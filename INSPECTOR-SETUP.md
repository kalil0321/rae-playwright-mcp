# MCP Inspector Setup Guide

## The Issue

When configuring the MCP Inspector, you **must** include `run-mcp-server` as part of the command arguments, otherwise the server won't start.

## Correct Configuration

### Option 1: Using Published Package (Recommended)

1. Start the inspector:
```bash
npx @modelcontextprotocol/inspector
```

2. In the browser UI, configure:
   - **Transport**: `stdio`
   - **Command**: `npx`
   - **Args**: 
     - Either enter as a single string: `rae-playwright-mcp run-mcp-server`
     - Or as separate args (if the UI supports it):
       - `rae-playwright-mcp`
       - `run-mcp-server`

### Option 2: Using Config File

Create `mcp-config.json`:
```json
{
  "mcpServers": {
    "rae-playwright-mcp": {
      "command": "npx",
      "args": ["rae-playwright-mcp", "run-mcp-server"]
    }
  }
}
```

Then run:
```bash
npx @modelcontextprotocol/inspector --config mcp-config.json --server rae-playwright-mcp
```

### Option 3: Testing Locally (Development)

If testing the local version before publishing:

1. Start inspector:
```bash
cd rae-playwright-mcp
npx @modelcontextprotocol/inspector
```

2. Configure:
   - **Transport**: `stdio`
   - **Command**: `node`
   - **Args**: `cli.js run-mcp-server`

## Verification

After configuration, you should see:
- Connection established
- List of available tools (browser_navigate, browser_click, etc.)
- No error messages

## Troubleshooting

- **"Cannot connect"**: Make sure `run-mcp-server` is included in args
- **"Command not found"**: Make sure `rae-playwright-mcp` is published or use `npx rae-playwright-mcp@0.0.2`
- **Port in use**: Kill existing inspector: `pkill -f inspector`

## Test Command Directly

To verify the package works:
```bash
npx rae-playwright-mcp run-mcp-server --version
# Should output: Version 0.0.2
```

