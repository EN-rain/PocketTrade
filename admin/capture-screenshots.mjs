/**
 * Standalone screenshot capture script.
 * Runs outside the test runner to capture authenticated admin pages.
 * Usage: node admin/capture-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'tests/e2e/__screenshots__');

const PAGES = [
  { name: 'dashboard',     url: 'http://localhost:5173/admin/dashboard' },
  { name: 'listings',      url: 'http://localhost:5173/admin/listings' },
  { name: 'users',         url: 'http://localhost:5173/admin/users' },
  { name: 'reports',       url: 'http://localhost:5173/admin/reports' },
  { name: 'analytics',     url: 'http://localhost:5173/admin/analytics' },
  { name: 'activity',      url: 'http://localhost:5173/admin/activity' },
];

const BROWSER_PATH = 'C:\\Users\\LENOVO\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe';

async function captureScreenshots() {
  const browser = await chromium.launch({
    executablePath: BROWSER_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // Login first
  console.log('Logging in...');
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });
  
  // Fill login form
  await page.getByLabel(/email/i).fill('admin@pockettrade.local');
  await page.getByLabel(/password/i).fill('AdminPass123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/admin/dashboard', { timeout: 10_000 });
  console.log('Logged in, now capturing pages...');

  for (const { name, url } of PAGES) {
    console.log(`  Capturing ${name}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 });
    await page.waitForTimeout(1_000); // let charts render
    
    const outPath = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    const size = (await import('fs')).promises.stat(outPath).then(s => s.size);
    console.log(`    → ${await size} bytes`);
  }

  await browser.close();
  console.log('Done.');
}

captureScreenshots().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});