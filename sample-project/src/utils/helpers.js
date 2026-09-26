// Utility helpers for the Items API

/**
 * Format a price value as a currency string.
 * @param {number} value
 * @returns {string}
 */
function formatPrice(value) {
  // Missing error handling — will throw if value is not a number
  return '$' + value.toFixed(2);
}

/**
 * Validate that a string is non-empty.
 * @param {string} str
 * @returns {boolean}
 */
function isNonEmptyString(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Generate a simple timestamp string.
 * @returns {string}
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Truncate a string to a maximum length.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

module.exports = { formatPrice, isNonEmptyString, timestamp, truncate };
