import React, { useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { formatUsd } from './format.js'
import Navbar from './components/Navbar.jsx'
import AuthModal from './components/AuthModal.jsx'
import CampaignDetail from './components/CampaignDetail.jsx'
import StudentPortal from './components/StudentPortal.jsx'
import DonorDashboard from './components/DonorDashboard.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import AboutSecurity from './components/AboutSecurity.jsx'
import { AnimatedNumber, MotionReveal } from './components/MotionPrimitives.jsx'
import {
  DisciplineExplorerSection,
  DualWorkflowSection,
  EscrowComparisonSection,
  ExecutiveCtaBanner,
  FaqAccordionSection,
  HeroSpotlightCard,
  PartnerInstitutionsRibbon,
  StoriesTestimonialsSection,
  TransparencyBentoSection,
} from './components/LandingSections.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([
    'Engineering & Technology',
    'Health & Nursing',
    'Computer Science',
    'Agriculture & Climate',
    'Architecture & Design',
    'Education & Teaching',
  ])
  const [portraits, setPortraits] = useState([
    '/images/amara-mensah.jpg',
    '/images/david-okonkwo.jpg',
    '/images/mateo-delgado.jpg',
    '/images/linh-nguyen.jpg',
    '/images/hannah-lindqvist.jpg',
    '/images/tariq-al-mansoor.jpg',
  ])

  const [currentView, setCurrentView] = useState('explore')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [authModalMode, setAuthModalMode] = useState(null)

  const [allCampaignsSnapshot, setAllCampaignsSnapshot] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [stats, setStats] = useState({
    totalRaisedCents: 0,
    totalSupporters: 0,
    totalCampaigns: 0,
    fundedCampaigns: 0,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState('public')
  const [sortBy, setSortBy] = useState('featured')
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  async function refreshSession() {
    try {
      const sess = await api.getSession()
      setUser(sess.user || null)
      if (sess.categories?.length) setCategories(sess.categories)
      if (sess.portraits?.length) setPortraits(sess.portraits)
      if (sess.user?.role === 'admin') {
        const overview = await api.adminOverview().catch(() => null)
        if (overview) {
          setPendingCount(overview.applications.filter((a) => a.status === 'pending').length)
        }
      } else {
        setPendingCount(0)
      }
    } catch {
      // Automatic retry on next interaction
    }
  }

  async function loadCampaigns() {
    setLoadingCampaigns(true)
    try {
      const data = await api.listCampaigns({
        q: searchQuery,
        category: activeCategory,
        status: statusFilter,
      })
      const fetched = data.campaigns || []
      setCampaigns(fetched)
      if (!searchQuery && activeCategory === 'All' && statusFilter === 'public') {
        setAllCampaignsSnapshot(fetched)
      }
      setRecentActivity(data.recentActivity || [])
      if (data.stats) setStats(data.stats)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    refreshSession()
    api.listCampaigns({}).then((d) => {
      if (d.campaigns) setAllCampaignsSnapshot(d.campaigns)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCampaigns()
    }, 100)
    return () => clearTimeout(timer)
  }, [searchQuery, activeCategory, statusFilter])

  const sortedCampaigns = useMemo(() => {
    const copy = [...campaigns]
    if (sortBy === 'closest') {
      copy.sort((a, b) => {
        if (a.status === 'funded' && b.status !== 'funded') return 1
        if (b.status === 'funded' && a.status !== 'funded') return -1
        return b.percentFunded - a.percentFunded
      })
    } else if (sortBy === 'highest') {
      copy.sort((a, b) => b.raisedCents - a.raisedCents)
    } else if (sortBy === 'newest') {
      copy.sort((a, b) => b.id - a.id)
    }
    return copy
  }, [campaigns, sortBy])

  function handleNavigate(view) {
    setCurrentView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCampaign(slug) {
    setSelectedSlug(slug)
    setCurrentView('campaign')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePickDiscipline(cat) {
    setActiveCategory(cat)
    document.getElementById('scholar-directory')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleAuthenticated(loggedInUser) {
    setUser(loggedInUser)
    setAuthModalMode(null)
    if (loggedInUser.role === 'admin') {
      const overview = await api.adminOverview().catch(() => null)
      if (overview) {
        setPendingCount(overview.applications.filter((a) => a.status === 'pending').length)
      }
      setCurrentView('admin')
    } else if (loggedInUser.role === 'student') {
      setCurrentView('apply')
    } else {
      setCurrentView('donor')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleLogout() {
    await api.logout()
    setUser(null)
    setPendingCount(0)
    if (['admin', 'donor'].includes(currentView)) {
      setCurrentView('explore')
    }
  }

  const spotlightPool = allCampaignsSnapshot.length > 0 ? allCampaignsSnapshot : campaigns

  return (
    <div>
      {/* Institutional Trust Strip */}
      <div className="top-trust-bar">
        <div className="top-trust-inner">
          <div className="live-indicator">
            <span className="live-dot" aria-hidden="true" />
            <span>Direct University Tuition Escrow · 100% Verified Academic Disbursement</span>
          </div>
          <div style={{ opacity: 0.9 }}>
            Card · Institutional Wire · Mobile Money · Digital Wallets Accepted
          </div>
        </div>
      </div>

      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        user={user}
        pendingCount={pendingCount}
        onOpenAuth={(mode) => setAuthModalMode(mode)}
        onLogout={handleLogout}
      />

      <main>
        {currentView === 'explore' && (
          <div className="page-transition">
            {/* 1. Flagship Executive Aurora Hero */}
            <section className="hero-aurora">
              <div className="hero-aurora-mesh" aria-hidden="true" />
              <div className="hero-orb-emerald" aria-hidden="true" />
              <div className="hero-orb-gold" aria-hidden="true" />

              <div className="container">
                <div className="hero-aurora-grid">
                  <MotionReveal>
                    <span className="hero-eyebrow-dark">
                      <span>●</span> Direct University Scholarship Network
                    </span>
                    <h1>
                      Where academic brilliance meets{' '}
                      <span className="text-gradient-gold">direct global sponsorship.</span>
                    </h1>
                    <p className="hero-aurora-lead">
                      ScholarFund connects verified university scholars facing final-mile tuition, laboratory bench fees, and clinical practicum balances with sponsors who invest directly in human potential—with zero student debt.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                      <a
                        href="#scholar-directory"
                        className="btn btn-gold"
                        onClick={(e) => {
                          e.preventDefault()
                          document
                            .getElementById('scholar-directory')
                            ?.scrollIntoView({ behavior: 'smooth' })
                        }}
                      >
                        Sponsor a Verified Scholar →
                      </a>
                      <button
                        type="button"
                        className="btn btn-glass-light"
                        onClick={() =>
                          user?.role === 'student'
                            ? handleNavigate('apply')
                            : setAuthModalMode('register')
                        }
                      >
                        {user?.role === 'student' ? 'Open My Scholar Dashboard' : 'Launch a Student Campaign'}
                      </button>
                    </div>

                    <div className="hero-trust-micro">
                      <span className="hero-trust-item">
                        <strong style={{ color: '#6ee7b7' }}>✓</strong> 100% Line-Item Tuition Clarity
                      </span>
                      <span className="hero-trust-item">
                        <strong style={{ color: '#6ee7b7' }}>✓</strong> 4 Global Settlement Channels
                      </span>
                      <span className="hero-trust-item">
                        <strong style={{ color: '#6ee7b7' }}>✓</strong> Instant Official Escrow Receipts
                      </span>
                    </div>
                  </MotionReveal>

                  <MotionReveal delay={120}>
                    <HeroSpotlightCard
                      campaigns={spotlightPool}
                      onOpenCampaign={openCampaign}
                    />
                  </MotionReveal>
                </div>

                {/* Animated Impact Counters Strip */}
                <MotionReveal delay={180}>
                  <div className="hero-metrics-strip" aria-label="Platform impact metrics">
                    <div className="hero-metric-cell">
                      <div className="hero-metric-val">
                        <AnimatedNumber
                          value={stats.totalRaisedCents}
                          formatter={(v) => formatUsd(v)}
                        />
                      </div>
                      <div className="hero-metric-lbl">Total scholarships disbursed</div>
                    </div>
                    <div className="hero-metric-cell">
                      <div className="hero-metric-val">
                        <AnimatedNumber value={stats.totalSupporters} />
                      </div>
                      <div className="hero-metric-lbl">Verified sponsorships completed</div>
                    </div>
                    <div className="hero-metric-cell">
                      <div className="hero-metric-val">
                        <AnimatedNumber value={stats.totalCampaigns} />
                      </div>
                      <div className="hero-metric-lbl">Active &amp; funded university scholars</div>
                    </div>
                    <div className="hero-metric-cell">
                      <div className="hero-metric-val tabular">0% APR</div>
                      <div className="hero-metric-lbl">Pure debt-free academic grants</div>
                    </div>
                  </div>
                </MotionReveal>
              </div>
            </section>

            {/* 2. Participating Universities Ribbon */}
            <PartnerInstitutionsRibbon />

            {/* 3. Main Verified Scholar Directory Section */}
            <section id="scholar-directory" style={{ padding: '64px 0 36px' }}>
              <div className="container">
                <MotionReveal>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      flexWrap: 'wrap',
                      gap: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <span className="eyebrow">Verified Scholar Directory</span>
                      <h2
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 'clamp(1.85rem, 3vw, 2.45rem)',
                          margin: '0 0 6px',
                        }}
                      >
                        Back a scholar’s final academic milestone.
                      </h2>
                      <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.98rem' }}>
                        Inspect itemized university budgets, read personal research statements, and fund directly via Card, Bank Wire, Mobile Money, or Digital Wallet.
                      </p>
                    </div>
                  </div>
                </MotionReveal>

                {/* Live Sponsorship Stream */}
                {recentActivity.length > 0 && (
                  <MotionReveal delay={70}>
                    <div className="activity-ticker-wrap" aria-label="Recent sponsorships">
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--accent)',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span className="live-dot" style={{ width: 6, height: 6 }} /> Live Stream
                      </span>
                      {recentActivity.map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          className="ticker-chip"
                          onClick={() => openCampaign(act.campaignSlug)}
                        >
                          <strong style={{ color: 'var(--ink-primary)' }}>{act.donorName}</strong>
                          <span>sponsored</span>
                          <strong className="tabular" style={{ color: 'var(--accent)' }}>
                            {formatUsd(act.amountCents)}
                          </strong>
                          <span>to {act.studentName}</span>
                        </button>
                      ))}
                    </div>
                  </MotionReveal>
                )}

                {/* Search, Sort & Discipline Filter Bar */}
                <MotionReveal delay={100}>
                  <div className="filter-shell">
                    <div className="filter-top">
                      <div className="search-box">
                        <svg
                          className="search-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="search"
                          className="search-input"
                          aria-label="Search student campaigns"
                          placeholder="Search by scholar name, university, country, or research topic..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                          aria-label="Filter campaign status"
                          className="field-select"
                          style={{ width: 'auto', padding: '9px 13px' }}
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="public">All active &amp; funded</option>
                          <option value="active">Open for sponsorship</option>
                          <option value="funded">100% Funded</option>
                        </select>

                        <select
                          aria-label="Sort campaigns"
                          className="field-select"
                          style={{ width: 'auto', padding: '9px 13px' }}
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                        >
                          <option value="featured">Sort: Featured Spotlights</option>
                          <option value="closest">Sort: Closest to Goal</option>
                          <option value="highest">Sort: Most Funded</option>
                          <option value="newest">Sort: Recently Published</option>
                        </select>
                      </div>
                    </div>

                    <div className="category-pills" role="group" aria-label="Filter by academic discipline">
                      {['All', ...categories].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                          onClick={() => setActiveCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </MotionReveal>

                {loadingCampaigns ? (
                  <p style={{ padding: '32px 0', color: 'var(--ink-muted)' }}>
                    Loading verified scholar campaigns...
                  </p>
                ) : sortedCampaigns.length === 0 ? (
                  <div
                    className="surface-card"
                    style={{ textAlign: 'center', marginBottom: 32, padding: 44 }}
                  >
                    <h2 style={{ fontFamily: 'var(--font-serif)', margin: '0 0 8px' }}>
                      No matching scholar campaigns found
                    </h2>
                    <p style={{ color: 'var(--ink-secondary)', margin: '0 0 18px' }}>
                      Clear your search query or discipline filter to browse all verified university scholars.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearchQuery('')
                        setActiveCategory('All')
                        setStatusFilter('public')
                      }}
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="campaign-grid">
                    {sortedCampaigns.map((c, idx) => {
                      const remaining = Math.max(0, c.goalCents - c.raisedCents)
                      return (
                        <MotionReveal key={c.id} delay={Math.min(idx * 55, 280)}>
                          <article
                            className="campaign-card"
                            style={{ height: '100%' }}
                            onClick={() => openCampaign(c.slug)}
                          >
                            <div className="card-media">
                              <img
                                src={c.portraitUrl}
                                alt={c.studentName}
                                loading="lazy"
                              />
                              <div className="card-badges">
                                <span className="badge-glass">{c.category}</span>
                                {c.status === 'funded' ? (
                                  <span className="badge-glass badge-funded">★ 100% Funded</span>
                                ) : c.verified ? (
                                  <span className="badge-glass" style={{ color: 'var(--accent)' }}>
                                    ✓ Verified
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="card-body">
                              <div className="card-student">
                                <span>{c.studentName}</span>
                                <span>·</span>
                                <span>{c.location}</span>
                              </div>
                              <h3 className="card-title">{c.title}</h3>
                              <p className="card-uni">
                                {c.program} — {c.university}
                              </p>
                              <p className="card-summary">{c.summary}</p>

                              <div>
                                <div className="progress-track">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${c.percentFunded}%` }}
                                  />
                                </div>
                                <div className="progress-meta tabular">
                                  <span className="progress-raised">
                                    <strong>{formatUsd(c.raisedCents)}</strong>{' '}
                                    <span style={{ color: 'var(--ink-muted)' }}>
                                      of {formatUsd(c.goalCents)}
                                    </span>
                                  </span>
                                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.82rem' }}>
                                    {c.percentFunded}%
                                  </span>
                                </div>

                                <div
                                  style={{
                                    marginTop: 14,
                                    paddingTop: 12,
                                    borderTop: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.81rem',
                                  }}
                                >
                                  <span style={{ color: 'var(--ink-muted)' }}>
                                    {remaining > 0
                                      ? `${formatUsd(remaining)} to goal · ${c.supporterCount} sponsors`
                                      : `Completed by ${c.supporterCount} sponsors`}
                                  </span>
                                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                    {remaining > 0 ? 'Sponsor →' : 'Read Story →'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </article>
                        </MotionReveal>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 4. Capital Transparency & Payment Architecture Bento */}
            <TransparencyBentoSection />

            {/* 5. Dual-Track How It Works Section */}
            <DualWorkflowSection
              user={user}
              onNavigate={handleNavigate}
              onOpenAuth={(mode) => setAuthModalMode(mode)}
            />

            {/* 6. Academic Discipline Explorer */}
            <DisciplineExplorerSection
              categories={categories}
              campaigns={spotlightPool}
              onPickCategory={handlePickDiscipline}
            />

            {/* 7. Institutional Escrow Comparison Table */}
            <EscrowComparisonSection />

            {/* 8. Scholar & Sponsor Voices */}
            <StoriesTestimonialsSection />

            {/* 9. Interactive FAQ Accordion */}
            <FaqAccordionSection />

            {/* 10. Executive Gradient CTA Banner */}
            <ExecutiveCtaBanner
              user={user}
              onNavigate={handleNavigate}
              onOpenAuth={(mode) => setAuthModalMode(mode)}
            />
          </div>
        )}

        {currentView === 'campaign' && selectedSlug && (
          <CampaignDetail
            slug={selectedSlug}
            user={user}
            onBack={() => handleNavigate('explore')}
            onCampaignMutated={loadCampaigns}
          />
        )}

        {currentView === 'apply' && (
          <StudentPortal
            user={user}
            categories={categories}
            portraits={portraits}
            onOpenAuth={(mode) => setAuthModalMode(mode)}
            onSelectCampaign={openCampaign}
            onUserUpdated={(updatedUser) => setUser(updatedUser)}
            onCampaignCreated={loadCampaigns}
          />
        )}

        {currentView === 'donor' && user && (
          <DonorDashboard
            user={user}
            onSelectCampaign={openCampaign}
            onNavigate={handleNavigate}
            onUserUpdated={(updatedUser) => setUser(updatedUser)}
          />
        )}

        {currentView === 'admin' && user?.role === 'admin' && (
          <AdminDashboard
            onSelectCampaign={openCampaign}
            onDataChanged={(overview) => {
              setPendingCount(overview.applications.filter((a) => a.status === 'pending').length)
              loadCampaigns()
            }}
          />
        )}

        {currentView === 'about' && (
          <AboutSecurity
            onOpenAuth={(mode) => setAuthModalMode(mode)}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Rich Multi-Column Institutional Footer */}
      <footer className="executive-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span className="brand-mark" style={{ width: 34, height: 34 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
                  </svg>
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>
                  ScholarFund
                </span>
              </div>
              <p style={{ margin: '0 0 16px', lineHeight: 1.64, maxWidth: 340, color: 'rgba(226, 241, 234, 0.75)' }}>
                Direct academic micro-sponsorship and registrar-verified tuition escrow connecting determined university scholars with global supporters.
              </p>
              <div style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 600 }}>
                ✓ 256-Bit Encrypted · SQLite WAL ACID Ledger
              </div>
            </div>

            <div>
              <h4 className="footer-col-title">Platform</h4>
              <button type="button" className="footer-link-btn" onClick={() => handleNavigate('explore')}>
                Explore Verified Scholars
              </button>
              <button type="button" className="footer-link-btn" onClick={() => handleNavigate('apply')}>
                Scholar Campaign Studio
              </button>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => (user ? handleNavigate('donor') : setAuthModalMode('login'))}
              >
                Sponsor Portfolio Dashboard
              </button>
              <button type="button" className="footer-link-btn" onClick={() => handleNavigate('about')}>
                Governance &amp; Security Architecture
              </button>
            </div>

            <div>
              <h4 className="footer-col-title">Academic Fields</h4>
              {categories.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="footer-link-btn"
                  onClick={() => {
                    setCurrentView('explore')
                    setActiveCategory(c)
                    setTimeout(() => {
                      document.getElementById('scholar-directory')?.scrollIntoView({ behavior: 'smooth' })
                    }, 80)
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div>
              <h4 className="footer-col-title">Accepted Settlement Rails</h4>
              <div style={{ display: 'grid', gap: 8, fontSize: '0.84rem', color: 'rgba(226, 241, 234, 0.78)' }}>
                <div>• Visa, Mastercard &amp; Verve Cards</div>
                <div>• Direct Institutional Bank Wire</div>
                <div>• OPay, PalmPay, MTN MoMo &amp; M-Pesa</div>
                <div>• PayPal, Apple Pay &amp; Google Pay</div>
              </div>
            </div>
          </div>

          <div
            style={{
              paddingTop: 26,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '0.8rem',
              color: 'rgba(226, 241, 234, 0.6)',
            }}
          >
            <span>© {new Date().getFullYear()} ScholarFund Institutional Scholarship Network. All rights reserved.</span>
            <span>100% Direct University Tuition &amp; Research Escrow</span>
          </div>
        </div>
      </footer>

      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  )
}
