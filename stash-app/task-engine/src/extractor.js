/**
 * Core task extraction engine.
 * Parses raw text and extracts structured, actionable tasks.
 */

import { todayStr, inferDueDate } from './date-utils.js';
import { assignPriority } from './priority.js';
import { detectStatus } from './status.js';
import { assignCategory } from './category.js';

/**
 * Action verbs used to identify and normalize task descriptions.
 */
const ACTION_VERBS = [
  'draft', 'review', 'schedule', 'send', 'follow up', 'prepare',
  'coordinate', 'update', 'create', 'analyze', 'finalize', 'submit',
  'complete', 'organize', 'plan', 'set up', 'arrange', 'confirm',
  'distribute', 'compile', 'research', 'write', 'edit', 'approve',
  'share', 'present', 'check', 'book', 'order', 'track', 'assign',
  'implement', 'design', 'build', 'test', 'deploy', 'fix', 'resolve',
  'escalate', 'notify', 'brief', 'summarize', 'document', 'gather',
  'collect', 'reach out', 'connect', 'meet', 'discuss', 'address',
  'respond', 'reply', 'forward', 'circulate', 'publish', 'launch',
  'migrate', 'transfer', 'onboard', 'train', 'mentor', 'facilitate',
];

/**
 * Patterns that signal an actionable task in text.
 */
const TASK_SIGNAL_PATTERNS = [
  // Direct requests
  /can you\s+(.+?)(?:\?|$)/i,
  /could you\s+(.+?)(?:\?|$)/i,
  /please\s+(.+?)(?:\.|$)/i,
  /we need (?:to )?(.+?)(?:\.|$)/i,
  /you need to\s+(.+?)(?:\.|$)/i,
  /make sure (?:to )?(.+?)(?:\.|$)/i,
  /be sure to\s+(.+?)(?:\.|$)/i,
  /don't forget to\s+(.+?)(?:\.|$)/i,
  /remember to\s+(.+?)(?:\.|$)/i,

  // Implied tasks
  /it would be great if\s+(.+?)(?:\.|$)/i,
  /it'd be great if\s+(.+?)(?:\.|$)/i,
  /we should\s+(.+?)(?:\.|$)/i,
  /i think we should\s+(.+?)(?:\.|$)/i,
  /we(?:'d| would) like (?:to )?(.+?)(?:\.|$)/i,
  /let's\s+(.+?)(?:\.|$)/i,
  /it(?:'d| would) be (?:good|nice|helpful|great) (?:to|if)\s+(.+?)(?:\.|$)/i,
  /might want to\s+(.+?)(?:\.|$)/i,
  /consider\s+(.+?)(?:\.|$)/i,

  // Commitments
  /i'll\s+(.+?)(?:\.|$)/i,
  /i will\s+(.+?)(?:\.|$)/i,
  /i(?:'m| am) going to\s+(.+?)(?:\.|$)/i,
  /let me\s+(.+?)(?:\.|$)/i,
  /i(?:'ll| will) take care of\s+(.+?)(?:\.|$)/i,
  /i can\s+(.+?)(?:\.|$)/i,

  // Work in progress / started (stop at conjunctions like "but", "however")
  /i (?:started|began) (?:on |working on )?(.+?)(?:\s+but\b|\s+however\b|\.|$)/i,
  /(?:already|have) (?:started|begun) (?:on |working on )?(.+?)(?:\s+but\b|\s+however\b|\.|$)/i,

  // Third-person wants/requests (skip if captured text contains unresolvable pronouns)
  /(?:the )?\b(?:CEO|CFO|COO|CTO|director|manager|partner|leader)\b.*?(?:wants?|requested?|asked for|expects?)\s+(?:us |you |me )?(?:to )?(.+?)(?:\.|$)/i,
  /\w+ (?:wants?|requested?|asked for|expects?)\s+(?:us |you |me )?(?:to )?(.+?)(?:\.|$)/i,

  // Decisions requiring action
  /let's go with\s+(.+?)(?:\.|$)/i,
  /(?:we )?decided (?:to|on)\s+(.+?)(?:\.|$)/i,
  /the plan is to\s+(.+?)(?:\.|$)/i,
  /moving forward with\s+(.+?)(?:\.|$)/i,
  /agreed to\s+(.+?)(?:\.|$)/i,

  // Third-person delegation
  /(?:@\w+|(?:\w+ )?(?:will|needs? to|should|must))\s+(.+?)(?:\.|$)/i,
  /\[\w+\]\s+(.+?)(?:\.|$)/i,

  // Deadline-implied tasks
  /(?:the |this )?(.+?) is due\s+(.+?)(?:\.|$)/i,
  /deadline for (.+?) is\s+(.+?)(?:\.|$)/i,
  /(.+?) (?:needs to|must) be (?:done|completed|submitted|ready)\s+(.+?)(?:\.|$)/i,
];

/**
 * Bullet/list patterns for structured input.
 */
const BULLET_PATTERN = /^[\s]*[-•*]\s+(.+)$/;
const NUMBERED_PATTERN = /^[\s]*\d+[.)]\s+(.+)$/;
const ACTION_ITEM_PATTERN = /^[\s]*(?:action item|AI|todo|task|to-do)[:\s]+(.+)$/i;

/**
 * Extract the owner from a task line if mentioned.
 * @param {string} text
 * @returns {{ owner: string, cleanText: string }}
 */
function extractOwner(text) {
  // Patterns: "@Person", "[Person]", "Owner: Person", "assigned to Person"
  const ownerPatterns = [
    /\[@?(\w+(?:\s\w+)?)\]/,
    /@([A-Z]\w*)/,  // @Name — capture only the capitalized name word
    /(?:owner|assigned to|assign to|responsible)[:\s]+(\w+(?:\s\w+)?)/i,
    /\((\w+)\)\s*$/,
  ];

  for (const pattern of ownerPatterns) {
    const match = text.match(pattern);
    if (match) {
      const owner = match[1].trim();
      const cleanText = text.replace(match[0], '').trim();
      return { owner, cleanText };
    }
  }

  // Check for commitment language → "I" = Tyler
  if (/^(?:i'll|i will|i'm going to|let me|i can)\s/i.test(text)) {
    return { owner: 'Tyler', cleanText: text };
  }

  return { owner: 'Tyler', cleanText: text };
}

/**
 * Clean and normalize a task description.
 * Ensures it starts with an action verb and is 10-80 chars.
 * @param {string} raw
 * @returns {string}
 */
function normalizeTaskDescription(raw) {
  let desc = raw.trim();

  // Remove common prefixes
  desc = desc
    .replace(/^(?:can you|could you|please|we need to|you need to|make sure to|i'll|i will|let me|i'm going to|i am going to|i can|let's|we should)\s+/i, '')
    .trim();

  // Capitalize first letter
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);

  // Verify it starts with a verb-like word; if not, try prepending a relevant verb
  const startsWithVerb = ACTION_VERBS.some(v =>
    desc.toLowerCase().startsWith(v)
  );
  if (!startsWithVerb) {
    // Try to infer an appropriate verb
    if (/email|message|note|response|reply/i.test(desc)) {
      desc = 'Send ' + desc.charAt(0).toLowerCase() + desc.slice(1);
    } else if (/meeting|call|session|sync/i.test(desc)) {
      desc = 'Schedule ' + desc.charAt(0).toLowerCase() + desc.slice(1);
    } else if (/report|document|proposal|plan|brief|assessment|analysis|presentation|deck/i.test(desc)) {
      desc = 'Complete ' + desc.charAt(0).toLowerCase() + desc.slice(1);
    } else if (/(?:take care of|handle)\b/i.test(desc)) {
      desc = desc.replace(/(?:take care of|handle)\s*/i, 'Complete ');
    } else if (/^the\s/i.test(desc)) {
      // Generic "the X" → "Complete X"
      desc = 'Complete ' + desc.replace(/^the\s+/i, '');
    }
  }

  // Truncate to 80 chars max
  if (desc.length > 80) {
    desc = desc.substring(0, 77) + '...';
  }

  // Ensure minimum length
  if (desc.length < 10) {
    desc = desc + ' (see notes for details)';
  }

  // Clean up trailing punctuation from sentence extraction
  desc = desc.replace(/[,;:]+$/, '').trim();

  return desc;
}

/**
 * Check if an extracted description is too vague to be actionable.
 * Filters out pronoun-heavy phrases like "see it before distribution".
 * @param {string} text
 * @returns {boolean}
 */
function isVagueDescription(text) {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // If very short (1-3 words) and mostly pronouns/articles, skip
  const vagueWords = new Set(['it', 'this', 'that', 'them', 'they', 'he', 'she', 'the', 'a', 'an', 'to', 'is', 'are', 'was', 'be']);
  if (words.length <= 4) {
    const vagueCount = words.filter(w => vagueWords.has(w)).length;
    if (vagueCount / words.length > 0.5) return true;
  }

  // Descriptions that are just "see it", "do it", "handle it" etc.
  if (/^(?:see|do|handle|get|check|look at) (?:it|this|that)\b/i.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Split text into meaningful segments (sentences, bullets, lines).
 * @param {string} text
 * @returns {string[]}
 */
function segmentText(text) {
  const lines = text.split('\n');
  const segments = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for bullet or numbered items
    const bulletMatch = trimmed.match(BULLET_PATTERN);
    if (bulletMatch) {
      segments.push(bulletMatch[1].trim());
      continue;
    }

    const numberedMatch = trimmed.match(NUMBERED_PATTERN);
    if (numberedMatch) {
      segments.push(numberedMatch[1].trim());
      continue;
    }

    const actionMatch = trimmed.match(ACTION_ITEM_PATTERN);
    if (actionMatch) {
      segments.push(actionMatch[1].trim());
      continue;
    }

    // Split on sentence boundaries for paragraph text
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (sentence.trim()) segments.push(sentence.trim());
    }
  }

  return segments;
}

/**
 * Check if a segment contains an actionable task signal.
 * @param {string} segment
 * @returns {{ isTask: boolean, extracted: string }}
 */
function detectTask(segment) {
  // Check bullet/list items — these are almost always actionable
  if (BULLET_PATTERN.test(segment) || NUMBERED_PATTERN.test(segment) || ACTION_ITEM_PATTERN.test(segment)) {
    return { isTask: true, extracted: segment };
  }

  // Check for task signal patterns
  for (const pattern of TASK_SIGNAL_PATTERNS) {
    const match = segment.match(pattern);
    if (match) {
      // Use the last capture group (some patterns have multiple groups)
      const extracted = match[match.length - 1] || match[1] || segment;
      return { isTask: true, extracted: extracted.trim() };
    }
  }

  // Check if it starts with an action verb
  const lower = segment.toLowerCase();
  for (const verb of ACTION_VERBS) {
    if (lower.startsWith(verb + ' ') || lower.startsWith(verb + '\t')) {
      return { isTask: true, extracted: segment };
    }
  }

  return { isTask: false, extracted: segment };
}

/**
 * Main extraction function.
 * @param {string} rawText - Raw input text
 * @param {object} options
 * @param {string} [options.source] - Source type (Email, Teams Chat, Meeting, etc.)
 * @param {string} [options.sourceDetail] - Specific source reference
 * @param {number} [options.startId] - Starting task number (default 1)
 * @param {Date} [options.referenceDate] - Reference date for due date inference
 * @param {string} [options.meetingDate] - Meeting date if source is a meeting (YYYY-MM-DD)
 * @param {string} [options.defaultOwner] - Default owner (default "Tyler")
 * @param {string} [options.defaultPriority] - Override priority for all tasks
 * @returns {object[]} Array of task objects
 */
export function extractTasks(rawText, options = {}) {
  const {
    source = 'Other',
    sourceDetail = '',
    startId = 1,
    referenceDate,
    meetingDate,
    defaultOwner = 'Tyler',
    defaultPriority,
  } = options;

  const ref = referenceDate || new Date();
  const today = todayStr(ref);
  const segments = segmentText(rawText);
  const tasks = [];
  let idCounter = startId;

  for (const segment of segments) {
    // Extract owner from the raw segment first, so @mentions don't interfere with detection
    const { owner, cleanText: ownerStripped } = extractOwner(segment);
    const { isTask, extracted } = detectTask(ownerStripped);
    if (!isTask) continue;

    const description = normalizeTaskDescription(extracted);

    // Skip tasks whose extracted description is too vague (pronoun-heavy, no nouns)
    if (isVagueDescription(extracted)) continue;

    const dueDate = inferDueDate(segment, ref, meetingDate);
    const priority = defaultPriority || assignPriority(segment, dueDate, ref);
    const status = detectStatus(segment);
    const category = assignCategory(description, segment);

    const taskId = `T-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    tasks.push({
      taskId,
      task: description,
      source,
      sourceDetail,
      owner: owner || defaultOwner,
      dueDate,
      priority,
      status,
      category,
      notes: '',
      dateAdded: today,
    });
  }

  // Deduplicate very similar tasks (same normalized description)
  return deduplicateTasks(tasks);
}

/**
 * Remove duplicate tasks based on similar descriptions.
 * @param {object[]} tasks
 * @returns {object[]}
 */
function deduplicateTasks(tasks) {
  const seen = new Set();
  const result = [];
  let idCounter = tasks.length > 0 ? parseInt(tasks[0].taskId.replace('T-', ''), 10) : 1;

  for (const task of tasks) {
    const normalized = task.task.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // Re-assign sequential IDs after dedup
    task.taskId = `T-${String(idCounter).padStart(3, '0')}`;
    idCounter++;
    result.push(task);
  }

  return result;
}
