/**
 * Status detection logic for extracted tasks.
 */

/**
 * Detect task status from source text.
 * @param {string} text - The source text
 * @returns {"Not Started"|"In Progress"|"Blocked"|"Waiting"|"Complete"}
 */
export function detectStatus(text) {
  const lower = text.toLowerCase();

  // Complete
  if (/\bcompleted?\b|\bdone\b|\bfinished\b|\bwrapped up\b|\bclosed\b/i.test(lower)) {
    // Only if it clearly refers to this task being done
    if (/(?:already|is|was|been|it's|its|that's) (?:completed?|done|finished)/i.test(lower)) {
      return 'Complete';
    }
  }

  // Blocked
  const blockedPatterns = [
    /can't proceed/,
    /cannot proceed/,
    /blocked by/,
    /waiting on (?:approval|sign.?off|access|permissions?)/,
    /stuck on/,
    /depends on .+ (?:first|before)/,
    /need .+ before/,
    /pending (?:approval|review|access)/,
  ];
  if (blockedPatterns.some(p => p.test(lower))) return 'Blocked';

  // Waiting
  const waitingPatterns = [
    /waiting (?:on|for)/,
    /once (?:they|he|she|\w+) (?:sends?|provides?|confirms?|gets? back|responds?|replies?)/,
    /after (?:they|he|she|\w+) (?:sends?|reviews?|approves?)/,
    /pending (?:their|his|her) (?:response|reply|feedback|input)/,
    /need (?:to hear|a response|feedback|input) from/,
  ];
  if (waitingPatterns.some(p => p.test(lower))) return 'Waiting';

  // In Progress
  const inProgressPatterns = [
    /i(?:'ve| have) started/,
    /i(?:'m| am) working on/,
    /already (?:started|working|began|begun)/,
    /in progress/,
    /first draft/,
    /here's (?:a |my |the )?(?:draft|start|version)/,
    /i(?:'ve| have) begun/,
    /halfway (?:through|done)/,
    /partially (?:done|complete)/,
  ];
  if (inProgressPatterns.some(p => p.test(lower))) return 'In Progress';

  return 'Not Started';
}
