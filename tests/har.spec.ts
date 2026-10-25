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

import fs from 'fs';
import path from 'path';

import { test, expect } from './fixtures';

const { prepareHarArgs } = require('../har');

function readHar(harPath: string) {
  return JSON.parse(fs.readFileSync(harPath, 'utf-8')).log;
}

test('browser_close writes the HAR to {save-har-path}/{run-id}/recording.har', async ({ startClient, server }, testInfo) => {
  const harBase = testInfo.outputPath('runs');
  const { client } = await startClient({ args: ['run-mcp-server', '--run-id', 'abc123', '--save-har-path', harBase] });
  await client.callTool({ name: 'browser_navigate', arguments: { url: server.HELLO_WORLD } });
  await client.callTool({ name: 'browser_close', arguments: {} });

  const harPath = path.join(harBase, 'abc123', 'recording.har');
  await expect.poll(() => fs.existsSync(harPath)).toBe(true);
  const urls = readHar(harPath).entries.map((entry: any) => entry.request.url);
  expect(urls).toContain(server.HELLO_WORLD);
});

test('run id and HAR directory fall back to the environment', async ({ startClient, server }, testInfo) => {
  const harBase = testInfo.outputPath('env-runs');
  const { client } = await startClient({ env: { PLAYWRIGHT_MCP_RUN_ID: 'from-env', PLAYWRIGHT_MCP_SAVE_HAR_PATH: harBase } });
  await client.callTool({ name: 'browser_navigate', arguments: { url: server.HELLO_WORLD } });
  await client.callTool({ name: 'browser_close', arguments: {} });

  await expect.poll(() => fs.existsSync(path.join(harBase, 'from-env', 'recording.har'))).toBe(true);
});

test('prepareHarArgs strips rae options and keeps the rest', async ({}, testInfo) => {
  const base = testInfo.outputPath('prepare');
  const { args, harPath, configDir } = prepareHarArgs(['run-mcp-server', '--run-id=r1', '--save-har-path', base, '--headless'], {});
  expect(harPath).toBe(path.join(base, 'r1', 'recording.har'));
  expect(args.slice(0, 1)).toEqual(['--headless']);
  expect(args.slice(1, 2)).toEqual(['--config']);
  const config = JSON.parse(fs.readFileSync(args[2], 'utf-8'));
  expect(config.browser.contextOptions.recordHar).toEqual({ path: harPath, content: 'attach', mode: 'full' });
  fs.rmSync(configDir, { recursive: true });
});

test('prepareHarArgs merges a user config without overriding its recordHar', async ({}, testInfo) => {
  const userConfig = testInfo.outputPath('user.json');
  const ownHar = testInfo.outputPath('own.har');
  fs.writeFileSync(userConfig, JSON.stringify({ browser: { contextOptions: { locale: 'fr-FR', recordHar: { path: ownHar } } } }));
  const { args, harPath, configDir } = prepareHarArgs(['--config', userConfig, '--run-id', 'r2', '--save-har-path', testInfo.outputPath('x')], {});
  const config = JSON.parse(fs.readFileSync(args[args.indexOf('--config') + 1], 'utf-8'));
  expect(config.browser.contextOptions.locale).toBe('fr-FR');
  expect(harPath).toBe(ownHar);
  expect(args.filter((arg: string) => arg === '--config')).toHaveLength(1);
  fs.rmSync(configDir, { recursive: true });
});

test('prepareHarArgs rejects run ids that are not path-safe', async ({}, testInfo) => {
  expect(() => prepareHarArgs(['--run-id', '../escape', '--save-har-path', testInfo.outputPath('y')], {})).toThrow(/--run-id/);
});
