import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { formatUsd } from '../format.js'

const PRESET_AMOUNTS = [25, 50, 100, 250, 500]

function formatCardDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function detectCardBrand(formatted) {
  const clean = formatted.replace(/\s+/g, '')
  if (clean.startsWith('4')) return 'Visa'
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard'
  if (clean.startsWith('506') || clean.startsWith('650')) return 'Verve'
  if (clean.startsWith('34') || clean.startsWith('37')) return 'Amex'
  return 'Card'
}

export default function PaymentCheckout({ campaign, user, onSuccess }) {
  const [frequency, setFrequency] = useState('one_time')
  const [amountUsd, setAmountUsd] = useState(100)
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Card fields
  const [cardNumber, setCardNumber] = useState('4532 8910 7421 4821')
  const [cardHolder, setCardHolder] = useState(user?.name || '')
  const [cardExpiry, setCardExpiry] = useState('09/29')
  const [cardCvv, setCardCvv] = useState('842')

  // Bank transfer fields
  const [selectedBank, setSelectedBank] = useState('GTBank Instant Wire')
  const [copiedEscrow, setCopiedEscrow] = useState(false)

  // Mobile money fields
  const [mobileProvider, setMobileProvider] = useState('OPay Mobile Wallet')
  const [mobilePhone, setMobilePhone] = useState('+234 803 551 9204')

  // Digital wallet fields
  const [walletProvider, setWalletProvider] = useState('PayPal')
  const [walletEmail, setWalletEmail] = useState(user?.email || 'sponsor@fellowship.org')

  // Sponsor attribution
  const [donorName, setDonorName] = useState(user?.name || '')
  const [donorEmail, setDonorEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    if (user) {
      if (!donorName) setDonorName(user.name)
      if (!cardHolder) setCardHolder(user.name)
      if (!donorEmail) setDonorEmail(user.email)
      if (!walletEmail || walletEmail === 'sponsor@fellowship.org') setWalletEmail(user.email)
    }
  }, [user])

  function buildPaymentLabel() {
    if (paymentMethod === 'card') {
      const clean = cardNumber.replace(/\s+/g, '')
      const last4 = clean.slice(-4) || '4242'
      return `${detectCardBrand(cardNumber)} •••• ${last4}`
    }
    if (paymentMethod === 'bank_transfer') {
      return selectedBank
    }
    if (paymentMethod === 'mobile_money') {
      return mobileProvider
    }
    return `${walletProvider} Verified`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const numericAmount = Number(amountUsd)
    if (!numericAmount || numericAmount < 5) {
      setError('Minimum sponsorship amount is $5 USD.')
      return
    }

    if (paymentMethod === 'card') {
      const digits = cardNumber.replace(/\s+/g, '')
      if (digits.length < 13) {
        setError('Please enter a valid 16-digit card number.')
        return
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setError('Enter card expiry date as MM/YY.')
        return
      }
      if (cardCvv.replace(/\D/g, '').length < 3) {
        setError('Enter a valid 3-digit security code.')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await api.donate(campaign.slug, {
        amountUsd: numericAmount,
        frequency,
        paymentMethod,
        paymentLabel: buildPaymentLabel(),
        donorName: (donorName || cardHolder || 'Academic Sponsor').trim(),
        donorEmail: donorEmail.trim(),
        isAnonymous,
        message: message.trim(),
      })
      setReceipt(res.receipt)
      setMessage('')
      if (onSuccess) onSuccess(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const remainingCents = Math.max(0, campaign.goalCents - campaign.raisedCents)
  const cardBrand = detectCardBrand(cardNumber)

  return (
    <aside className="surface-card sticky-box">
      <div className="progress-meta tabular" style={{ marginBottom: 8 }}>
        <span className="progress-raised">
          <strong style={{ fontSize: '1.55rem', fontFamily: 'var(--font-serif)' }}>
            {formatUsd(campaign.raisedCents)}
          </strong>{' '}
          <span style={{ color: 'var(--ink-muted)' }}>raised of {formatUsd(campaign.goalCents)}</span>
        </span>
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{campaign.percentFunded}%</span>
      </div>

      <div className="progress-track" style={{ height: 10 }}>
        <div className="progress-fill" style={{ width: `${campaign.percentFunded}%` }} />
      </div>

      <div
        className="tabular"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.81rem',
          color: 'var(--ink-muted)',
          marginBottom: 18,
        }}
      >
        <span>{campaign.supporterCount} verified sponsors</span>
        <span>
          {remainingCents > 0 ? `${formatUsd(remainingCents)} remaining` : '100% Goal Achieved'}
        </span>
      </div>

      {/* Official Confirmed Receipt View */}
      {receipt ? (
        <div
          style={{
            background: 'linear-gradient(180deg, #eef6f1 0%, #ffffff 100%)',
            border: '1.5px solid rgba(24, 81, 52, 0.3)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline
                  points="20 6 9 17 4 12"
                  style={{
                    strokeDasharray: 48,
                    animation: 'drawCheck 0.55s ease forwards',
                  }}
                />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.98rem' }}>
                Sponsorship Confirmed
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                Escrow Disbursal Reference <code>{receipt.referenceCode}</code>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: '0.83rem',
              display: 'grid',
              gap: 7,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Contribution Amount</span>
              <strong className="tabular" style={{ color: 'var(--ink-primary)' }}>
                {formatUsd(receipt.amountCents, { decimals: true })} USD
                {receipt.frequency === 'monthly' ? ' / month' : ''}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Payment Method</span>
              <strong>{receipt.paymentLabel}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Recipient Scholar</span>
              <strong>{receipt.studentName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-muted)' }}>Institution</span>
              <span style={{ textAlign: 'right', maxWidth: 190 }}>{receipt.university}</span>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => window.print()}
            >
              Print Official Receipt
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => setReceipt(null)}
            >
              Make Another Gift
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Frequency Toggle */}
          <div className="schedule-toggle" role="group" aria-label="Sponsorship frequency">
            <button
              type="button"
              className={`schedule-btn ${frequency === 'one_time' ? 'active' : ''}`}
              onClick={() => setFrequency('one_time')}
            >
              One-Time Sponsorship
            </button>
            <button
              type="button"
              className={`schedule-btn ${frequency === 'monthly' ? 'active' : ''}`}
              onClick={() => setFrequency('monthly')}
            >
              Monthly Stipend
            </button>
          </div>

          {/* Preset Amounts */}
          <span className="field-label">Select sponsorship amount (USD)</span>
          <div className="preset-grid">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`preset-btn tabular ${Number(amountUsd) === amt ? 'active' : ''}`}
                onClick={() => setAmountUsd(amt)}
              >
                ${amt}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="custom-sponsorship-usd">
              Custom USD amount
            </label>
            <input
              id="custom-sponsorship-usd"
              className="field-input tabular"
              type="number"
              min={5}
              max={25000}
              step="1"
              required
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
            />
          </div>

          {/* Payment Method Selector */}
          <span className="field-label">Payment method</span>
          <div className="method-tabs" role="tablist">
            <button
              type="button"
              className={`method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span>Card</span>
            </button>

            <button
              type="button"
              className={`method-tab ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('bank_transfer')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="22" x2="21" y2="22" />
                <line x1="6" y1="18" x2="6" y2="11" />
                <line x1="10" y1="18" x2="10" y2="11" />
                <line x1="14" y1="18" x2="14" y2="11" />
                <line x1="18" y1="18" x2="18" y2="11" />
                <polygon points="12 2 20 7 4 7" />
              </svg>
              <span>Bank Wire</span>
            </button>

            <button
              type="button"
              className={`method-tab ${paymentMethod === 'mobile_money' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('mobile_money')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>Mobile</span>
            </button>

            <button
              type="button"
              className={`method-tab ${paymentMethod === 'digital_wallet' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('digital_wallet')}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
              </svg>
              <span>Wallet</span>
            </button>
          </div>

          {/* Method 1: Interactive Card Checkout */}
          {paymentMethod === 'card' && (
            <div>
              <div className="payment-card-visual">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div className="card-chip-icon" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                    {cardBrand}
                  </span>
                </div>
                <div
                  className="tabular"
                  style={{
                    fontSize: '1.06rem',
                    letterSpacing: '0.13em',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    marginBottom: 14,
                  }}
                >
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', opacity: 0.88 }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', opacity: 0.7 }}>Cardholder</div>
                    <div style={{ fontWeight: 600 }}>{(cardHolder || donorName || 'SPONSOR NAME').toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', opacity: 0.7 }}>Expires</div>
                    <div className="tabular" style={{ fontWeight: 600 }}>{cardExpiry || 'MM/YY'}</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Card number</label>
                <input
                  className="field-input tabular"
                  inputMode="numeric"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardDigits(e.target.value))}
                  placeholder="4532 •••• •••• ••••"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="field-label">Expiry (MM/YY)</label>
                  <input
                    className="field-input tabular"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="09/29"
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">Security Code (CVV)</label>
                  <input
                    className="field-input tabular"
                    type="password"
                    maxLength={4}
                    required
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Method 2: Institutional Bank Transfer */}
          {paymentMethod === 'bank_transfer' && (
            <div className="escrow-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: 'var(--accent)', fontSize: '0.82rem' }}>
                  ScholarFund Tuition Escrow Account
                </strong>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 9px', fontSize: '0.72rem' }}
                  onClick={() => {
                    navigator.clipboard?.writeText('0194827310')
                    setCopiedEscrow(true)
                    setTimeout(() => setCopiedEscrow(false), 1800)
                  }}
                >
                  {copiedEscrow ? 'Copied ✓' : 'Copy Acct'}
                </button>
              </div>
              <div className="tabular" style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginBottom: 10 }}>
                Account: <strong style={{ color: 'var(--ink-primary)' }}>0194827310</strong> · SWIFT: <strong>SCFDUS33</strong>
              </div>
              <label className="field-label">Select originating bank</label>
              <select
                className="field-select"
                style={{ background: '#ffffff' }}
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
              >
                <option value="GTBank Instant Wire">Guaranty Trust Bank (Instant Transfer)</option>
                <option value="Access Bank Wire">Access Bank Institutional Transfer</option>
                <option value="Zenith Bank Transfer">Zenith Bank Instant NIP</option>
                <option value="FirstBank Direct">FirstBank Direct Wire</option>
                <option value="Standard Chartered Wire">Standard Chartered International Wire</option>
                <option value="JPMorgan Chase ACH">JPMorgan Chase ACH / Wire</option>
              </select>
            </div>
          )}

          {/* Method 3: Mobile Money */}
          {paymentMethod === 'mobile_money' && (
            <div className="escrow-box">
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="field-label">Mobile money network</label>
                <select
                  className="field-select"
                  style={{ background: '#ffffff' }}
                  value={mobileProvider}
                  onChange={(e) => setMobileProvider(e.target.value)}
                >
                  <option value="OPay Mobile Wallet">OPay Instant Wallet</option>
                  <option value="PalmPay Wallet">PalmPay Express</option>
                  <option value="MTN MoMo Wallet">MTN MoMo</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="M-Pesa Express">M-Pesa Express</option>
                </select>
              </div>
              <div>
                <label className="field-label">Registered mobile wallet number</label>
                <input
                  className="field-input tabular"
                  style={{ background: '#ffffff' }}
                  required
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Method 4: Digital Wallet */}
          {paymentMethod === 'digital_wallet' && (
            <div className="escrow-box">
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="field-label">Select digital wallet</label>
                <select
                  className="field-select"
                  style={{ background: '#ffffff' }}
                  value={walletProvider}
                  onChange={(e) => setWalletProvider(e.target.value)}
                >
                  <option value="PayPal">PayPal</option>
                  <option value="Apple Pay">Apple Pay</option>
                  <option value="Google Pay">Google Pay</option>
                </select>
              </div>
              <div>
                <label className="field-label">Verified wallet email</label>
                <input
                  type="email"
                  className="field-input"
                  style={{ background: '#ffffff' }}
                  required
                  value={walletEmail}
                  onChange={(e) => setWalletEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <div className="alert-error">{error}</div>}

          <div className="form-group">
            <label className="field-label" htmlFor="sponsor-display-name">
              Sponsor full name
            </label>
            <input
              id="sponsor-display-name"
              className="field-input"
              type="text"
              maxLength={80}
              placeholder="e.g., Dr. Chidi Nnaji"
              value={donorName}
              onChange={(e) => {
                setDonorName(e.target.value)
                setCardHolder(e.target.value)
              }}
              disabled={isAnonymous}
            />
          </div>

          <div className="form-group">
            <label className="field-label" htmlFor="sponsor-note">
              Message of encouragement (optional)
            </label>
            <textarea
              id="sponsor-note"
              className="field-textarea"
              style={{ minHeight: 68 }}
              maxLength={280}
              placeholder={`Leave a note of encouragement for ${campaign.studentName.split(' ')[0]}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem',
              color: 'var(--ink-secondary)',
              marginBottom: 16,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            List as “Anonymous Sponsor” on public honor roll
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', fontSize: '0.94rem' }}
            disabled={submitting}
          >
            {submitting
              ? 'Authorizing Sponsorship...'
              : `Complete ${formatUsd(Math.max(0, Number(amountUsd) || 0) * 100)}${
                  frequency === 'monthly' ? '/mo' : ''
                } Sponsorship`}
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.74rem',
              color: 'var(--ink-muted)',
              marginTop: 10,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>256-bit TLS Encrypted · 100% Tuition Escrow Protection</span>
          </div>
        </form>
      )}
    </aside>
  )
}
