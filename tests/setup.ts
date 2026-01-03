/**
 * Global Test Setup
 * 
 * Starts the MCP connection before tests run and tears it down after.
 * This runs via vitest's setupFiles in the same process as tests.
 */

import { beforeAll, afterAll } from 'vitest';
import { AgentOS, setGlobalAgentOS } from './utils/mcp-client';

let aos: AgentOS | null = null;

beforeAll(async () => {
  console.log('\n🔌 Connecting to AgentOS...');
  
  try {
    aos = await AgentOS.connect({
      debug: !!process.env.DEBUG_MCP,
      timeout: 30000,
    });
    
    setGlobalAgentOS(aos);
    console.log('✅ AgentOS connected\n');
  } catch (error) {
    console.error('❌ Failed to connect to AgentOS:', error);
    console.error('\nMake sure AgentOS is built:');
    console.error('  cd ~/dev/agentos && npm run tauri build -- --debug\n');
    throw error;
  }
});

afterAll(async () => {
  if (aos) {
    console.log('\n🔌 Disconnecting from AgentOS...');
    await aos.disconnect();
    setGlobalAgentOS(null);
    console.log('✅ AgentOS disconnected\n');
  }
});
