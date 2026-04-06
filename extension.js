/**
 * Gamplo SDK TurboWarp Extension
 * Updated to match official Gamplo API: getPlayer, onReady, refreshPlayer
 */

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This extension must run unsandboxed. Please check the "Run extension without sandbox" box.');
  }

  class GamploSDK {
    constructor(runtime) {
      this.runtime = runtime;
      this._lastError = "";
      this._player = null;
      this._loadSDK();
    }

    _loadSDK() {
      if (!window.Gamplo) {
        const script = document.createElement('script');
        script.src = 'https://gamplo.com/sdk/gamplo.js';
        script.async = true;
        script.onload = () => {
          // Use the official onReady listener
          window.Gamplo.onReady(() => {
            this._player = window.Gamplo.getPlayer();
            console.log("Gamplo SDK Ready. Player:", this._player?.displayName);
          });
        };
        script.onerror = () => this._triggerError("Failed to load Gamplo script.");
        document.head.appendChild(script);
      }
    }

    _triggerError(msg) {
      this._lastError = String(msg);
      this.runtime.startHats('gamplo_whenError');
    }

    getInfo() {
      return {
        id: 'gamplo',
        name: 'Gamplo SDK',
        color1: '#1a73e8',
        blocks: [
          {
            opcode: 'whenError',
            blockType: Scratch.BlockType.HAT,
            text: 'when Gamplo error occurs',
            isEdgeActivated: false 
          },
          '---',
          { opcode: 'isReady', blockType: Scratch.BlockType.BOOLEAN, text: 'is SDK ready?' },
          { 
            opcode: 'refreshPlayer', 
            blockType: Scratch.BlockType.COMMAND, 
            text: 'refresh player data from server' 
          },
          '---',
          { opcode: 'getDisplayName', blockType: Scratch.BlockType.REPORTER, text: 'player display name' },
          { opcode: 'getUsername', blockType: Scratch.BlockType.REPORTER, text: 'player username' },
          { opcode: 'getPlayerId', blockType: Scratch.BlockType.REPORTER, text: 'player ID' },
          { opcode: 'getAvatar', blockType: Scratch.BlockType.REPORTER, text: 'player avatar URL' },
          { opcode: 'getSessionId', blockType: Scratch.BlockType.REPORTER, text: 'session ID' },
          '---',
          {
            opcode: 'submitScore',
            blockType: Scratch.BlockType.COMMAND,
            text: 'submit score [SCORE] to leaderboard [ID]',
            arguments: {
              SCORE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          },
          { opcode: 'getError', blockType: Scratch.BlockType.REPORTER, text: 'last error message' }
        ]
      };
    }

    // --- LOGIC ---

    isReady() {
      return !!(window.Gamplo && window.Gamplo.isReady());
    }

    async refreshPlayer() {
      if (!window.Gamplo) return;
      try {
        this._player = await window.Gamplo.refreshPlayer();
      } catch (e) {
        this._triggerError("Refresh failed: " + e.message);
      }
    }

    getDisplayName() {
      const p = window.Gamplo?.getPlayer();
      return p?.displayName || "Guest";
    }

    getUsername() {
      const p = window.Gamplo?.getPlayer();
      return p?.username || "Guest";
    }

    getPlayerId() {
      const p = window.Gamplo?.getPlayer();
      return p?.id || "";
    }

    getAvatar() {
      const p = window.Gamplo?.getPlayer();
      return p?.image || "";
    }

    getSessionId() {
      return window.Gamplo?.getSessionId() || "";
    }

    async submitScore(args) {
      if (!window.Gamplo) return this._triggerError("SDK not loaded");
      try {
        // Note: Assuming standard Gamplo score submission structure
        await window.Gamplo.submitScore({
          score: Number(args.SCORE),
          leaderboard: String(args.ID)
        });
      } catch (e) {
        this._triggerError(e.message);
      }
    }

    getError() {
      return this._lastError;
    }
  }

  Scratch.extensions.register(new GamploSDK(Scratch.runtime));
})(Scratch);
