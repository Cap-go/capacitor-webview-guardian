import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { WebviewGuardian } from '@capgo/capacitor-webview-guardian';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const capgoIconUrl = new URL('../../assets/capgo-icon.png', import.meta.url).href;

const DEFAULT_START_OPTIONS = {
  foregroundDebounceMs: 600,
  pingScript: 'document.readyState',
  autoRestart: true,
  restartStrategy: 'reload',
  customRestartUrl: '',
  debug: false,
  runInitialCheck: true,
};

function formatJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatError(err) {
  if (err && typeof err === 'object' && 'message' in err) {
    return err.message;
  }
  return String(err);
}

window.customElements.define(
  'capacitor-welcome',
  class extends HTMLElement {
    constructor() {
      super();
      SplashScreen.hide().catch(() => undefined);

      this.guardianListeners = [];
      this.logEntries = [];
      this.lastState = null;

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
    <style>
      :host {
        --accent: #31d53d;
        --accent-dim: #1fa832;
        --surface: #ffffff;
        --surface-2: #f0f3f6;
        --border: #d8dde3;
        --text: #1a1d21;
        --text-muted: #5c6570;
        --danger: #d93025;
        --warn: #e37400;
        --ok: #188038;
        --chip-bg: #e8f5e9;
        --chip-fg: #1b5e20;
        --log-bg: #0d1117;
        --log-fg: #c9d1d9;
        --radius: 12px;
        --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
          sans-serif;
        display: block;
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
        color: var(--text);
        box-sizing: border-box;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --surface: #1a1f26;
          --surface-2: #252b33;
          --border: #3d4652;
          --text: #e8eaed;
          --text-muted: #9aa0a6;
          --chip-bg: #1e3a24;
          --chip-fg: #81c995;
          --shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
        }
      }

      * {
        box-sizing: border-box;
      }

      .header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 16px 12px;
        background: linear-gradient(135deg, #c2185b 0%, var(--accent) 100%);
        color: #fff;
      }

      .header img {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        flex-shrink: 0;
      }

      .header-text h1 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .header-text p {
        margin: 2px 0 0;
        font-size: 0.78rem;
        opacity: 0.92;
      }

      main {
        padding: 12px 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px;
        box-shadow: var(--shadow);
      }

      .card h2 {
        margin: 0 0 10px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        background: var(--chip-bg);
        color: var(--chip-fg);
      }

      .chip.off {
        background: var(--surface-2);
        color: var(--text-muted);
      }

      .chip.warn {
        background: #fff3e0;
        color: var(--warn);
      }

      @media (prefers-color-scheme: dark) {
        .chip.warn {
          background: #3e2723;
          color: #ffb74d;
        }
      }

      .state-pre {
        margin: 0;
        padding: 10px;
        border-radius: 8px;
        background: var(--surface-2);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.7rem;
        line-height: 1.45;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 200px;
        overflow-y: auto;
      }

      label {
        display: block;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 4px;
      }

      .field {
        margin-bottom: 10px;
      }

      input[type='text'],
      input[type='number'],
      select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.85rem;
        background: var(--surface);
        color: var(--text);
      }

      .row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      @media (max-width: 420px) {
        .row-2 {
          grid-template-columns: 1fr;
        }
      }

      .checks {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 16px;
        margin-bottom: 8px;
      }

      .checks label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 0;
        font-weight: 500;
        color: var(--text);
        font-size: 0.8rem;
      }

      .btn-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      button {
        border: none;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }

      button.primary {
        background: var(--accent);
        color: #fff;
      }

      button.primary:active {
        background: var(--accent-dim);
      }

      button.secondary {
        background: var(--surface-2);
        color: var(--text);
        border: 1px solid var(--border);
      }

      button.danger {
        background: #fce8e6;
        color: var(--danger);
        border: 1px solid #f5c6c2;
      }

      @media (prefers-color-scheme: dark) {
        button.danger {
          background: #3c1f1f;
          border-color: #5c2b2b;
        }
      }

      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .hint {
        margin: 8px 0 0;
        font-size: 0.75rem;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .log-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .log-toolbar h2 {
        margin: 0;
      }

      .log {
        margin: 0;
        padding: 10px;
        border-radius: 8px;
        background: var(--log-bg);
        color: var(--log-fg);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.68rem;
        line-height: 1.5;
        max-height: 220px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .log .evt-healthy {
        color: #7ee787;
      }

      .log .evt-crash {
        color: #ff7b72;
      }

      .log .evt-restart {
        color: #79c0ff;
      }

      .log .evt-fg {
        color: #d2a8ff;
      }

      .log .evt-err {
        color: #ffa657;
      }
    </style>
    <header class="header">
      <img src="${capgoIconUrl}" alt="Capgo" width="40" height="40" />
      <div class="header-text">
        <h1>Webview Guardian</h1>
        <p>Monitor WebView health, run checks, and watch lifecycle events</p>
      </div>
    </header>
    <main>
      <section class="card" aria-labelledby="status-heading">
        <h2 id="status-heading">Guardian status</h2>
        <div class="chips">
          <span class="chip" id="chip-platform">Platform</span>
          <span class="chip off" id="chip-monitoring">Monitoring off</span>
          <span class="chip" id="chip-reason" hidden>Reason</span>
        </div>
        <pre class="state-pre" id="state-json">Loading...</pre>
        <div class="btn-row" style="margin-top: 10px">
          <button type="button" class="secondary" id="btn-refresh">Refresh state</button>
        </div>
      </section>

      <section class="card" aria-labelledby="monitor-heading">
        <h2 id="monitor-heading">Start monitoring</h2>
        <div class="row-2">
          <div class="field">
            <label for="opt-debounce">Foreground debounce (ms)</label>
            <input type="number" id="opt-debounce" min="0" step="50" value="600" />
          </div>
          <div class="field">
            <label for="opt-strategy">Restart strategy</label>
            <select id="opt-strategy">
              <option value="reload">reload</option>
              <option value="reloadFromOrigin">reloadFromOrigin</option>
              <option value="customUrl">customUrl</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="opt-ping">Ping script</label>
          <input type="text" id="opt-ping" value="document.readyState" />
        </div>
        <div class="field" id="custom-url-wrap" hidden>
          <label for="opt-custom-url">Custom restart URL</label>
          <input type="text" id="opt-custom-url" placeholder="https://example.com" />
        </div>
        <div class="checks">
          <label><input type="checkbox" id="opt-auto-restart" checked /> Auto restart</label>
          <label><input type="checkbox" id="opt-debug" /> Debug logging</label>
          <label><input type="checkbox" id="opt-initial-check" checked /> Run initial check</label>
        </div>
        <div class="btn-row">
          <button type="button" class="primary" id="btn-start">Start monitoring</button>
          <button type="button" class="danger" id="btn-stop">Stop monitoring</button>
        </div>
      </section>

      <section class="card" aria-labelledby="check-heading">
        <h2 id="check-heading">Manual health check</h2>
        <div class="field">
          <label for="check-reason">Reason tag</label>
          <input type="text" id="check-reason" value="demo-manual" />
        </div>
        <div class="btn-row">
          <button type="button" class="primary" id="btn-check">Run check now</button>
        </div>
        <pre class="state-pre" id="check-result" style="margin-top: 10px">No check yet.</pre>
        <p class="hint" id="recovery-hint">
          Turn off auto restart to handle crashes manually, then use Run check now to probe recovery
          after a crash event appears in the log.
        </p>
      </section>

      <section class="card" aria-labelledby="log-heading">
        <div class="log-toolbar">
          <h2 id="log-heading">Event log</h2>
          <button type="button" class="secondary" id="btn-clear-log">Clear</button>
        </div>
        <div class="log" id="event-log" role="log" aria-live="polite"></div>
      </section>
    </main>
    `;
    }

    connectedCallback() {
      this.bindUi();
      this.updatePlatformChip();
      this.toggleCustomUrlField();
      void this.setupListeners();
      void this.refreshState();
      this.appendLog('info', 'Demo ready. Full monitoring runs on iOS and Android.');
    }

    disconnectedCallback() {
      void this.teardownListeners();
    }

    $(id) {
      return this.shadowRoot.querySelector(id);
    }

    bindUi() {
      this.$('#opt-strategy').addEventListener('change', () => this.toggleCustomUrlField());
      this.$('#btn-refresh').addEventListener('click', () => void this.refreshState());
      this.$('#btn-start').addEventListener('click', () => void this.startMonitoring());
      this.$('#btn-stop').addEventListener('click', () => void this.stopMonitoring());
      this.$('#btn-check').addEventListener('click', () => void this.runCheckNow());
      this.$('#btn-clear-log').addEventListener('click', () => this.clearLog());
    }

    updatePlatformChip() {
      const platform = Capacitor.getPlatform();
      const native = Capacitor.isNativePlatform();
      const chip = this.$('#chip-platform');
      chip.textContent = native ? `Native: ${platform}` : `Web preview (${platform})`;
      if (!native) {
        chip.classList.add('warn');
      }
    }

    toggleCustomUrlField() {
      const strategy = this.$('#opt-strategy').value;
      const wrap = this.$('#custom-url-wrap');
      wrap.hidden = strategy !== 'customUrl';
    }

    readStartOptions() {
      const strategy = this.$('#opt-strategy').value;
      const customUrl = this.$('#opt-custom-url').value.trim();
      const options = {
        foregroundDebounceMs: Number(this.$('#opt-debounce').value) || 0,
        pingScript: this.$('#opt-ping').value.trim() || DEFAULT_START_OPTIONS.pingScript,
        autoRestart: this.$('#opt-auto-restart').checked,
        restartStrategy: strategy,
        debug: this.$('#opt-debug').checked,
        runInitialCheck: this.$('#opt-initial-check').checked,
      };
      if (strategy === 'customUrl' && customUrl) {
        options.customRestartUrl = customUrl;
      }
      return options;
    }

    applyStateToUi(state) {
      this.lastState = state;
      this.$('#state-json').textContent = formatJson(state);

      const monitoring = Boolean(state && state.monitoring);
      const monChip = this.$('#chip-monitoring');
      monChip.textContent = monitoring ? 'Monitoring on' : 'Monitoring off';
      monChip.classList.toggle('off', !monitoring);

      const reasonChip = this.$('#chip-reason');
      if (state && state.reason) {
        reasonChip.hidden = false;
        reasonChip.textContent = `Reason: ${state.reason}`;
      } else {
        reasonChip.hidden = true;
      }
    }

    async refreshState() {
      try {
        const state = await WebviewGuardian.getState();
        this.applyStateToUi(state);
        this.appendLog('info', `getState OK @ ${state.timestamp}`);
      } catch (err) {
        this.applyStateToUi({
          monitoring: false,
          reason: 'unavailable',
          timestamp: new Date().toISOString(),
          error: formatError(err),
        });
        this.appendLog('error', `getState failed: ${formatError(err)}`);
      }
    }

    async startMonitoring() {
      const options = this.readStartOptions();
      try {
        const state = await WebviewGuardian.startMonitoring(options);
        this.applyStateToUi(state);
        this.appendLog('info', `startMonitoring OK (${formatJson(options)})`);
      } catch (err) {
        this.appendLog('error', `startMonitoring failed: ${formatError(err)}`);
      }
    }

    async stopMonitoring() {
      try {
        const state = await WebviewGuardian.stopMonitoring();
        this.applyStateToUi(state);
        this.appendLog('info', 'stopMonitoring OK');
      } catch (err) {
        this.appendLog('error', `stopMonitoring failed: ${formatError(err)}`);
      }
    }

    async runCheckNow() {
      const reason = this.$('#check-reason').value.trim() || 'manual';
      try {
        const result = await WebviewGuardian.checkNow({ reason });
        this.$('#check-result').textContent = formatJson(result);
        const label = result.healthy ? 'healthy' : 'unhealthy';
        this.appendLog(
          result.healthy ? 'healthy' : 'crash',
          `checkNow (${reason}): ${label}, restarted=${result.restarted}`,
        );
        if (result.pendingRestart) {
          this.appendLog('crash', 'Pending restart: run check again after fixing WebView state.');
        }
        await this.refreshState();
      } catch (err) {
        this.$('#check-result').textContent = formatError(err);
        this.appendLog('error', `checkNow failed: ${formatError(err)}`);
      }
    }

    async setupListeners() {
      if (!Capacitor.isNativePlatform()) {
        return;
      }
      const events = [
        ['foreground', 'fg'],
        ['webviewHealthy', 'healthy'],
        ['webviewCrashed', 'crash'],
        ['webviewRestarted', 'restart'],
      ];
      for (const [eventName, cssClass] of events) {
        const handle = await WebviewGuardian.addListener(eventName, (payload) => {
          this.appendLog(cssClass, `${eventName} @ ${payload.timestamp} (${payload.reason})`);
          void this.refreshState();
        });
        this.guardianListeners.push(handle);
      }
      this.appendLog('info', 'Event listeners registered.');
    }

    async teardownListeners() {
      for (const handle of this.guardianListeners) {
        await handle.remove();
      }
      this.guardianListeners = [];
    }

    appendLog(kind, message) {
      const time = new Date().toISOString().slice(11, 19);
      this.logEntries.push({ kind, message, time });
      if (this.logEntries.length > 120) {
        this.logEntries.shift();
      }
      this.renderLog();
    }

    clearLog() {
      this.logEntries = [];
      this.renderLog();
    }

    renderLog() {
      const el = this.$('#event-log');
      if (!el) {
        return;
      }
      if (this.logEntries.length === 0) {
        el.textContent = 'No events yet.';
        return;
      }
      el.innerHTML = this.logEntries
        .map((entry) => {
          const cls = `evt-${entry.kind}`;
          return `<div class="${cls}">[${entry.time}] ${entry.message}</div>`;
        })
        .join('');
      el.scrollTop = el.scrollHeight;
    }
  },
);

if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().catch((error) => {
    console.error('Capgo notifyAppReady failed', error);
  });
}
