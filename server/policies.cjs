'use strict'

/**
 * Explicit Role-Based & Resource-Ownership Access Control Policies.
 *
 * Security principles:
 *   1. Server-side enforcement is authoritative; client UI visibility is never access control.
 *   2. Public registration permits ONLY 'student' or 'donor' roles.
 *   3. Unknown permissions default strictly to DENY.
 *   4. Private student and sponsor records verify strict user ownership unless actor is 'admin'.
 */

const PUBLIC_SIGNUP_ROLES = Object.freeze(['student', 'donor'])
const ALL_ROLES = Object.freeze(['student', 'donor', 'admin'])

const POLICY_RULES = Object.freeze({
  'campaign:read_public': () => true,

  'donation:create': () => true,

  'profile:update_own': (user) => Boolean(user && ALL_ROLES.includes(user.role)),

  'upload:photo': (user) => Boolean(user && ALL_ROLES.includes(user.role)),

  'donation:read_own': (user, resource) => {
    if (!user || !ALL_ROLES.includes(user.role)) return false
    if (!resource) return true
    return user.role === 'admin' || Number(resource.donor_user_id) === Number(user.id)
  },

  'student:dashboard': (user) => Boolean(user && user.role === 'student'),

  'application:submit': (user) => Boolean(user && user.role === 'student'),

  'application:view_own': (user, resource) => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role !== 'student') return false
    if (!resource) return true
    return Number(resource.student_user_id) === Number(user.id)
  },

  'campaign:post_milestone': (user, resource) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return (
      user.role === 'student' &&
      Boolean(resource) &&
      Number(resource.student_user_id) === Number(user.id)
    )
  },

  'admin:dashboard': (user) => Boolean(user && user.role === 'admin'),
  'admin:applications:review': (user) => Boolean(user && user.role === 'admin'),
  'admin:campaigns:manage': (user) => Boolean(user && user.role === 'admin'),
  'admin:donations:summary': (user) => Boolean(user && user.role === 'admin'),
  'admin:audit:read': (user) => Boolean(user && user.role === 'admin'),
})

function canRegisterWithRole(role) {
  return typeof role === 'string' && PUBLIC_SIGNUP_ROLES.includes(role)
}

function hasPermission(user, permission, resource = null) {
  if (typeof permission !== 'string') return false
  if (!Object.prototype.hasOwnProperty.call(POLICY_RULES, permission)) {
    return false
  }
  return Boolean(POLICY_RULES[permission](user, resource))
}

function requirePermission(permission, getResource = null) {
  return (req, res, next) => {
    const user = req.currentUser || null
    const resource = typeof getResource === 'function' ? getResource(req) : null

    if (!hasPermission(user, permission, resource)) {
      const status = user ? 403 : 401
      return res.status(status).json({
        error: user
          ? 'You do not have permission to perform this action.'
          : 'Please sign in to access this workspace.',
        code: user ? 'FORBIDDEN' : 'UNAUTHENTICATED',
      })
    }
    return next()
  }
}

module.exports = {
  PUBLIC_SIGNUP_ROLES,
  ALL_ROLES,
  canRegisterWithRole,
  hasPermission,
  requirePermission,
}
