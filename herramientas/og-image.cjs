// Regenera assets/img/og-image.png desde herramientas/og-image.html.
// Uso (desde la raíz del repo, con Playwright y Chromium instalados):
//   NODE_PATH="$(npm root -g)" node herramientas/og-image.cjs
// Si la red sale por un proxy, exportar HTTPS_PROXY para cargar Barlow de Google Fonts.
// Guarda un PNG en color verdadero; para bajarlo a ~130 KB, cuantizarlo a 256 colores
// (por ejemplo, con Pillow: quantize(colors=256, dither=NONE)).
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const args = [];
  if (process.env.HTTPS_PROXY) args.push("--proxy-server=" + process.env.HTTPS_PROXY);
  const navegador = await chromium.launch({ args });
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
  await pagina.goto("file://" + path.join(__dirname, "og-image.html"), { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.locator(".og").screenshot({ path: path.join(__dirname, "..", "assets", "img", "og-image.png") });
  await navegador.close();
})();
