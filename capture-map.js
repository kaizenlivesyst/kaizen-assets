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

  console.log('1. Cargando la web de R.I.T...');
  await page.goto('https://www.ritstore.agency/es/event-details/sui-visual-kei-lights-lima', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  console.log('2. Bajando hacia el botón de entradas...');
  const buyBtn = page.getByRole('button', { name: /compra tus entradas/i })
    .or(page.locator('a, button').filter({ hasText: /compra tus entradas/i })).first();

  // Scroll explícito hacia el botón para garantizar que esté dentro de la vista
  await buyBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await buyBtn.click({ force: true });
  console.log('-> Clic en "Compra tus entradas" ejecutado.');

  console.log('3. Esperando que el modal abra y renderice la sala...');
  // Esperar a que el modal aparezca en el DOM
  const modalLocator = page.locator('div[role="dialog"], [aria-modal="true"]').first();
  await modalLocator.waitFor({ state: 'visible', timeout: 20000 });

  // Margen de 6 segundos para que los microservicios de Wix dibujen los círculos
  await page.waitForTimeout(6000);

  console.log('4. Ocultando columna izquierda y botones en BRL...');
  await page.addStyleTag({
    content: `
      [data-hook="tickets-picker"],
      aside,
      [data-hook="checkout"],
      [data-hook="invoice-breakdown"],
      div[role="dialog"] > div:first-child:not(:last-child) {
        display: none !important;
      }
      button:has-text("precios"),
      button[aria-haspopup="listbox"],
      [data-hook="dropdown-base-text"] {
        display: none !important;
      }
    `
  });

  console.log('5. Capturando el plano del mapa...');
  // Priorizar el lienzo del mapa dentro del diálogo
  const seatingGrid = modalLocator.locator('div:has(> canvas), div:has(> svg)').first();

  if (await seatingGrid.count() > 0 && await seatingGrid.isVisible()) {
    await seatingGrid.screenshot({ path: outputPath });
    console.log(`-> Éxito: Cuadrícula del mapa capturada en ${outputPath}`);
  } else {
    // Si no aísla el SVG, captura el modal completo ya sin la columna izquierda
    await modalLocator.screenshot({ path: outputPath });
    console.log(`-> Éxito: Modal limpio capturado en ${outputPath}`);
  }

  await browser.close();
  console.log('Finalizado.');
})();
