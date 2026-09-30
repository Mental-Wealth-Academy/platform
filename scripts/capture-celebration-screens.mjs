import { webkit } from 'playwright';
import path from 'path';

async function capture() {
  const browser = await webkit.launch({ headless: true });
  // Emulate iPhone 14/15 Pro: 393 x 852, DPR 3
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3009/dev/celebration...');
  await page.goto('http://localhost:3009/dev/celebration', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Screen 1: Stellar Progress
  const outDir = '/Users/james/.gemini/antigravity/brain/df0ac467-c86f-4202-9234-499dfb4a5b9d';
  const screen1Path = path.join(outDir, 'screen_1_stellar_progress.png');
  await page.screenshot({ path: screen1Path });
  console.log('Captured Screen 1:', screen1Path);

  // Click Share button to capture Screen 3 (Share sheet)
  const shareBtn = await page.$('button[aria-label="Share your progress"]');
  if (shareBtn) {
    await shareBtn.click();
    await page.waitForTimeout(500);
    const screen3Path = path.join(outDir, 'screen_3_share_sheet.png');
    await page.screenshot({ path: screen3Path });
    console.log('Captured Screen 3:', screen3Path);

    // Close share sheet
    const closeBtn = await page.$('button[aria-label="Close share sheet"]');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // Click "Claim credits" to advance to Screen 2 (Streak Milestone)
  const claimBtn = await page.getByRole('button', { name: /Claim credits/i });
  if (claimBtn) {
    await claimBtn.click();
    await page.waitForTimeout(1000);
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
