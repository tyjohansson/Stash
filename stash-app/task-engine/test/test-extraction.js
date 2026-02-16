/**
 * Tests for the Task Extraction Engine.
 * Run with: node test/test-extraction.js
 */

import { processInput } from '../src/index.js';
import { inferDueDate, formatDate, addDays, thisFriday, nextMonday, lastBusinessDayOfMonth, addBusinessDays } from '../src/date-utils.js';
import { assignPriority } from '../src/priority.js';
import { detectStatus } from '../src/status.js';
import { assignCategory } from '../src/category.js';
import { extractTasks } from '../src/extractor.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

function assertEq(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
  }
}

// Use a fixed reference date for deterministic tests: Wednesday, 2026-02-18
const REF = new Date(2026, 1, 18); // Feb 18, 2026

console.log('=== Date Utility Tests ===');
{
  assertEq(formatDate(REF), '2026-02-18', 'formatDate formats correctly');
  assertEq(formatDate(addDays(REF, 1)), '2026-02-19', 'addDays adds 1 day');
  assertEq(formatDate(addDays(REF, 7)), '2026-02-25', 'addDays adds 7 days');
  assertEq(formatDate(thisFriday(REF)), '2026-02-20', 'thisFriday returns Friday of the week');
  assertEq(formatDate(nextMonday(REF)), '2026-02-23', 'nextMonday returns next Monday');
  assertEq(formatDate(lastBusinessDayOfMonth(REF)), '2026-02-27', 'lastBusinessDayOfMonth returns last biz day of Feb 2026');
  assertEq(formatDate(addBusinessDays(REF, 2)), '2026-02-20', 'addBusinessDays skips to Friday (2 biz days from Wed)');
}

console.log('\n=== Due Date Inference Tests ===');
{
  assertEq(inferDueDate('This is urgent, ASAP', REF), '2026-02-19', 'ASAP infers tomorrow');
  assertEq(inferDueDate('Please get this done right away', REF), '2026-02-19', '"right away" infers tomorrow');
  assertEq(inferDueDate('Finish by end of week', REF), '2026-02-20', '"end of week" infers Friday');
  assertEq(inferDueDate('We need this next week', REF), '2026-02-23', '"next week" infers Monday');
  assertEq(inferDueDate('Submit by end of month', REF), '2026-02-27', '"end of month" infers last biz day');
  assertEq(inferDueDate('Send the report by March 1, 2026', REF), '2026-03-01', 'Explicit date parsed');
  assertEq(inferDueDate('Due date is 2026-03-15', REF), '2026-03-15', 'ISO date parsed');
  assertEq(inferDueDate('Get to it soon', REF), '2026-02-25', '"soon" infers 7 days');
  assertEq(inferDueDate('Please update the file', REF), 'TBD', 'No signal gives TBD');
  assertEq(inferDueDate('Complete by tomorrow', REF), '2026-02-19', '"tomorrow" infers next day');

  // Meeting follow-up
  assertEq(inferDueDate('Follow up on action items', REF, '2026-02-18'), '2026-02-20', 'Meeting follow-up gives 2 biz days after meeting');
}

console.log('\n=== Priority Assignment Tests ===');
{
  assertEq(assignPriority('This is urgent', 'TBD', REF), 'Urgent', '"urgent" text → Urgent');
  assertEq(assignPriority('Send ASAP', '2026-02-19', REF), 'Urgent', 'ASAP text → Urgent');
  assertEq(assignPriority('The CEO needs this', 'TBD', REF), 'Urgent', 'Executive request → Urgent');
  assertEq(assignPriority('Regular task', '2026-02-20', REF), 'Urgent', 'Due within 48h → Urgent');
  assertEq(assignPriority('Key deliverable for stakeholders', '2026-03-01', REF), 'Important', 'Stakeholder work → Important');
  assertEq(assignPriority('Normal task with no signals', 'TBD', REF), 'Normal', 'No signals → Normal');
  assertEq(assignPriority('FYI when you get a chance', 'TBD', REF), 'Low', 'FYI/no rush → Low');
  assertEq(assignPriority('Not urgent, low priority', 'TBD', REF), 'Low', '"low priority" → Low');
}

console.log('\n=== Status Detection Tests ===');
{
  assertEq(detectStatus('Can you send the report?'), 'Not Started', 'New request → Not Started');
  assertEq(detectStatus("I've started working on the draft"), 'In Progress', 'Started → In Progress');
  assertEq(detectStatus("Here's a first draft of the doc"), 'In Progress', 'First draft → In Progress');
  assertEq(detectStatus("Waiting on John's response"), 'Waiting', 'Waiting on → Waiting');
  assertEq(detectStatus("Once they send the data we can proceed"), 'Waiting', 'Once they send → Waiting');
  assertEq(detectStatus("Can't proceed until we get access"), 'Blocked', "Can't proceed → Blocked");
  assertEq(detectStatus("It's already done and completed"), 'Complete', 'Already completed → Complete');
}

console.log('\n=== Category Mapping Tests ===');
{
  assertEq(assignCategory('Draft well-being newsletter content'), 'Well-Being Initiative', 'well-being → Well-Being Initiative');
  assertEq(assignCategory('Prepare for listening tour session'), 'Listening Tour', 'listening tour → Listening Tour');
  assertEq(assignCategory('Brief the People Leaders on Q2 plans'), 'Leadership Support', 'People Leaders → Leadership Support');
  assertEq(assignCategory('Update newsletter distribution list'), 'Newsletter', 'newsletter → Newsletter');
  assertEq(assignCategory('Review change management readiness'), 'Change Management', 'change management → Change Management');
  assertEq(assignCategory('Schedule a meeting room for Tuesday'), 'Admin', 'scheduling → Admin');
  assertEq(assignCategory('Prepare client advisory proposal'), 'Client Work', 'client → Client Work');
  assertEq(assignCategory('Register for NASM certification exam'), 'Personal Dev', 'NASM → Personal Dev');
  assertEq(assignCategory('Buy groceries'), 'Other', 'unrelated → Other');
}

console.log('\n=== Core Extraction Tests ===');
{
  const tasks = extractTasks(
    '- Draft the Q2 well-being report\n- Schedule a meeting with the People Leaders\n- Follow up with John on the Happiness Index results',
    { source: 'Ad Hoc', startId: 1, referenceDate: REF }
  );

  assertEq(tasks.length, 3, 'Extracts 3 tasks from 3 bullets');
  assertEq(tasks[0].taskId, 'T-001', 'First task ID is T-001');
  assertEq(tasks[1].taskId, 'T-002', 'Second task ID is T-002');
  assertEq(tasks[2].taskId, 'T-003', 'Third task ID is T-003');
  assert(tasks[0].task.startsWith('Draft'), 'First task starts with action verb');
  assertEq(tasks[0].source, 'Ad Hoc', 'Source is Ad Hoc');
  assertEq(tasks[0].owner, 'Tyler', 'Default owner is Tyler');
  assertEq(tasks[0].status, 'Not Started', 'Default status is Not Started');
}

console.log('\n=== Email Processing Test ===');
{
  const emailInput = `Extract tasks from this email:
---
Hi Tyler,

Can you please draft the Q2 capacity-building budget proposal by end of week? We need to have it ready for the leadership review on March 5.

Also, I've started on the well-being newsletter content but could use your help reviewing it. When you get a chance, please take a look and send me your feedback.

One more thing — the CEO wants a briefing on the listening tour results ASAP.

Thanks,
Sarah
---
Source: Email
Source Detail: From Sarah Mitchell, Subject: Q2 Budget and Newsletter
Continue task numbering from T-010`;

  const { tasks } = processInput(emailInput, { referenceDate: REF });

  assert(tasks.length >= 3, `Extracts at least 3 tasks from email (got ${tasks.length})`);
  assertEq(tasks[0].taskId, 'T-010', 'Task numbering starts from T-010');
  assertEq(tasks[0].source, 'Email', 'Source is Email');
  assertEq(tasks[0].sourceDetail, 'From Sarah Mitchell, Subject: Q2 Budget and Newsletter', 'Source detail preserved');
}

console.log('\n=== Teams Chat Processing Test ===');
{
  const teamsInput = `Extract tasks from this Teams conversation:
---
[10:15 AM] Sarah: Hey Tyler, we should schedule a town hall for the listening tour
[10:16 AM] Sarah: Can you also update the distribution list for the newsletter?
[10:17 AM] Tyler: Sure, I'll take care of both. Let me also check on the Happiness Index survey results.
---
Source: Teams Chat
Source Detail: DM with Sarah Mitchell
Continue task numbering from T-001`;

  const { tasks } = processInput(teamsInput, { referenceDate: REF });

  assert(tasks.length >= 2, `Extracts at least 2 tasks from Teams chat (got ${tasks.length})`);
  assertEq(tasks[0].source, 'Teams Chat', 'Source is Teams Chat');
}

console.log('\n=== Meeting Notes Processing Test ===');
{
  const meetingInput = `Extract tasks from these meeting notes:
---
Meeting: Q2 Planning Session
Date: 2026-02-18

Attendees: Tyler, Sarah, Mark

Discussion:
- Agreed to launch the well-being program by March 15
- Mark will prepare the change readiness assessment
- Tyler needs to coordinate with the leadership team on talking points
- Action item: Send follow-up email to all People Leaders with meeting summary

Decision: Let's go with the biweekly newsletter cadence
---
Source: Meeting
Source Detail: Q2 Planning Session, 2026-02-18
Continue task numbering from T-001`;

  const { tasks } = processInput(meetingInput, { referenceDate: REF });

  assert(tasks.length >= 3, `Extracts at least 3 tasks from meeting notes (got ${tasks.length})`);
  assertEq(tasks[0].source, 'Meeting', 'Source is Meeting');

  // Check that meeting follow-ups get appropriate due dates
  const nonTbdTasks = tasks.filter(t => t.dueDate !== 'TBD');
  assert(nonTbdTasks.length > 0, 'At least one task has an inferred due date');
}

console.log('\n=== Batch Processing Test ===');
{
  const batchInput = `Extract tasks from these multiple inputs. Tag each with the correct source.

--- EMAIL ---
Can you draft the Q2 budget proposal?
Source Detail: From Sarah, Subject: Budget

--- TEAMS CHAT ---
Please update the wellness newsletter ASAP
Source Detail: DM with Mark

--- MEETING NOTES ---
- Follow up on Happiness Index survey
- Schedule leadership briefing
Source Detail: Weekly Sync, 2026-02-18

Continue task numbering from T-001`;

  const { tasks } = processInput(batchInput, { referenceDate: REF });

  assert(tasks.length >= 4, `Extracts at least 4 tasks from batch (got ${tasks.length})`);

  // Check that tasks are assigned correct sources
  const sources = new Set(tasks.map(t => t.source));
  assert(sources.has('Email'), 'Has Email source');
  assert(sources.has('Teams Chat'), 'Has Teams Chat source');
  assert(sources.has('Meeting'), 'Has Meeting source');
}

console.log('\n=== Quick Add Test ===');
{
  const quickInput = `Add these quick tasks:
- Update the well-being newsletter
- Book a room for Tuesday's meeting
- Review the client proposal draft
Source: Ad Hoc
Priority: Normal
Continue task numbering from T-001`;

  const { tasks } = processInput(quickInput, { referenceDate: REF });

  assert(tasks.length >= 3, `Extracts at least 3 tasks from quick add (got ${tasks.length})`);
  assertEq(tasks[0].source, 'Ad Hoc', 'Source is Ad Hoc');
}

console.log('\n=== Task Numbering Continuity Test ===');
{
  const input = `- Draft budget proposal\n- Review report\n- Send email`;
  const { tasks } = processInput(input, { referenceDate: REF });

  for (let i = 0; i < tasks.length; i++) {
    assertEq(tasks[i].taskId, `T-${String(i + 1).padStart(3, '0')}`, `Task ${i + 1} has sequential ID`);
  }
}

console.log('\n=== Output Format Test ===');
{
  const input = `- Draft the quarterly report\n- Review client proposal`;
  const { output, tasks } = processInput(input, { referenceDate: REF });

  assert(output.includes('### Table View'), 'Output contains Table View header');
  assert(output.includes('### CSV Import Block'), 'Output contains CSV Import Block header');
  assert(output.includes('```csv'), 'Output contains CSV code block');
  assert(output.includes('### Summary'), 'Output contains Summary');
  assert(output.includes('Total tasks extracted'), 'Output contains total count');
  assert(output.includes('Breakdown by priority'), 'Output contains priority breakdown');
}

console.log('\n=== Owner Extraction Test ===');
{
  const tasks = extractTasks(
    "- I'll handle the budget review\n- @Mark needs to send the report\n- Update the spreadsheet [Sarah]",
    { source: 'Ad Hoc', startId: 1, referenceDate: REF }
  );

  assertEq(tasks[0].owner, 'Tyler', "I'll → Tyler");
  assertEq(tasks[1].owner, 'Mark', '@Mark → Mark');
  assertEq(tasks[2].owner, 'Sarah', '[Sarah] → Sarah');
}

// === Summary ===
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed!');
}
