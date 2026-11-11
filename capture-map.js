const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  // 1. Asegurar carpeta de salida
  const outputDir = path.join(__dirname, 'events');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'sui-mapa.png');

  // 2. Lanzar Chromium headless
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

  console.log('1. Conectando con ritstore.agency...');
  await page.goto('https://www.ritstore.agency/es/event-details/sui-visual-kei-lights-lima', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  console.log('2. Abriendo el modal de butacas...');
  const buyBtn = page.locator('text=/compra tus entradas/i').first();
  await buyBtn.waitFor({ state: 'visible', timeout: 30000 });
  await buyBtn.click();

  // Espera de 6s para asegurar que Wix termine de renderizar el plano
  console.log('3. Esperando que el modal dibuje las butacas...');
  await page.waitForTimeout(6000);

  console.log('4. Limpiando la vista con CSS estándar...');
  await page.evaluate(() => {
    // Inyectar CSS que oculte la columna del carrito, el checkout y cualquier menú flotante
    const style = document.createElement('style');
    style.innerHTML = `
      [data-hook="tickets-picker"],
      aside,
      [data-hook="checkout"],
      [data-hook="dropdown-base-text"],
      div[role="dialog"] > div:first-child:not(:last-child) {
        display: none !important;
      }
      /* Ocultar botones o textos que contengan precios en BRL */
      button[aria-haspopup="listbox"],
      [data-hook="invoice-breakdown"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  });

  console.log('5. Capturando el área del mapa...');
  // Selector nativo de Playwright para el lienzo del mapa
  const seatingGrid = page.locator('div:has(> canvas), div:has(> svg)').first();

  if (await seatingGrid.count() > 0) {
    await seatingGrid.screenshot({ path: outputPath });
    console.log(`-> Éxito: Captura guardada en ${outputPath}`);
  } else {
    console.log('Aviso: Capturando diálogo modal...');
    const modal = page.locator('div[role="dialog"]').first();
    await modal.screenshot({ path: outputPath });
  }

  await browser.close();
  console.log('Proceso finalizado.');
})();
