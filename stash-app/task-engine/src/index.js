/**
 * Task Extraction Engine — Main entry point.
 *
 * Parses raw input from emails, Teams chats, meeting notes, ad hoc requests
 * and extracts structured tasks into CSV/Excel-compatible format.
 */

import { extractTasks } from './extractor.js';
import { formatOutput, toMarkdownTable, toCsv } from './formatter.js';
import { detectAndParse } from './input-parser.js';

/**
 * Process raw input and return formatted extracted tasks.
 * @param {string} rawInput - The raw input text with optional command template metadata
 * @param {object} [options]
 * @param {Date} [options.referenceDate] - Reference date for inference (defaults to today)
 * @param {string} [options.defaultOwner] - Default task owner (defaults to "Tyler")
 * @returns {{ tasks: object[], output: string }}
 */
export function processInput(rawInput, options = {}) {
  const { referenceDate, defaultOwner = 'Tyler' } = options;
  const { type, blocks } = detectAndParse(rawInput);

  let allTasks = [];
  let currentStartId = blocks[0]?.startId || 1;

  for (const block of blocks) {
    const tasks = extractTasks(block.body, {
      source: block.source,
      sourceDetail: block.sourceDetail,
      startId: currentStartId,
      referenceDate,
      meetingDate: block.meetingDate,
      defaultOwner,
      defaultPriority: block.priority,
    });

    allTasks = allTasks.concat(tasks);
    currentStartId += tasks.length;
  }

  // Re-number all tasks sequentially
  const baseId = blocks[0]?.startId || 1;
  allTasks.forEach((task, i) => {
    task.taskId = `T-${String(baseId + i).padStart(3, '0')}`;
  });

  const output = formatOutput(allTasks);

  return { tasks: allTasks, output };
}

/**
 * Process and return only the markdown table.
 * @param {string} rawInput
 * @param {object} [options]
 * @returns {string}
 */
export function processToTable(rawInput, options = {}) {
  const { tasks } = processInput(rawInput, options);
  return toMarkdownTable(tasks);
}

/**
 * Process and return only the CSV.
 * @param {string} rawInput
 * @param {object} [options]
 * @returns {string}
 */
export function processToCsv(rawInput, options = {}) {
  const { tasks } = processInput(rawInput, options);
  return toCsv(tasks);
}

// Re-export utilities for direct use
export { extractTasks } from './extractor.js';
export { formatOutput, toMarkdownTable, toCsv } from './formatter.js';
export { detectAndParse, parseSingleInput, parseBatchInput, parseQuickAdd } from './input-parser.js';
export { inferDueDate, todayStr } from './date-utils.js';
export { assignPriority } from './priority.js';
export { detectStatus } from './status.js';
export { assignCategory } from './category.js';
