import React from 'react'

export default function Navbar({
  currentView,
  onNavigate,
  user,
  pendingCount,
  onOpenAuth,
  onLogout,
}) {
  function getInitials(name = '') {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('')
  }

  function roleDisplayLabel(role) {
    if (role === 'donor') return 'sponsor'
    return role
  }

  function dashboardRouteForUser() {
    if (!user) return 'explore'
    if (user.role === 'admin') return 'admin'
    if (user.role === 'student') return 'apply'
    return 'donor'
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <button
          type="button"
          className="brand-btn"
          onClick={() => onNavigate('explore')}
        >
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
            </svg>
          </span>
          <span>
            <span className="brand-wordmark">ScholarFund</span>
            <span className="brand-sub">Education, within reach</span>
          </span>
        </button>

        <nav className="nav-links" aria-label="Primary navigation">
          <button
            type="button"
            className={`nav-btn ${currentView === 'explore' || currentView === 'campaign' ? 'active' : ''}`}
            onClick={() => onNavigate('explore')}
          >
            Explore Scholars
          </button>

          {(!user || user.role === 'student') && (
            <button
              type="button"
              className={`nav-btn ${currentView === 'apply' ? 'active' : ''}`}
              onClick={() => onNavigate('apply')}
            >
              {user?.role === 'student' ? 'Scholar Dashboard' : 'Launch Campaign'}
            </button>
          )}

          {user && user.role === 'donor' && (
            <button
              type="button"
              className={`nav-btn ${currentView === 'donor' ? 'active' : ''}`}
              onClick={() => onNavigate('donor')}
            >
              Sponsor Dashboard
            </button>
          )}

          {user?.role === 'student' && (
            <button
              type="button"
              className={`nav-btn ${currentView === 'donor' ? 'active' : ''}`}
              onClick={() => onNavigate('donor')}
            >
              My Contributions
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              type="button"
              className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => onNavigate('admin')}
            >
              Review Console
              {pendingCount > 0 && <span className="pill-count">{pendingCount}</span>}
            </button>
          )}

          <button
            type="button"
            className={`nav-btn ${currentView === 'about' ? 'active' : ''}`}
            onClick={() => onNavigate('about')}
          >
            Governance
          </button>
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <button
                type="button"
                className="user-chip"
                onClick={() => onNavigate(dashboardRouteForUser())}
                title="Open your dashboard"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="user-chip-avatar"
                  />
                ) : (
                  <span className="user-chip-avatar">{getInitials(user.name)}</span>
                )}
                <span style={{ fontWeight: 600 }}>{user.name}</span>
                <span className="role-tag">{roleDisplayLabel(user.role)}</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenAuth('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenAuth('register')}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
