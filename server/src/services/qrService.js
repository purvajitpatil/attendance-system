const crypto = require('crypto');

/**
 * QR Code Service
 * Handles cryptographically secure random token generation,
 * SHA-256 token hashing, and expiration time calculations.
 */
class QrService {
  /**
   * Token lifetime in seconds (default: 60 seconds)
   */
  static TOKEN_LIFETIME_SECONDS = 60;

  /**
   * Generates a cryptographically secure random token
   * @returns {string} Hex token string
   */
  static generateRawToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a raw token with SHA-256
   * @param {string} token 
   * @returns {string} Hex hash string
   */
  static hashToken(token) {
    if (!token || typeof token !== 'string') {
      return '';
    }
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a complete token payload with hash and expiration timestamp
   * @param {number} lifetimeSeconds 
   * @returns {{ token: string, tokenHash: string, expiresAt: Date }}
   */
  static generateTokenPair(lifetimeSeconds = this.TOKEN_LIFETIME_SECONDS) {
    const token = this.generateRawToken();
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);

    return {
      token,
      tokenHash,
      expiresAt,
    };
  }

  /**
   * Verifies if a raw token matches a stored hash
   * @param {string} rawToken 
   * @param {string} storedHash 
   * @returns {boolean}
   */
  static verifyToken(rawToken, storedHash) {
    if (!rawToken || !storedHash) return false;
    const computed = this.hashToken(rawToken);
    // Timing-safe buffer comparison to prevent timing attacks
    const bufA = Buffer.from(computed, 'hex');
    const bufB = Buffer.from(storedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Checks if an expiration date has passed
   * @param {Date|string} expiresAt 
   * @returns {boolean}
   */
  static isExpired(expiresAt) {
    if (!expiresAt) return true;
    return new Date() > new Date(expiresAt);
  }
}

module.exports = QrService;
