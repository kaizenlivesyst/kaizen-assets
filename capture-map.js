const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  // Asegurar que exista la carpeta events/
  const outputDir = path.join(__dirname, 'events');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'sui-mapa.png');

  // Lanzar navegador headless en alta resolución
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('1. Conectando con ritstore.agency...');
  await page.goto('https://www.ritstore.agency/es/event-details/sui-visual-kei-lights-lima', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  console.log('2. Abriendo el modal de butacas...');
  const buyButton = page.locator('text=/compra tus entradas/i').first();
  await buyButton.waitFor({ state: 'visible', timeout: 15000 });
  await buyButton.click();

  // Margen de 5s para que los microservicios de Wix rendericen las 147 butacas
  await page.waitForTimeout(5000);

  console.log('3. Limpiando el DOM (ocultando columna izquierda y desplegable de precios)...');
  await page.evaluate(() => {
    // Ocultar barra lateral de carrito y checkout en BRL
    const sidebars = document.querySelectorAll('[data-hook="tickets-picker"], aside');
    sidebars.forEach(el => el.style.setProperty('display', 'none', 'important'));

    // Ocultar cualquier botón flotante o menú emergente de "Mostrar precios / Ocultar precios"
    const overlays = document.querySelectorAll('button:has-text("precios"), [data-hook="dropdown-base-text"]');
    overlays.forEach(el => {
      const parent = el.closest('div');
      if (parent) parent.style.setProperty('display', 'none', 'important');
    });
  });

  console.log('4. Tomando captura enfocada solo en el plano de butacas...');
  // Localiza el contenedor del escenario y cuadrícula
  const seatingGrid = page.locator('div:has(> canvas), div:has(> svg)').first();

  if (await seatingGrid.count() > 0) {
    await seatingGrid.screenshot({ path: outputPath });
    console.log(`-> Éxito: Imagen generada en ${outputPath}`);
  } else {
    // Respaldo de seguridad si Wix cambia nombres internos
    console.log('Aviso: Capturando contenedor central del diálogo...');
    const modal = page.locator('div[role="dialog"]').first();
    await modal.screenshot({ path: outputPath });
  }

  await browser.close();
})();
