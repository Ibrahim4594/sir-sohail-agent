import { existsSync, mkdirSync } from 'node:fs';
import { test } from '@playwright/test';

const SCREENSHOT_DIR = 'tests/screenshots';
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

type Route = { path: string; name: string };
const routes: Route[] = [
  { path: '/', name: '01-landing' },
  { path: '/sign-in', name: '02-sign-in' },
  { path: '/chat', name: '03-chat-redirect' },
  { path: '/admin/documents', name: '04-admin-redirect' },
  { path: '/overview', name: '05-overview-redirect' },
];

for (const route of routes) {
  test(`audit: ${route.path}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const response = await page.goto(route.path, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${route.name}.png`,
      fullPage: true,
    });

    const status = response?.status() ?? 0;
    const finalUrl = page.url();
    console.log(
      `[AUDIT] ${route.path} → HTTP ${status} → ${finalUrl} | console errors: ${consoleErrors.length} | page errors: ${pageErrors.length}`,
    );
    if (consoleErrors.length) {
      console.log(`  console: ${consoleErrors.slice(0, 3).join(' ||| ')}`);
    }
    if (pageErrors.length) {
      console.log(`  pageerror: ${pageErrors.slice(0, 3).join(' ||| ')}`);
    }
  });
}
