import React from 'react'
import { MotionReveal } from './MotionPrimitives.jsx'

export default function AboutSecurity({ onOpenAuth, onNavigate }) {
  return (
    <div className="container section-page page-transition">
      <div style={{ maxWidth: 880 }}>
        <MotionReveal>
          <span className="eyebrow">Institutional Governance &amp; System Architecture</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.35rem', margin: '0 0 14px', lineHeight: 1.15 }}>
            Transparent academic sponsorship &amp; full-stack security architecture
          </h1>
          <p style={{ fontSize: '1.04rem', color: 'var(--ink-secondary)', marginBottom: 32, lineHeight: 1.66 }}>
            ScholarFund connects high-potential university scholars directly with educational sponsors through verified tuition itemization, multi-channel escrow disbursements, and real-time progress reporting backed by a normalized SQLite relational engine.
          </p>
        </MotionReveal>

        <div style={{ display: 'grid', gap: 22 }}>
          <MotionReveal delay={60}>
            <section className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.32rem', margin: '0 0 14px' }}>
                1. End-to-end stakeholder workflows
              </h2>
              <div style={{ display: 'grid', gap: 12, color: 'var(--ink-secondary)', fontSize: '0.94rem' }}>
                <div>
                  <strong style={{ color: 'var(--ink-primary)' }}>University Scholars:</strong> Upload personal campaign photography, itemize university tuition and laboratory costs, publish academic milestones, and monitor real-time funding velocity and incoming sponsor messages in a dedicated Scholar Dashboard.
                </div>
                <div>
                  <strong style={{ color: 'var(--ink-primary)' }}>Educational Sponsors:</strong> Evaluate verified scholar budgets across STEM, healthcare, agriculture, architecture, and education; fund one-time or recurring stipends across four payment rails (Card, Bank Wire, Mobile Money, Digital Wallet); and download official escrow certificates in a personal Sponsor Portfolio Dashboard.
                </div>
                <div>
                  <strong style={{ color: 'var(--ink-primary)' }}>Academic Review Board:</strong> Audit pending student dossiers, grant registrar verification crests, manage spotlight visibility, analyze settlement channel volume, and inspect the immutable server audit log.
                </div>
              </div>
            </section>
          </MotionReveal>

          <MotionReveal delay={120}>
            <section className="surface-card">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.32rem', margin: '0 0 14px' }}>
                2. Relational SQLite persistence &amp; defense-in-depth engineering
              </h2>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10, color: 'var(--ink-secondary)', fontSize: '0.93rem' }}>
                <li>
                  <strong style={{ color: 'var(--ink-primary)' }}>ACID WAL SQLite Engine:</strong> Zero-configuration embedded persistence using <code>better-sqlite3</code> in Write-Ahead Logging (WAL) mode with strict foreign-key integrity across <code>users</code>, <code>sessions</code>, <code>applications</code>, <code>campaigns</code>, <code>donations</code>, and <code>audit_logs</code>.
                </li>
                <li>
                  <strong style={{ color: 'var(--ink-primary)' }}>Authoritative RBAC &amp; Ownership Policies:</strong> Express enforces centralized deny-by-default authorization rules (<code>server/policies.cjs</code>) verifying role permissions and strict record ownership on every request.
                </li>
                <li>
                  <strong style={{ color: 'var(--ink-primary)' }}>Cryptographic Authentication &amp; CSRF Protection:</strong> Passwords hash with <code>bcryptjs</code>; sessions persist in SQLite with HTTP-only cookies; mutating endpoints verify session-bound <code>X-CSRF-Token</code> headers alongside <code>express-rate-limit</code> and <code>zod</code> schema validation.
                </li>
                <li>
                  <strong style={{ color: 'var(--ink-primary)' }}>Binary Magic-Byte Image Verification:</strong> Uploaded scholar photographs undergo client-side canvas optimization followed by server-side binary header inspection (<code>JPEG/PNG/WebP</code> signatures) before storage.
                </li>
              </ul>
            </section>
          </MotionReveal>

          <MotionReveal delay={180}>
            <section className="surface-card" style={{ background: 'linear-gradient(135deg, #faf5eb 0%, #ffffff 100%)' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.28rem', margin: '0 0 8px' }}>
                Join ScholarFund as a Scholar or Sponsor
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: '0.93rem', color: 'var(--ink-secondary)' }}>
                Register a Student Scholar account to upload your photo and publish a campaign, or explore active university scholars ready for sponsorship today.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-primary" onClick={() => onOpenAuth('register')}>
                  Create Account
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => onNavigate('explore')}>
                  Explore Verified Scholars
                </button>
              </div>
            </section>
          </MotionReveal>
        </div>
      </div>
    </div>
  )
}
