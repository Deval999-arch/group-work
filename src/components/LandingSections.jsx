import React, { useEffect, useState } from 'react'
import { formatUsd } from '../format.js'
import { MotionReveal } from './MotionPrimitives.jsx'

const PARTNER_INSTITUTIONS = [
  'Kwame Nkrumah University of Science & Technology',
  'University of Ibadan',
  'Chalmers University of Technology',
  'Universidad de Antioquia',
  'University of Lagos',
  'University of Da Nang',
  'University of Port Harcourt',
  'University of Jordan',
  'University of Cape Coast',
  'Universidad Nacional Mayor de San Marcos',
]

const SCHOLAR_STEPS = [
  {
    step: '01',
    title: 'Create Profile & Upload Portrait',
    description:
      'Register with your university credentials, upload your personal scholar photograph, and introduce your degree specialization.',
  },
  {
    step: '02',
    title: 'Itemize Tuition & Research Costs',
    description:
      'Break down exact semester tuition balances, laboratory bench fees, clinical rotation kits, or thesis materials with full line-item clarity.',
  },
  {
    step: '03',
    title: 'Receive Global Multi-Rail Funding',
    description:
      'Sponsors contribute one-time or recurring stipends via Card, Institutional Wire, Mobile Money, or Digital Wallets into protected escrow.',
  },
  {
    step: '04',
    title: 'Publish Live Academic Milestones',
    description:
      'Post transcript updates, laboratory prototypes, and graduation defense milestones directly to your sponsors from your Scholar Dashboard.',
  },
]

const SPONSOR_STEPS = [
  {
    step: '01',
    title: 'Explore Verified University Dossiers',
    description:
      'Filter scholars across six high-impact disciplines and inspect transparent line-by-line academic cost schedules.',
  },
  {
    step: '02',
    title: 'Select One-Time or Monthly Stipend',
    description:
      'Fund an immediate tuition balance or establish a monthly research stipend tailored to your philanthropic focus.',
  },
  {
    step: '03',
    title: 'Settle Across 4 Secure Channels',
    description:
      'Complete sponsorship seamlessly using Visa/Mastercard/Verve, Bank Wire, Mobile Money (OPay, MTN MoMo, PalmPay), or PayPal/Apple Pay.',
  },
  {
    step: '04',
    title: 'Track Portfolio Impact & Certificates',
    description:
      'Download official printable escrow certificates and monitor every scholar’s progress inside your dedicated Sponsor Dashboard.',
  },
]

const DISCIPLINE_META = {
  'Engineering & Technology': {
    accent: 'linear-gradient(135deg, #0d6e50, #10b981)',
    tagline: 'Clean energy microgrids, embedded systems & civil infrastructure',
  },
  'Health & Nursing': {
    accent: 'linear-gradient(135deg, #0f766e, #14b8a6)',
    tagline: 'Maternal primary care, clinical rotations & diagnostic pathology',
  },
  'Computer Science': {
    accent: 'linear-gradient(135deg, #1d4ed8, #38bdf8)',
    tagline: 'Assistive computing, AI accessibility & civic software engineering',
  },
  'Agriculture & Climate': {
    accent: 'linear-gradient(135deg, #15803d, #84cc16)',
    tagline: 'Drought-resilient soil science, agronomy & harvest preservation',
  },
  'Architecture & Design': {
    accent: 'linear-gradient(135deg, #b45309, #f59e0b)',
    tagline: 'Low-carbon timber engineering & cooperative student housing',
  },
  'Education & Teaching': {
    accent: 'linear-gradient(135deg, #0e7490, #06b6d4)',
    tagline: 'Secondary STEM pedagogy, tactile geometry & classroom equity',
  },
}

const COMPARISON_ROWS = [
  {
    feature: 'Registrar & Enrollment Verification',
    scholarfund: 'Verified Academic Dossier & Crest',
    crowdfunding: 'Unverified self-reported posts',
    loans: 'Credit-score & collateral gated',
  },
  {
    feature: 'Line-Item Tuition & Lab Breakdown',
    scholarfund: '100% Mandatory Itemized Schedule',
    crowdfunding: 'Lump-sum unitemized requests',
    loans: 'Opaque origination fees',
  },
  {
    feature: 'Repayment & Interest Burden on Student',
    scholarfund: '0% Debt · Pure Philanthropic Grant',
    crowdfunding: 'Platform deductions',
    loans: '9%–18% compounding APR',
  },
  {
    feature: 'Supported Payment Channels',
    scholarfund: 'Card, Bank Wire, Mobile Money & Wallets',
    crowdfunding: 'Single regional processor',
    loans: 'Bank debit only',
  },
  {
    feature: 'Post-Funding Academic Accountability',
    scholarfund: 'Live Scholar Milestone & Transcript Feed',
    crowdfunding: 'Rarely updated after payout',
    loans: 'None',
  },
  {
    feature: 'Official Sponsor Escrow Documentation',
    scholarfund: 'Instant Printable Escrow Certificate',
    crowdfunding: 'Generic email receipt',
    loans: 'Not applicable',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'Reaching 100% of my structural timber testing budget meant I could focus every waking hour in the laboratory instead of working double weekend shifts during my master’s thesis.',
    name: 'Hannah Lindqvist',
    role: 'M.Arch. Graduate Scholar · Chalmers University of Technology',
    avatar: '/images/hannah-lindqvist.jpg',
    badge: '100% Funded Scholar',
  },
  {
    quote:
      'Seeing exact line items—from high-voltage power lab hours to spectrophotometer soil assays—gives our fellowship complete confidence that every dollar advances real scholarship.',
    name: 'Marcus Vance',
    role: 'Managing Partner · Vance Engineering Fellowship',
    avatar: '/images/mateo-delgado.jpg',
    badge: 'Fellowship Sponsor',
  },
  {
    quote:
      'Bridging final-mile session balances keeps brilliant final-year agronomy and engineering students from deferring graduation over a single unpaid laboratory invoice.',
    name: 'David Okonkwo',
    role: 'B.Agric. Soil Science Scholar · University of Ibadan',
    avatar: '/images/david-okonkwo.jpg',
    badge: 'Verified Scholar',
  },
]

const FAQ_ITEMS = [
  {
    q: 'How are student scholarship campaigns verified before disbursement?',
    a: 'Every scholar submits institutional details, degree stage, and an itemized breakdown of tuition, laboratory, clinical, or thesis expenses. Our Academic Review Board verifies enrollment records and attaches a Registrar Verified crest while logging all decisions to an immutable audit ledger.',
  },
  {
    q: 'Which payment methods can sponsors use to fund a student?',
    a: 'ScholarFund supports four seamless payment rails: Credit & Debit Cards (Visa, Mastercard, Verve, Amex), Direct Institutional Bank Wires & Instant NIP transfers, Mobile Money wallets (OPay, PalmPay, MTN MoMo, Airtel Money, M-Pesa), and Digital Wallets (PayPal, Apple Pay, Google Pay).',
  },
  {
    q: 'Can students upload their own photo and post progress updates after launching?',
    a: 'Yes. During registration or inside the Scholar Campaign Studio, students drag-and-drop or upload their own photograph directly from their device, monitor live incoming sponsorships in real time, and post academic milestone updates straight onto their campaign page.',
  },
  {
    q: 'What is the difference between a One-Time Sponsorship and a Monthly Stipend?',
    a: 'One-time sponsorships clear immediate registrar invoices such as semester tuition or licensure exam fees, while Monthly Stipends provide recurring support across an entire academic session for research materials and clinical rotations.',
  },
  {
    q: 'Do sponsors receive official receipts and portfolio tracking?',
    a: 'Every contribution immediately generates an Official Escrow Receipt with a unique reference code (SF-TXN-XXXXXX) ready for printing or PDF export, alongside real-time discipline allocation charts inside the Sponsor Dashboard.',
  },
]

export function HeroSpotlightCard({ campaigns = [], onOpenCampaign }) {
  const featuredList = campaigns.slice(0, 3)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (featuredList.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredList.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [featuredList.length])

  const current = featuredList[activeIndex] || campaigns[0]
  if (!current) return null

  return (
    <div className="hero-spotlight-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#fde68a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ★ Featured Scholar Spotlight
        </span>

        {featuredList.length > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {featuredList.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                aria-label={`View ${item.studentName}`}
                onClick={() => setActiveIndex(idx)}
                style={{
                  width: idx === activeIndex ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: idx === activeIndex ? '#34d399' : 'rgba(255,255,255,0.28)',
                  transition: 'all 0.25s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="spotlight-img-wrap"
        onClick={() => onOpenCampaign(current.slug)}
        style={{ cursor: 'pointer' }}
      >
        <img src={current.portraitUrl} alt={current.studentName} />
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              background: 'rgba(6, 24, 19, 0.82)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              padding: '4px 11px',
              borderRadius: 999,
              fontSize: '0.73rem',
              fontWeight: 600,
            }}
          >
            {current.location}
          </span>
          <span
            style={{
              background: 'rgba(16, 185, 129, 0.92)',
              color: '#041f16',
              padding: '4px 10px',
              borderRadius: 999,
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            ✓ Verified Dossier
          </span>
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 600, marginBottom: 4 }}>
        {current.studentName} · {current.university}
      </div>
      <h3
        onClick={() => onOpenCampaign(current.slug)}
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.22rem',
          margin: '0 0 14px',
          lineHeight: 1.28,
          cursor: 'pointer',
          color: '#ffffff',
        }}
      >
        {current.title}
      </h3>

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: 'rgba(255, 255, 255, 0.16)',
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${current.percentFunded}%`,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #34d399 0%, #fde68a 100%)',
            transition: 'width 0.55s ease',
          }}
        />
      </div>

      <div
        className="tabular"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          marginTop: 14,
        }}
      >
        <div>
          <strong style={{ fontSize: '1.15rem', color: '#ffffff' }}>
            {formatUsd(current.raisedCents)}
          </strong>{' '}
          <span style={{ fontSize: '0.8rem', color: 'rgba(226,242,235,0.74)' }}>
            of {formatUsd(current.goalCents)} ({current.percentFunded}%)
          </span>
        </div>

        <button
          type="button"
          className="btn btn-gold btn-sm"
          onClick={() => onOpenCampaign(current.slug)}
        >
          Sponsor {current.studentName.split(' ')[0]} →
        </button>
      </div>
    </div>
  )
}

export function PartnerInstitutionsRibbon() {
  const doubled = [...PARTNER_INSTITUTIONS, ...PARTNER_INSTITUTIONS]
  return (
    <div className="partner-ribbon" aria-label="Participating universities">
      <div className="container" style={{ marginBottom: 8, textAlign: 'center' }}>
        <span
          style={{
            fontSize: '0.71rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            color: 'var(--ink-muted)',
          }}
        >
          Scholars Representing Leading Global Universities &amp; Research Institutions
        </span>
      </div>
      <div className="marquee-viewport">
        <div className="marquee-track">
          {doubled.map((uni, i) => (
            <span key={i} className="partner-uni-pill">
              <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>◆</span>
              <span>{uni}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TransparencyBentoSection() {
  const allocations = [
    { label: 'Direct University Tuition & Registrar Credits', pct: 62, color: '#34d399' },
    { label: 'Laboratory Bench Hours & Clinical Hospital Rotations', pct: 21, color: '#6ee7b7' },
    { label: 'Senior Thesis Hardware & Field Research Kits', pct: 11, color: '#fbbf24' },
    { label: 'Academic Licensure & Required Textbooks', pct: 6, color: '#38bdf8' },
  ]

  return (
    <section style={{ padding: '72px 0 40px' }}>
      <div className="container">
        <MotionReveal>
          <div className="section-heading-block">
            <span className="eyebrow">Institutional Escrow Architecture</span>
            <h2>Every dollar accounted for, down to the university invoice.</h2>
            <p>
              Built for complete financial clarity—eliminating opaque intermediaries so sponsors see the exact academic impact of every contribution.
            </p>
          </div>
        </MotionReveal>

        <div className="bento-grid">
          <MotionReveal>
            <div className="bento-dark-card" style={{ height: '100%' }}>
              <span
                style={{
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#6ee7b7',
                }}
              >
                Capital Allocation Standard
              </span>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.65rem',
                  margin: '8px 0 10px',
                  lineHeight: 1.2,
                }}
              >
                100% Direct Academic Escrow Model
              </h3>
              <p style={{ color: 'rgba(226, 241, 234, 0.8)', fontSize: '0.93rem', marginBottom: 26, lineHeight: 1.6 }}>
                Every campaign itemizes verified academic costs before publication. Zero compounding student debt, zero hidden deductions.
              </p>

              <div style={{ display: 'grid', gap: 16 }}>
                {allocations.map((a) => (
                  <div key={a.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: 6 }}>
                      <span style={{ color: 'rgba(241, 249, 245, 0.92)' }}>{a.label}</span>
                      <strong className="tabular" style={{ color: a.color }}>{a.pct}%</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${a.pct}%`,
                          borderRadius: 999,
                          background: a.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MotionReveal>

          <div style={{ display: 'grid', gap: 24 }}>
            <MotionReveal delay={80}>
              <div className="bento-light-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className="status-badge status-approved">Multi-Rail Settlement</span>
                  <span className="tabular" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>
                    256-Bit TLS
                  </span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.32rem', margin: '0 0 8px' }}>
                  Four Global Sponsorship Channels
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', margin: '0 0 16px' }}>
                  Seamless local and international settlement supporting instant cards, bank wires, African &amp; global mobile wallets, and PayPal.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    'Visa · Mastercard · Verve',
                    'GTBank & Access Wire',
                    'OPay · MTN MoMo · PalmPay',
                    'PayPal · Apple Pay',
                  ].map((rail) => (
                    <span
                      key={rail}
                      style={{
                        background: 'var(--bg-soft-mint)',
                        color: 'var(--accent)',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        padding: '5px 11px',
                        borderRadius: 999,
                        border: '1px solid rgba(13, 107, 77, 0.16)',
                      }}
                    >
                      {rail}
                    </span>
                  ))}
                </div>
              </div>
            </MotionReveal>

            <MotionReveal delay={140}>
              <div
                className="bento-light-card"
                style={{
                  background: 'linear-gradient(135deg, #fef9ec 0%, #ffffff 100%)',
                  borderColor: 'rgba(217, 119, 6, 0.2)',
                }}
              >
                <span className="status-badge status-pending" style={{ marginBottom: 10 }}>
                  Real-Time Accountability
                </span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.32rem', margin: '0 0 8px' }}>
                  Dedicated Dashboards for Scholars &amp; Sponsors
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.6 }}>
                  Scholars upload custom portraits, monitor funding rings, and publish exam or lab milestones—while sponsors track portfolio growth and export printable escrow certificates.
                </p>
              </div>
            </MotionReveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export function DualWorkflowSection({ onNavigate, onOpenAuth, user }) {
  const [track, setTrack] = useState('scholars')
  const steps = track === 'scholars' ? SCHOLAR_STEPS : SPONSOR_STEPS

  return (
    <section style={{ padding: '56px 0 68px', background: 'var(--grad-section-mist)' }}>
      <div className="container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 34,
          }}
        >
          <div>
            <span className="eyebrow">Seamless Platform Workflow</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.85rem, 3vw, 2.45rem)', margin: 0 }}>
              Designed for transparency at every step.
            </h2>
          </div>

          <div
            style={{
              display: 'inline-flex',
              background: '#ffffff',
              padding: 5,
              borderRadius: 999,
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              type="button"
              className={`cat-pill ${track === 'scholars' ? 'active' : ''}`}
              style={{ border: 'none' }}
              onClick={() => setTrack('scholars')}
            >
              For University Scholars
            </button>
            <button
              type="button"
              className={`cat-pill ${track === 'sponsors' ? 'active' : ''}`}
              style={{ border: 'none' }}
              onClick={() => setTrack('sponsors')}
            >
              For Global Sponsors
            </button>
          </div>
        </div>

        <div className="steps-grid-4">
          {steps.map((s, idx) => (
            <MotionReveal key={`${track}-${s.step}`} delay={idx * 60}>
              <div className="step-card" style={{ height: '100%' }}>
                <div className="step-number-badge tabular">{s.step}</div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.16rem', margin: '0 0 8px' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: '0.89rem', color: 'var(--ink-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {s.description}
                </p>
              </div>
            </MotionReveal>
          ))}
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {track === 'scholars' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (user?.role === 'student' ? onNavigate('apply') : onOpenAuth('register'))}
            >
              {user?.role === 'student' ? 'Open My Scholar Studio →' : 'Register as a Student Scholar →'}
            </button>
          ) : (
            <a
              href="#scholar-directory"
              className="btn btn-primary"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('scholar-directory')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Browse Verified Scholars →
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export function DisciplineExplorerSection({ categories = [], campaigns = [], onPickCategory }) {
  return (
    <section style={{ padding: '68px 0' }}>
      <div className="container">
        <MotionReveal>
          <div className="section-heading-block">
            <span className="eyebrow">Academic Disciplines</span>
            <h2>Invest in fields shaping resilient communities.</h2>
            <p>
              Select any discipline to filter verified university scholars working on high-impact research and clinical care.
            </p>
          </div>
        </MotionReveal>

        <div className="discipline-grid-6">
          {categories.map((cat, idx) => {
            const meta = DISCIPLINE_META[cat] || {
              accent: 'linear-gradient(135deg, #0d6e50, #10b981)',
              tagline: 'Verified undergraduate & graduate scholarship dossiers',
            }
            const matching = campaigns.filter((c) => c.category === cat)
            const raisedSum = matching.reduce((s, c) => s + c.raisedCents, 0)

            return (
              <MotionReveal key={cat} delay={idx * 45}>
                <button
                  type="button"
                  className="discipline-card"
                  style={{ width: '100%', height: '100%' }}
                  onClick={() => onPickCategory(cat)}
                >
                  <div
                    style={{
                      width: 42,
                      height: 6,
                      borderRadius: 999,
                      background: meta.accent,
                    }}
                  />
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.18rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {cat}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', lineHeight: 1.5, flex: 1 }}>
                    {meta.tagline}
                  </div>
                  <div
                    className="tabular"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                      fontSize: '0.8rem',
                      color: 'var(--accent)',
                      fontWeight: 700,
                    }}
                  >
                    <span>{matching.length} active {matching.length === 1 ? 'scholar' : 'scholars'}</span>
                    <span>{formatUsd(raisedSum)} funded →</span>
                  </div>
                </button>
              </MotionReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function EscrowComparisonSection() {
  return (
    <section style={{ padding: '68px 0', background: 'var(--grad-section-mist)' }}>
      <div className="container">
        <MotionReveal>
          <div className="section-heading-block">
            <span className="eyebrow">Why ScholarFund Stands Apart</span>
            <h2>Engineered beyond generic crowdfunding &amp; predatory loans.</h2>
            <p>
              A side-by-side comparison of institutional safeguards, fee structure, and post-disbursement accountability.
            </p>
          </div>
        </MotionReveal>

        <MotionReveal delay={80}>
          <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="data-table-wrap">
              <table className="data-table" style={{ fontSize: '0.91rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-soft-mint)' }}>
                    <th style={{ padding: '16px 22px' }}>Governance Dimension</th>
                    <th style={{ padding: '16px 22px', color: 'var(--accent)' }}>
                      ★ ScholarFund Direct Escrow
                    </th>
                    <th style={{ padding: '16px 22px' }}>Generic Crowdfunding</th>
                    <th style={{ padding: '16px 22px' }}>Private Student Loans</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature}>
                      <td style={{ padding: '15px 22px', fontWeight: 600 }}>{row.feature}</td>
                      <td style={{ padding: '15px 22px', fontWeight: 700, color: 'var(--accent)', background: 'rgba(224, 242, 235, 0.32)' }}>
                        ✓ {row.scholarfund}
                      </td>
                      <td style={{ padding: '15px 22px', color: 'var(--ink-muted)' }}>{row.crowdfunding}</td>
                      <td style={{ padding: '15px 22px', color: 'var(--ink-muted)' }}>{row.loans}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  )
}

export function StoriesTestimonialsSection() {
  return (
    <section style={{ padding: '72px 0' }}>
      <div className="container">
        <MotionReveal>
          <div className="section-heading-block">
            <span className="eyebrow">Scholar &amp; Sponsor Voices</span>
            <h2>Real academic outcomes powered by direct community backing.</h2>
            <p>
              From power-systems laboratories in Kumasi to structural engineering studios in Gothenburg.
            </p>
          </div>
        </MotionReveal>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, idx) => (
            <MotionReveal key={t.name} delay={idx * 70}>
              <div className="testimonial-card" style={{ height: '100%' }}>
                <div>
                  <span className="status-badge status-approved" style={{ marginBottom: 16 }}>
                    {t.badge}
                  </span>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.05rem',
                      lineHeight: 1.62,
                      color: 'var(--ink-primary)',
                      margin: '0 0 22px',
                    }}
                  >
                    “{t.quote}”
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <img
                    src={t.avatar}
                    alt={t.name}
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      objectPosition: 'center 35%',
                    }}
                  />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.92rem' }}>{t.name}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{t.role}</span>
                  </div>
                </div>
              </div>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FaqAccordionSection() {
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <section style={{ padding: '68px 0', background: 'var(--grad-section-mist)' }}>
      <div className="container" style={{ maxWidth: 920 }}>
        <MotionReveal>
          <div className="section-heading-block" style={{ maxWidth: '100%' }}>
            <span className="eyebrow">Frequently Asked Questions</span>
            <h2>Clarity on verification, payments &amp; academic reporting.</h2>
          </div>
        </MotionReveal>

        <div style={{ display: 'grid', gap: 12 }}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx
            return (
              <div key={item.q} className={`faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                >
                  <span>{item.q}</span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: isOpen ? 'var(--accent)' : 'var(--bg-soft-mint)',
                      color: isOpen ? '#ffffff' : 'var(--accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 22px 20px',
                      color: 'var(--ink-secondary)',
                      fontSize: '0.93rem',
                      lineHeight: 1.66,
                    }}
                  >
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function ExecutiveCtaBanner({ user, onNavigate, onOpenAuth }) {
  return (
    <section style={{ padding: '72px 0' }}>
      <div className="container">
        <MotionReveal>
          <div
            style={{
              background: 'var(--grad-hero)',
              borderRadius: 'var(--radius-xl)',
              padding: '54px 44px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 28,
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ maxWidth: 620, position: 'relative', zIndex: 1 }}>
              <span className="hero-eyebrow-dark" style={{ marginBottom: 14 }}>
                Start Making Measurable Impact
              </span>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)',
                  margin: '0 0 12px',
                  lineHeight: 1.15,
                }}
              >
                Ready to launch a scholar campaign or back a future graduate?
              </h2>
              <p style={{ margin: 0, color: 'rgba(226, 241, 234, 0.85)', fontSize: '1rem', lineHeight: 1.6 }}>
                Join verified university students and global sponsors building debt-free academic pathways with complete line-item transparency.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => (user ? onNavigate(user.role === 'student' ? 'apply' : 'explore') : onOpenAuth('register'))}
              >
                {user ? 'Open My Workspace →' : 'Create Scholar or Sponsor Account →'}
              </button>
              <button
                type="button"
                className="btn btn-glass-light"
                onClick={() => onNavigate('about')}
              >
                Explore Security Architecture
              </button>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  )
}
