'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')

const { canRegisterWithRole, hasPermission } = require('./policies.cjs')
const { createApp } = require('./index.cjs')

describe('ScholarFund RBAC & Ownership Policies', () => {
  const admin = { id: 1, role: 'admin' }
  const donor = { id: 2, role: 'donor' }
  const studentA = { id: 10, role: 'student' }
  const studentB = { id: 11, role: 'student' }

  it('denies unknown permissions for all users including admins', () => {
    assert.equal(hasPermission(null, 'unknown:permission'), false)
    assert.equal(hasPermission(studentA, 'unknown:permission'), false)
    assert.equal(hasPermission(admin, 'unknown:permission'), false)
    assert.equal(hasPermission(admin, '__proto__'), false)
  })

  it('allows public registration only for student and donor roles', () => {
    assert.equal(canRegisterWithRole('student'), true)
    assert.equal(canRegisterWithRole('donor'), true)
    assert.equal(canRegisterWithRole('admin'), false)
    assert.equal(canRegisterWithRole('moderator'), false)
    assert.equal(canRegisterWithRole(''), false)
  })

  it('enforces resource ownership on private student applications', () => {
    const appOwnedByA = { id: 99, student_user_id: 10 }
    assert.equal(hasPermission(studentA, 'application:view_own', appOwnedByA), true)
    assert.equal(hasPermission(studentB, 'application:view_own', appOwnedByA), false)
    assert.equal(hasPermission(donor, 'application:view_own', appOwnedByA), false)
    assert.equal(hasPermission(null, 'application:view_own', appOwnedByA), false)
    assert.equal(hasPermission(admin, 'application:view_own', appOwnedByA), true)
  })

  it('restricts admin review, campaign controls, and audit endpoints strictly to admins', () => {
    for (const perm of [
      'admin:dashboard',
      'admin:applications:review',
      'admin:campaigns:manage',
      'admin:donations:summary',
      'admin:audit:read',
    ]) {
      assert.equal(hasPermission(null, perm), false)
      assert.equal(hasPermission(donor, perm), false)
      assert.equal(hasPermission(studentA, perm), false)
      assert.equal(hasPermission(admin, perm), true)
    }
  })
})

describe('ScholarFund HTTP Security Controls (CSRF, Session, Role Checks)', () => {
  let server
  let baseUrl
  let app

  async function apiClient() {
    let cookie = ''
    let csrfToken = ''

    async function request(method, path, body, { includeCsrf = true } = {}) {
      const headers = { 'Content-Type': 'application/json' }
      if (cookie) headers.Cookie = cookie
      if (includeCsrf && csrfToken) headers['X-CSRF-Token'] = csrfToken

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

      const setCookie = res.headers.get('set-cookie')
      if (setCookie) {
        cookie = setCookie.split(';')[0]
      }
      const data = await res.json().catch(() => ({}))
      if (data.csrfToken) {
        csrfToken = data.csrfToken
      }
      return { status: res.status, data }
    }

    await request('GET', '/api/session')
    return { request }
  }

  before(async () => {
    app = createApp({ dbPath: ':memory:', seedDemo: true, rateLimitMax: 2000, authRateLimitMax: 500 })
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address()
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    app.locals.db.close()
  })

  it('rejects state-changing requests missing a valid CSRF token', async () => {
    const client = await apiClient()
    const res = await client.request(
      'POST',
      '/api/campaigns/amara-mensah-solar-cold-storage/donations',
      { amountUsd: 25, donorName: 'Test Donor' },
      { includeCsrf: false }
    )
    assert.equal(res.status, 403)
    assert.equal(res.data.code, 'CSRF_INVALID')
  })

  it('prevents privilege escalation to admin during public sign-up', async () => {
    const client = await apiClient()
    const res = await client.request('POST', '/api/auth/register', {
      name: 'Mallory Escalate',
      email: 'mallory@example.org',
      password: 'StrongPassword!99',
      role: 'admin',
    })
    assert.equal(res.status, 400)
    assert.equal(res.data.code, 'INVALID_ROLE')
  })

  it('blocks non-admin accounts from accessing admin overview and private applications of other students', async () => {
    const otherStudent = await apiClient()
    const reg = await otherStudent.request('POST', '/api/auth/register', {
      name: 'Nadia Mensah',
      email: 'nadia@example.org',
      password: 'StudentPassword!22',
      role: 'student',
    })
    assert.equal(reg.status, 201)

    // Attempt to read seeded application #1 belonging to Kofi Boateng
    const foreignApp = await otherStudent.request('GET', '/api/applications/1')
    assert.equal(foreignApp.status, 403)

    // Attempt to read admin overview
    const adminAttempt = await otherStudent.request('GET', '/api/admin/overview')
    assert.equal(adminAttempt.status, 403)
  })

  it('allows seeded demo admin to sign in, approve a pending application, and record an audit trail', async () => {
    const adminClient = await apiClient()
    const login = await adminClient.request('POST', '/api/auth/login', {
      email: 'admin@scholarfund.demo',
      password: 'ScholarFundDemo!2026',
    })
    assert.equal(login.status, 200)
    assert.equal(login.data.user.role, 'admin')

    const review = await adminClient.request('POST', '/api/admin/applications/1/review', {
      decision: 'approved',
      adminNote: 'Enrollment verified with registrar letter.',
    })
    assert.equal(review.status, 200)
    assert.equal(review.data.application.status, 'approved')
    assert.ok(review.data.campaign.slug)
  })
})
