package app.capgo.webviewguardian;

import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(name = "WebviewGuardian")
public class WebviewGuardianPlugin extends Plugin {
    private static final ThreadLocal<SimpleDateFormat> ISO_FORMAT = ThreadLocal.withInitial(() -> {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf;
    });

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private MonitoringOptions options = new MonitoringOptions();
    private boolean monitoring = false;
    private long lastHealthyAt;
    private long lastRestartAt;
    private long lastCrashAt;
    private String pendingRestartReason;

    @Override
    public void load() {
        super.load();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (!monitoring) {
            return;
        }
        notifyListeners("foreground", buildStatePayload("foreground", null));
        scheduleHealthCheck("foreground");
    }

    @PluginMethod
    public void startMonitoring(PluginCall call) {
        options = MonitoringOptions.fromCall(call, options);
        monitoring = true;
        if (call.getBoolean("runInitialCheck", true)) {
            scheduleHealthCheck("start");
        }
        call.resolve(buildStatePayload("start", null));
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        monitoring = false;
        call.resolve(buildStatePayload("stop", null));
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(buildStatePayload("state", null));
    }

    @PluginMethod
    public void checkNow(PluginCall call) {
        String reason = call.getString("reason", "manual");
        performHealthCheck(reason, call);
    }

    private void scheduleHealthCheck(String reason) {
        int delay = Math.max(0, options.foregroundDebounceMs);
        mainHandler.postDelayed(() -> performHealthCheck(reason, null), delay);
    }

    private void performHealthCheck(String reason, @Nullable PluginCall call) {
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            if (call != null) {
                call.reject("WebView unavailable");
            }
            return;
        }

        logDebug("Running health check with reason=" + reason);
        mainHandler.post(() -> {
            try {
                webView.evaluateJavascript(options.pingScript, value -> {
                    lastHealthyAt = System.currentTimeMillis();
                    notifyListeners("webviewHealthy", buildStatePayload(reason, null));
                    if (call != null) {
                        call.resolve(buildCheckResult(true, false, reason, null, false));
                    }
                });
            } catch (Throwable throwable) {
                handleCrash(reason, throwable.getMessage(), call);
            }
        });
    }

    private void handleCrash(String reason, @Nullable String error, @Nullable PluginCall call) {
        lastCrashAt = System.currentTimeMillis();
        String errorMessage = error != null ? error : "WebView renderer terminated";
        logDebug("Detected crashed WebView for reason=" + reason + " error=" + errorMessage);
        notifyListeners("webviewCrashed", buildStatePayload(reason, errorMessage));

        if (!options.autoRestart) {
            pendingRestartReason = reason;
            if (call != null) {
                call.resolve(buildCheckResult(false, false, reason, errorMessage, true));
            }
            return;
        }

        restartWebView(reason, errorMessage, call);
    }

    private void restartWebView(String reason, @Nullable String error, @Nullable PluginCall call) {
        WebView webView = getBridge().getWebView();
        if (webView == null) {
            if (call != null) {
                call.reject("WebView unavailable");
            }
            return;
        }

        mainHandler.post(() -> {
            switch (options.restartStrategy) {
                case CUSTOM_URL:
                    if (options.customRestartUrl != null && !options.customRestartUrl.isEmpty()) {
                        webView.loadUrl(options.customRestartUrl);
                    } else {
                        getBridge().reload();
                    }
                    break;
                case RELOAD_FROM_ORIGIN:
                case RELOAD:
                default:
                    getBridge().reload();
                    break;
            }

            pendingRestartReason = null;
            lastRestartAt = System.currentTimeMillis();
            notifyListeners("webviewRestarted", buildStatePayload(reason, error));
            if (call != null) {
                call.resolve(buildCheckResult(false, true, reason, error, false));
            }
        });
    }

    private JSObject buildStatePayload(String reason, @Nullable String error) {
        JSObject result = new JSObject();
        result.put("reason", reason);
        result.put("monitoring", monitoring);
        result.put("timestamp", isoNow());

        if (lastHealthyAt > 0) {
            result.put("lastHealthyAt", isoFromMillis(lastHealthyAt));
        }

        if (lastRestartAt > 0) {
            result.put("lastRestartAt", isoFromMillis(lastRestartAt));
        }

        if (lastCrashAt > 0) {
            result.put("lastCrashAt", isoFromMillis(lastCrashAt));
        }

        if (pendingRestartReason != null) {
            result.put("pendingRestartReason", pendingRestartReason);
        }

        if (error != null) {
            result.put("error", error);
        }

        return result;
    }

    private JSObject buildCheckResult(boolean healthy, boolean restarted, String reason, @Nullable String error, boolean pendingRestart) {
        JSObject result = new JSObject();
        result.put("healthy", healthy);
        result.put("restarted", restarted);
        result.put("reason", reason);
        result.put("timestamp", isoNow());
        if (error != null) {
            result.put("error", error);
        }
        if (pendingRestart) {
            result.put("pendingRestart", true);
        }
        return result;
    }

    private String isoNow() {
        return ISO_FORMAT.get().format(new Date());
    }

    private String isoFromMillis(long millis) {
        if (millis <= 0) {
            return null;
        }
        return ISO_FORMAT.get().format(new Date(millis));
    }

    private void logDebug(String message) {
        if (options.debugLogging) {
            Logger.debug(getLogTag(), message);
        }
    }

    private enum RestartStrategy {
        RELOAD,
        RELOAD_FROM_ORIGIN,
        CUSTOM_URL
    }

    private static final class MonitoringOptions {
        private int foregroundDebounceMs = 600;
        private String pingScript = "(function(){return document.readyState;})();";
        private boolean autoRestart = true;
        private RestartStrategy restartStrategy = RestartStrategy.RELOAD;
        private String customRestartUrl;
        private boolean debugLogging = false;

        static MonitoringOptions fromCall(PluginCall call, MonitoringOptions defaults) {
            MonitoringOptions opts = new MonitoringOptions();
            Integer debounce = call.getInt("foregroundDebounceMs");
            opts.foregroundDebounceMs = debounce != null ? debounce : defaults.foregroundDebounceMs;

            String ping = call.getString("pingScript");
            opts.pingScript = ping != null ? ping : defaults.pingScript;

            Boolean autoRestart = call.getBoolean("autoRestart");
            opts.autoRestart = autoRestart != null ? autoRestart : defaults.autoRestart;

            Boolean debug = call.getBoolean("debug");
            opts.debugLogging = debug != null ? debug : defaults.debugLogging;

            String strategyValue = call.getString("restartStrategy");
            if (strategyValue == null) {
                strategyValue = defaults.restartStrategy.name().toLowerCase(Locale.ROOT);
            }
            if (strategyValue != null) {
                try {
                    opts.restartStrategy = RestartStrategy.valueOf(strategyValue.toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ignored) {
                    opts.restartStrategy = defaults.restartStrategy;
                }
            } else {
                opts.restartStrategy = defaults.restartStrategy;
            }

            String customUrl = call.getString("customRestartUrl");
            opts.customRestartUrl = customUrl != null ? customUrl : defaults.customRestartUrl;

            return opts;
        }
    }
}
