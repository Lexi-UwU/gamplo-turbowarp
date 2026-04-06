(function (Scratch) {
  'use strict';

  // This extension MUST be run unsandboxed to access the URL and bypass CORS
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Gamplo extension must run unsandboxed! Please check the box in the Custom Extension menu.');
  }

  class GamploExtension {
    constructor(runtime) {
      this.runtime = runtime;
      this.apiBase = 'https://gamplo.com';
      this.sessionId = null;
      this.player = null;
      this.isConnected = false;
      this.lastLoadedData = ""; 
      this.isBusy = false; // Prevents overlapping save/load calls

      this._init();
    }

    /**
     * Internal: Authenticates using the gamplo_token found in the URL
     */
    async _init() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('gamplo_token');

      if (!token) {
        console.warn('[Gamplo] No token found. Extension will stay disconnected.');
        return;
      }

      try {
        const response = await fetch(`${this.apiBase}/api/sdk/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token })
        });

        if (!response.ok) throw new Error('Authentication failed');

        const data = await response.json();
        this.sessionId = data.sessionId;
        this.player = data.player;
        this.isConnected = true;

        this._startHeartbeat();
        console.log('[Gamplo] Connected as:', this.player.displayName);
      } catch (e) {
        console.error('[Gamplo] Init Error:', e);
      }
    }

    /**
     * Internal: Pings the server every 2 minutes to keep the session alive
     */
    _startHeartbeat() {
      setInterval(async () => {
        if (this.sessionId) {
          fetch(`${this.apiBase}/api/sdk/session`, {
            method: 'POST',
            headers: { 'x-sdk-session': this.sessionId }
          }).catch(() => { 
            this.isConnected = false; 
          });
        }
      }, 120000);
    }

    getInfo() {
      return {
        id: 'gamplo',
        name: 'Gamplo',
        color1: '#00c853', // Gamplo Green
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
          },
          '---',
          {
            opcode: 'setSave',
            blockType: Scratch.BlockType.COMMAND,
            text: 'save [DATA] to slot [SLOT]',
            arguments: {
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: '1' },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'getSave',
            blockType: Scratch.BlockType.COMMAND,
            text: 'load data from slot [SLOT]',
            arguments: {
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
          },
          {
            opcode: 'getLastData',
            blockType: Scratch.BlockType.REPORTER,
            text: 'last loaded data'
          }
        ]
      };
    }

    // --- Block Logic ---

    isReady() {
      return this.isConnected;
    }

    getPlayerName() {
      return this.player ? this.player.displayName : "Guest";
    }

    async unlockAchievement(args) {
      if (!this.sessionId) return;
      try {
        await fetch(`${this.apiBase}/api/sdk/achievements/unlock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sdk-session': this.sessionId
          },
          body: JSON.stringify({ key: args.KEY }) // SDK uses 'key'
        });
      } catch (e) {
        console.error('[Gamplo] Achievement Error:', e);
      }
    }

    async submitScore(args) {
      if (!this.sessionId) return;
      try {
        await fetch(`${this.apiBase}/api/sdk/scores`, {
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
      } catch (e) {
        console.error('[Gamplo] Score Error:', e);
      }
    }

  async setSave(args) {
      if (!this.sessionId || this.isBusy) return;
      this.isBusy = true;
      
      let dataObject;
      try {
        // Try to parse the Scratch string as JSON
        dataObject = JSON.parse(args.DATA);
        // Ensure it's actually an object, not a number or string
        if (typeof dataObject !== 'object' || dataObject === null) {
            dataObject = { value: args.DATA };
        }
      } catch (e) {
        // If it's not valid JSON, wrap it in an object anyway
        dataObject = { value: args.DATA };
      }

      try {
        await fetch(`${this.apiBase}/api/sdk/saves`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sdk-session': this.sessionId
          },
          body: JSON.stringify({
            slot: args.SLOT,
            data: dataObject // Sending as a real JSON Object {}
          })
        });
      } catch (e) { console.error(e); }
      this.isBusy = false;
    }
async getSave(args) {
      if (!this.sessionId || this.isBusy) return;
      this.isBusy = true;
      try {
        const response = await fetch(`${this.apiBase}/api/sdk/saves?slot=${args.SLOT}`, {
          method: 'GET',
          headers: { 'x-sdk-session': this.sessionId }
        });
        
        if (response.ok) {
          const result = await response.json();
          // result.data is now the object {}
          // If we wrapped it in {value: x}, return x. Otherwise stringify the whole object.
          if (result.data && result.data.value !== undefined && Object.keys(result.data).length === 1) {
            this.lastLoadedData = result.data.value;
          } else {
            this.lastLoadedData = JSON.stringify(result.data);
          }
        }
      } catch (e) { this.lastLoadedData = "ERROR"; }
      this.isBusy = false;
    }

  Scratch.extensions.register(new GamploExtension(Scratch.runtime));
})(Scratch);
