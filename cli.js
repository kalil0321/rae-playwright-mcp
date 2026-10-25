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

const fs = require('fs');
const { program } = require('playwright-core/lib/utilsBundle');
const { tools, libCli } = require('playwright-core/lib/coreBundle');
const { prepareHarArgs } = require('./har');

if (process.argv.includes('install-browser')) {
  const argv = process.argv.map(arg => arg === 'install-browser' ? 'install' : arg);
  libCli.decorateProgram(program);
  void program.parseAsync(argv);
  return;
}

const packageJSON = require('./package.json');
const userArgs = process.argv.slice(2);
const wantsInfo = userArgs.some(arg => ['--help', '-h', '--version', '-V'].includes(arg));

let argv = process.argv;
if (!wantsInfo) {
  try {
    const { args, harPath, configDir } = prepareHarArgs(userArgs);
    argv = [...process.argv.slice(0, 2), ...args];
    process.on('exit', () => fs.rmSync(configDir, { recursive: true, force: true }));
    // eslint-disable-next-line no-console
    console.error(`HAR recording enabled. HAR file will be saved to: ${harPath}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`rae-playwright-mcp: ${error.message}`);
    process.exit(1);
  }
}

const p = program.version('Version ' + packageJSON.version).name('Rae Playwright MCP');
tools.decorateMCPCommand(p, packageJSON.version);
p.option('--run-id <id>', 'run identifier; the HAR is saved to {save-har-path}/{run-id}/recording.har. Defaults to a random UUID.');
p.option('--save-har-path <path>', 'directory for HAR files. Defaults to ~/.reverse-api/runs/har.');

void program.parseAsync(argv);
