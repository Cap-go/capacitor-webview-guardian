# @capgo/capacitor-webview-guardian
 <a href="https://capgo.app/"><img src='https://raw.githubusercontent.com/Cap-go/capgo/main/assets/capgo_banner.png' alt='Capgo - Instant updates for capacitor'/></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin_webview_guardian"> ➡️ Get Instant updates for your App with Capgo</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin_webview_guardian"> Missing a feature? We’ll build the plugin for you 💪</a></h2>
</div>

Keep your Capacitor app alive after the OS kills its WebView while the app is in the background. Webview Guardian listens for foreground events, probes the renderer, and reloads it automatically (or notifies you so you can recover your own state) when the render process was terminated.

## Install

```bash
npm install @capgo/capacitor-webview-guardian
npx cap sync
```

## Usage

```ts
import { WebviewGuardian } from '@capgo/capacitor-webview-guardian';

await WebviewGuardian.startMonitoring({
  foregroundDebounceMs: 800,
  autoRestart: true,
  restartStrategy: 'reload',
});

WebviewGuardian.addListener('webviewRestarted', ({ reason }) => {
  console.info('[guardian] WebView restarted', reason);
});
```

## API

<docgen-index>

* [`startMonitoring(...)`](#startmonitoring)
* [`stopMonitoring()`](#stopmonitoring)
* [`getState()`](#getstate)
* [`checkNow(...)`](#checknow)
* [`addListener('foreground' | 'webviewHealthy' | 'webviewCrashed' | 'webviewRestarted', ...)`](#addlistenerforeground--webviewhealthy--webviewcrashed--webviewrestarted-)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### startMonitoring(...)

```typescript
startMonitoring(options?: StartMonitoringOptions | undefined) => Promise<GuardianState>
```

Starts observing foreground events and automatically checks the WebView health.

| Param         | Type                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| **`options`** | <code><a href="#startmonitoringoptions">StartMonitoringOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#guardianstate">GuardianState</a>&gt;</code>

--------------------


### stopMonitoring()

```typescript
stopMonitoring() => Promise<GuardianState>
```

Stops any automatic foreground monitoring.

**Returns:** <code>Promise&lt;<a href="#guardianstate">GuardianState</a>&gt;</code>

--------------------


### getState()

```typescript
getState() => Promise<GuardianState>
```

Returns the latest known monitoring state.

**Returns:** <code>Promise&lt;<a href="#guardianstate">GuardianState</a>&gt;</code>

--------------------


### checkNow(...)

```typescript
checkNow(options?: CheckNowOptions | undefined) => Promise<CheckResult>
```

Forces a WebView health probe immediately.

| Param         | Type                                                        |
| ------------- | ----------------------------------------------------------- |
| **`options`** | <code><a href="#checknowoptions">CheckNowOptions</a></code> |

**Returns:** <code>Promise&lt;<a href="#checkresult">CheckResult</a>&gt;</code>

--------------------


### addListener('foreground' | 'webviewHealthy' | 'webviewCrashed' | 'webviewRestarted', ...)

```typescript
addListener(eventName: 'foreground' | 'webviewHealthy' | 'webviewCrashed' | 'webviewRestarted', listenerFunc: (event: GuardianEvent) => void) => Promise<PluginListenerHandle>
```

| Param              | Type                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'foreground' \| 'webviewHealthy' \| 'webviewCrashed' \| 'webviewRestarted'</code> |
| **`listenerFunc`** | <code>(event: <a href="#guardianstate">GuardianState</a>) =&gt; void</code>             |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### Interfaces


#### GuardianState

| Prop                       | Type                 |
| -------------------------- | -------------------- |
| **`monitoring`**           | <code>boolean</code> |
| **`reason`**               | <code>string</code>  |
| **`timestamp`**            | <code>string</code>  |
| **`lastHealthyAt`**        | <code>string</code>  |
| **`lastRestartAt`**        | <code>string</code>  |
| **`lastCrashAt`**          | <code>string</code>  |
| **`pendingRestartReason`** | <code>string</code>  |
| **`error`**                | <code>string</code>  |


#### StartMonitoringOptions

| Prop                       | Type                                                        | Description                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`foregroundDebounceMs`** | <code>number</code>                                         | Delay (in ms) before running a health check after the app re-enters the foreground. Defaults to 600ms to let the bridge finish resuming.         |
| **`pingScript`**           | <code>string</code>                                         | Script executed via `evaluateJavascript`/`evaluateJavaScript` to confirm the WebView is alive. Defaults to `document.readyState`.                |
| **`autoRestart`**          | <code>boolean</code>                                        | Automatically reloads the WebView when a terminated render process is detected. Disable to receive `webviewCrashed` events and restart manually. |
| **`restartStrategy`**      | <code><a href="#restartstrategy">RestartStrategy</a></code> | Strategy used when restarting the WebView. Defaults to `reload`.                                                                                 |
| **`customRestartUrl`**     | <code>string</code>                                         | Custom HTTPS/HTTP URL to load when `restartStrategy` is `customUrl`.                                                                             |
| **`debug`**                | <code>boolean</code>                                        | Emits verbose logging in the native layer when true.                                                                                             |
| **`runInitialCheck`**      | <code>boolean</code>                                        | Whether an immediate health check should be executed right after enabling monitoring. Defaults to `true`.                                        |


#### CheckResult

| Prop                 | Type                 |
| -------------------- | -------------------- |
| **`healthy`**        | <code>boolean</code> |
| **`restarted`**      | <code>boolean</code> |
| **`reason`**         | <code>string</code>  |
| **`timestamp`**      | <code>string</code>  |
| **`error`**          | <code>string</code>  |
| **`pendingRestart`** | <code>boolean</code> |


#### CheckNowOptions

| Prop         | Type                | Description                                                |
| ------------ | ------------------- | ---------------------------------------------------------- |
| **`reason`** | <code>string</code> | Text tag describing why a manual check is being requested. |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


### Type Aliases


#### RestartStrategy

<code>'reload' | 'reloadFromOrigin' | 'customUrl'</code>


#### GuardianEvent

<code><a href="#guardianstate">GuardianState</a></code>

</docgen-api>
