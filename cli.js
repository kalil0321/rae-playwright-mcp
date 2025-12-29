#!/usr/bin/env node
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { program } = require('playwright-core/lib/utilsBundle');
const { decorateCommand } = require('./lib/mcp/program');

const packageJSON = require('./package.json');
const p = program.version('Version ' + packageJSON.version).name('Rae Playwright MCP');

// Create the run-mcp-server subcommand
const command = p.command('run-mcp-server', { hidden: true });
decorateCommand(command, packageJSON.version);

// If no subcommand provided, default to run-mcp-server
// This allows the bin entry to work: npx rae-playwright-mcp
const args = process.argv.slice(2);
const hasSubcommand = args.some(arg => !arg.startsWith('-') && arg !== 'help');
const hasHelp = args.includes('--help') || args.includes('-h');

if (!hasSubcommand) {
    // If --help is passed without a subcommand, show help for run-mcp-server
    if (hasHelp) {
        process.argv.splice(2, 0, 'run-mcp-server');
    } else {
        process.argv.push('run-mcp-server');
    }
}

void p.parseAsync(process.argv);
