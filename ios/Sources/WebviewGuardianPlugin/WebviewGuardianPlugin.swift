import Capacitor
import Foundation
import WebKit

@objc(WebviewGuardianPlugin)
public class WebviewGuardianPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WebviewGuardianPlugin"
    public let jsName = "WebviewGuardian"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startMonitoring", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopMonitoring", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkNow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    private var monitoringOptions = MonitoringOptions()
    private var monitoringEnabled = false
    private var lastHealthyAt: Date?
    private var lastRestartAt: Date?
    private var lastCrashAt: Date?
    private var pendingRestartReason: String?
    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    // MARK: - Lifecycle

    public override func load() {
        super.load()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Plugin Methods

    @objc func startMonitoring(_ call: CAPPluginCall) {
        monitoringOptions = MonitoringOptions(from: call, defaults: monitoringOptions)
        monitoringEnabled = true
        if call.getBool("runInitialCheck", true) {
            scheduleHealthCheck(reason: "start")
        }
        call.resolve(statePayload(reason: "start"))
    }

    @objc func stopMonitoring(_ call: CAPPluginCall) {
        monitoringEnabled = false
        call.resolve(statePayload(reason: "stop"))
    }

    @objc func getState(_ call: CAPPluginCall) {
        call.resolve(statePayload(reason: "state"))
    }

    @objc func checkNow(_ call: CAPPluginCall) {
        performHealthCheck(reason: call.getString("reason") ?? "manual", completion: call)
    }

    // MARK: - Observers

    @objc private func appDidBecomeActive() {
        guard monitoringEnabled else { return }
        notifyListeners("foreground", data: statePayload(reason: "foreground"))
        scheduleHealthCheck(reason: "foreground")
    }

    @objc private func appDidEnterBackground() {
        pendingRestartReason = nil
        notifyDebug("App entered background")
    }

    // MARK: - Health Checks

    private func scheduleHealthCheck(reason: String) {
        let delay = DispatchTime.now() + .milliseconds(max(0, monitoringOptions.foregroundDebounceMs))
        DispatchQueue.main.asyncAfter(deadline: delay) { [weak self] in
            self?.performHealthCheck(reason: reason, completion: nil)
        }
    }

    private func performHealthCheck(reason: String, completion: CAPPluginCall?) {
        guard let webView = bridge?.webView else {
            completion?.reject("WebView unavailable")
            return
        }

        notifyDebug("Running health check for reason=\(reason)")
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            webView.evaluateJavaScript(self.monitoringOptions.pingScript) { _, error in
                if let nsError = error as NSError?, self.isTerminatedError(nsError) {
                    self.handleCrash(reason: reason, error: nsError, completion: completion)
                } else if let nsError = error as NSError? {
                    self.notifyDebug("Ping failed with non-terminal error: \(nsError)")
                    completion?.reject("Ping failed: \(nsError.localizedDescription)")
                } else {
                    self.lastHealthyAt = Date()
                    self.notifyListeners("webviewHealthy", data: self.statePayload(reason: reason))
                    completion?.resolve(self.checkResult(healthy: true, restarted: false, reason: reason, error: nil))
                }
            }
        }
    }

    private func handleCrash(reason: String, error: NSError?, completion: CAPPluginCall?) {
        lastCrashAt = Date()
        let errorMessage = error?.localizedDescription ?? "WebView content process terminated"
        notifyDebug("Detected terminated WebView for reason=\(reason) error=\(errorMessage)")
        let crashData = statePayload(reason: reason, error: errorMessage)
        notifyListeners("webviewCrashed", data: crashData)

        guard monitoringOptions.autoRestart else {
            pendingRestartReason = reason
            completion?.resolve(checkResult(healthy: false, restarted: false, reason: reason, error: errorMessage, pendingRestart: true))
            return
        }

        restartWebView(reason: reason, error: errorMessage, completion: completion)
    }

    private func restartWebView(reason: String, error: String?, completion: CAPPluginCall?) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard let webView = self.bridge?.webView else {
                completion?.reject("WebView unavailable")
                return
            }

            switch self.monitoringOptions.restartStrategy {
            case .reloadFromOrigin:
                if webView.responds(to: #selector(WKWebView.reloadFromOrigin)) {
                    webView.reloadFromOrigin()
                } else {
                    webView.reload()
                }
            case .customUrl:
                if let url = self.monitoringOptions.customRestartURL {
                    webView.load(URLRequest(url: url))
                } else {
                    webView.reload()
                }
            case .reload:
                webView.reload()
            }

            self.pendingRestartReason = nil
            self.lastRestartAt = Date()
            let restartData = self.statePayload(reason: reason, error: error)
            self.notifyListeners("webviewRestarted", data: restartData)
            completion?.resolve(self.checkResult(healthy: false, restarted: true, reason: reason, error: error))
        }
    }

    // MARK: - Helpers

    private func statePayload(reason: String, error: String? = nil) -> [String: Any] {
        var data: [String: Any] = [
            "reason": reason,
            "monitoring": monitoringEnabled,
            "timestamp": isoFormatter.string(from: Date())
        ]

        if let lastHealthyAt {
            data["lastHealthyAt"] = isoFormatter.string(from: lastHealthyAt)
        }
        if let lastRestartAt {
            data["lastRestartAt"] = isoFormatter.string(from: lastRestartAt)
        }
        if let lastCrashAt {
            data["lastCrashAt"] = isoFormatter.string(from: lastCrashAt)
        }
        if let pendingRestartReason {
            data["pendingRestartReason"] = pendingRestartReason
        }
        if let error {
            data["error"] = error
        }

        return data
    }

    private func checkResult(healthy: Bool, restarted: Bool, reason: String, error: String?, pendingRestart: Bool = false) -> [String: Any] {
        var result: [String: Any] = [
            "healthy": healthy,
            "restarted": restarted,
            "reason": reason,
            "timestamp": isoFormatter.string(from: Date())
        ]
        if let error {
            result["error"] = error
        }
        if pendingRestart {
            result["pendingRestart"] = true
        }
        return result
    }

    private func isTerminatedError(_ error: NSError) -> Bool {
        guard error.domain == WKError.errorDomain else { return false }
        return error.code == WKError.webContentProcessTerminated.rawValue ||
            error.code == WKError.webViewInvalidated.rawValue
    }

    private func notifyDebug(_ message: String) {
        guard monitoringOptions.debugLogging else { return }
        CAPLog.print("⚡️ [WebviewGuardian] \(message)")
    }
}

// MARK: - Monitoring Options

private struct MonitoringOptions {
    enum RestartStrategy: String {
        case reload
        case reloadFromOrigin
        case customUrl
    }

    var foregroundDebounceMs: Int = 600
    var pingScript: String = "document.readyState"
    var autoRestart: Bool = true
    var restartStrategy: RestartStrategy = .reload
    var customRestartURL: URL?
    var debugLogging: Bool = false

    init() {}

    init(from call: CAPPluginCall, defaults: MonitoringOptions) {
        foregroundDebounceMs = call.getInt("foregroundDebounceMs", defaults.foregroundDebounceMs)
        pingScript = call.getString("pingScript") ?? defaults.pingScript
        autoRestart = call.getBool("autoRestart", defaults.autoRestart)
        debugLogging = call.getBool("debug", defaults.debugLogging)

        if let strategyValue = call.getString("restartStrategy")?.lowercased(),
           let parsed = RestartStrategy(rawValue: strategyValue) {
            restartStrategy = parsed
        } else {
            restartStrategy = defaults.restartStrategy
        }

        if let urlValue = call.getString("customRestartUrl"), let parsed = URL(string: urlValue) {
            customRestartURL = parsed
        } else {
            customRestartURL = defaults.customRestartURL
        }
    }
}
