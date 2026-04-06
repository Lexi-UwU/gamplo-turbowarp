(function (Scratch) {
  'use strict';

  // Check if we are unsandboxed (Required for Fetch and Window access)
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Gamplo extension must run unsandboxed! Please check the box in the Custom Extension menu.');
  }

  class GamploExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.sessionId = null;
      this.player = null;
      this.isConnected = false;
      this.lastError = "";

      // Start the auth flow immediately on load
      this._init();
    }

    async _init() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('gamplo_token');

      if (!token) {
        this.lastError = "No gamplo_token found in URL.";
        return;
      }

      try {
        const response = await fetch('https://gamplo.com/api/sdk/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token })
        });

        if (!response.ok) throw new Error('Auth failed');

        const data = await response.json();
        this.sessionId = data.sessionId;
        this.player = data.player;
        this.isConnected = true;

        // Start Heartbeat (Every 2 minutes as per SDK)
        this._startHeartbeat();
        console.log('Gamplo Connected as:', this.player.displayName);
      } catch (e) {
        this.lastError = e.message;
        console.error('Gamplo Init Error:', e);
      }
    }

    _startHeartbeat() {
      setInterval(async () => {
        if (this.sessionId) {
          await fetch('https://gamplo.com/api/sdk/session', {
            method: 'POST',
            headers: { 'x-sdk-session': this.sessionId }
          }).catch(() => { this.isConnected = false; });
        }
      }, 120000);
    }

    getInfo() {
      return {
        id: 'gamplo',
        name: 'Gamplo',
        color1: '#00c853',
        blocks: [
          {
            opcode: 'isReady',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'is Gamplo connected?'
          },
          {
            opcode: 'getPlayerName',
            blockType: Scratch.BlockType.REPORTER,
            text: 'player name'
          },
          '---',
          {
            opcode: 'unlockAchievement',
            blockType: Scratch.BlockType.COMMAND,
            text: 'unlock achievement [KEY]',
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'test_1' }
            }
          },
          {
            opcode: 'submitScore',
            blockType: Scratch.BlockType.COMMAND,
            text: 'submit score [SCORE] to [LB]',
            arguments: {
              SCORE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              LB: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          }
        ]
      };
    }

    isReady() { return this.isConnected; }

    getPlayerName() { return this.player ? this.player.displayName : "Guest"; }

    async unlockAchievement(args) {
      if (!this.sessionId) return;
      try {
        const response = await fetch('https://gamplo.com/api/sdk/achievements/unlock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sdk-session': this.sessionId
          },
          body: JSON.stringify({ key: args.KEY }) // Using 'key' as found in SDK
        });
        if (!response.ok) console.error("Unlock failed", await response.json());
      } catch (e) { console.error(e); }
    }

    async submitScore(args) {
      if (!this.sessionId) return;
      try {
        await fetch('https://gamplo.com/api/sdk/scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sdk-session': this.sessionId
          },
          body: JSON.stringify({
            score: args.SCORE,
            leaderboard: args.LB
          })
        });
      } catch (e) { console.error(e); }
    }
  }

  Scratch.extensions.register(new GamploExtension(Scratch.runtime));
})(Scratch);
