import { WebPlugin } from '@capacitor/core';

import type {
  CheckNowOptions,
  CheckResult,
  GuardianState,
  StartMonitoringOptions,
  WebviewGuardianPlugin,
} from './definitions';

export class WebviewGuardianWeb extends WebPlugin implements WebviewGuardianPlugin {
  async startMonitoring(_options?: StartMonitoringOptions): Promise<GuardianState> {
    throw this.unimplemented('WebviewGuardian is only available on native platforms.');
  }

  async stopMonitoring(): Promise<GuardianState> {
    throw this.unimplemented('WebviewGuardian is only available on native platforms.');
  }

  async getState(): Promise<GuardianState> {
    throw this.unimplemented('WebviewGuardian is only available on native platforms.');
  }

  async checkNow(_options?: CheckNowOptions): Promise<CheckResult> {
    throw this.unimplemented('WebviewGuardian is only available on native platforms.');
  }
}
