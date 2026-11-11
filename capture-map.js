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

  try {
    console.log('1. Cargando ritstore.agency...');
    await page.goto('https://www.ritstore.agency/es/event-details/sui-visual-kei-lights-lima', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('2. Buscando y clickeando botón de entradas...');
    // Clic forzado en cualquier botón o enlace que diga "entradas" o "Compra"
    const btn = page.locator('button, a').filter({ hasText: /entradas|compra/i }).first();
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await btn.click({ force: true });

    // Tiempo prudente para que Wix abra el popup y pinte las butacas
    console.log('3. Esperando renderizado de la sala...');
    await page.waitForTimeout(7000);

    console.log('4. Limpiando el panel izquierdo...');
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

    console.log('5. Guardando snapshot...');
    // Si encuentra el modal o diálogo, captura ese elemento; de lo contrario, captura la ventana
    const modal = page.locator('div[role="dialog"], [aria-modal="true"]').first();
    if (await modal.isVisible()) {
      await modal.screenshot({ path: outputPath });
      console.log('-> Captura recortada del modal guardada con éxito.');
    } else {
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log('-> Captura general guardada con éxito.');
    }

  } catch (error) {
    console.error('Aviso durante la ejecución:', error.message);
    // Foto de emergencia para no botar error y poder ver en qué pantalla quedó el bot
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log('-> Se generó captura de respaldo.');
  } finally {
    await browser.close();
    console.log('Finalizado.');
  }
})();
