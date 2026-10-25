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

// Per-run HAR recording for reverse-api-engineer, layered on upstream Playwright MCP
// through its config file (browser.contextOptions.recordHar).

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function defaultHarBaseDir() {
  return path.join(os.homedir(), '.reverse-api', 'runs', 'har');
}

// Removes `--name value` / `--name=value` from args and returns the value.
function takeOption(args, name) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`${name} requires a value`);
      args.splice(i, 2);
      return value;
    }
    if (args[i].startsWith(name + '=')) {
      const value = args[i].slice(name.length + 1);
      args.splice(i, 1);
      return value;
    }
  }
  return undefined;
}

// The merged config is written to a temp directory, so paths that upstream resolves
// against the config file's directory are made absolute first.
function loadUserConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf-8');
  const data = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  let config;
  try {
    config = JSON.parse(data);
  } catch (error) {
    throw new Error(`--config must be a JSON file when HAR recording is enabled: ${configPath} (${error.message})`);
  }
  const baseDir = path.dirname(path.resolve(configPath));
  for (const key of ['initScript', 'initPage']) {
    if (Array.isArray(config.browser?.[key]))
      config.browser[key] = config.browser[key].map(entry => path.resolve(baseDir, entry));
  }
  return config;
}

// `run-mcp-server` is the subcommand older reverse-api-engineer releases pass.
// The same word can also be the value of an option, which must be kept.
function stripLegacySubcommand(args, optionTakesValue) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== 'run-mcp-server')
      continue;
    const previous = args[i - 1];
    const isOptionValue = previous !== undefined && previous.startsWith('-') && !previous.includes('=') && optionTakesValue(previous);
    if (!isOptionValue) {
      args.splice(i, 1);
      return;
    }
  }
}

/**
 * Rewrites MCP server arguments so the browser context records a HAR to
 * `{saveHarPath}/{runId}/recording.har`.
 *
 * `optionTakesValue(flag)` tells whether an upstream flag consumes the next argument.
 * Returns the args to hand to upstream Playwright MCP and the HAR path.
 */
function prepareHarArgs(rawArgs, env = process.env, optionTakesValue = () => false) {
  const args = [...rawArgs];
  const runIdArg = takeOption(args, '--run-id');
  const baseDirArg = takeOption(args, '--save-har-path');
  const userConfigArg = takeOption(args, '--config');
  stripLegacySubcommand(args, optionTakesValue);

  const runId = runIdArg || env.PLAYWRIGHT_MCP_RUN_ID || crypto.randomUUID();
  if (!RUN_ID_PATTERN.test(runId))
    throw new Error(`--run-id may only contain letters, digits, "-" and "_": ${runId}`);
  const baseDir = baseDirArg || env.PLAYWRIGHT_MCP_SAVE_HAR_PATH || defaultHarBaseDir();

  const harDir = path.join(path.resolve(baseDir), runId);
  fs.mkdirSync(harDir, { recursive: true });
  const harPath = path.join(harDir, 'recording.har');

  const userConfigPath = userConfigArg || env.PLAYWRIGHT_MCP_CONFIG;
  const config = userConfigPath ? loadUserConfig(userConfigPath) : {};
  config.browser = config.browser || {};
  config.browser.contextOptions = config.browser.contextOptions || {};
  config.browser.contextOptions.recordHar = config.browser.contextOptions.recordHar || {
    path: harPath,
    content: 'attach',
    mode: 'full',
  };

  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rae-playwright-mcp-'));
  const configPath = path.join(configDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  args.push('--config', configPath);

  return { args, harPath: config.browser.contextOptions.recordHar.path, configDir };
}

module.exports = { prepareHarArgs, defaultHarBaseDir };
