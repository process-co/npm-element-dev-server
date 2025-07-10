#!/usr/bin/env node

process.stdout.write('\x1Bc'); // Clear the terminal

import { render } from 'ink';
import meow from 'meow';
import React from 'react';
import path from 'path';
import fs from 'fs';
import { DevUI } from './ui.js';
import Logo from './logo.js';

const cli = meow(`
  Usage
    $ process-element [path]

  Options 
    --help     Show help
    --version  Show version

  Examples
    $ process-element                    # Use current directory
    $ process-element /path/to/elements  # Use specified path
    $ process-element ./elements         # Use relative path

  Description
    Scans the specified directory for Process.co element modules (.mjs/.mts files)
    and provides an interactive interface to launch development servers.
`, {
  importMeta: import.meta,
});

// Get the path from arguments or use current directory
const targetPath = cli.input[0] ? path.resolve(cli.input[0]) : process.cwd();

// Validate that the path exists
if (!fs.existsSync(targetPath)) {
  console.error(`❌ Error: Path '${targetPath}' does not exist.`);
  process.exit(1);
}

// Check if it's a directory
const stats = fs.statSync(targetPath);
if (!stats.isDirectory()) {
  console.error(`❌ Error: '${targetPath}' is not a directory.`);
  process.exit(1);
}

const App = ({ rootDir }: { rootDir: string }) => (
  <>
    <Logo />
    <DevUI rootDir={rootDir} />
  </>
);

render(<App rootDir={targetPath} />);
