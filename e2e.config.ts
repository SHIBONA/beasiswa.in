import { randomUUID } from 'node:crypto';
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  tests: 'tests/**/*.e2e.ts',
  workers: 1,
  targets: [{
    engine: web({
      viewport: process.env.BEASISWA_TEST_MOBILE === '1'
        ? { width: 375, height: 812 }
        : { width: 1280, height: 720 },
    }),
    app: {
      url: 'http://127.0.0.1:0',
      command: {
        executable: process.execPath,
        args: ['src/server.mjs'],
        env: {
          PORT: '{port}',
          DATABASE_FILE: `.e2e/data-${randomUUID()}.sqlite`,
          DATA_FILE: '.e2e/no-legacy-data.json',
          FIRECRAWL_API_KEY: '',
          ANTHROPIC_API_KEY: '',
          DEMO_STEP_MS: '5',
        },
        log: '.e2e/logs/app.log',
      },
    },
  }],
} satisfies E2EConfig;
