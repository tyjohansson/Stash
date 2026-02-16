/**
 * Input parser for different source formats.
 * Handles the command templates: email, Teams chat, meeting notes, batch, quick add.
 */

/**
 * Parse a "Source Detail:" line from the input.
 * @param {string} text
 * @returns {string}
 */
function parseSourceDetail(text) {
  const match = text.match(/Source\s*Detail\s*:\s*(.+)/i);
  return match ? match[1].trim() : '';
}

/**
 * Parse a "Source:" line from the input.
 * @param {string} text
 * @returns {string}
 */
function parseSource(text) {
  const match = text.match(/^Source\s*:\s*(.+)/im);
  return match ? match[1].trim() : '';
}

/**
 * Parse a "Priority:" line from the input.
 * @param {string} text
 * @returns {string|null}
 */
function parsePriority(text) {
  const match = text.match(/Priority\s*:\s*(\w+)/i);
  if (match) {
    const p = match[1].trim();
    const validPriorities = ['Urgent', 'Important', 'Normal', 'Low'];
    const found = validPriorities.find(v => v.toLowerCase() === p.toLowerCase());
    return found || null;
  }
  return null;
}

/**
 * Parse the "Continue task numbering from T-XXX" directive.
 * @param {string} text
 * @returns {number} Starting ID number
 */
function parseStartId(text) {
  const match = text.match(/Continue task numbering from T-(\d+)/i);
  if (match) return parseInt(match[1], 10);

  const matchAlt = text.match(/start (?:at|from|numbering) T-(\d+)/i);
  if (matchAlt) return parseInt(matchAlt[1], 10);

  return 1;
}

/**
 * Parse a meeting date from the source detail or content.
 * @param {string} text
 * @returns {string|null} YYYY-MM-DD or null
 */
function parseMeetingDate(text) {
  // Look for a date in Source Detail line
  const detailMatch = text.match(/Source\s*Detail\s*:.+?(\d{4}-\d{2}-\d{2})/i);
  if (detailMatch) return detailMatch[1];

  const detailMatch2 = text.match(/Source\s*Detail\s*:.+?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (detailMatch2) {
    const parts = detailMatch2[1].split('/');
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }

  return null;
}

/**
 * Strip metadata lines from the raw content, returning just the body text.
 * @param {string} text
 * @returns {string}
 */
function stripMetadata(text) {
  return text
    .replace(/^Source\s*:\s*.+$/gim, '')
    .replace(/^Source\s*Detail\s*:\s*.+$/gim, '')
    .replace(/^Priority\s*:\s*.+$/gim, '')
    .replace(/^Continue task numbering from T-\d+$/gim, '')
    .replace(/^---+$/gm, '')
    .trim();
}

/**
 * Parse a single-source input block (email, Teams, meeting, ad hoc).
 * @param {string} rawInput
 * @returns {object} Parsed input with { body, source, sourceDetail, startId, meetingDate, priority }
 */
export function parseSingleInput(rawInput) {
  const source = parseSource(rawInput) || 'Other';
  const sourceDetail = parseSourceDetail(rawInput);
  const startId = parseStartId(rawInput);
  const meetingDate = source.toLowerCase().includes('meeting') ? parseMeetingDate(rawInput) : null;
  const priority = parsePriority(rawInput);
  const body = stripMetadata(rawInput);

  return { body, source, sourceDetail, startId, meetingDate, priority };
}

/**
 * Parse a batch input containing multiple source blocks.
 * @param {string} rawInput
 * @returns {object[]} Array of parsed inputs
 */
export function parseBatchInput(rawInput) {
  const blocks = [];
  const startId = parseStartId(rawInput);

  // Split on labeled separators: --- EMAIL ---, --- TEAMS CHAT ---, --- MEETING NOTES ---
  const sectionPattern = /---\s*(EMAIL|TEAMS?\s*CHAT|MEETING\s*NOTES?|SLACK|PHONE\s*CALL|DOCUMENT|AD\s*HOC|OTHER)\s*---/gi;
  const sections = [];
  let lastIndex = 0;
  let match;

  // Collect all section markers
  const markers = [];
  while ((match = sectionPattern.exec(rawInput)) !== null) {
    markers.push({ label: match[1].trim(), index: match.index, endIndex: match.index + match[0].length });
  }

  if (markers.length === 0) {
    // No batch markers — treat as single input
    return [parseSingleInput(rawInput)];
  }

  // Map section labels to valid source types
  const sourceMap = {
    'EMAIL': 'Email',
    'TEAMS CHAT': 'Teams Chat',
    'TEAM CHAT': 'Teams Chat',
    'MEETING NOTES': 'Meeting',
    'MEETING NOTE': 'Meeting',
    'SLACK': 'Slack',
    'PHONE CALL': 'Phone Call',
    'DOCUMENT': 'Document',
    'AD HOC': 'Ad Hoc',
    'OTHER': 'Other',
  };

  let currentId = startId;

  for (let i = 0; i < markers.length; i++) {
    const sectionStart = markers[i].endIndex;
    const sectionEnd = i + 1 < markers.length ? markers[i + 1].index : rawInput.length;
    const sectionText = rawInput.substring(sectionStart, sectionEnd).trim();

    const source = sourceMap[markers[i].label.toUpperCase()] || 'Other';
    const sourceDetail = parseSourceDetail(sectionText);
    const meetingDate = source === 'Meeting' ? parseMeetingDate(sectionText) : null;
    const priority = parsePriority(sectionText);
    const body = stripMetadata(sectionText);

    blocks.push({
      body,
      source,
      sourceDetail,
      startId: currentId,
      meetingDate,
      priority,
    });

    // We'll update currentId after extraction to chain numbering
  }

  return blocks;
}

/**
 * Parse a quick-add input (bullet list of tasks).
 * @param {string} rawInput
 * @returns {object} Parsed input
 */
export function parseQuickAdd(rawInput) {
  const source = parseSource(rawInput) || 'Ad Hoc';
  const sourceDetail = parseSourceDetail(rawInput) || '';
  const startId = parseStartId(rawInput);
  const priority = parsePriority(rawInput);

  // Extract the task items from bullet lines
  const lines = rawInput.split('\n');
  const taskLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Match "- task" style bullets
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      taskLines.push(bulletMatch[1].trim());
      continue;
    }
    // Match "1. task" or "1) task"
    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numMatch) {
      taskLines.push(numMatch[1].trim());
    }
  }

  const body = taskLines.length > 0
    ? taskLines.map(t => `- ${t}`).join('\n')
    : stripMetadata(rawInput);

  return { body, source, sourceDetail, startId, meetingDate: null, priority };
}

/**
 * Detect input type from content and parse accordingly.
 * @param {string} rawInput
 * @returns {{ type: string, blocks: object[] }}
 */
export function detectAndParse(rawInput) {
  const lower = rawInput.toLowerCase();

  // Batch: contains multiple section markers
  if (/---\s*(?:email|teams?\s*chat|meeting\s*notes?|slack|phone\s*call)\s*---/i.test(rawInput)) {
    return { type: 'batch', blocks: parseBatchInput(rawInput) };
  }

  // Quick add: starts with "Add these quick tasks" or similar
  if (/^(?:add these|quick add|add tasks|quick tasks)/i.test(lower.trim())) {
    return { type: 'quick', blocks: [parseQuickAdd(rawInput)] };
  }

  // Single source detection
  if (/extract tasks from this email/i.test(lower)) {
    const parsed = parseSingleInput(rawInput);
    parsed.source = parsed.source === 'Other' ? 'Email' : parsed.source;
    return { type: 'email', blocks: [parsed] };
  }

  if (/extract tasks from this teams/i.test(lower)) {
    const parsed = parseSingleInput(rawInput);
    parsed.source = parsed.source === 'Other' ? 'Teams Chat' : parsed.source;
    return { type: 'teams', blocks: [parsed] };
  }

  if (/extract tasks from these meeting/i.test(lower)) {
    const parsed = parseSingleInput(rawInput);
    parsed.source = parsed.source === 'Other' ? 'Meeting' : parsed.source;
    return { type: 'meeting', blocks: [parsed] };
  }

  // Default: treat as single generic input
  return { type: 'generic', blocks: [parseSingleInput(rawInput)] };
}
