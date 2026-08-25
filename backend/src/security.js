const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "smart-attendance-secret-key-2026";
const JWT_EXPIRES_IN = "24h";

/**
 * Hash password using salted SHA-256 (matches format: salt:hash)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored salt:hash string
 */
function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  
  // Legacy / plain text fallback
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }

  const [salt, expectedHash] = storedHash.split(":", 2);
  const actualHash = crypto.createHash("sha256").update(salt + password).digest("hex");

  try {
    const actualBuf = Buffer.from(actualHash, "utf8");
    const expectedBuf = Buffer.from(expectedHash, "utf8");
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return actualHash === expectedHash;
  }
}

/**
 * Generate standard JWT Access Token
 */
function createAccessToken(userId, role) {
  return jwt.sign(
    {
      sub: String(userId),
      role: String(role).toUpperCase(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT Access Token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyToken,
};
