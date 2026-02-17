const { chromium } = require('playwright');

const API_KEY = 'sk_735982c4-b9c5-4b1e-b406-13fd174d5511.Mcwdv59YEoz1p+eAB6mVx6EEfTU2toYetvT/eWVkH84';

// Only remaining accounts
const ACCOUNTS = [
  { name: 'demo7', profileId: 'fgzj6x1px2tlgtuiswr07r77' },
  { name: 'demo11', profileId: 'xxv3sak6vq89ar7gkl7iohyn' },
  { name: 'demo16', profileId: 'lwyyavtna38qqrastdw7we6p' },
  { name: 'demo17', profileId: 'w6ywzhus5oaz0xzm634ib62v' },
];

const SCREENSHOT_DIR = '/Users/jarvisdoes/Documents/frank/projects/ugc-reports/screenshots/2026-02-17';

async function takeScreenshot(account) {
  console.log(`[${account.name}] Creating Kernel session...`);
  
  const response = await fetch('https://api.onkernel.com/browsers', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ profile_id: account.profileId, timeout_seconds: 120 })
  });
  
  const session = await response.json();
  if (!session.cdp_ws_url) {
    console.error(`[${account.name}] Failed:`, JSON.stringify(session));
    return;
  }
  
  console.log(`[${account.name}] Connecting...`);
  const browser = await chromium.connectOverCDP(session.cdp_ws_url);
  
  try {
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();
    
    // Go directly to posts first (profile may have cookies)
    console.log(`[${account.name}] Trying /posts directly...`);
    await page.goto('https://members.ugcprofitgenerator.com/posts', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    
    // If redirected to login
    if (page.url().includes('/login') || page.url().includes('/sign')) {
      console.log(`[${account.name}] Need to login...`);
      // Try multiple selectors
      const emailSel = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('#email');
      const pwSel = await page.$('input[type="password"]') || await page.$('input[name="password"]') || await page.$('#password');
      
      if (emailSel && pwSel) {
        await emailSel.fill(`${account.name}@ugcprofitgenerator.com`);
        await pwSel.fill('UGC2026!');
        // Find submit button
        const btn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
        if (btn) await btn.click();
        await page.waitForTimeout(5000);
        
        // Navigate to posts
        await page.goto('https://members.ugcprofitgenerator.com/posts', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(3000);
      } else {
        console.log(`[${account.name}] Could not find login fields, taking screenshot anyway`);
      }
    }
    
    const path = `${SCREENSHOT_DIR}/${account.name}-posts.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`[${account.name}] ✅ Screenshot saved`);
    
  } finally {
    await browser.close();
    await fetch(`https://api.onkernel.com/browsers/${session.session_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + API_KEY }
    }).catch(() => {});
    console.log(`[${account.name}] Session terminated`);
  }
}

(async () => {
  for (const account of ACCOUNTS) {
    try {
      await takeScreenshot(account);
    } catch (err) {
      console.error(`[${account.name}] Error:`, err.message);
    }
  }
  console.log('All done!');
})();
