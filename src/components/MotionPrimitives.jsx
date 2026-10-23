import React, { useEffect, useRef, useState } from 'react'

/**
 * Smooth hardware-composited scroll entrance choreography.
 */
export function MotionReveal({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`motion-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
    >
      {children}
    </div>
  )
}

/**
 * Smooth eased counter animation for financial & impact metrics.
 */
export function AnimatedNumber({ value = 0, formatter = (v) => Math.round(v).toLocaleString(), duration = 850 }) {
  const [display, setDisplay] = useState(value)
  const previousRef = useRef(0)

  useEffect(() => {
    const startVal = previousRef.current
    const targetVal = Number(value) || 0
    if (startVal === targetVal) {
      setDisplay(targetVal)
      return
    }

    let rafId
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = startVal + (targetVal - startVal) * eased
      setDisplay(current)
      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        previousRef.current = targetVal
        setDisplay(targetVal)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [value, duration])

  return <span className="tabular">{formatter(display)}</span>
}

/**
 * Animated SVG radial funding gauge.
 */
export function RadialProgress({ percent = 0, size = 148, strokeWidth = 12, label = '', sublabel = '' }) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0))
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setAnimatedPct(clamped), 60)
    return () => clearTimeout(id)
  }, [clamped])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (animatedPct / 100) * circumference

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-subtle)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#scholarRadialGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.95s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
          <defs>
            <linearGradient id="scholarRadialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#185134" />
              <stop offset="100%" stopColor="#349b66" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <span
            className="tabular"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '1.55rem', fontWeight: 700, lineHeight: 1 }}
          >
            {clamped}%
          </span>
          {label && (
            <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 4 }}>
              {label}
            </span>
          )}
        </div>
      </div>
      {sublabel && (
        <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: 8, textAlign: 'center' }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}

/**
 * Interactive SVG Area Trend Chart for Student, Sponsor & Admin analytics.
 */
export function SparkAreaChart({ series = [], formatValue = (v) => `$${v}` }) {
  const [hoverIdx, setHoverIdx] = useState(null)

  const pointsData =
    series.length >= 2
      ? series
      : [
          { label: 'Start', value: 0 },
          { label: 'Current', value: series[0]?.value || 0 },
        ]

  const width = 460
  const height = 165
  const padX = 22
  const padTop = 20
  const padBottom = 28
  const plotW = width - padX * 2
  const plotH = height - padTop - padBottom

  const maxVal = Math.max(1, ...pointsData.map((d) => d.value))

  const coords = pointsData.map((d, idx) => {
    const x = padX + (idx / Math.max(1, pointsData.length - 1)) * plotW
    const y = padTop + plotH - (d.value / maxVal) * plotH
    return { x, y, ...d }
  })

  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + plotH} L ${coords[0].x.toFixed(1)} ${padTop + plotH} Z`

  const activePoint = hoverIdx !== null ? coords[hoverIdx] : coords[coords.length - 1]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{activePoint?.label}</span>
        <strong className="tabular" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
          {formatValue(activePoint?.value || 0)}
        </strong>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaFillEmerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e6b43" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#1e6b43" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          y1={padTop + plotH}
          x2={width - padX}
          y2={padTop + plotH}
          stroke="var(--border)"
          strokeWidth="1"
        />

        <path d={areaPath} fill="url(#areaFillEmerald)" />
        <path
          d={linePath}
          fill="none"
          stroke="#185134"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map((pt, idx) => (
          <g key={idx}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoverIdx === idx ? 5.5 : 3.5}
              fill={hoverIdx === idx ? '#185134' : '#ffffff'}
              stroke="#185134"
              strokeWidth="2.2"
              style={{ transition: 'r 0.15s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHoverIdx(idx)}
            />
            {(idx === 0 || idx === coords.length - 1 || pointsData.length <= 6) && (
              <text
                x={pt.x}
                y={height - 6}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--ink-muted)"
              >
                {pt.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
