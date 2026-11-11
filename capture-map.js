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

  // 2. Lanzar Chromium simulando un navegador real
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

  console.log('1. Conectando con ritstore.agency (usando domcontentloaded)...');
  // Usar domcontentloaded en lugar de networkidle para evitar bloqueos por telemetría de Wix
  await page.goto('https://www.ritstore.agency/es/event-details/sui-visual-kei-lights-lima', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  console.log('2. Buscando botón "Compra tus entradas"...');
  // Esperar a que el botón aparezca
  const buyBtn = page.locator('button:has-text("Compra tus entradas"), a:has-text("Compra tus entradas"), text="Compra tus entradas"').first();
  await buyBtn.waitFor({ state: 'visible', timeout: 30000 });
  await buyBtn.click();
  console.log('-> Clic realizado con éxito.');

  // Pausa técnica para que abra el modal y renderice los asientos
  console.log('3. Esperando que el modal dibuje las butacas...');
  await page.waitForTimeout(6000);

  console.log('4. Ocultando columna izquierda y desplegable de precios...');
  await page.evaluate(() => {
    // Ocultar barra lateral de carrito y checkout en BRL
    const sidebars = document.querySelectorAll('[data-hook="tickets-picker"], aside');
    sidebars.forEach(el => el.style.setProperty('display', 'none', 'important'));

    // Ocultar desplegables de precios flotantes
    const overlays = document.querySelectorAll('button:has-text("precios"), [data-hook="dropdown-base-text"]');
    overlays.forEach(el => {
      const parent = el.closest('div');
      if (parent) parent.style.setProperty('display', 'none', 'important');
    });
  });

  console.log('5. Capturando el área del mapa...');
  // Buscar el contenedor donde está el canvas/svg del mapa
  const seatingGrid = page.locator('div:has(> canvas), div:has(> svg)').first();

  if (await seatingGrid.count() > 0) {
    await seatingGrid.screenshot({ path: outputPath });
    console.log(`-> Captura guardada exitosamente en ${outputPath}`);
  } else {
    // Respaldo de seguridad
    console.log('Aviso: Capturando diálogo completo...');
    const modal = page.locator('div[role="dialog"]').first();
    if (await modal.count() > 0) {
      await modal.screenshot({ path: outputPath });
    } else {
      await page.screenshot({ path: outputPath, fullPage: false });
    }
  }

  await browser.close();
  console.log('Proceso completado.');
})();
