const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Test student dashboard
    console.log('Testing student dashboard...');
    await page.goto('https://17jja4h2u5po.space.minimax.io/student-dashboard', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const pageContent = await page.content();
    
    if (pageContent.includes('LGS Sınavına') || pageContent.includes('LGS')) {
      console.log('✅ LGS countdown widget found');
    } else {
      console.log('❌ LGS countdown widget NOT found');
    }
    
    if (pageContent.includes('İOKBS') || pageContent.includes('İOKBS')) {
      console.log('✅ İOKBS countdown widget found');
    } else {
      console.log('❌ İOKBS countdown widget NOT found');
    }
    
    if (pageContent.includes('Haftalık') || pageContent.includes('Haftalık')) {
      console.log('✅ Weekly summary found');
    } else {
      console.log('❌ Weekly summary NOT found');
    }
    
    if (pageContent.includes('Aylık') || pageContent.includes('Aylık')) {
      console.log('✅ Monthly summary found');
    } else {
      console.log('❌ Monthly summary NOT found');
    }
    
    // Test panel
    console.log('\nTesting panel...');
    await page.goto('https://17jja4h2u5po.space.minimax.io/panel', { timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const panelContent = await page.content();
    
    if (panelContent.includes('Başarı Rozetleri') || panelContent.includes('Başarı')) {
      console.log('✅ Başarı Rozetleri tab found');
    } else {
      console.log('❌ Başarı Rozetleri tab NOT found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
