import React, { useState } from 'react'
import { api } from '../api.js'

export default function AuthModal({ initialMode = 'login', onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [institution, setInstitution] = useState('')
  const [role, setRole] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ name, email, password, role, institution })
      onAuthenticated(result.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function instantProfileSignIn(profileEmail, profilePassword) {
    setError('')
    setLoading(true)
    try {
      const result = await api.login({ email: profileEmail, password: profilePassword })
      onAuthenticated(result.user)
    } catch (err) {
      setEmail(profileEmail)
      setPassword(profilePassword)
      setMode('login')
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 id="auth-modal-title" style={{ fontFamily: 'var(--font-serif)', margin: 0, fontSize: '1.48rem' }}>
            {mode === 'login' ? 'Sign in to ScholarFund' : 'Create your account'}
          </h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button
            type="button"
            className={`cat-pill ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`cat-pill ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            Register Account
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <span className="field-label">Select account type</span>
                <div className="form-row-2">
                  <label
                    style={{
                      border: `1.5px solid ${role === 'student' ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: role === 'student' ? 'var(--accent-soft)' : 'var(--bg-page)',
                      borderRadius: 12,
                      padding: '11px 12px',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="student"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                      style={{ marginRight: 7 }}
                    />
                    <strong>Student Scholar</strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-secondary)', marginTop: 3 }}>
                      Upload photo, launch campaign &amp; track funding
                    </div>
                  </label>

                  <label
                    style={{
                      border: `1.5px solid ${role === 'donor' ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: role === 'donor' ? 'var(--accent-soft)' : 'var(--bg-page)',
                      borderRadius: 12,
                      padding: '11px 12px',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="donor"
                      checked={role === 'donor'}
                      onChange={() => setRole('donor')}
                      style={{ marginRight: 7 }}
                    />
                    <strong>Sponsor</strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-secondary)', marginTop: 3 }}>
                      Fund scholars, manage receipts &amp; portfolio
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  className="field-input"
                  type="text"
                  required
                  placeholder={role === 'student' ? 'e.g., Chidinma Okafor' : 'e.g., Dr. Tunde Adeyemi'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label" htmlFor="auth-inst">
                  {role === 'student' ? 'University / Institution' : 'Organization / Fellowship (optional)'}
                </label>
                <input
                  id="auth-inst"
                  className="field-input"
                  type="text"
                  placeholder={
                    role === 'student'
                      ? 'e.g., University of Port Harcourt'
                      : 'e.g., West Africa STEM Foundation'
                  }
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="field-label" htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              className="field-input"
              type="email"
              required
              autoComplete="username"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="field-input"
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={loading}
          >
            {loading
              ? 'Authenticating...'
              : mode === 'login'
              ? 'Sign in'
              : `Create ${role === 'donor' ? 'Sponsor' : 'Scholar'} Account`}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Quick Institutional Access
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={loading}
              onClick={() => instantProfileSignIn('amara.mensah@scholarfund.org', 'Scholar!2026')}
            >
              Scholar · Amara Mensah
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={loading}
              onClick={() => instantProfileSignIn('marcus.vance@scholarfund.org', 'Sponsor!2026')}
            >
              Sponsor · Marcus Vance
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={loading}
              onClick={() => instantProfileSignIn('admin@scholarfund.org', 'ScholarFund!2026')}
            >
              Review Board · Dr. Rostova
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
