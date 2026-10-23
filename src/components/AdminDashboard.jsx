import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatUsd, formatShortTimestamp } from '../format.js'
import { AnimatedNumber, MotionReveal } from './MotionPrimitives.jsx'

export default function AdminDashboard({ onSelectCampaign, onDataChanged }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('applications')
  const [notes, setNotes] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [bannerMsg, setBannerMsg] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const overview = await api.adminOverview()
      setData(overview)
      if (onDataChanged) onDataChanged(overview)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleReview(appId, decision) {
    setBusyId(appId)
    setBannerMsg('')
    setError('')
    try {
      const res = await api.reviewApplication(appId, {
        decision,
        adminNote: notes[appId] || '',
      })
      setBannerMsg(
        decision === 'approved'
          ? `Approved ${res.application.studentName}'s dossier — campaign published to directory.`
          : `Updated review decision (${decision}) for ${res.application.studentName}.`
      )
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleCampaignPatch(campaignId, patch) {
    setBusyId(`c-${campaignId}`)
    setError('')
    try {
      await api.updateCampaign(campaignId, patch)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="container section-page">
        <p style={{ color: 'var(--ink-muted)' }}>Loading executive review console...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="container section-page">
        <div className="alert-error">{error}</div>
      </div>
    )
  }

  const pendingApps = data.applications.filter((a) => a.status === 'pending')
  const totalRaisedCents = data.campaigns.reduce((s, c) => s + c.raisedCents, 0)

  return (
    <div className="container section-page page-transition">
      <MotionReveal>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
          <div>
            <span className="eyebrow">Academic Verification &amp; Governance Board</span>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.1rem', margin: '0 0 4px' }}>
              Executive review &amp; treasury oversight
            </h1>
            <p style={{ color: 'var(--ink-secondary)', margin: 0, fontSize: '0.94rem' }}>
              Verify university enrollment dossiers, oversee live scholar campaigns, monitor payment settlement channels, and inspect server security logs.
            </p>
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>
            Sync Ledger
          </button>
        </div>
      </MotionReveal>

      {/* 4 Animated Executive KPIs */}
      <div className="kpi-grid-4">
        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber value={pendingApps.length} />
          </div>
          <div className="stat-label">Dossiers awaiting verification</div>
        </div>
        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber value={data.campaigns.length} />
          </div>
          <div className="stat-label">Active &amp; completed scholar campaigns</div>
        </div>
        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber
              value={totalRaisedCents}
              formatter={(v) => formatUsd(v)}
            />
          </div>
          <div className="stat-label">Total institutional capital raised</div>
        </div>
        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber value={data.auditLogs.length} />
          </div>
          <div className="stat-label">Cryptographic &amp; audit events logged</div>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {bannerMsg && <div className="alert-success">{bannerMsg}</div>}

      <div className="sub-tabs" role="tablist">
        <button
          type="button"
          className={`cat-pill ${activeTab === 'applications' ? 'active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          Verification Queue ({pendingApps.length} pending)
        </button>
        <button
          type="button"
          className={`cat-pill ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          Campaign Controls ({data.campaigns.length})
        </button>
        <button
          type="button"
          className={`cat-pill ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => setActiveTab('donations')}
        >
          Treasury &amp; Payment Channels
        </button>
        <button
          type="button"
          className={`cat-pill ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Security &amp; Audit Trail
        </button>
      </div>

      {/* TAB 1: APPLICATIONS REVIEW */}
      {activeTab === 'applications' && (
        <div style={{ display: 'grid', gap: 18 }}>
          {data.applications.map((app) => (
            <article key={app.id} className="surface-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <img
                    src={app.portraitUrl}
                    alt={app.studentName}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 12,
                      objectFit: 'cover',
                      objectPosition: 'center 38%',
                      border: '1px solid var(--border)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                      <span className={`status-badge status-${app.status}`}>{app.status}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{app.category}</span>
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.28rem', margin: '0 0 3px' }}>
                      {app.title}
                    </h2>
                    <div style={{ fontSize: '0.86rem', color: 'var(--ink-secondary)' }}>
                      <strong>{app.studentName}</strong> ({app.age}) · {app.program} · {app.university} ({app.location})
                    </div>
                  </div>
                </div>

                <div className="tabular" style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--accent)' }}>
                    {formatUsd(app.goalCents)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Academic budget</div>
                </div>
              </div>

              <p style={{ fontSize: '0.93rem', color: 'var(--ink-secondary)', lineHeight: 1.64, margin: '0 0 14px' }}>
                {app.story}
              </p>

              <div
                style={{
                  background: 'var(--bg-page)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 16,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)', marginBottom: 6 }}>
                  Itemized tuition &amp; research schedule
                </div>
                {app.tuitionItems.map((it, i) => (
                  <div
                    key={i}
                    className="tabular"
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', padding: '3px 0' }}
                  >
                    <span>{it.label}</span>
                    <strong>{formatUsd(it.amount_cents)}</strong>
                  </div>
                ))}
              </div>

              {app.status === 'pending' ? (
                <div>
                  <label className="field-label" htmlFor={`note-${app.id}`}>
                    Registrar verification note (recorded permanently in audit ledger)
                  </label>
                  <input
                    id={`note-${app.id}`}
                    className="field-input"
                    placeholder="e.g., Confirmed official university registrar invoice & good academic standing."
                    value={notes[app.id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    style={{ marginBottom: 12 }}
                  />
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busyId === app.id}
                      onClick={() => handleReview(app.id, 'approved')}
                    >
                      Approve &amp; Publish to Directory
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={busyId === app.id}
                      onClick={() => handleReview(app.id, 'rejected')}
                    >
                      Decline Dossier
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                    {app.reviewedAt ? `Reviewed ${formatShortTimestamp(app.reviewedAt)}` : 'Verified'}
                    {app.adminNote ? ` · ${app.adminNote}` : ''}
                  </div>
                  {app.campaignSlug && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectCampaign(app.campaignSlug)}
                    >
                      Open Campaign →
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* TAB 2: CAMPAIGN MONITORING */}
      {activeTab === 'campaigns' && (
        <section className="surface-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scholar &amp; Institution</th>
                  <th>Discipline</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Spotlight</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={c.portraitUrl}
                          alt={c.studentName}
                          style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', objectPosition: 'center 38%' }}
                        />
                        <div>
                          <strong>{c.studentName}</strong>
                          <div style={{ fontSize: '0.77rem', color: 'var(--ink-muted)' }}>{c.university}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.category}</td>
                    <td className="tabular">
                      <strong>{formatUsd(c.raisedCents)}</strong> / {formatUsd(c.goalCents)} ({c.percentFunded}%)
                    </td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === `c-${c.id}`}
                        onClick={() => handleCampaignPatch(c.id, { verified: !c.verified })}
                      >
                        {c.verified ? '✓ Verified' : 'Unverified'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === `c-${c.id}`}
                        onClick={() => handleCampaignPatch(c.id, { featured: !c.featured })}
                      >
                        {c.featured ? 'Featured ★' : 'Standard'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.status !== 'paused' ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busyId === `c-${c.id}`}
                            onClick={() => handleCampaignPatch(c.id, { status: 'paused' })}
                          >
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={busyId === `c-${c.id}`}
                            onClick={() => handleCampaignPatch(c.id, { status: 'active' })}
                          >
                            Resume
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectCampaign(c.slug)}
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: TREASURY & PAYMENT CHANNELS */}
      {activeTab === 'donations' && (
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="analytics-grid-2" style={{ marginBottom: 0 }}>
            <section className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 14px' }}>
                Volume by payment rail
              </h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th>Transactions</th>
                      <th>Total Disbursed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.paymentSummary || []).map((p) => (
                      <tr key={p.paymentMethod}>
                        <td><strong>{p.label}</strong></td>
                        <td className="tabular">{p.txCount}</td>
                        <td className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {formatUsd(p.totalCents, { decimals: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 14px' }}>
                Disbursements by academic field
              </h2>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Discipline</th>
                      <th>Scholars</th>
                      <th>Raised</th>
                      <th>Goal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categorySummary.map((row) => (
                      <tr key={row.category}>
                        <td><strong>{row.category}</strong></td>
                        <td className="tabular">{row.campaignCount}</td>
                        <td className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {formatUsd(row.raisedCents)}
                        </td>
                        <td className="tabular">{formatUsd(row.goalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="surface-card">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: '0 0 14px' }}>
              Master sponsorship ledger
            </h2>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Sponsor</th>
                    <th>Scholar</th>
                    <th>Payment Rail</th>
                    <th>Amount (USD)</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {data.donations.map((d) => (
                    <tr key={d.id}>
                      <td><code>{d.referenceCode}</code></td>
                      <td>{d.donorName}</td>
                      <td><strong>{d.studentName}</strong></td>
                      <td>{d.paymentLabel}</td>
                      <td className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {formatUsd(d.amountCents, { decimals: true })}
                      </td>
                      <td style={{ color: 'var(--ink-muted)' }}>{formatShortTimestamp(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <section className="surface-card">
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: '0 0 6px' }}>
            Immutable server activity &amp; security audit trail
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', margin: '0 0 14px' }}>
            Server-enforced log recording every authentication event, CSRF verification, role check, photo upload, campaign publication, and sponsorship settlement.
          </p>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-muted)' }}>
                      {formatShortTimestamp(log.createdAt)}
                    </td>
                    <td><code>{log.action}</code></td>
                    <td>{log.actorEmail}</td>
                    <td><span className="role-tag">{log.actorRole}</span></td>
                    <td>{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
