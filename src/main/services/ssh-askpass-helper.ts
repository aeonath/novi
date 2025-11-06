/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * SSH Askpass Helper for Nova
 * Acts as SSH_ASKPASS to capture SSH key passphrases within Nova's UI
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Create a temporary SSH_ASKPASS script that communicates with Nova
 * Returns the path to the executable
 */
export function createSshAskpassScript(): string {
  const isWindows = process.platform === 'win32';
  
  // Create a Node.js script that will be called by SSH
  const scriptContent = `const fs = require('fs');
const path = require('path');

// Get the request file path from environment
const requestFile = process.env.NOVA_SSH_REQUEST_FILE;
const responseFile = process.env.NOVA_SSH_RESPONSE_FILE;

if (!requestFile || !responseFile) {
  process.exit(1);
}

// Write request (SSH is asking for passphrase)
fs.writeFileSync(requestFile, JSON.stringify({
  type: 'ssh-passphrase',
  prompt: process.argv[2] || 'Enter passphrase for SSH key',
  timestamp: Date.now()
}));

// Wait for response (poll every 100ms, timeout after 5 minutes)
const startTime = Date.now();
const timeout = 300000; // 5 minutes

function checkResponse() {
  if (Date.now() - startTime > timeout) {
    process.exit(1);
  }

  try {
    if (fs.existsSync(responseFile)) {
      const response = JSON.parse(fs.readFileSync(responseFile, 'utf8'));
      
      // Delete response file
      fs.unlinkSync(responseFile);
      
      if (response.cancelled) {
        process.exit(1);
      }
      
      // Output password to stdout (SSH reads this)
      console.log(response.password);
      process.exit(0);
    }
  } catch (err) {
    // File might be being written, try again
  }

  setTimeout(checkResponse, 100);
}

checkResponse();
`;

  // Write Node.js script
  const scriptPath = join(tmpdir(), 'nova-ssh-askpass.js');
  writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
  
  if (isWindows) {
    // On Windows, create a batch wrapper that SSH can execute
    const batchPath = join(tmpdir(), 'nova-ssh-askpass.bat');
    const batchContent = `@echo off
node "${scriptPath}" %*`;
    writeFileSync(batchPath, batchContent);
    return batchPath;
  } else {
    // On Unix, make the script executable with shebang
    const unixScriptPath = join(tmpdir(), 'nova-ssh-askpass.sh');
    const unixContent = `#!/usr/bin/env node\n${scriptContent}`;
    writeFileSync(unixScriptPath, unixContent, { mode: 0o755 });
    return unixScriptPath;
  }
}

/**
 * Get environment variables for SSH operations with custom askpass
 */
export function getSshAskpassEnvironment(requestFile: string, responseFile: string): Record<string, string> {
  const scriptPath = createSshAskpassScript();
  
  return {
    SSH_ASKPASS: scriptPath,       // Path to executable script (bat on Windows, sh on Unix)
    SSH_ASKPASS_REQUIRE: 'force',  // Force SSH to use SSH_ASKPASS even with terminal
    DISPLAY: ':0',                  // Required for SSH_ASKPASS on some systems
    NOVA_SSH_REQUEST_FILE: requestFile,
    NOVA_SSH_RESPONSE_FILE: responseFile,
  };
}

