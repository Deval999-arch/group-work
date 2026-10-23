'use strict'

require('dotenv').config()

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const session = require('express-session')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const bcrypt = require('bcryptjs')
const { z } = require('zod')

const { initDatabase } = require('./db.cjs')
const { SQLiteSessionStore } = require('./sessionStore.cjs')
const {
  canRegisterWithRole,
  hasPermission,
  requirePermission,
} = require('./policies.cjs')

const CATEGORIES = [
  'Engineering & Technology',
  'Health & Nursing',
  'Computer Science',
  'Agriculture & Climate',
  'Architecture & Design',
  'Education & Teaching',
]

const PRESET_PORTRAITS = [
  '/images/amara-mensah.jpg',
  '/images/david-okonkwo.jpg',
  '/images/mateo-delgado.jpg',
  '/images/linh-nguyen.jpg',
  '/images/hannah-lindqvist.jpg',
  '/images/tariq-al-mansoor.jpg',
]

const PAYMENT_METHOD_NAMES = {
  card: 'Credit / Debit Card',
  bank_transfer: 'Institutional Bank Wire',
  mobile_money: 'Mobile Money Wallet',
  digital_wallet: 'Digital Wallet',
}

function isAllowedPortraitPath(value) {
  if (typeof value !== 'string') return false
  if (PRESET_PORTRAITS.includes(value)) return true
  return /^\/images\/uploads\/scholar-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(value)
}

function detectImageExtensionFromMagicBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg'
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'png'
  }
  // WEBP: RIFF....WEBP
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

function signToken(sid, secret) {
  const mac = crypto.createHmac('sha256', secret).update(sid).digest('hex')
  return `${sid}.${mac}`
}

function verifySignedToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const idx = token.lastIndexOf('.')
  const sid = token.slice(0, idx)
  const mac = token.slice(idx + 1)
  if (!sid || !mac) return null
  const expected = crypto.createHmac('sha256', secret).update(sid).digest('hex')
  if (mac.length !== expected.length) return null
  const ok = crypto.timingSafeEqual(Buffer.from(mac, 'utf8'), Buffer.from(expected, 'utf8'))
  return ok ? sid : null
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function formatUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url || '',
    institution: row.institution || '',
    headline: row.headline || '',
    createdAt: row.created_at,
  }
}

function formatCampaign(row) {
  if (!row) return null
  let tuitionItems = []
  let milestones = []
  try {
    tuitionItems = JSON.parse(row.tuition_items_json || '[]')
  } catch {
    tuitionItems = []
  }
  try {
    milestones = JSON.parse(row.milestones_json || '[]')
  } catch {
    milestones = []
  }
  return {
    id: row.id,
    slug: row.slug,
    applicationId: row.application_id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    age: row.age,
    university: row.university,
    program: row.program,
    yearLabel: row.year_label,
    location: row.location,
    category: row.category,
    title: row.title,
    summary: row.summary,
    story: row.story,
    quote: row.quote,
    goalCents: row.goal_cents,
    raisedCents: row.raised_cents,
    supporterCount: row.supporter_count,
    percentFunded: Math.min(100, Math.round((row.raised_cents / Math.max(1, row.goal_cents)) * 100)),
    portraitUrl: row.portrait_url,
    tuitionItems,
    milestones,
    status: row.status,
    verified: Boolean(row.verified),
    featured: Boolean(row.featured),
    createdAt: row.created_at,
  }
}

function formatApplication(row) {
  if (!row) return null
  let tuitionItems = []
  try {
    tuitionItems = JSON.parse(row.tuition_items_json || '[]')
  } catch {
    tuitionItems = []
  }
  return {
    id: row.id,
    studentUserId: row.student_user_id,
    studentName: row.student_name,
    age: row.age,
    university: row.university,
    program: row.program,
    yearLabel: row.year_label,
    location: row.location,
    category: row.category,
    title: row.title,
    summary: row.summary,
    story: row.story,
    quote: row.quote,
    goalCents: row.goal_cents,
    tuitionItems,
    portraitUrl: row.portrait_url,
    status: row.status,
    adminNote: row.admin_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    campaignSlug: row.campaign_slug || null,
  }
}

function createApp(options = {}) {
  const seedFlag =
    options.seedData !== undefined
      ? options.seedData
      : options.seedDemo !== undefined
      ? options.seedDemo
      : process.env.NODE_ENV !== 'production'

  const db = initDatabase(options.dbPath, { seedData: seedFlag })

  const sessionSecret =
    process.env.SESSION_SECRET || 'scholarfund-institutional-secret-rotate-in-prod'

  const store = new SQLiteSessionStore(db)
  const app = express()
  app.locals.db = db

  app.set('trust proxy', 1)

  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  )

  app.use(express.json({ limit: '6mb' }))

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.rateLimitMax || 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a moment and try again.' },
  })

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.authRateLimitMax || 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
  })

  app.use('/api', apiLimiter)

  const baseSessionMiddleware = session({
    name: 'scholarfund.sid',
    secret: sessionSecret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: false,
    },
  })

  app.use((req, res, next) => {
    baseSessionMiddleware(req, res, (err) => {
      if (err) return next(err)
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https'
      if (isHttps && req.session && req.session.cookie) {
        req.session.cookie.sameSite = 'none'
        req.session.cookie.secure = true
        req.session.cookie.partitioned = true
      }
      return next()
    })
  })

  // Signed token hydration fallback when embedded browser frames block third-party cookies
  app.use((req, _res, next) => {
    const headerToken = req.get('x-session-token')
    const verifiedSid = headerToken ? verifySignedToken(headerToken, sessionSecret) : null

    if (verifiedSid && (!req.session || !req.session.csrfToken)) {
      store.get(verifiedSid, (err, loadedSess) => {
        if (!err && loadedSess) {
          req.fallbackSid = verifiedSid
          Object.assign(req.session, loadedSess)
        }
        next()
      })
      return
    }
    next()
  })

  function persistSessionData(req, cb) {
    if (req.fallbackSid) {
      store.set(req.fallbackSid, { ...req.session }, cb)
    } else {
      req.session.save(cb)
    }
  }

  function activeSessionId(req) {
    return req.fallbackSid || req.sessionID
  }

  function ensureCsrfToken(req) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(24).toString('hex')
    }
    return req.session.csrfToken
  }

  function logAudit(req, action, targetType, targetId, summary) {
    const user = req.currentUser
    db.prepare(`
      INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, target_type, target_id, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      user ? user.id : null,
      user ? user.email : 'visitor',
      user ? user.role : 'visitor',
      action,
      targetType,
      String(targetId || ''),
      summary
    )
  }

  // Hydrate authenticated user record from SQLite
  app.use('/api', (req, _res, next) => {
    req.currentUser = null
    const userId = req.session && req.session.userId
    if (userId) {
      const row = db
        .prepare(
          'SELECT id, name, email, role, avatar_url, institution, headline, created_at FROM users WHERE id = ?'
        )
        .get(userId)
      if (row) {
        req.currentUser = formatUser(row)
      } else {
        delete req.session.userId
      }
    }
    next()
  })

  // Enforce CSRF token validation on all mutating endpoints
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next()
    }
    const provided = req.get('x-csrf-token')
    const expected = req.session && req.session.csrfToken
    if (!provided || !expected || provided !== expected) {
      logAudit(
        req,
        'security.csrf_rejected',
        'endpoint',
        req.path,
        `Rejected ${req.method} ${req.path} due to missing or invalid CSRF token.`
      )
      return res.status(403).json({
        error: 'Security verification failed (CSRF token mismatch). Please retry.',
        code: 'CSRF_INVALID',
      })
    }
    return next()
  })

  // --- Session & Auth ---
  app.get('/api/session', (req, res, next) => {
    const csrfToken = ensureCsrfToken(req)
    persistSessionData(req, (err) => {
      if (err) return next(err)
      res.json({
        user: req.currentUser,
        csrfToken,
        sessionToken: signToken(activeSessionId(req), sessionSecret),
        categories: CATEGORIES,
        portraits: PRESET_PORTRAITS,
      })
    })
  })

  const registerSchema = z.object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(80),
    email: z.string().trim().email('Please enter a valid email address.').max(120),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .max(128),
    role: z.string(),
    institution: z.string().trim().max(120).optional().default(''),
    headline: z.string().trim().max(140).optional().default(''),
  })

  app.post('/api/auth/register', authLimiter, (req, res, next) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid registration details.',
      })
    }

    const { name, email, password, role, institution, headline } = parsed.data

    if (!canRegisterWithRole(role)) {
      logAudit(
        req,
        'security.role_escalation_blocked',
        'auth',
        email.toLowerCase(),
        `Blocked public account registration attempt with restricted role "${role}".`
      )
      return res.status(400).json({
        error: 'Public registration permits student or sponsor accounts only.',
        code: 'INVALID_ROLE',
      })
    }

    const normalizedEmail = email.toLowerCase()
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in instead.',
      })
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const result = db
      .prepare(
        'INSERT INTO users (name, email, password_hash, role, institution, headline) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(name, normalizedEmail, passwordHash, role, institution, headline)

    const createdRow = db
      .prepare(
        'SELECT id, name, email, role, avatar_url, institution, headline, created_at FROM users WHERE id = ?'
      )
      .get(result.lastInsertRowid)
    const newUser = formatUser(createdRow)

    req.session.userId = newUser.id
    req.currentUser = newUser
    const csrfToken = crypto.randomBytes(24).toString('hex')
    req.session.csrfToken = csrfToken

    logAudit(
      req,
      'auth.registered',
      'user',
      newUser.id,
      `Registered new ${newUser.role === 'donor' ? 'sponsor' : newUser.role} account for ${newUser.name}.`
    )

    persistSessionData(req, (err) => {
      if (err) return next(err)
      res.status(201).json({
        user: newUser,
        csrfToken,
        sessionToken: signToken(activeSessionId(req), sessionSecret),
      })
    })
  })

  const loginSchema = z.object({
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(1, 'Enter your password.').max(128),
  })

  app.post('/api/auth/login', authLimiter, (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid credentials.',
      })
    }

    const normalizedEmail = parsed.data.email.toLowerCase()
    const userRow = db
      .prepare(
        'SELECT id, name, email, password_hash, role, avatar_url, institution, headline, created_at FROM users WHERE email = ?'
      )
      .get(normalizedEmail)

    if (!userRow || !bcrypt.compareSync(parsed.data.password, userRow.password_hash)) {
      logAudit(
        req,
        'auth.login_failed',
        'auth',
        normalizedEmail,
        `Failed authentication attempt for ${normalizedEmail}.`
      )
      return res.status(401).json({
        error: 'Incorrect email address or password.',
      })
    }

    const safeUser = formatUser(userRow)
    req.session.userId = safeUser.id
    req.currentUser = safeUser
    const csrfToken = crypto.randomBytes(24).toString('hex')
    req.session.csrfToken = csrfToken

    logAudit(
      req,
      'auth.login',
      'user',
      safeUser.id,
      `${safeUser.name} (${safeUser.role}) authenticated.`
    )

    persistSessionData(req, (err) => {
      if (err) return next(err)
      res.json({
        user: safeUser,
        csrfToken,
        sessionToken: signToken(activeSessionId(req), sessionSecret),
      })
    })
  })

  app.post('/api/auth/logout', (req, res) => {
    logAudit(req, 'auth.logout', 'user', req.currentUser?.id || '', 'Signed out of session.')
    const sid = activeSessionId(req)
    store.destroy(sid, () => {
      req.session.destroy(() => {
        res.clearCookie('scholarfund.sid')
        res.json({ ok: true })
      })
    })
  })

  // --- Profile Update & Student Photo Upload ---
  const photoUploadSchema = z.object({
    dataUrl: z.string().min(50).max(6_500_000),
    updateProfileAvatar: z.boolean().optional().default(true),
  })

  app.post('/api/uploads/photo', requirePermission('upload:photo'), (req, res) => {
    const parsed = photoUploadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please select a valid image file under 5 MB.' })
    }

    const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
      parsed.data.dataUrl.trim()
    )
    if (!match) {
      return res.status(400).json({
        error: 'Unsupported image format. Please upload a JPG, PNG, or WebP photograph.',
      })
    }

    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Photograph must be 5 MB or smaller.' })
    }

    const verifiedExt = detectImageExtensionFromMagicBytes(buffer)
    if (!verifiedExt) {
      return res.status(400).json({
        error: 'Image file header verification failed. Please choose a valid photograph.',
      })
    }

    const uploadsDir = path.resolve(__dirname, '..', 'public', 'images', 'uploads')
    fs.mkdirSync(uploadsDir, { recursive: true })

    const filename = `scholar-${req.currentUser.id}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString('hex')}.${verifiedExt}`
    fs.writeFileSync(path.join(uploadsDir, filename), buffer)

    const publicUrl = `/images/uploads/${filename}`

    if (parsed.data.updateProfileAvatar) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(
        publicUrl,
        req.currentUser.id
      )
    }

    logAudit(
      req,
      'media.photo_uploaded',
      'user',
      req.currentUser.id,
      `Uploaded verified campaign portrait (${filename}, ${Math.round(buffer.length / 1024)} KB).`
    )

    const updatedUser = formatUser(
      db
        .prepare(
          'SELECT id, name, email, role, avatar_url, institution, headline, created_at FROM users WHERE id = ?'
        )
        .get(req.currentUser.id)
    )

    res.status(201).json({
      url: publicUrl,
      user: updatedUser,
    })
  })

  const profilePatchSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    institution: z.string().trim().max(120).optional(),
    headline: z.string().trim().max(140).optional(),
    avatarUrl: z.string().trim().max(260).optional(),
  })

  app.patch('/api/profile', requirePermission('profile:update_own'), (req, res) => {
    const parsed = profilePatchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid profile details.' })
    }
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.currentUser.id)
    const nextAvatar =
      parsed.data.avatarUrl !== undefined &&
      (parsed.data.avatarUrl === '' || isAllowedPortraitPath(parsed.data.avatarUrl))
        ? parsed.data.avatarUrl
        : existing.avatar_url

    db.prepare(`
      UPDATE users
      SET name = ?, institution = ?, headline = ?, avatar_url = ?
      WHERE id = ?
    `).run(
      parsed.data.name ?? existing.name,
      parsed.data.institution ?? existing.institution,
      parsed.data.headline ?? existing.headline,
      nextAvatar,
      req.currentUser.id
    )

    const updated = formatUser(
      db
        .prepare(
          'SELECT id, name, email, role, avatar_url, institution, headline, created_at FROM users WHERE id = ?'
        )
        .get(req.currentUser.id)
    )
    res.json({ user: updated })
  })

  // --- Public Campaign Directory & Live Activity Feed ---
  app.get('/api/campaigns', (req, res) => {
    const search = String(req.query.q || '').trim().toLowerCase()
    const category = String(req.query.category || '').trim()
    const statusFilter = String(req.query.status || 'public').trim()

    let rows = db
      .prepare(
        `SELECT * FROM campaigns
         WHERE status IN ('active', 'funded')
         ORDER BY featured DESC, CASE WHEN status = 'active' THEN 0 ELSE 1 END, id DESC`
      )
      .all()

    if (category && category !== 'All') {
      rows = rows.filter((r) => r.category === category)
    }
    if (statusFilter === 'active' || statusFilter === 'funded') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (search) {
      rows = rows.filter((r) => {
        const hay = `${r.student_name} ${r.university} ${r.program} ${r.location} ${r.category} ${r.title} ${r.summary}`.toLowerCase()
        return hay.includes(search)
      })
    }

    const totals = db
      .prepare(
        `SELECT
           COALESCE(SUM(raised_cents), 0) AS total_raised_cents,
           COALESCE(SUM(supporter_count), 0) AS total_supporters,
           COUNT(*) AS total_campaigns,
           SUM(CASE WHEN status = 'funded' THEN 1 ELSE 0 END) AS funded_campaigns
         FROM campaigns
         WHERE status IN ('active', 'funded')`
      )
      .get()

    const recentActivity = db
      .prepare(
        `SELECT d.id, d.donor_name, d.is_anonymous, d.amount_cents, d.payment_label, d.created_at,
                c.student_name, c.slug AS campaign_slug, c.university
         FROM donations d
         JOIN campaigns c ON c.id = d.campaign_id
         ORDER BY d.id DESC
         LIMIT 6`
      )
      .all()
      .map((item) => ({
        id: item.id,
        donorName: item.is_anonymous ? 'Anonymous Sponsor' : item.donor_name,
        amountCents: item.amount_cents,
        paymentLabel: item.payment_label,
        studentName: item.student_name,
        university: item.university,
        campaignSlug: item.campaign_slug,
        createdAt: item.created_at,
      }))

    res.json({
      campaigns: rows.map(formatCampaign),
      recentActivity,
      stats: {
        totalRaisedCents: totals.total_raised_cents,
        totalSupporters: totals.total_supporters,
        totalCampaigns: totals.total_campaigns,
        fundedCampaigns: totals.funded_campaigns || 0,
      },
    })
  })

  app.get('/api/campaigns/:slug', (req, res) => {
    const row = db.prepare('SELECT * FROM campaigns WHERE slug = ?').get(req.params.slug)
    const isOwner =
      req.currentUser &&
      row &&
      Number(row.student_user_id) === Number(req.currentUser.id)
    if (
      !row ||
      (row.status === 'paused' &&
        !isOwner &&
        !hasPermission(req.currentUser, 'admin:campaigns:manage'))
    ) {
      return res.status(404).json({ error: 'Scholarship campaign not found.' })
    }

    const donations = db
      .prepare(
        `SELECT id, donor_name, is_anonymous, amount_cents, currency, frequency,
                payment_method, payment_label, message, reference_code, created_at
         FROM donations
         WHERE campaign_id = ?
         ORDER BY id DESC
         LIMIT 30`
      )
      .all(row.id)
      .map((d) => ({
        id: d.id,
        donorName: d.is_anonymous ? 'Anonymous Sponsor' : d.donor_name,
        isAnonymous: Boolean(d.is_anonymous),
        amountCents: d.amount_cents,
        currency: d.currency,
        frequency: d.frequency,
        paymentMethod: d.payment_method,
        paymentLabel: d.payment_label,
        message: d.message,
        referenceCode: d.reference_code,
        createdAt: d.created_at,
      }))

    res.json({
      campaign: formatCampaign(row),
      donations,
    })
  })

  // --- Multi-Method Sponsorship Checkout Endpoint ---
  const donationSchema = z.object({
    amountUsd: z
      .number({ invalid_type_error: 'Enter a valid USD sponsorship amount.' })
      .min(5, 'Minimum sponsorship contribution is $5 USD.')
      .max(25000, 'Maximum single sponsorship transaction is $25,000 USD.'),
    frequency: z.enum(['one_time', 'monthly']).optional().default('one_time'),
    paymentMethod: z
      .enum(['card', 'bank_transfer', 'mobile_money', 'digital_wallet'])
      .optional()
      .default('card'),
    paymentLabel: z.string().trim().min(2).max(60).optional(),
    donorName: z.string().trim().min(2, 'Enter sponsor full name.').max(80).optional(),
    donorEmail: z.string().trim().email().max(120).optional().or(z.literal('')),
    isAnonymous: z.boolean().optional().default(false),
    message: z.string().trim().max(280).optional().default(''),
  })

  app.post('/api/campaigns/:slug/donations', (req, res) => {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE slug = ?').get(req.params.slug)
    if (!campaign || campaign.status === 'paused') {
      return res.status(404).json({ error: 'This campaign is not currently open for sponsorships.' })
    }

    const parsed = donationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please check your sponsorship details.',
      })
    }

    const amountCents = Math.round(parsed.data.amountUsd * 100)
    const isAnon = parsed.data.isAnonymous ? 1 : 0
    const donorName =
      parsed.data.donorName || (req.currentUser ? req.currentUser.name : 'Academic Sponsor')
    const donorEmail =
      parsed.data.donorEmail || (req.currentUser ? req.currentUser.email : '')
    const method = parsed.data.paymentMethod || 'card'
    const label = parsed.data.paymentLabel || PAYMENT_METHOD_NAMES[method]
    const frequency = parsed.data.frequency || 'one_time'

    const referenceCode = `SF-TXN-${crypto.randomInt(100000, 999999)}`

    const recordSponsorship = db.transaction(() => {
      db.prepare(`
        INSERT INTO donations (
          campaign_id, donor_user_id, donor_name, donor_email, is_anonymous,
          amount_cents, currency, frequency, payment_method, payment_label, message, reference_code
        ) VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?)
      `).run(
        campaign.id,
        req.currentUser ? req.currentUser.id : null,
        donorName,
        donorEmail,
        isAnon,
        amountCents,
        frequency,
        method,
        label,
        parsed.data.message || '',
        referenceCode
      )

      const newRaised = campaign.raised_cents + amountCents
      const newStatus = newRaised >= campaign.goal_cents ? 'funded' : campaign.status

      db.prepare(`
        UPDATE campaigns
        SET raised_cents = ?, supporter_count = supporter_count + 1, status = ?
        WHERE id = ?
      `).run(newRaised, newStatus, campaign.id)

      logAudit(
        req,
        'sponsorship.completed',
        'campaign',
        campaign.id,
        `Processed $${(amountCents / 100).toFixed(2)} USD (${label}) sponsorship for ${campaign.student_name} (${referenceCode}).`
      )

      return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign.id)
    })

    const updated = recordSponsorship()

    res.status(201).json({
      receipt: {
        referenceCode,
        amountCents,
        currency: 'USD',
        frequency,
        paymentMethod: method,
        paymentLabel: label,
        studentName: updated.student_name,
        university: updated.university,
        program: updated.program,
        campaignTitle: updated.title,
        donorName: isAnon ? 'Anonymous Sponsor' : donorName,
        issuedAt: new Date().toISOString(),
      },
      campaign: formatCampaign(updated),
    })
  })

  // --- Detailed Sponsor Dashboard Endpoint ---
  app.get('/api/donor/dashboard', requirePermission('donation:read_own'), (req, res) => {
    const rows = db
      .prepare(
        `SELECT d.*, c.student_name, c.university, c.program, c.category,
                c.title AS campaign_title, c.slug AS campaign_slug,
                c.portrait_url, c.goal_cents, c.raised_cents, c.supporter_count, c.status AS campaign_status
         FROM donations d
         JOIN campaigns c ON c.id = d.campaign_id
         WHERE d.donor_user_id = ?
         ORDER BY d.id DESC`
      )
      .all(req.currentUser.id)

    const totalContributedCents = rows.reduce((sum, r) => sum + r.amount_cents, 0)
    const monthlyRecurringCents = rows
      .filter((r) => r.frequency === 'monthly')
      .reduce((sum, r) => sum + r.amount_cents, 0)

    const byCampaignMap = new Map()
    const byCategoryMap = new Map()
    const byMethodMap = new Map()

    for (const r of rows) {
      if (!byCampaignMap.has(r.campaign_id)) {
        byCampaignMap.set(r.campaign_id, {
          campaignId: r.campaign_id,
          slug: r.campaign_slug,
          studentName: r.student_name,
          university: r.university,
          program: r.program,
          category: r.category,
          title: r.campaign_title,
          portraitUrl: r.portrait_url,
          goalCents: r.goal_cents,
          raisedCents: r.raised_cents,
          percentFunded: Math.min(100, Math.round((r.raised_cents / Math.max(1, r.goal_cents)) * 100)),
          status: r.campaign_status,
          myContributionCents: 0,
          giftCount: 0,
        })
      }
      const cEntry = byCampaignMap.get(r.campaign_id)
      cEntry.myContributionCents += r.amount_cents
      cEntry.giftCount += 1

      const catEntry = byCategoryMap.get(r.category) || {
        category: r.category,
        amountCents: 0,
        count: 0,
      }
      catEntry.amountCents += r.amount_cents
      catEntry.count += 1
      byCategoryMap.set(r.category, catEntry)

      const mEntry = byMethodMap.get(r.payment_method) || {
        paymentMethod: r.payment_method,
        label: PAYMENT_METHOD_NAMES[r.payment_method] || r.payment_method,
        amountCents: 0,
        count: 0,
      }
      mEntry.amountCents += r.amount_cents
      mEntry.count += 1
      byMethodMap.set(r.payment_method, mEntry)
    }

    const categoryAllocation = Array.from(byCategoryMap.values())
      .sort((a, b) => b.amountCents - a.amountCents)
      .map((item) => ({
        ...item,
        sharePercent: Math.round((item.amountCents / Math.max(1, totalContributedCents)) * 100),
      }))

    const paymentBreakdown = Array.from(byMethodMap.values()).sort(
      (a, b) => b.amountCents - a.amountCents
    )

    res.json({
      profile: req.currentUser,
      summary: {
        totalContributedCents,
        monthlyRecurringCents,
        scholarsSupportedCount: byCampaignMap.size,
        transactionsCount: rows.length,
        topCategory: categoryAllocation[0]?.category || 'All Disciplines',
      },
      supportedCampaigns: Array.from(byCampaignMap.values()),
      categoryAllocation,
      paymentBreakdown,
      transactions: rows.map((d) => ({
        id: d.id,
        campaignSlug: d.campaign_slug,
        campaignTitle: d.campaign_title,
        studentName: d.student_name,
        university: d.university,
        category: d.category,
        amountCents: d.amount_cents,
        currency: d.currency,
        frequency: d.frequency,
        paymentMethod: d.payment_method,
        paymentLabel: d.payment_label,
        isAnonymous: Boolean(d.is_anonymous),
        message: d.message,
        referenceCode: d.reference_code,
        createdAt: d.created_at,
      })),
    })
  })

  app.get('/api/donations/mine', requirePermission('donation:read_own'), (req, res) => {
    const rows = db
      .prepare(
        `SELECT d.*, c.student_name, c.university, c.title AS campaign_title, c.slug AS campaign_slug
         FROM donations d
         JOIN campaigns c ON c.id = d.campaign_id
         WHERE d.donor_user_id = ?
         ORDER BY d.id DESC`
      )
      .all(req.currentUser.id)

    res.json({
      donations: rows.map((d) => ({
        id: d.id,
        campaignSlug: d.campaign_slug,
        campaignTitle: d.campaign_title,
        studentName: d.student_name,
        university: d.university,
        amountCents: d.amount_cents,
        currency: d.currency,
        frequency: d.frequency,
        paymentMethod: d.payment_method,
        paymentLabel: d.payment_label,
        isAnonymous: Boolean(d.is_anonymous),
        message: d.message,
        referenceCode: d.reference_code,
        createdAt: d.created_at,
      })),
    })
  })

  // --- Detailed Student Dashboard & Campaign Creation ---
  app.get('/api/student/dashboard', requirePermission('student:dashboard'), (req, res) => {
    const campaignRows = db
      .prepare('SELECT * FROM campaigns WHERE student_user_id = ? ORDER BY id DESC')
      .all(req.currentUser.id)

    const applicationRows = db
      .prepare(
        `SELECT a.*, c.slug AS campaign_slug
         FROM applications a
         LEFT JOIN campaigns c ON c.application_id = a.id
         WHERE a.student_user_id = ?
         ORDER BY a.id DESC`
      )
      .all(req.currentUser.id)

    const sponsorships = db
      .prepare(
        `SELECT d.*, c.title AS campaign_title, c.slug AS campaign_slug
         FROM donations d
         JOIN campaigns c ON c.id = d.campaign_id
         WHERE c.student_user_id = ?
         ORDER BY d.id DESC
         LIMIT 50`
      )
      .all(req.currentUser.id)
      .map((d) => ({
        id: d.id,
        donorName: d.is_anonymous ? 'Anonymous Sponsor' : d.donor_name,
        amountCents: d.amount_cents,
        currency: d.currency,
        frequency: d.frequency,
        paymentMethod: d.payment_method,
        paymentLabel: d.payment_label,
        message: d.message,
        referenceCode: d.reference_code,
        campaignTitle: d.campaign_title,
        campaignSlug: d.campaign_slug,
        createdAt: d.created_at,
      }))

    const campaigns = campaignRows.map(formatCampaign)
    const applications = applicationRows.map(formatApplication)

    const totalRaisedCents = campaigns.reduce((s, c) => s + c.raisedCents, 0)
    const totalGoalCents =
      campaigns.reduce((s, c) => s + c.goalCents, 0) ||
      applications.reduce((s, a) => s + a.goalCents, 0)
    const totalSupporters = campaigns.reduce((s, c) => s + c.supporterCount, 0)
    const overallProgressPercent =
      totalGoalCents > 0 ? Math.min(100, Math.round((totalRaisedCents / totalGoalCents) * 100)) : 0

    res.json({
      profile: req.currentUser,
      summary: {
        totalRaisedCents,
        totalGoalCents,
        totalSupporters,
        campaignCount: campaigns.length,
        activeCount: campaigns.filter((c) => c.status === 'active').length,
        fundedCount: campaigns.filter((c) => c.status === 'funded').length,
        pendingApplicationsCount: applications.filter((a) => a.status === 'pending').length,
        overallProgressPercent,
      },
      campaigns,
      applications,
      sponsorships,
    })
  })

  const applicationSchema = z.object({
    age: z.number().int().min(18, 'Applicants must be 18 or older.').max(80),
    university: z.string().trim().min(3, 'Enter your university or institution name.').max(120),
    program: z.string().trim().min(3, 'Enter your degree program or major.').max(120),
    yearLabel: z.string().trim().min(2).max(60),
    location: z.string().trim().min(2, 'Enter your city and country.').max(80),
    category: z.enum(CATEGORIES),
    title: z.string().trim().min(10, 'Provide a descriptive campaign title (min 10 characters).').max(120),
    summary: z.string().trim().min(20, 'Provide a concise summary (min 20 characters).').max(260),
    story: z.string().trim().min(60, 'Share your full academic story (min 60 characters).').max(4000),
    quote: z.string().trim().max(180).optional().default(''),
    goalUsd: z.number().min(250, 'Minimum campaign goal is $250 USD.').max(25000, 'Maximum campaign goal is $25,000 USD.'),
    portraitUrl: z.string().refine(isAllowedPortraitPath, {
      message: 'Please upload a valid photo or choose a portrait.',
    }),
    publishImmediately: z.boolean().optional().default(true),
    tuitionItems: z
      .array(
        z.object({
          label: z.string().trim().min(2).max(100),
          amountUsd: z.number().min(10).max(25000),
        })
      )
      .min(1)
      .max(6),
    milestones: z
      .array(
        z.object({
          term: z.string().trim().min(2).max(50),
          text: z.string().trim().min(4).max(200),
        })
      )
      .max(6)
      .optional(),
  })

  app.get('/api/applications/mine', requirePermission('application:view_own'), (req, res) => {
    const rows = db
      .prepare(
        `SELECT a.*, c.slug AS campaign_slug
         FROM applications a
         LEFT JOIN campaigns c ON c.application_id = a.id
         WHERE a.student_user_id = ?
         ORDER BY a.id DESC`
      )
      .all(req.currentUser.id)

    res.json({ applications: rows.map(formatApplication) })
  })

  app.get('/api/applications/:id', (req, res) => {
    const appRow = db
      .prepare(
        `SELECT a.*, c.slug AS campaign_slug
         FROM applications a
         LEFT JOIN campaigns c ON c.application_id = a.id
         WHERE a.id = ?`
      )
      .get(Number(req.params.id))

    if (!appRow) {
      return res.status(404).json({ error: 'Application not found.' })
    }
    if (!hasPermission(req.currentUser, 'application:view_own', appRow)) {
      const code = req.currentUser ? 403 : 401
      return res.status(code).json({
        error: 'You are not permitted to view this student record.',
      })
    }
    res.json({ application: formatApplication(appRow) })
  })

  app.post('/api/applications', requirePermission('application:submit'), (req, res) => {
    const parsed = applicationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please review your campaign fields.',
      })
    }

    const d = parsed.data
    const goalCents = Math.round(d.goalUsd * 100)
    const tuitionItems = d.tuitionItems.map((item) => ({
      label: item.label,
      amount_cents: Math.round(item.amountUsd * 100),
    }))
    const milestones =
      d.milestones && d.milestones.length > 0
        ? d.milestones
        : [
            {
              term: 'Academic Enrollment',
              text: `${d.program} at ${d.university} (${d.yearLabel}).`,
            },
            {
              term: 'Completion Milestone',
              text: 'Full tuition clearance, academic transcript update, and sponsor impact report.',
            },
          ]

    const txResult = db.transaction(() => {
      // Update student profile metadata & avatar if empty
      db.prepare(`
        UPDATE users
        SET institution = CASE WHEN institution = '' THEN ? ELSE institution END,
            headline = CASE WHEN headline = '' THEN ? ELSE headline END,
            avatar_url = CASE WHEN avatar_url = '' THEN ? ELSE avatar_url END
        WHERE id = ?
      `).run(d.university, `${d.program} · ${d.yearLabel}`, d.portraitUrl, req.currentUser.id)

      const status = d.publishImmediately ? 'approved' : 'pending'

      const info = db
        .prepare(
          `INSERT INTO applications (
            student_user_id, student_name, age, university, program, year_label, location,
            category, title, summary, story, quote, goal_cents, tuition_items_json, portrait_url, status, admin_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.currentUser.id,
          req.currentUser.name,
          d.age,
          d.university,
          d.program,
          d.yearLabel,
          d.location,
          d.category,
          d.title,
          d.summary,
          d.story,
          d.quote || 'Every investment in education multiplies across an entire community.',
          goalCents,
          JSON.stringify(tuitionItems),
          d.portraitUrl,
          status,
          d.publishImmediately ? 'Published via Scholar Campaign Studio.' : ''
        )

      let createdCampaign = null
      if (d.publishImmediately) {
        const baseSlug = slugify(`${req.currentUser.name}-${d.title}`)
        const uniqueSlug = `${baseSlug}-${info.lastInsertRowid}`
        const campInfo = db
          .prepare(
            `INSERT INTO campaigns (
              slug, application_id, student_user_id, student_name, age, university, program,
              year_label, location, category, title, summary, story, quote,
              goal_cents, raised_cents, supporter_count, portrait_url,
              tuition_items_json, milestones_json, status, verified, featured
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'active', 1, 0)`
          )
          .run(
            uniqueSlug,
            info.lastInsertRowid,
            req.currentUser.id,
            req.currentUser.name,
            d.age,
            d.university,
            d.program,
            d.yearLabel,
            d.location,
            d.category,
            d.title,
            d.summary,
            d.story,
            d.quote || 'Every investment in education multiplies across an entire community.',
            goalCents,
            d.portraitUrl,
            JSON.stringify(tuitionItems),
            JSON.stringify(milestones)
          )
        createdCampaign = db
          .prepare('SELECT * FROM campaigns WHERE id = ?')
          .get(campInfo.lastInsertRowid)
      }

      logAudit(
        req,
        d.publishImmediately ? 'campaign.published' : 'application.submitted',
        'application',
        info.lastInsertRowid,
        `${req.currentUser.name} launched "${d.title}" ($${d.goalUsd.toLocaleString()} USD goal at ${d.university}).`
      )

      const createdApp = db
        .prepare(
          `SELECT a.*, c.slug AS campaign_slug
           FROM applications a
           LEFT JOIN campaigns c ON c.application_id = a.id
           WHERE a.id = ?`
        )
        .get(info.lastInsertRowid)

      return { createdApp, createdCampaign }
    })()

    res.status(201).json({
      application: formatApplication(txResult.createdApp),
      campaign: formatCampaign(txResult.createdCampaign),
    })
  })

  // Post new academic milestone update on own campaign
  const milestoneSchema = z.object({
    term: z.string().trim().min(2, 'Enter milestone phase title.').max(50),
    text: z.string().trim().min(5, 'Describe your academic progress update.').max(220),
  })

  app.post('/api/student/campaigns/:id/milestones', (req, res) => {
    const campaignId = Number(req.params.id)
    const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId)
    if (!row) {
      return res.status(404).json({ error: 'Campaign not found.' })
    }
    if (!hasPermission(req.currentUser, 'campaign:post_milestone', row)) {
      return res.status(403).json({ error: 'Only the scholar or an administrator can post updates.' })
    }
    const parsed = milestoneSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid milestone update.',
      })
    }

    let current = []
    try {
      current = JSON.parse(row.milestones_json || '[]')
    } catch {
      current = []
    }
    const updatedMilestones = [...current, parsed.data]
    db.prepare('UPDATE campaigns SET milestones_json = ? WHERE id = ?').run(
      JSON.stringify(updatedMilestones),
      campaignId
    )

    logAudit(
      req,
      'campaign.milestone_posted',
      'campaign',
      campaignId,
      `${req.currentUser.name} posted academic milestone "${parsed.data.term}".`
    )

    const updatedRow = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId)
    res.status(201).json({ campaign: formatCampaign(updatedRow) })
  })

  // --- Executive Admin Overview & Actions ---
  app.get('/api/admin/overview', requirePermission('admin:dashboard'), (_req, res) => {
    const appsRows = db
      .prepare(
        `SELECT a.*, c.slug AS campaign_slug
         FROM applications a
         LEFT JOIN campaigns c ON c.application_id = a.id
         ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.id DESC`
      )
      .all()

    const campaignsRows = db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all()

    const recentDonations = db
      .prepare(
        `SELECT d.*, c.student_name, c.slug AS campaign_slug, c.category
         FROM donations d
         JOIN campaigns c ON c.id = d.campaign_id
         ORDER BY d.id DESC
         LIMIT 50`
      )
      .all()

    const byCategory = db
      .prepare(
        `SELECT category,
                COUNT(*) AS campaign_count,
                SUM(raised_cents) AS raised_cents,
                SUM(goal_cents) AS goal_cents,
                SUM(supporter_count) AS supporters
         FROM campaigns
         GROUP BY category
         ORDER BY raised_cents DESC`
      )
      .all()

    const byPaymentMethod = db
      .prepare(
        `SELECT payment_method,
                COUNT(*) AS tx_count,
                SUM(amount_cents) AS total_cents
         FROM donations
         GROUP BY payment_method
         ORDER BY total_cents DESC`
      )
      .all()

    const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 75').all()

    res.json({
      applications: appsRows.map(formatApplication),
      campaigns: campaignsRows.map(formatCampaign),
      donations: recentDonations.map((d) => ({
        id: d.id,
        referenceCode: d.reference_code,
        donorName: d.is_anonymous ? 'Anonymous Sponsor' : d.donor_name,
        studentName: d.student_name,
        campaignSlug: d.campaign_slug,
        category: d.category,
        amountCents: d.amount_cents,
        currency: d.currency,
        frequency: d.frequency,
        paymentMethod: d.payment_method,
        paymentLabel: d.payment_label,
        message: d.message,
        createdAt: d.created_at,
      })),
      categorySummary: byCategory.map((c) => ({
        category: c.category,
        campaignCount: c.campaign_count,
        raisedCents: c.raised_cents,
        goalCents: c.goal_cents,
        supporters: c.supporters,
      })),
      paymentSummary: byPaymentMethod.map((p) => ({
        paymentMethod: p.payment_method,
        label: PAYMENT_METHOD_NAMES[p.payment_method] || p.payment_method,
        txCount: p.tx_count,
        totalCents: p.total_cents,
      })),
      auditLogs: auditLogs.map((l) => ({
        id: l.id,
        actorEmail: l.actor_email,
        actorRole: l.actor_role,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        summary: l.summary,
        createdAt: l.created_at,
      })),
    })
  })

  const reviewSchema = z.object({
    decision: z.enum(['approved', 'rejected']),
    adminNote: z.string().trim().max(500).optional().default(''),
  })

  app.post(
    '/api/admin/applications/:id/review',
    requirePermission('admin:applications:review'),
    (req, res) => {
      const appId = Number(req.params.id)
      const appRow = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId)
      if (!appRow) {
        return res.status(404).json({ error: 'Application not found.' })
      }
      if (appRow.status !== 'pending') {
        return res.status(400).json({ error: 'This application has already been reviewed.' })
      }

      const parsed = reviewSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Provide a valid review decision.' })
      }

      const { decision, adminNote } = parsed.data

      const runReview = db.transaction(() => {
        db.prepare(`
          UPDATE applications
          SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now')
          WHERE id = ?
        `).run(decision, adminNote, req.currentUser.id, appId)

        let createdCampaign = null
        if (decision === 'approved') {
          const baseSlug = slugify(`${appRow.student_name}-${appRow.title}`)
          const uniqueSlug = `${baseSlug}-${appId}`
          const milestones = [
            {
              term: 'Registrar Verified',
              text: `Enrollment and academic standing verified by ScholarFund Review Board (${appRow.university}).`,
            },
            {
              term: 'Target Milestone',
              text: `${appRow.year_label} completion & academic progress report.`,
            },
          ]
          const campaignInfo = db
            .prepare(
              `INSERT INTO campaigns (
                slug, application_id, student_user_id, student_name, age, university, program,
                year_label, location, category, title, summary, story, quote,
                goal_cents, raised_cents, supporter_count, portrait_url,
                tuition_items_json, milestones_json, status, verified, featured
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'active', 1, 0)`
            )
            .run(
              uniqueSlug,
              appRow.id,
              appRow.student_user_id,
              appRow.student_name,
              appRow.age,
              appRow.university,
              appRow.program,
              appRow.year_label,
              appRow.location,
              appRow.category,
              appRow.title,
              appRow.summary,
              appRow.story,
              appRow.quote || 'Thank you for investing in higher education.',
              appRow.goal_cents,
              appRow.portrait_url,
              appRow.tuition_items_json,
              JSON.stringify(milestones)
            )
          createdCampaign = db
            .prepare('SELECT * FROM campaigns WHERE id = ?')
            .get(campaignInfo.lastInsertRowid)
        }

        logAudit(
          req,
          `application.${decision}`,
          'application',
          appRow.id,
          `Review Board ${decision} dossier for ${appRow.student_name}${
            adminNote ? ` — "${adminNote}"` : ''
          }.`
        )

        const updatedApp = db
          .prepare(
            `SELECT a.*, c.slug AS campaign_slug
             FROM applications a
             LEFT JOIN campaigns c ON c.application_id = a.id
             WHERE a.id = ?`
          )
          .get(appId)

        return { updatedApp, createdCampaign }
      })

      const { updatedApp, createdCampaign } = runReview()
      res.json({
        application: formatApplication(updatedApp),
        campaign: formatCampaign(createdCampaign),
      })
    }
  )

  const campaignManageSchema = z.object({
    status: z.enum(['active', 'paused', 'funded']).optional(),
    featured: z.boolean().optional(),
    verified: z.boolean().optional(),
  })

  app.patch(
    '/api/admin/campaigns/:id',
    requirePermission('admin:campaigns:manage'),
    (req, res) => {
      const id = Number(req.params.id)
      const existing = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)
      if (!existing) {
        return res.status(404).json({ error: 'Campaign not found.' })
      }
      const parsed = campaignManageSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid campaign update.' })
      }

      const nextStatus = parsed.data.status ?? existing.status
      const nextFeatured =
        parsed.data.featured !== undefined ? (parsed.data.featured ? 1 : 0) : existing.featured
      const nextVerified =
        parsed.data.verified !== undefined ? (parsed.data.verified ? 1 : 0) : existing.verified

      db.prepare('UPDATE campaigns SET status = ?, featured = ?, verified = ? WHERE id = ?').run(
        nextStatus,
        nextFeatured,
        nextVerified,
        id
      )

      logAudit(
        req,
        'campaign.updated',
        'campaign',
        id,
        `Updated ${existing.student_name} campaign (status=${nextStatus}, featured=${Boolean(
          nextFeatured
        )}, verified=${Boolean(nextVerified)}).`
      )

      const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)
      res.json({ campaign: formatCampaign(updated) })
    }
  )

  // Serve public assets (portraits & uploaded student photographs)
  const publicDir = path.resolve(__dirname, '..', 'public')
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir))
  }

  // Serve compiled React SPA bundle
  const candidateFrontendDirs = [
    path.resolve(__dirname, '..', 'public-dist'),
    path.resolve(__dirname, '..', 'dist'),
  ]
  const frontendDir = candidateFrontendDirs.find((dir) =>
    fs.existsSync(path.join(dir, 'index.html'))
  )
  if (frontendDir) {
    app.use(express.static(frontendDir))
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(frontendDir, 'index.html'))
    })
  }

  return app
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4000)
  const host = process.env.HOST || '0.0.0.0'
  const app = createApp()
  app.listen(port, host, () => {
    console.log(`ScholarFund server listening on http://${host}:${port}`)
  })
}

module.exports = { createApp }
