/**
 * Date utility functions for task due date inference.
 */

/**
 * Get today's date as YYYY-MM-DD string.
 * @param {Date} [referenceDate] - Optional reference date (for testing)
 * @returns {string}
 */
export function todayStr(referenceDate) {
  const d = referenceDate || new Date();
  return formatDate(d);
}

/**
 * Format a Date object as YYYY-MM-DD.
 * @param {Date} d
 * @returns {string}
 */
export function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add calendar days to a date.
 * @param {Date} d
 * @param {number} days
 * @returns {Date}
 */
export function addDays(d, days) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add business days to a date (skips weekends).
 * @param {Date} d
 * @param {number} bizDays
 * @returns {Date}
 */
export function addBusinessDays(d, bizDays) {
  const result = new Date(d);
  let added = 0;
  while (added < bizDays) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}

/**
 * Get the Friday of the current week (or this Friday if today is before Friday).
 * @param {Date} d
 * @returns {Date}
 */
export function thisFriday(d) {
  const result = new Date(d);
  const dow = result.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - dow + 7) % 7 || 7;
  // If today is Friday, return today
  if (dow === 5) return result;
  result.setDate(result.getDate() + daysUntilFriday);
  return result;
}

/**
 * Get the following Monday.
 * @param {Date} d
 * @returns {Date}
 */
export function nextMonday(d) {
  const result = new Date(d);
  const dow = result.getDay(); // 0=Sun, 1=Mon
  const daysUntilMonday = (1 - dow + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilMonday);
  return result;
}

/**
 * Get the last business day of the current month.
 * @param {Date} d
 * @returns {Date}
 */
export function lastBusinessDayOfMonth(d) {
  const result = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day of month
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() - 1);
  }
  return result;
}

/**
 * Parse an explicit date from text. Supports:
 *  - YYYY-MM-DD
 *  - MM/DD/YYYY, MM-DD-YYYY
 *  - Month DD, YYYY / Month DD
 *  - "March 1", "March 1st", "Jan 15th"
 * @param {string} text
 * @param {Date} [referenceDate]
 * @returns {string|null} YYYY-MM-DD or null
 */
export function parseExplicitDate(text, referenceDate) {
  const ref = referenceDate || new Date();

  // YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const usMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (usMatch) {
    return `${usMatch[3]}-${String(usMatch[1]).padStart(2, '0')}-${String(usMatch[2]).padStart(2, '0')}`;
  }

  // Month DD, YYYY or Month DDth/st/nd/rd, YYYY or Month DD (no year)
  const months = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const monthPattern = Object.keys(months).join('|');
  const dateRegex = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?\\b`,
    'i'
  );
  const monthMatch = text.match(dateRegex);
  if (monthMatch) {
    const monthIdx = months[monthMatch[1].toLowerCase()];
    const day = parseInt(monthMatch[2], 10);
    const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : ref.getFullYear();
    const d = new Date(year, monthIdx, day);
    // If parsed date is in the past and no year was specified, push to next year
    if (!monthMatch[3] && d < ref) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return formatDate(d);
  }

  return null;
}

/**
 * Infer a due date from text based on urgency signals.
 * @param {string} text - The source text
 * @param {Date} [referenceDate] - Reference date (defaults to today)
 * @param {string} [meetingDateStr] - Meeting date if applicable (YYYY-MM-DD)
 * @returns {string} YYYY-MM-DD or "TBD"
 */
export function inferDueDate(text, referenceDate, meetingDateStr) {
  const ref = referenceDate || new Date();
  const lower = text.toLowerCase();

  // Check for explicit dates first
  const explicit = parseExplicitDate(text, ref);
  if (explicit) return explicit;

  // ASAP / urgent / right away → tomorrow
  if (/\basap\b|right away|immediately|urgent(?:ly)?/i.test(lower)) {
    return formatDate(addDays(ref, 1));
  }

  // "end of week" / "this week" / "by Friday" → this Friday
  if (/end of (?:the )?week|this week|by friday|before (?:the )?weekend/i.test(lower)) {
    return formatDate(thisFriday(ref));
  }

  // "next week" → following Monday
  if (/next week/i.test(lower)) {
    return formatDate(nextMonday(ref));
  }

  // "end of month" / "by month end" / "this month" → last business day of month
  if (/end of (?:the )?month|by month.?end|this month/i.test(lower)) {
    return formatDate(lastBusinessDayOfMonth(ref));
  }

  // "tomorrow" → next day
  if (/\btomorrow\b/i.test(lower)) {
    return formatDate(addDays(ref, 1));
  }

  // "today" → today
  if (/\btoday\b|by (?:end of|close of) (?:business|day)/i.test(lower)) {
    return formatDate(ref);
  }

  // Meeting-related follow-ups → 2 business days after meeting
  if (meetingDateStr) {
    const meetingDate = new Date(meetingDateStr + 'T00:00:00');
    return formatDate(addBusinessDays(meetingDate, 2));
  }

  // "soon" → 7 days from today
  if (/\bsoon\b|when you (?:get a chance|have time)|at your convenience/i.test(lower)) {
    return formatDate(addDays(ref, 7));
  }

  // Default: 7 days from today for items with some action signal, TBD otherwise
  return 'TBD';
}
