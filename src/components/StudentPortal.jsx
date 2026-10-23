import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { formatUsd, formatDateTime } from '../format.js'
import PhotoUploader from './PhotoUploader.jsx'
import {
  AnimatedNumber,
  MotionReveal,
  RadialProgress,
  SparkAreaChart,
} from './MotionPrimitives.jsx'

export default function StudentPortal({
  user,
  categories,
  portraits,
  onOpenAuth,
  onSelectCampaign,
  onUserUpdated,
  onCampaignCreated,
}) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState('')
  const [bannerMsg, setBannerMsg] = useState('')
  const [copiedSlug, setCopiedSlug] = useState('')

  // Milestone composer state per campaign
  const [milestoneInputs, setMilestoneInputs] = useState({})
  const [postingMilestoneId, setPostingMilestoneId] = useState(null)

  // Quick avatar input ref
  const avatarFileRef = useRef(null)

  // Campaign Creation Studio state
  const [age, setAge] = useState(21)
  const [university, setUniversity] = useState(user?.institution || '')
  const [program, setProgram] = useState('')
  const [yearLabel, setYearLabel] = useState('Final Year Undergraduate')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState(categories[0] || 'Engineering & Technology')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [story, setStory] = useState('')
  const [quote, setQuote] = useState('')
  const [portraitUrl, setPortraitUrl] = useState(
    user?.avatarUrl || portraits[0] || '/images/amara-mensah.jpg'
  )
  const [items, setItems] = useState([
    { label: 'University semester tuition & registration balance', amountUsd: 1850 },
    { label: 'Laboratory bench fees, clinical rotation, or research materials', amountUsd: 650 },
    { label: 'Academic textbooks & thesis documentation', amountUsd: 350 },
  ])
  const [milestones, setMilestones] = useState([
    { term: 'Academic Standing', text: 'Full-time enrollment confirmed with university faculty.' },
    { term: 'Graduation Target', text: 'Final thesis defense & transcript publication.' },
  ])
  const [submitting, setSubmitting] = useState(false)

  async function loadDashboard({ switchSmartTab = false } = {}) {
    if (!user || user.role !== 'student') return
    setLoading(true)
    setError('')
    try {
      const data = await api.studentDashboard()
      setDashboard(data)
      if (switchSmartTab) {
        if ((data.campaigns?.length || 0) === 0 && (data.applications?.length || 0) === 0) {
          setActiveTab('create')
        } else {
          setActiveTab('overview')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.institution && !university) {
      setUniversity(user.institution)
    }
    if (user?.avatarUrl) {
      setPortraitUrl(user.avatarUrl)
    }
    loadDashboard({ switchSmartTab: true })
  }, [user?.id])

  const computedGoalUsd = items.reduce((sum, i) => sum + (Number(i.amountUsd) || 0), 0)

  function updateItem(idx, key, val) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)))
  }

  function addItem() {
    if (items.length >= 6) return
    setItems((prev) => [...prev, { label: '', amountUsd: 250 }])
  }

  function removeItem(idx) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateMilestoneDraft(idx, key, val) {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: val } : m)))
  }

  async function handleQuickAvatarUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const img = new Image()
        img.onload = async () => {
          const maxDim = 640
          let w = img.width
          let h = img.height
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w)
              w = maxDim
            } else {
              w = Math.round((w * maxDim) / h)
              h = maxDim
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          const res = await api.uploadPhoto({
            dataUrl: canvas.toDataURL('image/jpeg', 0.88),
            updateProfileAvatar: true,
          })
          setPortraitUrl(res.url)
          if (onUserUpdated && res.user) onUserUpdated(res.user)
          await loadDashboard()
        }
        img.src = reader.result
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleCreateCampaign(e) {
    e.preventDefault()
    setError('')
    setBannerMsg('')
    setSubmitting(true)
    try {
      const cleanedItems = items.map((i) => ({
        label: i.label.trim(),
        amountUsd: Number(i.amountUsd),
      }))
      const cleanedMilestones = milestones
        .filter((m) => m.term.trim() && m.text.trim())
        .map((m) => ({ term: m.term.trim(), text: m.text.trim() }))

      const res = await api.submitApplication({
        age: Number(age),
        university,
        program,
        yearLabel,
        location,
        category,
        title,
        summary,
        story,
        quote,
        goalUsd: computedGoalUsd,
        portraitUrl,
        publishImmediately: true,
        tuitionItems: cleanedItems,
        milestones: cleanedMilestones,
      })

      const sess = await api.getSession()
      if (sess.user && onUserUpdated) onUserUpdated(sess.user)
      if (onCampaignCreated) onCampaignCreated()

      setTitle('')
      setSummary('')
      setStory('')
      setQuote('')
      setBannerMsg(
        `Your scholarship campaign "${res.campaign?.title || res.application.title}" is now live and visible to sponsors!`
      )
      await loadDashboard()
      setActiveTab('overview')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePostMilestone(campaignId) {
    const draft = milestoneInputs[campaignId] || { term: '', text: '' }
    if (!draft.term.trim() || !draft.text.trim()) return
    setPostingMilestoneId(campaignId)
    setError('')
    try {
      await api.postMilestone(campaignId, {
        term: draft.term.trim(),
        text: draft.text.trim(),
      })
      setMilestoneInputs((prev) => ({ ...prev, [campaignId]: { term: '', text: '' } }))
      setBannerMsg('Academic progress update published to your campaign page.')
      await loadDashboard()
    } catch (err) {
      setError(err.message)
    } finally {
      setPostingMilestoneId(null)
    }
  }

  // Gate view if visitor or signed in as non-student
  if (!user || user.role !== 'student') {
    return (
      <div className="container section-page page-transition">
        <div className="surface-card" style={{ maxWidth: 740, padding: 36 }}>
          <span className="eyebrow">Scholar Campaign Studio &amp; Analytics</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.15rem', margin: '0 0 14px' }}>
            Launch your verified academic sponsorship campaign
          </h1>
          <p style={{ color: 'var(--ink-secondary)', marginBottom: 24, lineHeight: 1.66, fontSize: '1rem' }}>
            {user
              ? `You are signed in as ${user.name} (${user.role === 'donor' ? 'Sponsor' : user.role}). Sign in or create a Student Scholar account to upload your photograph, publish itemized tuition campaigns, and track live sponsorship disbursements.`
              : 'Create a Student Scholar profile to upload your portrait, itemize university tuition and research costs, post academic progress milestones, and track every incoming sponsorship in real time.'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => onOpenAuth('register')}>
              Register as a Student Scholar
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onOpenAuth('login')}>
              Sign in to Existing Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  const summaryData = dashboard?.summary || {
    totalRaisedCents: 0,
    totalGoalCents: 0,
    totalSupporters: 0,
    campaignCount: 0,
    activeCount: 0,
    fundedCount: 0,
    overallProgressPercent: 0,
  }
  const myCampaigns = dashboard?.campaigns || []
  const myApplications = dashboard?.applications || []
  const sponsorships = dashboard?.sponsorships || []

  // Aggregate itemized expenses across student's campaigns for visual breakdown
  const allExpenseItems = myCampaigns.flatMap((c) => c.tuitionItems || [])
  const totalExpenseCents = Math.max(
    1,
    allExpenseItems.reduce((sum, item) => sum + (item.amount_cents || 0), 0)
  )

  // Build cumulative chart series from sponsorships chronological order
  const chronologicalGifts = [...sponsorships].reverse()
  let runningCents = 0
  const chartSeries =
    chronologicalGifts.length > 0
      ? chronologicalGifts.map((s, idx) => {
          runningCents += s.amountCents
          return {
            label: `#${idx + 1}`,
            value: Math.round(runningCents / 100),
          }
        })
      : [
          { label: 'Launch', value: 0 },
          { label: 'Today', value: Math.round(summaryData.totalRaisedCents / 100) },
        ]

  return (
    <div className="container section-page page-transition">
      {/* Scholar Profile Header Card */}
      <MotionReveal>
        <div
          className="surface-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #ffffff 0%, #f3f7f4 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative' }}>
              <img
                src={user.avatarUrl || portraitUrl || '/images/amara-mensah.jpg'}
                alt={user.name}
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  objectPosition: 'center 35%',
                  border: '3px solid #ffffff',
                  boxShadow: '0 4px 14px rgba(20, 34, 25, 0.14)',
                }}
              />
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleQuickAvatarUpload}
              />
              <button
                type="button"
                title="Upload profile photo"
                onClick={() => avatarFileRef.current?.click()}
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                }}
              >
                ✎
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="status-badge status-approved">Verified Scholar Workspace</span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', margin: 0, lineHeight: 1.15 }}>
                {user.name}
              </h1>
              <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginTop: 3 }}>
                {user.institution || myCampaigns[0]?.university || 'Academic Scholar Profile'}
                {user.headline ? ` · ${user.headline}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('overview')}
            >
              Dashboard &amp; Analytics
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('create')}
            >
              + Create New Campaign
            </button>
          </div>
        </div>
      </MotionReveal>

      {error && <div className="alert-error">{error}</div>}
      {bannerMsg && <div className="alert-success">{bannerMsg}</div>}

      {/* TAB 1: DETAILED STUDENT ANALYTICS & CAMPAIGN MANAGEMENT */}
      {activeTab === 'overview' && (
        <div>
          {/* 4 Animated KPI Cards */}
          <div className="kpi-grid-4">
            <div className="kpi-card">
              <div className="stat-value">
                <AnimatedNumber
                  value={summaryData.totalRaisedCents}
                  formatter={(v) => formatUsd(v)}
                />
              </div>
              <div className="stat-label">Total sponsorship funds raised</div>
            </div>

            <div className="kpi-card">
              <div className="stat-value">
                <AnimatedNumber
                  value={summaryData.totalGoalCents}
                  formatter={(v) => formatUsd(v)}
                />
              </div>
              <div className="stat-label">
                Combined academic budget goal ({summaryData.overallProgressPercent}%)
              </div>
            </div>

            <div className="kpi-card">
              <div className="stat-value">
                <AnimatedNumber value={summaryData.totalSupporters} />
              </div>
              <div className="stat-label">Sponsors supporting your education</div>
            </div>

            <div className="kpi-card">
              <div className="stat-value">
                <AnimatedNumber value={summaryData.campaignCount} />
              </div>
              <div className="stat-label">
                Published campaigns ({summaryData.fundedCount} completed)
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--ink-muted)' }}>Loading your scholar metrics...</p>
          ) : myCampaigns.length === 0 && myApplications.length === 0 ? (
            <div className="surface-card" style={{ textAlign: 'center', padding: 48 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: '0 0 10px' }}>
                Ready to publish your first scholarship campaign
              </h2>
              <p style={{ color: 'var(--ink-secondary)', maxWidth: 520, margin: '0 auto 22px' }}>
                Upload your photograph, share your academic journey, and itemize your university tuition and laboratory expenses so sponsors can back your degree directly.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveTab('create')}
              >
                Open Campaign Studio →
              </button>
            </div>
          ) : (
            <>
              {/* Visual Charts Row */}
              <div className="analytics-grid-2">
                <div className="surface-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: 0 }}>
                        Funding trajectory &amp; goal completion
                      </h2>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                        Real-time cumulative sponsorships recorded in SQLite
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '156px 1fr',
                      gap: 20,
                      alignItems: 'center',
                    }}
                  >
                    <RadialProgress
                      percent={summaryData.overallProgressPercent}
                      label="Funded"
                      sublabel={`${formatUsd(
                        Math.max(0, summaryData.totalGoalCents - summaryData.totalRaisedCents)
                      )} remaining`}
                    />
                    <SparkAreaChart
                      series={chartSeries}
                      formatValue={(v) => `$${Number(v).toLocaleString()} USD`}
                    />
                  </div>
                </div>

                <div className="surface-card">
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 4px' }}>
                    Itemized tuition &amp; research allocation
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: '0 0 16px' }}>
                    Transparent breakdown across your published academic expenses
                  </p>
                  <div style={{ display: 'grid', gap: 13 }}>
                    {allExpenseItems.slice(0, 5).map((item, idx) => {
                      const pct = Math.round((item.amount_cents / totalExpenseCents) * 100)
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                            <span style={{ fontWeight: 500 }}>{item.label}</span>
                            <strong className="tabular">
                              {formatUsd(item.amount_cents)} ({pct}%)
                            </strong>
                          </div>
                          <div className="progress-track" style={{ height: 7, marginBottom: 0 }}>
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Active Campaigns Management & Milestone Composer */}
              <section className="surface-card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: 0 }}>
                    My live scholarship campaigns ({myCampaigns.length})
                  </h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('create')}
                  >
                    + New Campaign
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 20 }}>
                  {myCampaigns.map((c) => {
                    const draft = milestoneInputs[c.id] || { term: '', text: '' }
                    return (
                      <div
                        key={c.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 16,
                          padding: 20,
                          background: 'var(--bg-page)',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '110px 1fr auto',
                            gap: 18,
                            alignItems: 'center',
                            marginBottom: 16,
                          }}
                        >
                          <img
                            src={c.portraitUrl}
                            alt={c.studentName}
                            style={{
                              width: 110,
                              height: 110,
                              objectFit: 'cover',
                              objectPosition: 'center 38%',
                              borderRadius: 12,
                              border: '1px solid var(--border)',
                            }}
                          />

                          <div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                              <span className={`status-badge status-${c.status}`}>{c.status}</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{c.category}</span>
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', margin: '0 0 4px' }}>
                              {c.title}
                            </h3>
                            <div style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', marginBottom: 10 }}>
                              {c.program} · {c.university}
                            </div>

                            <div className="progress-track" style={{ background: '#ffffff', marginBottom: 6 }}>
                              <div className="progress-fill" style={{ width: `${c.percentFunded}%` }} />
                            </div>
                            <div className="tabular" style={{ fontSize: '0.83rem', color: 'var(--ink-secondary)' }}>
                              <strong style={{ color: 'var(--ink-primary)' }}>{formatUsd(c.raisedCents)}</strong> raised of{' '}
                              {formatUsd(c.goalCents)} ({c.percentFunded}% · {c.supporterCount} sponsors)
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => onSelectCampaign(c.slug)}
                            >
                              View Public Page →
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                navigator.clipboard?.writeText(window.location.origin)
                                setCopiedSlug(c.slug)
                                setTimeout(() => setCopiedSlug(''), 1800)
                              }}
                            >
                              {copiedSlug === c.slug ? 'Link Copied ✓' : 'Copy Share Link'}
                            </button>
                          </div>
                        </div>

                        {/* Inline Academic Progress Update Composer */}
                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 14px',
                          }}
                        >
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 8 }}>
                            Post academic milestone update to sponsors ({c.milestones?.length || 0} posted)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 8 }}>
                            <input
                              className="field-input"
                              placeholder="Phase (e.g., Mid-Term)"
                              value={draft.term}
                              onChange={(e) =>
                                setMilestoneInputs((prev) => ({
                                  ...prev,
                                  [c.id]: { ...draft, term: e.target.value },
                                }))
                              }
                            />
                            <input
                              className="field-input"
                              placeholder="Share exam results, lab progress, or tuition receipt update..."
                              value={draft.text}
                              onChange={(e) =>
                                setMilestoneInputs((prev) => ({
                                  ...prev,
                                  [c.id]: { ...draft, text: e.target.value },
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={postingMilestoneId === c.id}
                              onClick={() => handlePostMilestone(c.id)}
                            >
                              Post Update
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Incoming Sponsorships Ledger */}
              <section className="surface-card">
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: '0 0 14px' }}>
                  Incoming sponsorship ledger ({sponsorships.length})
                </h2>

                {sponsorships.length === 0 ? (
                  <p style={{ color: 'var(--ink-muted)', margin: 0 }}>
                    No sponsorship disbursements recorded yet. Share your campaign link with sponsors to receive contributions via Card, Bank Transfer, Mobile Money, or Wallet.
                  </p>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Sponsor</th>
                          <th>Payment Method</th>
                          <th>Schedule</th>
                          <th>Amount</th>
                          <th>Encouragement Note</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sponsorships.map((s) => (
                          <tr key={s.id}>
                            <td><code>{s.referenceCode}</code></td>
                            <td><strong>{s.donorName}</strong></td>
                            <td>{s.paymentLabel}</td>
                            <td>
                              <span className="role-tag">
                                {s.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                              </span>
                            </td>
                            <td className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                              {formatUsd(s.amountCents, { decimals: true })}
                            </td>
                            <td style={{ color: 'var(--ink-secondary)', maxWidth: 260 }}>
                              {s.message || '—'}
                            </td>
                            <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-muted)' }}>
                              {formatDateTime(s.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB 2: CAMPAIGN CREATION STUDIO WITH PHOTO UPLOAD */}
      {activeTab === 'create' && (
        <section className="surface-card" style={{ maxWidth: 880 }}>
          <span className="eyebrow">Scholar Campaign Studio</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: '0 0 6px' }}>
            Create &amp; publish your scholarship campaign
          </h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', margin: '0 0 24px' }}>
            Upload your photograph, detail your university degree and research goals, and itemize your academic budget. Published campaigns appear immediately in both your Scholar Dashboard and the public Sponsor Directory.
          </p>

          <form onSubmit={handleCreateCampaign}>
            {/* Step 1: Student Photograph Upload */}
            <PhotoUploader
              value={portraitUrl}
              onChange={setPortraitUrl}
              presets={portraits}
              onUserUpdated={onUserUpdated}
              label="1. Upload your scholar photograph"
            />

            {/* Step 2: University & Degree Info */}
            <div style={{ marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <span className="field-label" style={{ fontSize: '0.92rem', marginBottom: 12 }}>
                2. Academic institution &amp; program details
              </span>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label">University / Institution</label>
                  <input
                    className="field-input"
                    required
                    placeholder="e.g., University of Port Harcourt"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Degree &amp; Department</label>
                  <input
                    className="field-input"
                    required
                    placeholder="e.g., B.Eng. Mechatronics & Systems Engineering"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label">Academic discipline</label>
                  <select
                    className="field-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="field-label">City, Country</label>
                  <input
                    className="field-input"
                    required
                    placeholder="e.g., Port Harcourt, Nigeria"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label">Academic level / Year</label>
                  <input
                    className="field-input"
                    required
                    value={yearLabel}
                    onChange={(e) => setYearLabel(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Age</label>
                  <input
                    className="field-input tabular"
                    type="number"
                    min={18}
                    max={80}
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Campaign Narrative */}
            <div style={{ marginTop: 18, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <span className="field-label" style={{ fontSize: '0.92rem', marginBottom: 12 }}>
                3. Campaign headline &amp; academic narrative
              </span>

              <div className="form-group">
                <label className="field-label">Campaign headline</label>
                <input
                  className="field-input"
                  required
                  minLength={10}
                  placeholder="e.g., Final-year embedded robotics thesis & semester tuition balance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Concise card summary (shown on directory cards)</label>
                <input
                  className="field-input"
                  required
                  minLength={20}
                  maxLength={250}
                  placeholder="Summarize what this sponsorship enables in 1–2 clear sentences..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Full personal story &amp; research vision</label>
                <textarea
                  className="field-textarea"
                  style={{ minHeight: 140 }}
                  required
                  minLength={60}
                  placeholder="Share your background, academic achievements, research goals, and how completing this degree impacts your community..."
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Personal highlight quote (optional)</label>
                <input
                  className="field-input"
                  maxLength={175}
                  placeholder="A memorable reflection displayed on your profile..."
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Itemized Tuition Budget */}
            <div
              style={{
                background: 'var(--bg-page)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 18,
                marginTop: 18,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="field-label" style={{ margin: 0, fontSize: '0.92rem' }}>
                  4. Itemized tuition &amp; research budget (USD)
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                  + Add budget line
                </button>
              </div>

              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px auto',
                    gap: 8,
                    marginBottom: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    className="field-input"
                    style={{ background: '#ffffff' }}
                    required
                    placeholder="Expense item description"
                    value={it.label}
                    onChange={(e) => updateItem(idx, 'label', e.target.value)}
                  />
                  <input
                    className="field-input tabular"
                    style={{ background: '#ffffff' }}
                    type="number"
                    min={10}
                    max={25000}
                    required
                    value={it.amountUsd}
                    onChange={(e) => updateItem(idx, 'amountUsd', e.target.value)}
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeItem(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div className="tabular" style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', marginTop: 12 }}>
                Total Campaign Funding Goal:{' '}
                <span style={{ color: 'var(--accent)', fontSize: '1.18rem' }}>
                  ${computedGoalUsd.toLocaleString()} USD
                </span>
              </div>
            </div>

            {/* Step 5: Initial Academic Milestones */}
            <div
              style={{
                background: 'var(--bg-page)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 18,
                marginBottom: 22,
              }}
            >
              <span className="field-label" style={{ fontSize: '0.92rem', marginBottom: 10 }}>
                5. Initial academic milestones
              </span>
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 8, marginBottom: 8 }}
                >
                  <input
                    className="field-input"
                    style={{ background: '#ffffff' }}
                    placeholder="Term / Stage"
                    value={m.term}
                    onChange={(e) => updateMilestoneDraft(idx, 'term', e.target.value)}
                  />
                  <input
                    className="field-input"
                    style={{ background: '#ffffff' }}
                    placeholder="Milestone description"
                    value={m.text}
                    onChange={(e) => updateMilestoneDraft(idx, 'text', e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Publishing Campaign...' : 'Publish Scholarship Campaign →'}
              </button>
              {myCampaigns.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('overview')}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
