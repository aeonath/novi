/**
 * © 2025-2026 MiraNova Studios. All rights reserved.
 */

/**
 * Git Credential Helper for Novi
 * Handles authentication prompts within Novi's UI via IPC
 * Used by isomorphic-git's onAuth/onAuthFailure callbacks
 */

import { BrowserWindow } from 'electron';

export interface CredentialRequest {
  type: 'password' | 'username' | 'passphrase';
  prompt: string;
  host?: string;
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
   * Request credentials from the user via Novi's UI
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

      // Timeout after 5 minutes
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
}

export const gitCredentialHelper = new GitCredentialHelper();
