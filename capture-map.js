const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = path.join(__dirname, 'events');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'sui-mapa.png');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  console.log('1. Cargando ritstore.agency...');
  await page.goto('https://www.ritstore.agency/es/event-details/sui-visual-kei-lights-lima', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  console.log('2. Abriendo modal de butacas...');
  const buyBtn = page.locator('text=/compra tus entradas/i').first();
  await buyBtn.waitFor({ state: 'visible', timeout: 30000 });
  await buyBtn.click();

  // Espera a que Wix dibuje la cuadrícula
  await page.waitForTimeout(6000);

  console.log('3. Limpiando interfaz...');
  await page.evaluate(() => {
    // Inyección de estilos limpia y 100% estándar de CSS
    const sheet = document.createElement('style');
    sheet.innerHTML = `
      [data-hook="tickets-picker"], 
      aside, 
      [data-hook="checkout"],
      [data-hook="invoice-breakdown"],
      div[role="dialog"] > div:first-child:not(:last-child) { 
        display: none !important; 
      }
    `;
    document.head.appendChild(sheet);
  });

  console.log('4. Capturando mapa...');
  // Captura directa del modal recortando la cuadrícula
  const seatingArea = page.locator('div:has(> canvas), div:has(> svg)').first();

  if (await seatingArea.count() > 0) {
    await seatingArea.screenshot({ path: outputPath });
    console.log(`-> Mapa capturado en: ${outputPath}`);
  } else {
    const modal = page.locator('div[role="dialog"]').first();
    await modal.screenshot({ path: outputPath });
    console.log(`-> Modal capturado en: ${outputPath}`);
  }

  await browser.close();
  console.log('Finalizado.');
})();
