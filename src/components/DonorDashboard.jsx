import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { formatUsd, formatDateTime } from '../format.js'
import { AnimatedNumber, MotionReveal, SparkAreaChart } from './MotionPrimitives.jsx'

export default function DonorDashboard({ user, onSelectCampaign, onNavigate, onUserUpdated }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const avatarInputRef = useRef(null)

  async function loadPortfolio() {
    if (!user) return
    setLoading(true)
    try {
      const res = await api.donorDashboard()
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPortfolio()
  }, [user?.id])

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
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
        if (onUserUpdated && res.user) onUserUpdated(res.user)
        await loadPortfolio()
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  const summary = data?.summary || {
    totalContributedCents: 0,
    monthlyRecurringCents: 0,
    scholarsSupportedCount: 0,
    transactionsCount: 0,
    topCategory: 'All Disciplines',
  }
  const supportedCampaigns = data?.supportedCampaigns || []
  const categoryAllocation = data?.categoryAllocation || []
  const paymentBreakdown = data?.paymentBreakdown || []
  const transactions = data?.transactions || []

  // Build cumulative chart points from chronological transactions
  const chronological = [...transactions].reverse()
  let running = 0
  const impactSeries =
    chronological.length > 0
      ? chronological.map((tx, idx) => {
          running += tx.amountCents
          return {
            label: tx.studentName.split(' ')[0] || `#${idx + 1}`,
            value: Math.round(running / 100),
          }
        })
      : [
          { label: 'Joined', value: 0 },
          { label: 'Today', value: 0 },
        ]

  function getInitials(name = '') {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('')
  }

  return (
    <div className="container section-page page-transition">
      {/* Sponsor Profile Banner */}
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
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f6f0 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative' }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center 35%',
                    border: '3px solid #ffffff',
                    boxShadow: '0 4px 14px rgba(20, 34, 25, 0.14)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1d6340 0%, #113a25 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.45rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(20, 34, 25, 0.14)',
                  }}
                >
                  {getInitials(user.name)}
                </div>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                title="Upload profile photo"
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 27,
                  height: 27,
                  borderRadius: '50%',
                  border: '2px solid #fff',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                }}
              >
                ✎
              </button>
            </div>

            <div>
              <span className="status-badge status-approved" style={{ marginBottom: 5 }}>
                Sponsor Impact Portfolio
              </span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', margin: 0, lineHeight: 1.15 }}>
                {user.name}
              </h1>
              <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginTop: 3 }}>
                {user.institution || 'Educational Philanthropy Partner'} · Primary focus: {summary.topCategory}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('explore')}
          >
            + Sponsor Another Scholar
          </button>
        </div>
      </MotionReveal>

      {/* 4 Animated Portfolio KPI Cards */}
      <div className="kpi-grid-4">
        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber
              value={summary.totalContributedCents}
              formatter={(v) => formatUsd(v)}
            />
          </div>
          <div className="stat-label">Total educational capital deployed</div>
        </div>

        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber
              value={summary.monthlyRecurringCents}
              formatter={(v) => `${formatUsd(v)}/mo`}
            />
          </div>
          <div className="stat-label">Active recurring stipend commitments</div>
        </div>

        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber value={summary.scholarsSupportedCount} />
          </div>
          <div className="stat-label">University scholars directly backed</div>
        </div>

        <div className="kpi-card">
          <div className="stat-value">
            <AnimatedNumber value={summary.transactionsCount} />
          </div>
          <div className="stat-label">Verified escrow receipts issued</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Loading your sponsorship portfolio...</p>
      ) : transactions.length === 0 ? (
        <div className="surface-card" style={{ textAlign: 'center', padding: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: '0 0 10px' }}>
            Begin your scholarship impact portfolio
          </h2>
          <p style={{ color: 'var(--ink-secondary)', maxWidth: 520, margin: '0 auto 22px' }}>
            Explore verified university scholars and complete your first sponsorship via Credit Card, Bank Wire, Mobile Money, or Digital Wallet to unlock real-time portfolio analytics and official receipts.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('explore')}
          >
            Browse Verified Scholars →
          </button>
        </div>
      ) : (
        <>
          {/* Analytics Charts Row */}
          <div className="analytics-grid-2">
            <div className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 4px' }}>
                Cumulative sponsorship growth
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: '0 0 14px' }}>
                Progressive capital disbursed across scholars
              </p>
              <SparkAreaChart
                series={impactSeries}
                formatValue={(v) => `$${Number(v).toLocaleString()} USD`}
              />
            </div>

            <div className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 4px' }}>
                Allocation by discipline &amp; payment channel
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', margin: '0 0 14px' }}>
                Distribution across academic fields and settlement rails
              </p>

              <div style={{ display: 'grid', gap: 11, marginBottom: 18 }}>
                {categoryAllocation.map((cat) => (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{cat.category}</span>
                      <strong className="tabular">
                        {formatUsd(cat.amountCents)} ({cat.sharePercent}%)
                      </strong>
                    </div>
                    <div className="progress-track" style={{ height: 7, marginBottom: 0 }}>
                      <div className="progress-fill" style={{ width: `${cat.sharePercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {paymentBreakdown.map((pm) => (
                  <span
                    key={pm.paymentMethod}
                    className="badge-glass tabular"
                    style={{ background: 'var(--bg-page)', border: '1px solid var(--border)' }}
                  >
                    {pm.label}: <strong>{formatUsd(pm.amountCents)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Supported Scholars Visual Progress Grid */}
          <section className="surface-card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: '0 0 16px' }}>
              Scholars in your portfolio ({supportedCampaigns.length})
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: 18,
              }}
            >
              {supportedCampaigns.map((c) => (
                <div
                  key={c.campaignId}
                  onClick={() => onSelectCampaign(c.slug)}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: 16,
                    background: 'var(--bg-page)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <img
                      src={c.portraitUrl}
                      alt={c.studentName}
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 12,
                        objectFit: 'cover',
                        objectPosition: 'center 38%',
                      }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.96rem', display: 'block' }}>{c.studentName}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{c.university}</span>
                      <div style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700, marginTop: 2 }}>
                        Your support: {formatUsd(c.myContributionCents)}
                      </div>
                    </div>
                  </div>

                  <div className="progress-track" style={{ background: '#ffffff', height: 7, marginBottom: 6 }}>
                    <div className="progress-fill" style={{ width: `${c.percentFunded}%` }} />
                  </div>
                  <div className="tabular" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.79rem', color: 'var(--ink-secondary)' }}>
                    <span>{formatUsd(c.raisedCents)} of {formatUsd(c.goalCents)}</span>
                    <strong>{c.percentFunded}% funded</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Official Receipts Ledger */}
          <section className="surface-card">
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', margin: '0 0 14px' }}>
              Official transaction &amp; escrow receipt ledger
            </h2>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt ID</th>
                    <th>Scholar &amp; Institution</th>
                    <th>Payment Method</th>
                    <th>Schedule</th>
                    <th>Amount (USD)</th>
                    <th>Date</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((d) => (
                    <tr key={d.id}>
                      <td><code>{d.referenceCode}</code></td>
                      <td>
                        <strong>{d.studentName}</strong>
                        <div style={{ fontSize: '0.77rem', color: 'var(--ink-muted)' }}>
                          {d.university}
                        </div>
                      </td>
                      <td>{d.paymentLabel}</td>
                      <td>
                        <span className="role-tag">
                          {d.frequency === 'monthly' ? 'Monthly' : 'One-Time'}
                        </span>
                      </td>
                      <td className="tabular" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {formatUsd(d.amountCents, { decimals: true })}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--ink-muted)' }}>
                        {formatDateTime(d.createdAt)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedReceipt(d)}
                        >
                          Certificate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Printable Official Sponsorship Certificate Modal */}
      {selectedReceipt && (
        <div className="modal-backdrop" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 14, marginBottom: 16 }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                ScholarFund Academic Escrow Receipt
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', margin: '4px 0 0', fontSize: '1.45rem' }}>
                Official Sponsorship Confirmation
              </h2>
            </div>

            <div style={{ display: 'grid', gap: 10, fontSize: '0.88rem', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Reference Number</span>
                <code>{selectedReceipt.referenceCode}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Sponsor</span>
                <strong>{user.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Recipient Scholar</span>
                <strong>{selectedReceipt.studentName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Institution</span>
                <span>{selectedReceipt.university}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Payment Rail</span>
                <strong>{selectedReceipt.paymentLabel}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Date Recorded</span>
                <span>{formatDateTime(selectedReceipt.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: '1.04rem' }}>
                <strong>Total Disbursed</strong>
                <strong className="tabular" style={{ color: 'var(--accent)' }}>
                  {formatUsd(selectedReceipt.amountCents, { decimals: true })} USD
                </strong>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                Print / Save PDF
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
