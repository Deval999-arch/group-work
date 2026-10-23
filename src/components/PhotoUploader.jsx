import React, { useRef, useState } from 'react'
import { api } from '../api.js'

/**
 * Optimizes arbitrary user image files cleanly via HTML5 Canvas before uploading
 * to the Express + SQLite server so high-megapixel camera photos upload in <200ms.
 */
function compressImageToDataUrl(file, maxDimension = 960, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected image file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Selected file is not a valid image.'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoUploader({
  value,
  onChange,
  presets = [],
  onUserUpdated,
  label = 'Campaign & Scholar Photograph',
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  async function processFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a JPG, PNG, or WebP photograph.')
      return
    }
    setError('')
    setUploading(true)
    setUploadSuccess(false)
    try {
      const optimizedDataUrl = await compressImageToDataUrl(file)
      const res = await api.uploadPhoto({
        dataUrl: optimizedDataUrl,
        updateProfileAvatar: true,
      })
      onChange(res.url)
      setUploadSuccess(true)
      if (onUserUpdated && res.user) {
        onUserUpdated(res.user)
      }
    } catch (err) {
      setError(err.message || 'Photo upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="form-group">
      <span className="field-label">{label}</span>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 1fr',
          gap: 18,
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            aspectRatio: '4 / 4.4',
            background: 'var(--bg-subtle)',
          }}
        >
          <img
            src={value}
            alt="Selected scholar portrait"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 38%',
              display: 'block',
            }}
          />
          {uploadSuccess && (
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                right: 8,
                background: 'rgba(24, 81, 52, 0.92)',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                textAlign: 'center',
                padding: '3px 6px',
                borderRadius: 999,
              }}
            >
              Uploaded ✓
            </span>
          )}
        </div>

        <div
          className={`photo-dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) processFile(file)
              e.target.value = ''
            }}
          />

          <div style={{ marginBottom: 8, color: 'var(--accent)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink-primary)' }}>
            {uploading ? 'Uploading & optimizing photograph...' : 'Upload your photograph'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 4 }}>
            Drag &amp; drop an image here, or <span style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>browse files</span> (JPG, PNG, WebP)
          </div>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {presets.length > 0 && (
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginBottom: 7 }}>
            Or choose from curated campus portraits:
          </div>
          <div className="portrait-picker">
            {presets.map((url) => (
              <button
                key={url}
                type="button"
                className={`portrait-option ${value === url ? 'selected' : ''}`}
                onClick={() => {
                  setUploadSuccess(false)
                  onChange(url)
                }}
              >
                <img src={url} alt="Scholar portrait option" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
