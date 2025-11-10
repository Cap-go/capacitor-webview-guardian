import XCTest
@testable import WebviewGuardianPlugin

final class WebviewGuardianPluginTests: XCTestCase {
    func testPluginExposesMetadata() {
        let plugin = WebviewGuardianPlugin()
        XCTAssertEqual(plugin.jsName, "WebviewGuardian")
        XCTAssertEqual(plugin.identifier, "WebviewGuardianPlugin")
    }
}
