/**
 * Output formatting for extracted tasks.
 * Produces markdown tables and CSV blocks.
 */

const HEADERS = [
  'Task ID', 'Task', 'Source', 'Source Detail', 'Owner',
  'Due Date', 'Priority', 'Status', 'Category', 'Notes', 'Date Added'
];

const FIELD_KEYS = [
  'taskId', 'task', 'source', 'sourceDetail', 'owner',
  'dueDate', 'priority', 'status', 'category', 'notes', 'dateAdded'
];

/**
 * Escape pipe characters for markdown tables.
 * @param {string} val
 * @returns {string}
 */
function escapeMarkdown(val) {
  return String(val || '').replace(/\|/g, '\\|');
}

/**
 * Escape commas and quotes for CSV.
 * @param {string} val
 * @returns {string}
 */
function escapeCsv(val) {
  const str = String(val || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format tasks as a markdown table.
 * @param {object[]} tasks - Array of task objects
 * @returns {string}
 */
export function toMarkdownTable(tasks) {
  if (tasks.length === 0) return '_No tasks extracted._';

  const headerRow = '| ' + HEADERS.join(' | ') + ' |';
  const separatorRow = '|' + HEADERS.map(() => '------').join('|') + '|';

  const dataRows = tasks.map(task => {
    const cells = FIELD_KEYS.map(key => escapeMarkdown(task[key]));
    return '| ' + cells.join(' | ') + ' |';
  });

  return [headerRow, separatorRow, ...dataRows].join('\n');
}

/**
 * Format tasks as a CSV string.
 * @param {object[]} tasks - Array of task objects
 * @returns {string}
 */
export function toCsv(tasks) {
  const headerLine = HEADERS.join(',');
  const dataLines = tasks.map(task => {
    return FIELD_KEYS.map(key => escapeCsv(task[key])).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Generate a priority breakdown summary.
 * @param {object[]} tasks
 * @returns {string}
 */
function prioritySummary(tasks) {
  const counts = { Urgent: 0, Important: 0, Normal: 0, Low: 0 };
  for (const t of tasks) {
    counts[t.priority] = (counts[t.priority] || 0) + 1;
  }
  return `Urgent: ${counts.Urgent}, Important: ${counts.Important}, Normal: ${counts.Normal}, Low: ${counts.Low}`;
}

/**
 * Identify ambiguous items and explain categorization.
 * @param {object[]} tasks
 * @returns {string}
 */
function ambiguityNotes(tasks) {
  const notes = [];
  for (const t of tasks) {
    if (t.dueDate === 'TBD') {
      notes.push(`- **${t.taskId}**: No date signal found; due date set to TBD, priority defaulted to ${t.priority}`);
    }
    if (t.category === 'Other') {
      notes.push(`- **${t.taskId}**: "${t.task}" did not match a specific work category; classified as Other`);
    }
  }
  return notes.length > 0 ? notes.join('\n') : '_None — all tasks were clearly categorizable._';
}

/**
 * Generate the full formatted output including table, CSV, and summary.
 * @param {object[]} tasks
 * @returns {string}
 */
export function formatOutput(tasks) {
  const parts = [];

  parts.push('### Table View');
  parts.push(toMarkdownTable(tasks));
  parts.push('');

  parts.push('### CSV Import Block');
  parts.push('```csv');
  parts.push(toCsv(tasks));
  parts.push('```');
  parts.push('');

  parts.push('### Summary');
  parts.push(`1. **Total tasks extracted:** ${tasks.length}`);
  parts.push(`2. **Breakdown by priority:** ${prioritySummary(tasks)}`);
  parts.push(`3. **Ambiguous items:**`);
  parts.push(ambiguityNotes(tasks));

  return parts.join('\n');
}
