// src/utils/formatters.js
/**
 * Enterprise-grade formatting utilities for the Assessly Platform
 * Consistent, locale-aware formatting for dates, numbers, currencies, and text
 */

// Locale configuration
const DEFAULT_LOCALE = 'en-US';
const CURRENCY_MAP = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CAD': 'CA$',
  'AUD': 'A$',
  'INR': '₹'
};

// Date format presets
const DATE_FORMATS = {
  SHORT: { dateStyle: 'short' },
  MEDIUM: { dateStyle: 'medium' },
  LONG: { dateStyle: 'long' },
  FULL: { dateStyle: 'full' },
  SHORT_TIME: { dateStyle: 'short', timeStyle: 'short' },
  MEDIUM_TIME: { dateStyle: 'medium', timeStyle: 'short' },
  LONG_TIME: { dateStyle: 'long', timeStyle: 'short' },
  FULL_TIME: { dateStyle: 'full', timeStyle: 'short' },
  TIME_ONLY: { timeStyle: 'short' },
  ISO: { // For API/DB storage
    format: (date) => date.toISOString()
  }
};

// Number format presets
const NUMBER_FORMATS = {
  INTEGER: { maximumFractionDigits: 0 },
  DECIMAL_1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  DECIMAL_2: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  PERCENT: { style: 'percent', maximumFractionDigits: 1 },
  PERCENT_2: { style: 'percent', maximumFractionDigits: 2 },
  COMPACT: { notation: 'compact', maximumFractionDigits: 1 },
  SCIENTIFIC: { notation: 'scientific', maximumFractionDigits: 2 },
  CURRENCY: (currency) => ({ style: 'currency', currency, maximumFractionDigits: 2 })
};

/**
 * Format date with locale awareness and multiple presets
 * @param {Date|string|number} date - Date to format
 * @param {string|Object} format - Format preset or Intl.DateTimeFormat options
 * @param {string} locale - Locale to use (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'MEDIUM', locale = DEFAULT_LOCALE) => {
  try {
    if (!date) return '';
    
    // Parse input to Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Handle invalid dates
    if (isNaN(dateObj.getTime())) {
      console.warn('[Formatter] Invalid date provided:', date);
      return 'Invalid Date';
    }
    
    // Handle ISO format special case
    if (format === 'ISO' || (format && format.format === 'ISO')) {
      return dateObj.toISOString();
    }
    
    // Get format options
    const formatOptions = typeof format === 'string' 
      ? DATE_FORMATS[format.toUpperCase()] || DATE_FORMATS.MEDIUM
      : format;
    
    // Create formatter
    const formatter = new Intl.DateTimeFormat(locale, formatOptions);
    return formatter.format(dateObj);
  } catch (error) {
    console.error('[Formatter] Date formatting error:', error);
    return String(date);
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @param {string} locale - Locale to use
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date, options = {}, locale = DEFAULT_LOCALE) => {
  try {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffMs = dateObj - now;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffWeek = Math.round(diffDay / 7);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);
    
    const rtf = new Intl.RelativeTimeFormat(locale, {
      numeric: 'auto',
      style: 'long',
      ...options
    });
    
    if (Math.abs(diffYear) >= 1) return rtf.format(diffYear, 'year');
    if (Math.abs(diffMonth) >= 1) return rtf.format(diffMonth, 'month');
    if (Math.abs(diffWeek) >= 1) return rtf.format(diffWeek, 'week');
    if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, 'day');
    if (Math.abs(diffHour) >= 1) return rtf.format(diffHour, 'hour');
    if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, 'minute');
    
    return rtf.format(diffSec, 'second');
  } catch (error) {
    console.error('[Formatter] Relative time formatting error:', error);
    return formatDate(date, 'SHORT', locale);
  }
};

/**
 * Format duration in human-readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @param {Object} options - Formatting options
 * @returns {string} Formatted duration
 */
export const formatDuration = (milliseconds, options = {}) => {
  const {
    showMilliseconds = false,
    showZeroValues = false,
    compact = false,
    maxUnits = 2
  } = options;
  
  if (milliseconds < 0) milliseconds = 0;
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  const remainingMillis = milliseconds % 1000;
  
  const parts = [];
  
  if (days > 0 || showZeroValues) parts.push(`${days}d`);
  if (remainingHours > 0 || (showZeroValues && days === 0)) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0 || (showZeroValues && hours === 0)) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0 || (showZeroValues && minutes === 0)) parts.push(`${remainingSeconds}s`);
  if (showMilliseconds && remainingMillis > 0) parts.push(`${remainingMillis}ms`);
  
  // Limit number of units shown
  const displayParts = parts.slice(0, maxUnits);
  
  if (compact && displayParts.length > 0) {
    return displayParts.join('');
  }
  
  return displayParts.join(' ') || '0s';
};

/**
 * Format number with locale awareness
 * @param {number} number - Number to format
 * @param {string|Object} format - Format preset or Intl.NumberFormat options
 * @param {string} locale - Locale to use
 * @returns {string} Formatted number string
 */
export const formatNumber = (number, format = 'DECIMAL_2', locale = DEFAULT_LOCALE) => {
  try {
    if (number === null || number === undefined) return '';
    
    const num = typeof number === 'string' ? parseFloat(number) : number;
    
    if (isNaN(num)) {
      console.warn('[Formatter] Invalid number provided:', number);
      return 'NaN';
    }
    
    // Handle currency format
    if (typeof format === 'string' && format.startsWith('CURRENCY_')) {
      const currency = format.split('_')[1];
      const options = NUMBER_FORMATS.CURRENCY(currency);
      const formatter = new Intl.NumberFormat(locale, options);
      return formatter.format(num);
    }
    
    // Get format options
    let formatOptions;
    if (typeof format === 'string') {
      const formatKey = format.toUpperCase();
      formatOptions = NUMBER_FORMATS[formatKey] || NUMBER_FORMATS.DECIMAL_2;
      
      // Handle dynamic formats
      if (typeof formatOptions === 'function') {
        formatOptions = formatOptions();
      }
    } else {
      formatOptions = format;
    }
    
    const formatter = new Intl.NumberFormat(locale, formatOptions);
    return formatter.format(num);
  } catch (error) {
    console.error('[Formatter] Number formatting error:', error);
    return String(number);
  }
};

/**
 * Format currency amount with symbol and locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, EUR, etc.)
 * @param {Object} options - Formatting options
 * @param {string} locale - Locale to use
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', options = {}, locale = DEFAULT_LOCALE) => {
  const defaultOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  };
  
  return formatNumber(amount, defaultOptions, locale);
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {Object} options - Formatting options
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, options = {}) => {
  const {
    decimals = 2,
    binary = false,
    locale = DEFAULT_LOCALE
  } = options;
  
  if (bytes === 0) return '0 Bytes';
  
  const k = binary ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = binary
    ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: dm,
    maximumFractionDigits: dm
  });
  
  return `${formatter.format(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)))} ${sizes[i]}`;
};

/**
 * Format percentage with proper rounding and symbols
 * @param {number} value - Percentage value (0-100 or 0-1)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, options = {}) => {
  const {
    decimals = 1,
    includeSymbol = true,
    isDecimal = false, // If value is 0-1 instead of 0-100
    locale = DEFAULT_LOCALE
  } = options;
  
  const percentage = isDecimal ? value * 100 : value;
  const formatted = formatNumber(percentage, {
    style: includeSymbol ? 'percent' : 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }, locale);
  
  return formatted;
};

/**
 * Format phone number for display
 * @param {string} phoneNumber - Raw phone number
 * @param {string} countryCode - Country code for formatting
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber, countryCode = 'US') => {
  if (!phoneNumber) return '';
  
  // Clean the number
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // US/Canada formatting
  if (countryCode === 'US' || countryCode === 'CA') {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
  }
  
  // International formatting
  if (cleaned.length > 10) {
    return `+${cleaned.substring(0, cleaned.length - 10)} ${formatPhoneNumber(cleaned.substring(cleaned.length - 10), 'US')}`;
  }
  
  // Default: just return cleaned version
  return cleaned;
};

/**
 * Format name with proper capitalization
 * @param {string} name - Name to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted name
 */
export const formatName = (name, options = {}) => {
  if (!name) return '';
  
  const {
    case: caseType = 'title', // 'title', 'upper', 'lower'
    trim = true,
    preserveCaseFor = [] // Words to preserve case for (e.g., ['McDonald', 'iPhone'])
  } = options;
  
  let processed = trim ? name.trim() : name;
  
  if (caseType === 'lower') {
    return processed.toLowerCase();
  }
  
  if (caseType === 'upper') {
    return processed.toUpperCase();
  }
  
  // Title case with exceptions
  return processed
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Check if word should preserve its case
      const preserved = preserveCaseFor.find(p => 
        p.toLowerCase() === word.toLowerCase()
      );
      if (preserved) return preserved;
      
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Format email with optional masking
 * @param {string} email - Email address
 * @param {Object} options - Formatting options
 * @returns {string} Formatted email
 */
export const formatEmail = (email, options = {}) => {
  if (!email) return '';
  
  const {
    mask = false,
    maskCharacter = '*',
    showDomain = true
  } = options;
  
  const [localPart, domain] = email.split('@');
  
  if (!mask || !showDomain) {
    return email;
  }
  
  // Mask local part
  const maskedLocal = localPart.length > 2
    ? `${localPart.charAt(0)}${maskCharacter.repeat(3)}${localPart.charAt(localPart.length - 1)}`
    : `${localPart.charAt(0)}${maskCharacter.repeat(2)}`;
  
  return `${maskedLocal}@${domain}`;
};

/**
 * Format social security number (SSN) with masking
 * @param {string} ssn - Social security number
 * @param {Object} options - Formatting options
 * @returns {string} Formatted SSN
 */
export const formatSSN = (ssn, options = {}) => {
  if (!ssn) return '';
  
  const {
    mask = true,
    maskCharacter = '*',
    showLastFour = true
  } = options;
  
  const cleaned = ssn.replace(/\D/g, '');
  
  if (cleaned.length !== 9) {
    console.warn('[Formatter] Invalid SSN length:', cleaned.length);
    return ssn;
  }
  
  if (!mask) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5)}`;
  }
  
  if (showLastFour) {
    return `XXX-XX-${cleaned.substring(5)}`;
  }
  
  return `${maskCharacter.repeat(3)}-${maskCharacter.repeat(2)}-${maskCharacter.repeat(4)}`;
};

/**
 * Format credit card number with masking
 * @param {string} cardNumber - Credit card number
 * @param {Object} options - Formatting options
 * @returns {string} Formatted card number
 */
export const formatCreditCard = (cardNumber, options = {}) => {
  if (!cardNumber) return '';
  
  const {
    mask = true,
    maskCharacter = '*',
    showLastFour = true,
    separator = ' '
  } = options;
  
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (!mask) {
    // Format with separator every 4 digits
    return cleaned.replace(/(\d{4})/g, `$1${separator}`).trim();
  }
  
  if (showLastFour && cleaned.length >= 4) {
    const lastFour = cleaned.substring(cleaned.length - 4);
    const masked = maskCharacter.repeat(Math.max(0, cleaned.length - 4));
    return `${masked}${separator}${lastFour}`;
  }
  
  return maskCharacter.repeat(cleaned.length);
};

/**
 * Format assessment score with grade letter
 * @param {number} score - Score (0-100)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted score with grade
 */
export const formatScore = (score, options = {}) => {
  const {
    showGrade = true,
    showPercentage = true,
    decimals = 1,
    gradingScale = {
      A: 90,
      B: 80,
      C: 70,
      D: 60,
      F: 0
    }
  } = options;
  
  const roundedScore = parseFloat(score.toFixed(decimals));
  
  let grade = '';
  if (showGrade) {
    for (const [letter, threshold] of Object.entries(gradingScale)) {
      if (score >= threshold) {
        grade = letter;
        break;
      }
    }
  }
  
  const parts = [];
  if (showPercentage) {
    parts.push(`${roundedScore}%`);
  }
  if (grade) {
    parts.push(`(${grade})`);
  }
  
  return parts.join(' ');
};

/**
 * Truncate text with ellipsis and word boundary awareness
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {Object} options - Truncation options
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, options = {}) => {
  if (!text || text.length <= maxLength) return text || '';
  
  const {
    ellipsis = '…',
    preserveWords = true,
    preserveTags = false
  } = options;
  
  let truncated = text.substring(0, maxLength);
  
  if (preserveWords) {
    // Find last word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) { // Only truncate at space if it's not too early
      truncated = truncated.substring(0, lastSpace);
    }
  }
  
  if (preserveTags) {
    // Simple HTML tag preservation
    const openTags = (truncated.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (truncated.match(/<\/[^>]+>/g) || []).length;
    
    if (openTags > closeTags) {
      // Add missing closing tags
      const tagsToClose = openTags - closeTags;
      const tagStack = [];
      const tagRegex = /<(\/?)([^\s>]+)/g;
      let match;
      
      while ((match = tagRegex.exec(truncated)) !== null) {
        if (match[1] === '/') {
          tagStack.pop();
        } else {
          tagStack.push(match[2]);
        }
      }
      
      for (let i = 0; i < Math.min(tagsToClose, tagStack.length); i++) {
        const tag = tagStack.pop();
        truncated += `</${tag}>`;
      }
    }
  }
  
  return truncated + ellipsis;
};

/**
 * Format pluralization with proper grammar
 * @param {number} count - Count of items
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, will auto-generate)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted plural string
 */
export const pluralize = (count, singular, plural, options = {}) => {
  const {
    includeNumber = true,
    zeroText = null
  } = options;
  
  if (count === 0 && zeroText) {
    return zeroText;
  }
  
  const actualPlural = plural || `${singular}s`;
  const word = Math.abs(count) === 1 ? singular : actualPlural;
  
  if (!includeNumber) {
    return word;
  }
  
  const formattedNumber = formatNumber(count, 'INTEGER');
  return `${formattedNumber} ${word}`;
};

/**
 * Generate initials from name
 * @param {string} name - Full name
 * @param {Object} options - Formatting options
 * @returns {string} Initials
 */
export const getInitials = (name, options = {}) => {
  if (!name) return '';
  
  const {
    maxInitials = 2,
    separator = '',
    case: caseType = 'upper'
  } = options;
  
  const parts = name.trim().split(/\s+/);
  let initials = '';
  
  for (let i = 0; i < Math.min(maxInitials, parts.length); i++) {
    if (parts[i].length > 0) {
      initials += parts[i].charAt(0);
    }
  }
  
  if (caseType === 'upper') {
    return initials.toUpperCase();
  }
  
  if (caseType === 'lower') {
    return initials.toLowerCase();
  }
  
  return initials;
};

/**
 * Create a slug from text (URL-friendly)
 * @param {string} text - Text to slugify
 * @param {Object} options - Slug options
 * @returns {string} Slug
 */
export const slugify = (text, options = {}) => {
  if (!text) return '';
  
  const {
    separator = '-',
    lowercase = true,
    trim = true
  } = options;
  
  let slug = text;
  
  if (trim) slug = slug.trim();
  if (lowercase) slug = slug.toLowerCase();
  
  // Replace non-alphanumeric characters with separator
  slug = slug.replace(/[^a-z0-9]+/g, separator);
  
  // Remove leading/trailing separators
  slug = slug.replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  
  return slug;
};

/**
 * Format bytes to human-readable storage units
 * @param {number} bytes - Bytes to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted storage
 */
export const formatStorage = (bytes, options = {}) => {
  return formatFileSize(bytes, { binary: true, ...options });
};

/**
 * Format list of items with proper Oxford comma
 * @param {Array} items - Array of items
 * @param {Object} options - Formatting options
 * @returns {string} Formatted list
 */
export const formatList = (items, options = {}) => {
  if (!items || !Array.isArray(items)) return '';
  
  const {
    conjunction = 'and',
    oxfordComma = true,
    maxItems = 0, // 0 = show all
    truncateText = '...'
  } = options;
  
  const visibleItems = maxItems > 0 ? items.slice(0, maxItems) : items;
  const remainingCount = maxItems > 0 ? items.length - maxItems : 0;
  
  if (visibleItems.length === 0) return '';
  if (visibleItems.length === 1) return String(visibleItems[0]);
  
  const allButLast = visibleItems.slice(0, -1);
  const lastItem = visibleItems[visibleItems.length - 1];
  
  let formatted = allButLast.join(', ');
  
  if (oxfordComma && allButLast.length > 1) {
    formatted += ',';
  }
  
  formatted += ` ${conjunction} ${lastItem}`;
  
  if (remainingCount > 0) {
    formatted += `, ${truncateText} (+${remainingCount} more)`;
  }
  
  return formatted;
};

/**
 * Create a consistent formatter instance with custom defaults
 * @param {Object} defaults - Default formatting options
 * @returns {Object} Formatter instance with bound defaults
 */
export const createFormatter = (defaults = {}) => {
  const {
    locale = DEFAULT_LOCALE,
    currency = 'USD',
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } = defaults;
  
  return {
    date: (date, format) => formatDate(date, format, locale),
    relativeTime: (date, options) => formatRelativeTime(date, options, locale),
    number: (number, format) => formatNumber(number, format, locale),
    currency: (amount, options) => formatCurrency(amount, currency, options, locale),
    percentage: (value, options) => formatPercentage(value, { locale, ...options }),
    fileSize: (bytes, options) => formatFileSize(bytes, { locale, ...options }),
    // Bind other formatters with defaults
    ...Object.keys(defaults).reduce((acc, key) => {
      if (typeof defaults[key] === 'object') {
        acc[key] = (value, options) => {
          const formatter = formatters[key];
          return formatter ? formatter(value, { ...defaults[key], ...options }) : value;
        };
      }
      return acc;
    }, {})
  };
};

// Export all formatters
export const formatters = {
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatPercentage,
  formatPhoneNumber,
  formatName,
  formatEmail,
  formatSSN,
  formatCreditCard,
  formatScore,
  truncateText,
  pluralize,
  getInitials,
  slugify,
  formatStorage,
  formatList,
  createFormatter
};

export default formatters;
