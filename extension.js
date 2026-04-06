/**
 * Gamplo SDK TurboWarp Extension (Full Version)
 * Author: Gemini AI
 * Features: Auth, Stats, Achievements, UI, and Error Events.
 */

(function (Scratch) {
  'use strict';

  // The extension must run unsandboxed to access window.Gamplo
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('This extension must run unsandboxed. Please check the "Run extension without sandbox" box.');
  }

  class GamploSDK {
    constructor(runtime) {
      this.runtime = runtime;
      this._lastError = "";
      this._loadSDK();
    }

    /**
     * Automatically injects the Gamplo SDK script into the page.
     * Replace the URL below with the official one from gamplo.com/developer/sdk
     */
    _loadSDK() {
      if (!window.Gamplo) {
        const script = document.createElement('script');
        script.src = 'https://gamplo.com/sdk.js'; 
        script.async = true;
        script.onload = () => console.log("Gamplo SDK: Script loaded.");
        script.onerror = () => this._triggerError("SDK script failed to load. Check your internet or the URL.");
        document.head.appendChild(script);
      }
    }

    /**
     * Triggers the 'When Error' Hat block and stores the message.
     */
    _triggerError(msg) {
      this._lastError = String(msg);
      console.error("Gamplo Error:", msg);
      // Firing the hat block as a pulse (prevents permanent yellow outline)
      this.runtime.startHats('gamplo_whenError');
    }

    getInfo() {
      return {
        id: 'gamplo',
        name: 'Gamplo SDK',
        color1: '#1a73e8',
        color2: '#1557b0',
        blocks: [
          // --- EVENTS ---
          {
            opcode: 'whenError',
            blockType: Scratch.BlockType.HAT,
            text: 'when Gamplo error occurs',
            isEdgeActivated: false 
          },

          '---',

          // --- USER & AUTH ---
          {
            opcode: 'isLoggedIn',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'is user logged in?'
          },
          {
            opcode: 'getUsername',
            blockType: Scratch.BlockType.REPORTER,
            text: 'player username'
          },
          {
            opcode: 'getUserId',
            blockType: Scratch.BlockType.REPORTER,
            text: 'player ID'
          },

          '---',

          // --- LEADERBOARDS ---
          {
            opcode: 'submitScore',
            blockType: Scratch.BlockType.COMMAND,
            text: 'submit score [SCORE] to leaderboard [ID]',
            arguments: {
              SCORE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          },
          {
            opcode: 'getHighScore',
            blockType: Scratch.BlockType.REPORTER,
            text: 'my high score on [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          },

          '---',

          // --- ACHIEVEMENTS ---
          {
            opcode: 'unlockAchievement',
            blockType: Scratch.BlockType.COMMAND,
            text: 'unlock achievement [ID]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'badge_01' }
            }
          },

          '---',

          // --- UI & UTILS ---
          {
            opcode: 'showLeaderboard',
            blockType: Scratch.BlockType.COMMAND,
            text: 'open leaderboard overlay'
          },
          {
            opcode: 'getError',
            blockType: Scratch.BlockType.REPORTER,
            text: 'last error message'
          }
        ]
      };
    }

    // --- BLOCK LOGIC ---

    isLoggedIn() {
      if (!window.Gamplo) return false;
      return typeof window.Gamplo.isLoggedIn === 'function' ? window.Gamplo.isLoggedIn() : false;
    }

    getUsername() {
      return window.Gamplo?.user?.name || "Guest";
    }

    getUserId() {
      return window.Gamplo?.user?.id || "";
    }

    async submitScore(args) {
      if (!window.Gamplo) return this._triggerError("SDK not loaded yet.");
      try {
        await window.Gamplo.submitScore({
          score: Number(args.SCORE),
          leaderboard: String(args.ID)
        });
      } catch (err) {
        this._triggerError(err.message || err);
      }
    }

    async getHighScore(args) {
      if (!window.Gamplo) return 0;
      try {
        const stats = await window.Gamplo.getStats(String(args.ID));
        return stats?.highScore || 0;
      } catch (err) {
        return 0;
      }
    }

    async unlockAchievement(args) {
      if (!window.Gamplo) return this._triggerError("SDK not loaded yet.");
      try {
        await window.Gamplo.unlockAchievement(String(args.ID));
      } catch (err) {
        this._triggerError(err.message || err);
      }
    }

    showLeaderboard() {
      if (window.Gamplo?.ui?.showLeaderboard) {
        window.Gamplo.ui.showLeaderboard();
      } else {
        this._triggerError("Leaderboard UI not supported or SDK not ready.");
      }
    }

    getError() {
      return this._lastError;
    }
  }

  Scratch.extensions.register(new GamploSDK(Scratch.runtime));
})(Scratch);
