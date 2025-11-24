// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WebviewGuardian",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "WebviewGuardian",
            targets: ["WebviewGuardianPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.4.4")
    ],
    targets: [
        .target(
            name: "WebviewGuardianPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/WebviewGuardianPlugin"),
        .testTarget(
            name: "WebviewGuardianPluginTests",
            dependencies: ["WebviewGuardianPlugin"],
            path: "ios/Tests/WebviewGuardianPluginTests")
    ]
)
