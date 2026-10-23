export function formatUsd(cents, { decimals = false } = {}) {
  const dollars = (Number(cents) || 0) / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(dollars)
}

export function formatDateTime(isoLike) {
  if (!isoLike) return ''
  const normalized = isoLike.includes('T') ? isoLike : `${isoLike.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return isoLike
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatShortTimestamp(isoLike) {
  if (!isoLike) return ''
  const normalized = isoLike.includes('T') ? isoLike : `${isoLike.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return isoLike
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
