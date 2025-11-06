/**
 * © 2025 MiraNova Studios. All rights reserved.
 * See the LICENSE file in the project root for full license text.
 */

/**
 * Git Credential Helper for Nova
 * Handles authentication within Nova's UI instead of external credential managers
 */

import { BrowserWindow } from 'electron';

export interface CredentialRequest {
  type: 'password' | 'username' | 'passphrase';
  prompt: string;
  protocol?: string;
  host?: string;
  username?: string;
}

export interface CredentialResponse {
  username?: string;
  password?: string;
  cancelled: boolean;
}

class GitCredentialHelper {
  private mainWindow: BrowserWindow | null = null;
  private pendingRequest: {
    resolve: (response: CredentialResponse) => void;
    reject: (error: Error) => void;
  } | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Request credentials from the user via Nova's UI
   */
  async requestCredentials(request: CredentialRequest): Promise<CredentialResponse> {
    if (!this.mainWindow) {
      throw new Error('Main window not available for credential request');
    }

    // If there's already a pending request, reject it
    if (this.pendingRequest) {
      this.pendingRequest.reject(new Error('Credential request cancelled by new request'));
      this.pendingRequest = null;
    }

    console.log('[GitCredentialHelper] Requesting credentials:', request.type, request.prompt);

    // Send request to renderer
    this.mainWindow.webContents.send('git-credential-request', request);

    // Wait for response from renderer
    return new Promise((resolve, reject) => {
      this.pendingRequest = { resolve, reject };

      // Timeout after 5 minutes (should never happen in practice)
      setTimeout(() => {
        if (this.pendingRequest) {
          this.pendingRequest.reject(new Error('Credential request timeout'));
          this.pendingRequest = null;
        }
      }, 300000);
    });
  }

  /**
   * Called by IPC handler when user provides credentials
   */
  provideCredentials(response: CredentialResponse): void {
    if (this.pendingRequest) {
      console.log('[GitCredentialHelper] Credentials provided:', response.cancelled ? 'cancelled' : 'received');
      this.pendingRequest.resolve(response);
      this.pendingRequest = null;
    } else {
      console.warn('[GitCredentialHelper] No pending credential request');
    }
  }

  /**
   * Cancel any pending credential request
   */
  cancelRequest(): void {
    if (this.pendingRequest) {
      console.log('[GitCredentialHelper] Credential request cancelled');
      this.pendingRequest.resolve({ cancelled: true });
      this.pendingRequest = null;
    }
  }

  /**
   * Get environment variables to bypass external credential managers
   */
  getCredentialEnvironment(): Record<string, string> {
    return {
      // Disable Git credential manager
      GIT_TERMINAL_PROMPT: '0',
      // Disable SSH key passphrase prompts (we'll handle via SSH_ASKPASS if needed)
      GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',
      // Prevent credential helper from prompting
      GCM_INTERACTIVE: 'never',
    };
  }
}

export const gitCredentialHelper = new GitCredentialHelper();

