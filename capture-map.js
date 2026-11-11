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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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

  console.log('2. Clickeando "Compra tus entradas"...');
  const buyBtn = page.locator('text=/compra tus entradas/i').first();
  await buyBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await buyBtn.click({ force: true });

  console.log('3. Esperando que Wix cargue los asientos...');
  await page.waitForTimeout(7000);

  console.log('4. Ocultando panel lateral de compras...');
  await page.addStyleTag({
    content: `
      [data-hook="tickets-picker"],
      aside,
      [data-hook="checkout"],
      [data-hook="invoice-breakdown"] {
        display: none !important;
      }
    `
  });

  console.log('5. Tomando captura...');
  // Buscar el lienzo interactivo del mapa (canvas o SVG)
  const seatingGrid = page.locator('canvas, svg').filter({ has: page.locator('circle, path') }).first();

  if (await seatingGrid.count() > 0 && await seatingGrid.isVisible()) {
    await seatingGrid.screenshot({ path: outputPath });
    console.log(`-> Cuadrícula recortada guardada en ${outputPath}`);
  } else {
    // Si Wix agrupó el SVG dentro de un contenedor, recorta el área central de la pantalla
    console.log('-> Tomando captura de la zona central de la sala...');
    await page.screenshot({
      path: outputPath,
      clip: { x: 300, y: 150, width: 900, height: 600 }
    });
  }

  await browser.close();
  console.log('Proceso completado.');
})();
