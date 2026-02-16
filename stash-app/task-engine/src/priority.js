/**
 * Priority assignment logic for extracted tasks.
 */

/**
 * Determine task priority based on text signals and due date proximity.
 * @param {string} text - The source text containing the task
 * @param {string} dueDate - Inferred due date (YYYY-MM-DD or "TBD")
 * @param {Date} [referenceDate] - Reference date for calculating proximity
 * @returns {"Urgent"|"Important"|"Normal"|"Low"}
 */
export function assignPriority(text, dueDate, referenceDate) {
  const ref = referenceDate || new Date();
  const lower = text.toLowerCase();

  // Check for Low signals first (they negate urgent keywords like "not urgent")
  const lowPatterns = [
    /\bfyi\b/,
    /nice.?to.?have/,
    /when you (?:get a chance|have time)/,
    /no rush/,
    /low priority/,
    /at your convenience/,
    /not urgent/,
    /long.?term/,
    /eventually/,
    /someday/,
    /back.?burner/,
  ];
  if (lowPatterns.some(p => p.test(lower))) return 'Low';

  // Urgent signals
  const urgentPatterns = [
    /\burgent(?:ly)?\b/,
    /\basap\b/,
    /right away/,
    /immediately/,
    /critical/,
    /blocker/,
    /blocking/,
    /escalat/,
    /time.?sensitive/,
    /drop everything/,
    /top priority/,
    /highest priority/,
    /can't wait/,
    /cannot wait/,
  ];
  if (urgentPatterns.some(p => p.test(lower))) return 'Urgent';

  // Executive-level requests
  if (/\b(?:ceo|cfo|coo|cto|managing director|partner|exec(?:utive)?|senior partner|c-suite)\b/i.test(lower)) {
    return 'Urgent';
  }

  // Check due date proximity
  if (dueDate && dueDate !== 'TBD') {
    const due = new Date(dueDate + 'T00:00:00');
    const diffMs = due.getTime() - ref.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 2) return 'Urgent';
    if (diffDays <= 14) return 'Important';
  }

  // Important signals
  const importantPatterns = [
    /\bimportant\b/,
    /\bkey deliverable\b/,
    /stakeholder/,
    /presentation/,
    /\bdeliverable\b/,
    /client.?facing/,
    /leadership/,
    /\bvisible\b/,
    /high.?priority/,
  ];
  if (importantPatterns.some(p => p.test(lower))) return 'Important';

  return 'Normal';
}
