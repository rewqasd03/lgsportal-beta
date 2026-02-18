const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Testing student dashboard...');
    await page.goto('https://17jja4h2u5po.space.minimax.io/student-dashboard', { timeout: 30000 });
    await page.waitForTimeout(5000);
    
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page content:', pageText.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
