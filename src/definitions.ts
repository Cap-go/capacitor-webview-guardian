import type { PluginListenerHandle } from '@capacitor/core';

export type RestartStrategy = 'reload' | 'reloadFromOrigin' | 'customUrl';

export interface StartMonitoringOptions {
  /**
   * Delay (in ms) before running a health check after the app re-enters the foreground.
   * Defaults to 600ms to let the bridge finish resuming.
   */
  foregroundDebounceMs?: number;

  /**
   * Script executed via `evaluateJavascript`/`evaluateJavaScript` to confirm the WebView is alive.
   * Defaults to `document.readyState`.
   */
  pingScript?: string;

  /**
   * Automatically reloads the WebView when a terminated render process is detected.
   * Disable to receive `webviewCrashed` events and restart manually.
   */
  autoRestart?: boolean;

  /**
   * Strategy used when restarting the WebView. Defaults to `reload`.
   */
  restartStrategy?: RestartStrategy;

  /**
   * Custom HTTPS/HTTP URL to load when `restartStrategy` is `customUrl`.
   */
  customRestartUrl?: string;

  /**
   * Emits verbose logging in the native layer when true.
   */
  debug?: boolean;

  /**
   * Whether an immediate health check should be executed right after enabling monitoring.
   * Defaults to `true`.
   */
  runInitialCheck?: boolean;
}

export interface GuardianState {
  monitoring: boolean;
  reason: string;
  timestamp: string;
  lastHealthyAt?: string;
  lastRestartAt?: string;
  lastCrashAt?: string;
  pendingRestartReason?: string;
  error?: string;
}

export interface CheckResult {
  healthy: boolean;
  restarted: boolean;
  reason: string;
  timestamp: string;
  error?: string;
  pendingRestart?: boolean;
}

export type GuardianEvent = GuardianState;

export interface CheckNowOptions {
  /**
   * Text tag describing why a manual check is being requested.
   */
  reason?: string;
}

export interface WebviewGuardianPlugin {
  /**
   * Starts observing foreground events and automatically checks the WebView health.
   */
  startMonitoring(options?: StartMonitoringOptions): Promise<GuardianState>;

  /**
   * Stops any automatic foreground monitoring.
   */
  stopMonitoring(): Promise<GuardianState>;

  /**
   * Returns the latest known monitoring state.
   */
  getState(): Promise<GuardianState>;

  /**
   * Forces a WebView health probe immediately.
   */
  checkNow(options?: CheckNowOptions): Promise<CheckResult>;

  addListener(
    eventName: 'foreground' | 'webviewHealthy' | 'webviewCrashed' | 'webviewRestarted',
    listenerFunc: (event: GuardianEvent) => void,
  ): Promise<PluginListenerHandle>;
}
