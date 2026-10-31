const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyLogin() {
  console.log('🔍 Testing LinkedIn session authentication with li_at...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    const cookiesPath = path.join(__dirname, '../.linkedin_auth/cookies.json');
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
    await page.setCookie(...cookies);

    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    const url = page.url();
    console.log('Navigated to URL:', url);

    const title = await page.title();
    console.log('Page Title:', title);

    const isLoggedIn = url.includes('/feed') || url.includes('/jobs') || url.includes('/mynetwork');
    if (isLoggedIn) {
      console.log('🎉 SUCCESS: LinkedIn session is ACTIVE and verified!');
      const profileName = await page.evaluate(() => {
        const el = document.querySelector('.feed-identity-module__actor-meta, .profile-rail-card__actor-link, .identity-headline, a[href*="/in/"]');
        return el ? el.innerText.trim().split('\n')[0] : 'Verified LinkedIn User';
      });
      console.log('👤 Logged-in Profile:', profileName);

      // Save fresh full cookie jar from active session
      const freshCookies = await page.cookies();
      fs.writeFileSync(cookiesPath, JSON.stringify(freshCookies, null, 2));
      console.log('🍪 Saved full authenticated cookie jar to .linkedin_auth/cookies.json');
    } else {
      console.log('❌ Login was redirected to:', url);
    }
  } catch (err) {
    console.error('Error during verification:', err.message);
  } finally {
    await browser.close();
  }
}

verifyLogin().then(() => process.exit(0)).catch(() => process.exit(1));
