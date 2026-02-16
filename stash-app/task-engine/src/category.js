/**
 * Category mapping logic for Tyler's work areas.
 */

const CATEGORY_PATTERNS = [
  {
    category: 'Well-Being Initiative',
    patterns: [
      /well.?being/i,
      /wellness/i,
      /happiness index/i,
      /mental health/i,
      /mindfulness/i,
      /well-being program/i,
      /resilience/i,
      /self.?care/i,
      /burnout/i,
      /employee wellness/i,
    ],
  },
  {
    category: 'Listening Tour',
    patterns: [
      /listening (?:tour|session)/i,
      /capacity.?building/i,
      /leadership conversation/i,
      /tour logistics/i,
      /listening meeting/i,
      /town hall/i,
      /feedback session/i,
      /pulse (?:check|survey)/i,
    ],
  },
  {
    category: 'Leadership Support',
    patterns: [
      /people leader/i,
      /leadership support/i,
      /exec(?:utive)? comm/i,
      /briefing/i,
      /leader(?:ship)? (?:prep|readiness|meeting|call)/i,
      /talking points/i,
      /chief of staff/i,
      /leadership team/i,
    ],
  },
  {
    category: 'Newsletter',
    patterns: [
      /newsletter/i,
      /well.?being (?:email|digest|content|article|curate|curation)/i,
      /distribution list/i,
      /email blast/i,
      /content curation/i,
    ],
  },
  {
    category: 'Change Management',
    patterns: [
      /change management/i,
      /transformation/i,
      /change readiness/i,
      /adoption/i,
      /transition plan/i,
      /reorg(?:anization)?/i,
      /restructur/i,
      /change (?:initiative|program|plan)/i,
    ],
  },
  {
    category: 'Admin',
    patterns: [
      /schedul(?:e|ing)/i,
      /logistics/i,
      /book(?:ing)? (?:a |the )?(?:room|conference|space|flight|travel|hotel)/i,
      /calendar/i,
      /expense report/i,
      /time(?:sheet|card)/i,
      /procurement/i,
      /order(?:ing)? (?:supplies|equipment)/i,
      /set up (?:a |the )?meeting/i,
      /send (?:an? )?(?:invite|invitation)/i,
    ],
  },
  {
    category: 'Client Work',
    patterns: [
      /client/i,
      /external.?facing/i,
      /advisory/i,
      /engagement/i,
      /deliverable for/i,
      /project (?:plan|proposal|scope)/i,
      /statement of work/i,
      /SOW\b/,
    ],
  },
  {
    category: 'Personal Dev',
    patterns: [
      /sabbatical/i,
      /certification/i,
      /\bIIN\b/,
      /\bNASM\b/,
      /training/i,
      /career development/i,
      /professional development/i,
      /learning/i,
      /course/i,
      /personal (?:growth|development)/i,
      /continuing education/i,
      /skill(?:s)? development/i,
    ],
  },
];

/**
 * Map a task to one of Tyler's work categories.
 * @param {string} taskText - The task description
 * @param {string} [sourceText] - The full source text for additional context
 * @returns {string} Category name
 */
export function assignCategory(taskText, sourceText) {
  const combinedText = sourceText ? `${taskText} ${sourceText}` : taskText;

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some(p => p.test(combinedText))) {
      return category;
    }
  }

  return 'Other';
}
