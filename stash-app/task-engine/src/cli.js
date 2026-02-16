#!/usr/bin/env node

/**
 * CLI entry point for the Task Extraction Engine.
 *
 * Usage:
 *   node src/cli.js                    # Read from stdin (pipe or interactive)
 *   node src/cli.js --file input.txt   # Read from file
 *   node src/cli.js --csv              # Output CSV only
 *   node src/cli.js --table            # Output markdown table only
 *   node src/cli.js --help             # Show help
 */

import { readFileSync } from 'fs';
import { processInput, processToCsv, processToTable } from './index.js';

const HELP = `
Task Extraction Engine — CLI

Parses raw input from emails, Teams chats, meeting notes, and ad hoc
requests and extracts structured tasks into CSV/Excel-compatible format.

USAGE:
  echo "input text" | node src/cli.js          Read from stdin
  node src/cli.js --file input.txt             Read from file
  node src/cli.js --file input.txt --csv       Output CSV only
  node src/cli.js --file input.txt --table     Output markdown table only
  node src/cli.js --help                       Show this help

OPTIONS:
  --file <path>    Read input from a file instead of stdin
  --csv            Output CSV format only (no table or summary)
  --table          Output markdown table only (no CSV or summary)
  --owner <name>   Set default owner (default: "Tyler")
  --help           Show this help message

COMMAND TEMPLATES:
  The engine auto-detects input format based on these templates:
    - Email:        "Extract tasks from this email: ---"
    - Teams Chat:   "Extract tasks from this Teams conversation: ---"
    - Meeting:      "Extract tasks from these meeting notes: ---"
    - Batch:        Multiple "--- EMAIL ---" / "--- TEAMS CHAT ---" sections
    - Quick Add:    "Add these quick tasks:" followed by bullet list
    - Generic:      Any text input (auto-extracted)
`.trim();

function parseArgs(argv) {
  const args = {
    file: null,
    csv: false,
    table: false,
    owner: 'Tyler',
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--file':
      case '-f':
        args.file = argv[++i];
        break;
      case '--csv':
        args.csv = true;
        break;
      case '--table':
        args.table = true;
        break;
      case '--owner':
        args.owner = argv[++i];
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    // If stdin is a TTY (interactive), show prompt
    if (process.stdin.isTTY) {
      console.error('Paste your input below, then press Ctrl+D when done:\n');
    }

    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  let input;

  if (args.file) {
    try {
      input = readFileSync(args.file, 'utf8');
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }
  } else {
    input = await readStdin();
  }

  if (!input || !input.trim()) {
    console.error('No input provided. Use --help for usage information.');
    process.exit(1);
  }

  const options = { defaultOwner: args.owner };

  if (args.csv) {
    console.log(processToCsv(input, options));
  } else if (args.table) {
    console.log(processToTable(input, options));
  } else {
    const { output } = processInput(input, options);
    console.log(output);
  }
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
