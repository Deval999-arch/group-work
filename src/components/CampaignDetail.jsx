import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatUsd, formatDateTime } from '../format.js'
import PaymentCheckout from './PaymentCheckout.jsx'
import { MotionReveal } from './MotionPrimitives.jsx'

export default function CampaignDetail({ slug, user, onBack, onCampaignMutated }) {
  const [campaign, setCampaign] = useState(null)
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDetail() {
    setLoading(true)
    setError('')
    try {
      const data = await api.getCampaign(slug)
      setCampaign(data.campaign)
      setDonations(data.donations || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [slug])

  if (loading) {
    return (
      <div className="container detail-wrap">
        <p style={{ color: 'var(--ink-secondary)' }}>Loading scholar profile...</p>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="container detail-wrap">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to scholar directory
        </button>
        <div className="alert-error">{error || 'Campaign not found.'}</div>
      </div>
    )
  }

  return (
    <div className="container detail-wrap page-transition">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to scholar directory
      </button>

      <div className="detail-grid">
        <div>
          <MotionReveal>
            <article className="surface-card" style={{ marginBottom: 24 }}>
              <div className="detail-portrait-row">
                <img
                  src={campaign.portraitUrl}
                  alt={campaign.studentName}
                  className="detail-portrait"
                />
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <span className="status-badge status-active">{campaign.category}</span>
                    {campaign.verified && (
                      <span className="status-badge status-approved">
                        ✓ Registrar Verified
                      </span>
                    )}
                    {campaign.status === 'funded' && (
                      <span className="status-badge status-funded">100% Funded</span>
                    )}
                  </div>
                  <h1
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'clamp(1.55rem, 2.6vw, 2.05rem)',
                      lineHeight: 1.2,
                      margin: '0 0 10px',
                    }}
                  >
                    {campaign.title}
                  </h1>
                  <div style={{ fontWeight: 700, color: 'var(--ink-primary)', fontSize: '0.96rem' }}>
                    {campaign.studentName}, {campaign.age} · {campaign.location}
                  </div>
                  <div style={{ color: 'var(--ink-secondary)', fontSize: '0.88rem', marginTop: 3 }}>
                    {campaign.program}
                  </div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: '0.84rem', marginTop: 2 }}>
                    {campaign.university} · {campaign.yearLabel}
                  </div>
                </div>
              </div>

              {campaign.quote && (
                <blockquote className="student-quote">“{campaign.quote}”</blockquote>
              )}

              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: 12 }}>
                Academic background &amp; impact statement
              </h2>
              {campaign.story.split('\n\n').map((para, idx) => (
                <p key={idx} className="story-paragraph">
                  {para}
                </p>
              ))}

              {/* Itemized Budget with Animated Share Bars */}
              <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 6px' }}>
                  Verified tuition &amp; research allocation (USD)
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', margin: '0 0 16px' }}>
                  Funds disburse directly toward itemized university tuition, laboratory bench hours, and required academic materials.
                </p>

                <div style={{ display: 'grid', gap: 14 }}>
                  {campaign.tuitionItems.map((item, i) => {
                    const share = Math.round(
                      (item.amount_cents / Math.max(1, campaign.goalCents)) * 100
                    )
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 5 }}>
                          <span style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>{item.label}</span>
                          <span className="tabular" style={{ fontWeight: 700 }}>
                            {formatUsd(item.amount_cents)}{' '}
                            <span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                              ({share}%)
                            </span>
                          </span>
                        </div>
                        <div className="progress-track" style={{ height: 6, marginBottom: 0 }}>
                          <div className="progress-fill" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <strong style={{ fontSize: '0.95rem' }}>Total Verified Academic Budget</strong>
                  <strong className="tabular" style={{ color: 'var(--accent)', fontSize: '1.14rem' }}>
                    {formatUsd(campaign.goalCents)} USD
                  </strong>
                </div>
              </div>

              {/* Milestones */}
              {campaign.milestones?.length > 0 && (
                <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid var(--border)' }}>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 14px' }}>
                    Verified academic milestones
                  </h2>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {campaign.milestones.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--bg-page)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px 15px',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {m.term}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--ink-primary)', marginTop: 2 }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </MotionReveal>

          {/* Sponsor Honor Roll */}
          <MotionReveal delay={90}>
            <section className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', margin: '0 0 16px' }}>
                Sponsor honor roll ({donations.length})
              </h2>

              {donations.length === 0 ? (
                <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Be the founding sponsor supporting {campaign.studentName}’s academic milestone.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {donations.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        paddingBottom: 14,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                        <div>
                          <strong style={{ fontSize: '0.92rem' }}>{d.donorName}</strong>
                          {d.frequency === 'monthly' && (
                            <span className="role-tag" style={{ marginLeft: 8 }}>Monthly</span>
                          )}
                        </div>
                        <span className="tabular" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.94rem' }}>
                          {formatUsd(d.amountCents)}
                        </span>
                      </div>
                      {d.message && (
                        <p style={{ margin: '5px 0 4px', fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
                          “{d.message}”
                        </p>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                        {formatDateTime(d.createdAt)} · {d.paymentLabel} · Ref {d.referenceCode}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </MotionReveal>
        </div>

        {/* Sticky Multi-Method Sponsorship Checkout */}
        <PaymentCheckout
          campaign={campaign}
          user={user}
          onSuccess={async () => {
            await loadDetail()
            if (onCampaignMutated) onCampaignMutated()
          }}
        />
      </div>
    </div>
  )
}
