"use strict"

const { test } = require("node:test")
const assert = require("node:assert/strict")
const crypto = require("node:crypto")
const Password = require("../js/Password.js")

test("sha256 matches the published vectors", () => {
  // Our own implementation, so it is pinned against the standard's
  // test vectors and against Node's, not against itself.
  assert.equal(
    Password.sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  )
  assert.equal(
    Password.sha256(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  )
  assert.equal(
    Password.sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  )
})

test("sha256 agrees with node on awkward input", () => {
  const cases = [
    "a".repeat(55), // one byte short of a padded block
    "a".repeat(56), // forces a second block
    "a".repeat(64),
    "a".repeat(200),
    "pässwörd with ümlauts",
    "emoji 🔒 and 中文",
    " leading and trailing ",
  ]
  for (const value of cases) {
    assert.equal(
      Password.sha256(value),
      crypto.createHash("sha256").update(value, "utf8").digest("hex"),
      JSON.stringify(value),
    )
  }
})

test("a new record stores a salted digest, never the password", () => {
  const record = Password.newPasswordRecord("hunter2")
  assert.match(record.salt, /^[0-9a-f]{32}$/)
  assert.match(record.hash, /^[0-9a-f]{64}$/)
  assert.equal(record.iterations, Password.PASSWORD_ITERATIONS)
  const serialized = JSON.stringify(record)
  assert.equal(serialized.includes("hunter2"), false)
})

test("the same password hashes differently per install", () => {
  const a = Password.newPasswordRecord("hunter2")
  const b = Password.newPasswordRecord("hunter2")
  assert.notEqual(a.salt, b.salt)
  assert.notEqual(a.hash, b.hash)
  assert.equal(Password.verifyPassword("hunter2", a), true)
  assert.equal(Password.verifyPassword("hunter2", b), true)
})

test("verify accepts the password and nothing else", () => {
  const record = Password.newPasswordRecord("open sesame")
  assert.equal(Password.verifyPassword("open sesame", record), true)
  assert.equal(Password.verifyPassword("open sesam", record), false)
  assert.equal(Password.verifyPassword("Open Sesame", record), false)
  assert.equal(Password.verifyPassword("", record), false)
  assert.equal(Password.verifyPassword(null, record), false)
  assert.equal(Password.verifyPassword(undefined, record), false)
  // The stored digest itself is not a way in.
  assert.equal(Password.verifyPassword(record.hash, record), false)
})

test("an empty password is no lock, never an open one", () => {
  assert.equal(Password.newPasswordRecord(""), null)
  assert.equal(Password.newPasswordRecord(null), null)
  assert.equal(Password.newPasswordRecord(undefined), null)
  assert.equal(Password.hasPassword(null), false)
  assert.equal(Password.verifyPassword("", null), false)
  assert.equal(Password.verifyPassword("anything", null), false)
})

test("a malformed record unlocks the settings instead of sealing them", () => {
  // A record nobody can satisfy would lock the page for good, so
  // anything unusable reads as "no password set".
  const junk = [
    undefined,
    null,
    "",
    "nope",
    42,
    [],
    {},
    { salt: "abc" },
    { salt: "abc", hash: "short", iterations: 1000 },
    { salt: "nothex!", hash: "a".repeat(64), iterations: 1000 },
    { salt: "abc", hash: "A".repeat(64), iterations: 1000 }, // uppercase hex
    { salt: "abc", hash: "a".repeat(64), iterations: 0 },
    { salt: "abc", hash: "a".repeat(64), iterations: -1 },
    { salt: "abc", hash: "a".repeat(64), iterations: "lots" },
    // A count that would hang the GUI thread for minutes is refused.
    { salt: "abc", hash: "a".repeat(64), iterations: 9999999 },
  ]
  for (const value of junk) {
    assert.equal(
      Password.parsePasswordRecord(value),
      null,
      JSON.stringify(value),
    )
    assert.equal(Password.hasPassword(value), false, JSON.stringify(value))
    assert.equal(Password.verifyPassword("hunter2", value), false)
  }
})

test("a stored record keeps verifying after the default changes", () => {
  // Iterations travel with the record, so raising or lowering the
  // default never locks an existing password out.
  const record = Password.newPasswordRecord("hunter2", "beefcafe", 7)
  assert.equal(record.iterations, 7)
  assert.equal(Password.verifyPassword("hunter2", record), true)
  const parsed = Password.parsePasswordRecord(
    JSON.parse(JSON.stringify(record)),
  )
  assert.deepEqual(parsed, record)
  assert.equal(Password.verifyPassword("hunter2", parsed), true)
})

test("hashing is deterministic for a given salt and count", () => {
  const a = Password.hashPassword("hunter2", "beefcafe", 32)
  const b = Password.hashPassword("hunter2", "beefcafe", 32)
  assert.equal(a, b)
  assert.notEqual(a, Password.hashPassword("hunter2", "beefcaff", 32))
  assert.notEqual(a, Password.hashPassword("hunter2", "beefcafe", 33))
  assert.match(a, /^[0-9a-f]{64}$/)
})

test("salts are hex and do not repeat", () => {
  const seen = new Set()
  for (let i = 0; i < 200; i++) {
    const salt = Password.newSalt(16)
    assert.match(salt, /^[0-9a-f]{32}$/)
    seen.add(salt)
  }
  assert.equal(seen.size, 200)
})
