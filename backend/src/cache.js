const crypto = require("crypto");

/**
 * Simple in-memory LRU-style cache for LLM analysis results.
 * Keyed by SHA-256 hash of the input text.
 * Evicts oldest entries when capacity is exceeded.
 */
class AnalysisCache {
  constructor(maxSize = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  _hash(text) {
    return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
  }

  get(text) {
    const key = this._hash(text);
    if (!this.cache.has(key)) return null;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(text, result) {
    const key = this._hash(text);
    if (this.cache.size >= this.maxSize) {
      // Evict the oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { ...result, cachedAt: new Date().toISOString() });
  }

  stats() {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

module.exports = new AnalysisCache();
