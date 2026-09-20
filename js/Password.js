// Settings-lock password hashing, importable by both Node and the QML
// engine. A salted, iterated SHA-256 digest is all that is ever stored:
// the plain password never reaches shell.json, a log or a process.
//
// What this is NOT: protection against someone with a shell. The digest
// sits in shell.json, which the same user can edit, and the plugin can
// be disabled from the bar. It is a deliberate speed bump between an
// impulse and a raised limit — treat it as one.

// First 32 bits of the fractional parts of the cube roots of the first
// 64 primes; the standard SHA-256 round constants.
var SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function rotr(value, bits) {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0
}

// UTF-8 bytes, so a pass phrase with anything but ASCII still hashes
// the same everywhere.
function utf8Bytes(text) {
  var out = []
  var s = String(text)
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    } else {
      // Surrogate pair: one code point across two UTF-16 units.
      i++
      var cp = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff))
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      )
    }
  }
  return out
}

function sha256Bytes(bytes) {
  var h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]
  var msg = bytes.slice()
  var bitLen = bytes.length * 8
  msg.push(0x80)
  while (msg.length % 64 !== 56) msg.push(0)
  // 64-bit big-endian length; inputs here are far below 2^32 bits.
  msg.push(0, 0, 0, 0)
  msg.push(
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff,
  )

  var w = new Array(64)
  var i, t
  for (i = 0; i < msg.length; i += 64) {
    for (t = 0; t < 16; t++) {
      var o = i + t * 4
      w[t] =
        ((msg[o] << 24) |
          (msg[o + 1] << 16) |
          (msg[o + 2] << 8) |
          msg[o + 3]) >>>
        0
    }
    for (t = 16; t < 64; t++) {
      var x = w[t - 15]
      var y = w[t - 2]
      var s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0
      var s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
    }
    var a = h[0]
    var b = h[1]
    var c = h[2]
    var d = h[3]
    var e = h[4]
    var f = h[5]
    var g = h[6]
    var hh = h[7]
    for (t = 0; t < 64; t++) {
      var S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
      var ch = ((e & f) ^ (~e & g)) >>> 0
      var t1 = (hh + S1 + ch + SHA256_K[t] + w[t]) >>> 0
      var S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
      var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
      var t2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }

  var hex = ""
  for (i = 0; i < h.length; i++) {
    var part = h[i].toString(16)
    while (part.length < 8) part = "0" + part
    hex += part
  }
  return hex
}

function sha256(text) {
  return sha256Bytes(utf8Bytes(text))
}

// ---- Stored record -------------------------------------------------------
// { salt, iterations, hash }. Iterations travel with the record so an
// older one keeps verifying after the default changes.
//
// The work factor is deliberately small, and the ceiling is the shell's
// GUI thread: hashing runs there, so every iteration is frozen bar. The
// QML engine measures ~0.35ms per 1000 rounds, which puts 1000 at about
// a third of a second on submit — noticeable, bearable, once.
//
// Stretching further would buy nothing anyway. Whoever can read this
// digest can delete it from shell.json instead, and an attacker who
// reimplements the loop in C outruns any count this side of a freeze.
// The rounds are here to blunt casual guessing, not to keep a secret.
var PASSWORD_ITERATIONS = 1000
var SALT_BYTES = 16

// Hex salt. Math.random is not a cryptographic source, and that is fine
// for its one job here: stopping a single table from covering every
// install at once.
function newSalt(bytes) {
  var n = Math.floor(Number(bytes))
  if (!isFinite(n) || n < 1) n = SALT_BYTES
  var out = ""
  for (var i = 0; i < n; i++) {
    var byte = Math.floor(Math.random() * 256)
    out += (byte < 16 ? "0" : "") + byte.toString(16)
  }
  return out
}

function isHex(value, length) {
  var s = String(value || "")
  if (length && s.length !== length) return false
  return s.length > 0 && /^[0-9a-f]+$/.test(s)
}

function hashPassword(password, salt, iterations) {
  var n = Math.floor(Number(iterations))
  if (!isFinite(n) || n < 1) n = PASSWORD_ITERATIONS
  var digest = sha256(String(salt || "") + ":" + String(password))
  for (var i = 1; i < n; i++) digest = sha256(digest + String(salt || ""))
  return digest
}

// A record for a new password, or null for an empty one — an empty
// password means "no lock", never a lock that anything opens.
function newPasswordRecord(password, salt, iterations) {
  var pw = String(password === undefined || password === null ? "" : password)
  if (pw.length === 0) return null
  var s = isHex(salt) ? String(salt) : newSalt(SALT_BYTES)
  var n = Math.floor(Number(iterations))
  if (!isFinite(n) || n < 1) n = PASSWORD_ITERATIONS
  return {
    salt: s,
    iterations: n,
    hash: hashPassword(pw, s, n),
  }
}

// Anything malformed reads as "no lock": a record nobody can satisfy
// would lock the settings for good.
function parsePasswordRecord(value) {
  if (!value || typeof value !== "object") return null
  var salt = String(value.salt || "")
  var hash = String(value.hash || "")
  var n = Math.floor(Number(value.iterations))
  if (!isHex(salt) || !isHex(hash, 64)) return null
  if (!isFinite(n) || n < 1 || n > 5000000) return null
  return {
    salt: salt,
    iterations: n,
    hash: hash,
  }
}

function hasPassword(value) {
  return parsePasswordRecord(value) !== null
}

// Length-independent compare, so a wrong guess never leaks how much of
// the digest matched through timing.
function digestsEqual(a, b) {
  var x = String(a || "")
  var y = String(b || "")
  if (x.length !== y.length) return false
  var diff = 0
  for (var i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0
}

function verifyPassword(password, value) {
  var record = parsePasswordRecord(value)
  if (!record) return false
  var pw = String(password === undefined || password === null ? "" : password)
  if (pw.length === 0) return false
  return digestsEqual(
    hashPassword(pw, record.salt, record.iterations),
    record.hash,
  )
}

// Wrong guesses start costing time after the first couple: 2s, then 4,
// 8, 16, capped at 30. Typing at the panel is then slow enough to be
// pointless, without punishing a fat-fingered first try.
function lockoutMs(failures) {
  var n = Math.floor(Number(failures))
  if (!isFinite(n) || n < 3) return 0
  return Math.min(30000, Math.pow(2, n - 3) * 2000)
}

// Seconds still to wait, for the gate's caption. Counts down to 0 and
// never goes negative, including across a backward clock jump.
function lockoutSecondsLeft(retryAt, now) {
  var until = Number(retryAt)
  var stamp = Number(now)
  if (!isFinite(until) || !isFinite(stamp) || until <= stamp) return 0
  return Math.ceil((until - stamp) / 1000)
}

if (typeof module !== "undefined" && module && module.exports) {
  module.exports = {
    PASSWORD_ITERATIONS: PASSWORD_ITERATIONS,
    sha256: sha256,
    newSalt: newSalt,
    hashPassword: hashPassword,
    newPasswordRecord: newPasswordRecord,
    parsePasswordRecord: parsePasswordRecord,
    hasPassword: hasPassword,
    verifyPassword: verifyPassword,
    lockoutMs: lockoutMs,
    lockoutSecondsLeft: lockoutSecondsLeft,
  }
}
