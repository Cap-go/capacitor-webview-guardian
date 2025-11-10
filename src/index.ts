import { registerPlugin } from '@capacitor/core';

import type { WebviewGuardianPlugin } from './definitions';

const WebviewGuardian = registerPlugin<WebviewGuardianPlugin>('WebviewGuardian', {
  web: () => import('./web').then((m) => new m.WebviewGuardianWeb()),
});

export * from './definitions';
export { WebviewGuardian };
