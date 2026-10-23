'use strict'

const session = require('express-session')

class SQLiteSessionStore extends session.Store {
  constructor(db, options = {}) {
    super()
    this.db = db
    this.ttlMs = options.ttlMs || 1000 * 60 * 60 * 24 * 7

    this.getStmt = db.prepare('SELECT sess, expire FROM sessions WHERE sid = ?')
    this.upsertStmt = db.prepare(`
      INSERT INTO sessions (sid, sess, expire)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
    `)
    this.destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?')
    this.touchStmt = db.prepare('UPDATE sessions SET expire = ? WHERE sid = ?')
    this.pruneStmt = db.prepare('DELETE FROM sessions WHERE expire <= ?')

    this.pruneTimer = setInterval(() => {
      try {
        this.pruneStmt.run(Date.now())
      } catch {
        // Ignore cleanup errors if DB is closed during test teardown
      }
    }, 1000 * 60 * 15)
    this.pruneTimer.unref()
  }

  computeExpiry(sess) {
    if (sess && sess.cookie && sess.cookie.expires) {
      return new Date(sess.cookie.expires).getTime()
    }
    if (sess && sess.cookie && typeof sess.cookie.maxAge === 'number') {
      return Date.now() + sess.cookie.maxAge
    }
    return Date.now() + this.ttlMs
  }

  get(sid, callback) {
    try {
      const row = this.getStmt.get(sid)
      if (!row) return callback(null, null)
      if (row.expire <= Date.now()) {
        this.destroyStmt.run(sid)
        return callback(null, null)
      }
      return callback(null, JSON.parse(row.sess))
    } catch (err) {
      return callback(err)
    }
  }

  set(sid, sess, callback = () => {}) {
    try {
      const expire = this.computeExpiry(sess)
      this.upsertStmt.run(sid, JSON.stringify(sess), expire)
      return callback(null)
    } catch (err) {
      return callback(err)
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.destroyStmt.run(sid)
      return callback(null)
    } catch (err) {
      return callback(err)
    }
  }

  touch(sid, sess, callback = () => {}) {
    try {
      const expire = this.computeExpiry(sess)
      this.touchStmt.run(expire, sid)
      return callback(null)
    } catch (err) {
      return callback(err)
    }
  }
}

module.exports = { SQLiteSessionStore }
