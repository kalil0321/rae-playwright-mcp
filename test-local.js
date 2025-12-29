#!/usr/bin/env node
/**
 * Simple test script to verify the MCP server works locally
 */

const { spawn } = require('child_process');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function testMCP() {
  console.log('Starting MCP server...');
  
  // Start the MCP server as a child process
  const serverProcess = spawn('node', ['cli.js', 'run-mcp-server'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['cli.js', 'run-mcp-server'],
    env: {}
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✓ Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log(`✓ Found ${tools.tools.length} tools:`);
    tools.tools.slice(0, 5).forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test a simple tool call (navigate)
    console.log('\nTesting browser_navigate tool...');
    const result = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' }
    });
    console.log('✓ Tool call successful');
    console.log('Response:', JSON.stringify(result, null, 2).substring(0, 200) + '...');

    await client.close();
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testMCP();

