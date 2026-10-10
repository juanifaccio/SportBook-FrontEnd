import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4300;

export default defineConfig({
  testDir: './e2e',

  fullyParallel: true,

  forbidOnly: !!process.env['CI'],

  retries: process.env['CI'] ? 2 : 0,

  workers: process.env['CI'] ? 1 : undefined,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${PUERTO}`,

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    locale: 'es-AR'
  },

  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ],

  webServer: {
    command: 'npm run start:e2e',
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000
  }
});
