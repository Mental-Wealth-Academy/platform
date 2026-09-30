const { chromium } = require('/Users/james/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/james/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3009/dev/celebration...');
  await page.goto('http://localhost:3009/dev/celebration', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const outDir = '/Users/james/.gemini/antigravity/brain/df0ac467-c86f-4202-9234-499dfb4a5b9d';

  // 1. Screen 1: Stellar Progress
  const screen1Path = path.join(outDir, 'screen_1_stellar_progress.png');
  await page.screenshot({ path: screen1Path });
  console.log('Captured Screen 1:', screen1Path);

  // 2. Click Share button to capture Screen 3 (Share sheet)
  const shareBtn = await page.$('button[aria-label="Share your progress"]');
  if (shareBtn) {
    await shareBtn.click();
    await page.waitForTimeout(600);
    const screen3Path = path.join(outDir, 'screen_3_share_sheet.png');
    await page.screenshot({ path: screen3Path });
    console.log('Captured Screen 3:', screen3Path);

    // Close share sheet
    const closeBtn = await page.$('button[aria-label="Close share sheet"]');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Click "Claim credits" to advance to Screen 2 (Streak Milestone)
  const claimBtn = await page.getByRole('button', { name: /Claim credits/i });
  if (claimBtn) {
    await claimBtn.click();
    await page.waitForTimeout(1200);
    const screen2Path = path.join(outDir, 'screen_2_streak_milestone.png');
    await page.screenshot({ path: screen2Path });
    console.log('Captured Screen 2:', screen2Path);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
