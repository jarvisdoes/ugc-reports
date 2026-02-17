const { chromium } = require('playwright');

const API_KEY = 'sk_735982c4-b9c5-4b1e-b406-13fd174d5511.Mcwdv59YEoz1p+eAB6mVx6EEfTU2toYetvT/eWVkH84';

const ACCOUNTS = [
  { name: 'demo2', profileId: 'y5hjiiaxtw6dlhbe06p92dzg' },
  { name: 'demo3', profileId: 'z3t80h0up47fs0lpt919nmws' },
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
    body: JSON.stringify({ profile_id: account.profileId })
  });
  
  const session = await response.json();
  if (!session.cdp_ws_url) {
    console.error(`[${account.name}] Failed to create session:`, JSON.stringify(session));
    return;
  }
  
  console.log(`[${account.name}] Connecting to CDP...`);
  const browser = await chromium.connectOverCDP(session.cdp_ws_url);
  
  try {
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();
    
    // Navigate to login
    console.log(`[${account.name}] Logging in...`);
    await page.goto('https://members.ugcprofitgenerator.com/login', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if already logged in
    if (page.url().includes('/posts') || page.url().includes('/dashboard')) {
      console.log(`[${account.name}] Already logged in, navigating to /posts...`);
    } else {
      // Fill login form
      await page.fill('input[type="email"], input[name="email"], #email', `${account.name}@ugcprofitgenerator.com`);
      await page.fill('input[type="password"], input[name="password"], #password', 'UGC2026!');
      await page.click('button[type="submit"], input[type="submit"], .login-button, button:has-text("Log in"), button:has-text("Sign in")');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    
    // Navigate to posts
    console.log(`[${account.name}] Navigating to /posts...`);
    await page.goto('https://members.ugcprofitgenerator.com/posts', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Take screenshot
    const path = `${SCREENSHOT_DIR}/${account.name}-posts.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`[${account.name}] Screenshot saved to ${path}`);
    
  } finally {
    await browser.close();
    // Terminate session
    console.log(`[${account.name}] Terminating session...`);
    await fetch(`https://api.onkernel.com/browsers/${session.session_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + API_KEY }
    }).catch(() => {});
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
