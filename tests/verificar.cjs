#!/usr/bin/env node
// =============================================================================
// Verificación de la landing ICTC (sección 11 del brief).
//
// Requisitos: Node 18+ y Playwright con Chromium instalados en la máquina
// (no es dependencia del sitio). Con Playwright instalado global:
//
//   python3 -m http.server 8080          # en la raíz del repo, otra terminal
//   NODE_PATH="$(npm root -g)" node tests/verificar.cjs
//
// Variables opcionales:
//   ICT_URL=http://127.0.0.1:8080   dónde está servido el sitio
//   ICT_CAPTURAS=1                  guarda capturas en tests/capturas/
//   HTTPS_PROXY=...                 si la red sale por proxy (Google Fonts)
//
// Nada de esto modifica config.js: las variantes de configuración se simulan
// interceptando la descarga de config.js en el navegador.
// =============================================================================

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = (process.env.ICT_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const RAIZ = path.resolve(__dirname, "..");
const CAPTURAS = process.env.ICT_CAPTURAS === "1";
const CONFIG_ORIGINAL = fs.readFileSync(path.join(RAIZ, "config.js"), "utf8");

const resultados = [];
const TIEMPO_POR_PRUEBA = 90000;
const SOLO = process.env.ICT_SOLO ? new RegExp(process.env.ICT_SOLO, "i") : null; // ICT_SOLO="Calculadora|c\)"
async function prueba(nombre, fn) {
  if (SOLO && !SOLO.test(nombre)) return;
  let reloj;
  try {
    await Promise.race([
      fn(),
      new Promise((_, rechazar) => { reloj = setTimeout(() => rechazar(new Error("tiempo agotado")), TIEMPO_POR_PRUEBA); })
    ]);
    clearTimeout(reloj);
    resultados.push([true, nombre]);
    console.log("  ✔ " + nombre);
  } catch (e) {
    clearTimeout(reloj);
    resultados.push([false, nombre, e.message]);
    console.log("  ✘ " + nombre + "\n      " + e.message.split("\n").join("\n      "));
  }
}
function afirmar(condicion, mensaje) { if (!condicion) throw new Error(mensaje); }
function igual(real, esperado, que) {
  afirmar(JSON.stringify(real) === JSON.stringify(esperado),
    `${que}: se esperaba ${JSON.stringify(esperado)} y llegó ${JSON.stringify(real)}`);
}

// --- Navegador ----------------------------------------------------------------
let navegador;
async function abrir(ruta, { ancho = 360, alto = 800, config = {}, movimientoReducido = true, bloquearMeta = true } = {}) {
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    reducedMotion: movimientoReducido ? "reduce" : "no-preference",
    locale: "es-AR"
  });
  // Solo en la prueba: guarda el último console.info y la cola del píxel en
  // sessionStorage para leerlos después de la redirección.
  await contexto.addInitScript(() => {
    const info = console.info;
    console.info = function (...a) {
      try { sessionStorage.setItem("__prueba_info", JSON.stringify(a)); } catch (e) { /* nada */ }
      return info.apply(this, a);
    };
    addEventListener("pagehide", () => {
      try {
        if (window.fbq) sessionStorage.setItem("__prueba_fbq", JSON.stringify(window.fbq.queue.map((x) => Array.from(x))));
      } catch (e) { /* nada */ }
    });
  });
  const pagina = await contexto.newPage();
  const consola = [];
  pagina.on("console", (m) => consola.push(m));
  pagina.on("pageerror", (e) => consola.push({ type: () => "pageerror", text: () => e.message, args: () => [] }));
  pagina.consola = consola;
  pagina.solicitudes = [];
  pagina.on("request", (r) => pagina.solicitudes.push(r.url()));

  // config.js con valores de prueba (sin tocar el archivo real).
  await pagina.route("**/config.js", (route) => route.fulfill({
    contentType: "application/javascript; charset=utf-8",
    body: CONFIG_ORIGINAL + `\nObject.assign(CONFIG, ${JSON.stringify(config)});\n`
  }));
  if (bloquearMeta) {
    // Stub vacío del píxel: la cola de fbq queda intacta para inspeccionarla.
    await pagina.route("https://connect.facebook.net/**", (route) =>
      route.fulfill({ contentType: "application/javascript", body: "/* stub */" }));
  }
  await pagina.goto(BASE + "/" + ruta, { waitUntil: "networkidle" });
  return pagina;
}
const cerrar = (pagina) => pagina.context().close();
const erroresConsola = (pagina) => pagina.consola
  .filter((m) => ["error", "pageerror"].includes(m.type()))
  .map((m) => m.type() + ": " + m.text());

// --- Formulario ---------------------------------------------------------------
const DATOS = {
  nombre: "Prueba Automática",
  whatsapp: "300 123 4567",
  tienda: "Tienda de Prueba",
  instagram: "@tiendaprueba",
  ciudad: "Medellín"
};

async function llenarYEnviar(pagina, r) {
  await pagina.fill("#f-nombre", DATOS.nombre);
  await pagina.fill("#f-whatsapp", DATOS.whatsapp);
  await pagina.fill("#f-tienda", DATOS.tienda);
  await pagina.fill("#f-instagram", DATOS.instagram);
  await pagina.fill("#f-ciudad", DATOS.ciudad);
  const siguiente = pagina.locator('[data-accion="siguiente"]');
  if (await siguiente.isVisible()) await siguiente.click();
  const elegir = (nombre, valor) => pagina.check(`input[name="${nombre}"][value="${valor}"]`);
  await elegir("iphone_principal", r.iphone);
  await elegir("pauta_actual", "USD 300 a 1.000");
  await elegir("suma_1000", r.suma);
  await elegir("utilidad", r.utilidad);
  await elegir("graba", r.graba);
  await elegir("decisor", "Yo");
  await pagina.check("#f-privacidad");
  await pagina.click('[data-accion="enviar"]');
}

// Después de la redirección: payload que se imprimió con console.info y
// cola de eventos del píxel (guardados por el script de prueba).
async function payloadGuardado(pagina) {
  const registro = await pagina.evaluate(() => sessionStorage.getItem("__prueba_info"));
  afirmar(registro, "No apareció el payload en console.info");
  const [mensaje, payload] = JSON.parse(registro);
  afirmar(mensaje.includes("Webhook no configurado"), "console.info inesperado: " + mensaje);
  return payload;
}
const colaPixel = (pagina) => pagina.evaluate(() => JSON.parse(sessionStorage.getItem("__prueba_fbq") || "[]"));

// --- Contraste (WCAG 2.x) en el navegador -------------------------------------
function auditarContraste() {
  const leer = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const primerDegradado = (img) => {
    const i = img.indexOf("gradient(");
    if (i < 0) return null;
    let n = 0, j = i + 8;
    for (; j < img.length; j++) { if (img[j] === "(") n++; if (img[j] === ")" && --n === 0) break; }
    // Los tramos transparentes no son fondo (ej.: líneas de guía de 1 px).
    return (img.slice(i, j + 1).match(/rgba?\([^)]+\)/g) || []).map(leer).filter((c) => c.a > 0.1);
  };
  const esBlanco = (c) => c.r > 250 && c.g > 250 && c.b > 250;
  const esCeleste = (c) => Math.abs(c.r - 55) < 4 && Math.abs(c.g - 177) < 4 && Math.abs(c.b - 171) < 4;

  const problemas = [];
  const blancoSobreCeleste = [];
  const vistos = new Set();
  const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (recorrido.nextNode()) {
    const texto = recorrido.currentNode;
    if (!texto.textContent.trim()) continue;
    const el = texto.parentElement;
    if (!el || vistos.has(el) || el.closest("svg, noscript")) continue;
    vistos.add(el);
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
    const fg = leer(cs.color);
    let fondos = null;
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      // Texto en degradado (background-clip: text): su fondo es la letra, no el fondo.
      if (s.backgroundClip === "text" || s.webkitBackgroundClip === "text") continue;
      const deg = s.backgroundImage !== "none" ? primerDegradado(s.backgroundImage) : null;
      if (deg && deg.length) { fondos = deg; break; }
      const c = leer(s.backgroundColor);
      if (c && c.a > 0.5) { fondos = [c]; break; }
    }
    if (!fondos) fondos = [{ r: 255, g: 255, b: 255, a: 1 }];
    const tam = parseFloat(cs.fontSize);
    const negrita = parseInt(cs.fontWeight, 10) >= 700;
    const grande = tam >= 24 || (tam >= 18.66 && negrita);
    const minimo = grande ? 3 : 4.5;
    const peor = Math.min(...fondos.map((f) => ratio(fg, f)));
    const muestra = texto.textContent.trim().slice(0, 50);
    // Texto solo para lectores de pantalla (recortado con clip-path): no se ve.
    let oculto = false;
    for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).clipPath === "inset(50%)") { oculto = true; break; }
    if (oculto) continue;
    if (peor < minimo) problemas.push(`${peor.toFixed(2)}:1 (mín. ${minimo}) "${muestra}"`);
    if (esBlanco(fg) && fondos.some(esCeleste)) blancoSobreCeleste.push(muestra);
    if (tam < 14) problemas.push(`texto de ${tam}px (< 14px): "${muestra}"`);
  }
  return { problemas, blancoSobreCeleste };
}

// =============================================================================
(async () => {
  const args = [];
  if (process.env.HTTPS_PROXY) {
    args.push("--proxy-server=" + process.env.HTTPS_PROXY, "--proxy-bypass-list=127.0.0.1;localhost");
  }
  navegador = await chromium.launch({ args });
  if (CAPTURAS) fs.mkdirSync(path.join(__dirname, "capturas"), { recursive: true });

  console.log("\n1) Diseño responsive y consola");
  for (const [ancho, alto] of [[360, 800], [768, 1024], [1440, 900]]) {
    await prueba(`index.html a ${ancho}×${alto}: sin errores en consola`, async () => {
      const p = await abrir("index.html", { ancho, alto });
      if (CAPTURAS) await p.screenshot({ path: path.join(__dirname, "capturas", `index-${ancho}.png`), fullPage: true });
      igual(erroresConsola(p), [], "errores");
      await cerrar(p);
    });
  }
  await prueba("Sin scroll horizontal entre 320 y 1440 px (todas las páginas)", async () => {
    const malos = [];
    for (const ruta of ["index.html", "agenda.html", "no-califica.html", "terminos.html", "privacidad.html"]) {
      for (const ancho of [320, 360, 375, 414, 600, 768, 900, 1024, 1280, 1440]) {
        const p = await abrir(ruta, { ancho, alto: 800 });
        const { sw, cw } = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        if (sw > cw) malos.push(`${ruta} @${ancho}: ${sw} > ${cw}`);
        await cerrar(p);
      }
    }
    igual(malos, [], "páginas con scroll horizontal");
  });
  await prueba("Un solo <h1> por página y noindex en todas", async () => {
    for (const ruta of ["index.html", "agenda.html", "no-califica.html", "terminos.html", "privacidad.html"]) {
      const p = await abrir(ruta);
      const { h1, robots } = await p.evaluate(() => ({
        h1: document.querySelectorAll("h1").length,
        robots: (document.querySelector('meta[name="robots"]') || {}).content
      }));
      igual(h1, 1, ruta + " <h1>");
      igual(robots, "noindex, nofollow", ruta + " robots");
      await cerrar(p);
    }
  });

  console.log("\n2) Formulario (webhook vacío → payload en consola)");
  const URL_PRUEBA = "index.html?utm_source=meta&utm_campaign=test&fbclid=abc&h=b";
  const casos = [
    { nombre: "a) Califica (Sí, Sí, USD 81 a 100) → agenda.html", iphone: "Sí", suma: "Sí", utilidad: "USD 81 a 100", graba: "Yo", destino: "agenda.html", califica: true, motivos: [] },
    { nombre: "b) No califica por utilidad (USD 60 a 80) → no-califica.html", iphone: "Sí", suma: "Sí", utilidad: "USD 60 a 80", graba: "Yo", destino: "no-califica.html", califica: false, motivos: ["utilidad_menor_a_81"] },
    { nombre: "c) \"No sé\" + \"Nadie todavía\" → califica", iphone: "Sí", suma: "Sí", utilidad: "No sé", graba: "Nadie todavía", destino: "agenda.html", califica: true, motivos: [] },
    { nombre: "d) No califica por iPhone y por USD 1.000 (escritorio, sin pasos)", iphone: "No", suma: "No", utilidad: "Más de USD 150", graba: "Yo", destino: "no-califica.html", califica: false, motivos: ["iphone_no_es_principal", "no_puede_sumar_1000"], ancho: 1440 }
  ];
  for (const caso of casos) {
    await prueba(caso.nombre, async () => {
      const p = await abrir(URL_PRUEBA, { ancho: caso.ancho || 360, alto: 800 });
      const navegacion = p.waitForRequest((r) => r.isNavigationRequest() && r.url().includes(caso.destino));
      await llenarYEnviar(p, caso);
      const destino = (await navegacion).url();
      await p.waitForURL("**/" + caso.destino + "*");
      await p.waitForLoadState("networkidle");
      const payload = await payloadGuardado(p);
      igual(payload.califica, caso.califica, "califica");
      igual(payload.motivo_no_califica, caso.motivos, "motivo_no_califica");
      igual(payload.utm_source, "meta", "utm_source");
      igual(payload.utm_campaign, "test", "utm_campaign");
      igual(payload.fbclid, "abc", "fbclid");
      igual(payload.variante_titular, "B", "variante_titular");
      igual(payload.whatsapp, "+573001234567", "whatsapp");
      igual(payload.instagram, "tiendaprueba", "instagram sin @");
      igual(payload.privacidad, true, "privacidad");
      for (const clave of ["nombre", "tienda", "ciudad", "iphone_principal", "pauta_actual", "suma_1000", "utilidad", "graba", "decisor",
        "utm_medium", "utm_term", "utm_content", "ref", "pagina", "enviado_en", "user_agent", "event_id"]) {
        afirmar(clave in payload, "falta la clave " + clave);
      }
      afirmar(!isNaN(Date.parse(payload.enviado_en)) && payload.enviado_en.endsWith("Z"), "enviado_en no es ISO 8601");
      afirmar(payload.pagina.includes("utm_source=meta"), "pagina no es la URL actual");
      if (caso.destino === "agenda.html") {
        const q = new URL(destino).searchParams;
        igual(q.get("nombre"), DATOS.nombre, "nombre en la URL de agenda");
        igual(q.get("whatsapp"), "+573001234567", "whatsapp en la URL de agenda");
      }
      igual(erroresConsola(p), [], "errores");
      await cerrar(p);
    });
  }

  await prueba("Validación: errores en usted, aria-invalid y foco al primer error", async () => {
    const p = await abrir("index.html");
    await p.click('[data-accion="siguiente"]');
    const r = await p.evaluate(() => ({
      foco: document.activeElement && document.activeElement.id,
      error: document.getElementById("error-nombre").textContent,
      invalido: document.getElementById("f-nombre").getAttribute("aria-invalid"),
      describe: document.getElementById("f-nombre").getAttribute("aria-describedby")
    }));
    igual(r.foco, "f-nombre", "foco");
    igual(r.error, "Escriba su nombre.", "mensaje");
    igual(r.invalido, "true", "aria-invalid");
    igual(r.describe, "error-nombre", "aria-describedby");
    await p.fill("#f-whatsapp", "2001234567");
    await p.fill("#f-nombre", "Ana");
    await p.click('[data-accion="siguiente"]');
    igual(await p.textContent("#error-whatsapp"), "Escriba un celular de 10 dígitos que empiece por 3.", "WhatsApp +57");
    // Regresión: corregir los errores y tocar "Siguiente" UNA vez tiene que avanzar
    // (antes el error se borraba al perder el foco y el botón se movía bajo el dedo).
    await p.fill("#f-whatsapp", "3001234567");
    await p.fill("#f-tienda", "Tienda X");
    await p.fill("#f-instagram", "tiendax");
    await p.fill("#f-ciudad", "Cali");
    await p.click('[data-accion="siguiente"]');
    igual(await p.isVisible('[data-paso="2"]'), true, "paso 2 visible tras un solo toque");
    await cerrar(p);
  });

  await prueba("Escritorio: enviar vacío marca los errores de las dos partes y enfoca el primero", async () => {
    const p = await abrir("index.html", { ancho: 1440, alto: 900 });
    await p.click('[data-accion="enviar"]');
    const visibles = await p.$$eval(".campo__error", (e) => e.filter((x) => !x.hidden).map((x) => x.dataset.errorDe));
    igual(visibles, ["nombre", "whatsapp", "tienda", "instagram", "ciudad", "iphone_principal", "pauta_actual",
      "suma_1000", "utilidad", "graba", "decisor", "privacidad"], "errores visibles");
    igual(await p.evaluate(() => document.activeElement.id), "f-nombre", "foco");
    await cerrar(p);
  });

  console.log("\n3) Titular A/B");
  await prueba("?h=b muestra la variante B; sin parámetro, la A (config por defecto)", async () => {
    let p = await abrir("index.html?h=b");
    igual((await p.locator("h1").innerText()).trim(), "Un chat no es una venta. Sepa cuántos iPhones le vende cada anuncio.", "titular B");
    await cerrar(p);
    p = await abrir("index.html");
    igual((await p.locator("h1").innerText()).trim(), "15 ventas de iPhone atribuidas a su pauta en 30 días, medidas una por una.", "titular A");
    await cerrar(p);
    p = await abrir("index.html", { config: { titularPorDefecto: "B" } });
    igual((await p.locator("h1").innerText()).trim(), "Un chat no es una venta. Sepa cuántos iPhones le vende cada anuncio.", "titular B por config");
    await cerrar(p);
  });

  console.log("\n4) Calculadora vs. tabla");
  await prueba("U = 81, 90, 100, 120, 150 coinciden con la tabla; U = 70 → 18, −160 y aviso; borde U = 80", async () => {
    const p = await abrir("index.html");
    const tabla = await p.$$eval("#tabla-cuenta tbody tr", (filas) => filas.map((f) => [...f.children].map((c) => c.textContent.trim())));
    igual(tabla, [["81", "15", "5"], ["90", "14", "140"], ["100", "13", "290"], ["120", "11", "590"], ["150", "9", "1.040"]], "tabla estática");
    for (const [u, ventas, queda] of tabla) {
      await p.fill("#calc-utilidad", u);
      igual(await p.textContent("#calc-ventas"), ventas, `ventas con U=${u}`);
      igual(await p.textContent("#calc-queda"), "USD " + queda, `queda con U=${u}`);
      igual(await p.isVisible("#calc-aviso"), false, `aviso con U=${u}`);
    }
    await p.fill("#calc-utilidad", "70");
    igual(await p.textContent("#calc-ventas"), "18", "ventas con U=70");
    igual(await p.textContent("#calc-queda"), "USD −160", "queda con U=70");
    igual(await p.isVisible("#calc-aviso"), true, "aviso con U=70");
    igual(await p.$eval("#calc-queda", (e) => e.classList.contains("es-negativo")), true, "estilo negativo");
    // Borde: 80 es el último entero sin ganancia (15 × 80 − 1.210 = −10).
    await p.fill("#calc-utilidad", "80");
    igual(await p.textContent("#calc-ventas"), "16", "ventas con U=80");
    igual(await p.textContent("#calc-queda"), "USD −10", "queda con U=80");
    igual(await p.isVisible("#calc-aviso"), true, "aviso con U=80");
    await p.fill("#calc-utilidad", "1.200");
    igual(await p.textContent("#calc-queda"), "USD 16.790", "punto de miles (U=1.200)");
    for (const malo of ["0", "-5", "abc", "85,5"]) {
      await p.fill("#calc-utilidad", malo);
      igual(await p.textContent("#calc-ventas"), "—", `no calcula con "${malo}"`);
    }
    await cerrar(p);
  });

  await prueba("Calculadora interactiva: deslizador sincronizado y medidor de 15 ventas exacto", async () => {
    const p = await abrir("index.html", { ancho: 1440, alto: 900 });
    igual(await p.$$eval("#calc-medidor .medidor__hex", (h) => h.length), 15, "hexágonos del medidor");
    igual(await p.getAttribute("#calc-rango", "data-sin-valor"), "", "deslizador sin valor al inicio");
    await p.fill("#calc-utilidad", "100");
    igual(await p.inputValue("#calc-rango"), "100", "deslizador sigue al campo");
    // 1.210 / 100 = 12,1 ventas cubren el costo: 12 hexágonos azules, el 13 al 10 %, el resto celeste.
    const p100 = await p.$$eval("#calc-medidor .medidor__relleno", (r) => r.map((x) => Number(x.style.getPropertyValue("--p"))));
    igual(p100, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.1, 0, 0], "relleno con U=100");
    await p.$eval("#calc-rango", (r) => { r.value = "150"; r.dispatchEvent(new Event("input", { bubbles: true })); });
    igual(await p.inputValue("#calc-utilidad"), "150", "el campo sigue al deslizador");
    igual(await p.textContent("#calc-ventas"), "9", "ventas con el deslizador en 150");
    igual(await p.textContent("#calc-queda"), "USD 1.040", "queda con el deslizador en 150");
    await p.fill("#calc-utilidad", "70");
    const p70 = await p.$$eval("#calc-medidor .medidor__relleno", (r) => r.map((x) => Number(x.style.getPropertyValue("--p"))));
    igual(p70.every((v) => v === 1), true, "con U=70 las 15 ventas no alcanzan a cubrir el costo");
    await cerrar(p);
  });

  await prueba("Encabezado: transparente sobre el hero y sólido al bajar; con reduced-motion la escena no se inclina", async () => {
    let p = await abrir("index.html", { ancho: 1440, alto: 900 });
    const clases = () => p.$eval(".encabezado", (e) => e.className);
    afirmar((await clases()).includes("encabezado--sobre-oscuro") && !(await clases()).includes("es-solido"), "arriba: " + await clases());
    await p.evaluate(() => scrollTo(0, 600));
    await p.waitForTimeout(200);
    afirmar((await clases()).includes("es-solido"), "abajo: " + await clases());
    await cerrar(p);
    p = await abrir("agenda.html", { ancho: 1440, alto: 900 });
    afirmar(!(await p.$eval(".encabezado", (e) => e.className)).includes("sobre-oscuro"), "agenda con encabezado transparente");
    await cerrar(p);
    p = await abrir("index.html", { ancho: 1440, alto: 900, movimientoReducido: true });
    await p.mouse.move(1300, 200);
    await p.waitForTimeout(200);
    igual(await p.$eval("[data-inclinar]", (e) => e.style.getPropertyValue("--ry")), "", "inclinación con reduced-motion");
    await cerrar(p);
    p = await abrir("index.html", { ancho: 1440, alto: 900, movimientoReducido: false });
    await p.mouse.move(1300, 200);
    await p.waitForTimeout(200);
    afirmar((await p.$eval("[data-inclinar]", (e) => e.style.getPropertyValue("--ry"))) !== "", "sin inclinación con mouse");
    await cerrar(p);
  });

  console.log("\n5) Configuración vacía y con datos");
  await prueba("Config vacía: sin cupos, mock visible, sin script de Meta, placeholder de calendario", async () => {
    let p = await abrir("index.html");
    igual(await p.isVisible("#cupos"), false, "franja de cupos visible");
    igual(await p.isVisible(".telefono-mock"), true, "mock de la cotizadora");
    afirmar(!p.solicitudes.some((u) => u.includes("facebook")), "se pidió un script de Meta");
    igual(await p.evaluate(() => typeof window.fbq), "undefined", "fbq");
    igual(await p.isVisible("[data-aviso-dev]"), true, "aviso 'Webhook no configurado'");
    igual(await p.locator("#pie").count(), 0, "el contenedor #pie no se reemplazó por el pie");
    const pie = await p.textContent(".pie");
    afirmar(!/undefined|null/.test(pie), "el pie muestra undefined/null");
    afirmar(!pie.includes("Contacto:"), "muestra 'Contacto:' sin datos");
    afirmar(!pie.includes("píxel"), "aviso del píxel sin píxel");
    await cerrar(p);
    p = await abrir("agenda.html");
    igual((await p.textContent("#calendario")).trim(), "Calendario pendiente de configurar", "placeholder del calendario");
    await cerrar(p);
    p = await abrir("no-califica.html");
    igual(await p.isVisible("[data-whatsapp-agencia]"), false, "botón de WhatsApp sin número");
    await cerrar(p);
  });

  await prueba("Cupos con datos: chips con singular, plural y 'completo'", async () => {
    const p = await abrir("index.html", { config: { cupos: [{ ciudad: "Medellín", disponibles: 4 }, { ciudad: "Cali", disponibles: 1 }, { ciudad: "Bogotá", disponibles: 0 }] } });
    igual(await p.$$eval("#cupos .chip", (c) => c.map((x) => x.textContent)),
      ["Medellín: 4 cupos disponibles", "Cali: 1 cupo disponible", "Bogotá: completo"], "chips");
    await cerrar(p);
  });

  await prueba("Video: portada con carga diferida; el iframe solo aparece al hacer clic", async () => {
    const p = await abrir("index.html", { ancho: 1440, alto: 900, config: { videoHero: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    igual(await p.locator(".telefono-mock").count(), 0, "mock presente");
    igual(await p.locator(".video iframe").count(), 0, "iframe antes del clic");
    await p.click(".video__portada");
    igual(await p.getAttribute(".video iframe", "src"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1", "src");
    await cerrar(p);
  });

  await prueba("Píxel: PageView, ViewContent una vez, Lead con eventID, sin datos personales", async () => {
    const p = await abrir("index.html?h=a", { ancho: 1440, alto: 900, config: { metaPixelId: "123456789" } });
    afirmar(p.solicitudes.some((u) => u.startsWith("https://connect.facebook.net/")), "no se cargó fbevents.js");
    afirmar((await p.textContent(".pie")).includes("Este sitio usa el píxel de Meta para medir anuncios."), "falta el aviso del píxel");
    await p.locator("#inversion").scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    await p.locator("#garantia").scrollIntoViewIfNeeded();
    await p.locator("#inversion").scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    await llenarYEnviar(p, { iphone: "Sí", suma: "Sí", utilidad: "USD 101 a 150", graba: "Yo" });
    await p.waitForURL("**/agenda.html*");
    await p.waitForLoadState("networkidle");
    const payload = await payloadGuardado(p);
    const cola = await colaPixel(p);
    const eventos = cola.map((a) => a.slice(0, 2).join(" "));
    igual(eventos.filter((e) => e === "track PageView").length, 1, "PageView");
    igual(eventos.filter((e) => e === "track ViewContent").length, 1, "ViewContent");
    const lead = cola.find((a) => a[0] === "track" && a[1] === "Lead");
    afirmar(lead, "no hubo Lead");
    igual(lead[3], { eventID: payload.event_id }, "eventID del Lead");
    const enviado = JSON.stringify(cola);
    afirmar(!enviado.includes("3001234567") && !enviado.includes(DATOS.nombre), "datos personales en el píxel");
    await cerrar(p);
  });

  await prueba("Píxel: AplicacionNoCalifica si no califica", async () => {
    const p = await abrir("index.html", { ancho: 1440, alto: 900, config: { metaPixelId: "123456789" } });
    await llenarYEnviar(p, { iphone: "Sí", suma: "No", utilidad: "USD 101 a 150", graba: "Yo" });
    await p.waitForURL("**/no-califica.html*");
    await p.waitForLoadState("networkidle");
    const cola = await colaPixel(p);
    afirmar(cola.some((a) => a[0] === "trackCustom" && a[1] === "AplicacionNoCalifica"), "no hubo AplicacionNoCalifica");
    afirmar(!cola.some((a) => a[1] === "Lead"), "hubo Lead");
    await cerrar(p);
  });

  await prueba("Webhook OK: POST JSON con el payload completo", async () => {
    const p = await abrir("index.html?utm_source=meta&h=b", { config: { webhookUrl: "https://webhook.prueba.local/hook" } });
    let cuerpo = null;
    await p.route("https://webhook.prueba.local/**", async (route) => {
      const req = route.request();
      igual(req.method(), "POST", "método");
      igual(req.headers()["content-type"], "application/json", "content-type");
      cuerpo = JSON.parse(req.postData());
      await route.fulfill({ status: 200, body: "ok", headers: { "access-control-allow-origin": "*" } });
    });
    const navegacion = p.waitForRequest((r) => r.isNavigationRequest() && r.url().includes("agenda.html"));
    await llenarYEnviar(p, { iphone: "Sí", suma: "Sí", utilidad: "USD 81 a 100", graba: "Yo" });
    await navegacion;
    afirmar(cuerpo, "no se envió nada");
    igual(cuerpo.utm_source, "meta", "utm_source en el POST");
    igual(cuerpo.variante_titular, "B", "variante en el POST");
    await cerrar(p);
  });

  await prueba("Webhook caído: mensaje claro y botón 'Enviar por WhatsApp' con el resumen", async () => {
    const p = await abrir("index.html", { config: { webhookUrl: "https://webhook.prueba.local/hook", whatsappAgencia: "5491100000000" } });
    await p.route("https://webhook.prueba.local/**", (route) => route.abort("failed"));
    await llenarYEnviar(p, { iphone: "Sí", suma: "Sí", utilidad: "USD 81 a 100", graba: "Yo" });
    const boton = p.locator(".formulario__estado a.boton--whatsapp");
    await boton.waitFor({ timeout: 3000 });
    const href = await boton.getAttribute("href");
    afirmar(href.startsWith("https://wa.me/5491100000000?text="), "href: " + href);
    const texto = decodeURIComponent(href.split("text=")[1]);
    afirmar(texto.includes("Nombre: " + DATOS.nombre) && texto.includes("¿Cuánto le deja en promedio cada iPhone? USD 81 a 100"), "resumen incompleto:\n" + texto);
    igual(await p.isEnabled('[data-accion="enviar"]'), true, "botón Enviar rehabilitado");
    igual(await p.textContent('[data-accion="enviar"]'), "Enviar mi aplicación", "texto del botón");
    await cerrar(p);
  });

  await prueba("Agenda: iframe del calendario prellenado y URL limpia de datos personales", async () => {
    const p = await abrir("agenda.html?nombre=Ana%20P%C3%A9rez&whatsapp=%2B573001234567", { config: { calendarioUrl: "https://calendario.prueba.local/widget/booking/abc" } });
    const src = await p.getAttribute(".calendario__iframe", "src");
    igual(src, "https://calendario.prueba.local/widget/booking/abc?first_name=Ana+P%C3%A9rez&phone=%2B573001234567", "src del iframe");
    afirmar(!p.url().includes("nombre=") && !p.url().includes("whatsapp="), "la URL conserva datos personales: " + p.url());
    await cerrar(p);
  });

  await prueba("Botón fijo en móvil: oculto en el hero, visible después, oculto con el formulario", async () => {
    const p = await abrir("index.html", { ancho: 360, alto: 800 });
    const visible = () => p.$eval("#cta-movil", (e) => getComputedStyle(e).visibility === "visible");
    igual(await visible(), false, "en el hero");
    await p.locator("#caso").scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    igual(await visible(), true, "después del hero");
    await p.locator("#form-aplicacion").scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    igual(await visible(), false, "con el formulario a la vista");
    await cerrar(p);
  });

  console.log("\n6) Copy");
  await prueba("Sin tú/vos/'nuestros clientes'/manzana; el caso dice 'ventas' a secas", async () => {
    const archivos = ["index.html", "agenda.html", "no-califica.html", "terminos.html", "privacidad.html",
      "assets/js/comun.js", "assets/js/form.js", "assets/js/main.js", "assets/js/agenda.js"];
    const malos = [];
    const prohibidos = [
      [/(^|[^\wáéíóúñ])(tú|tu |tus |te |ti |contigo|vos|vosotros|tenés|podés|querés|sabés)([^\wáéíóúñ]|$)/i, "tuteo/voseo"],
      [/nuestros clientes|cientos de tiendas/i, "plural de casos"],
      [/|🍎|apple-logo|logo de apple/i, "manzana de Apple"],
      [/solo hoy|últimas horas|cuenta regresiva/i, "urgencia falsa"]
    ];
    for (const archivo of archivos) {
      const texto = fs.readFileSync(path.join(RAIZ, archivo), "utf8")
        .replace(/<!--[\s\S]*?-->/g, "").replace(/\/\/.*$/gm, "");
      for (const [re, que] of prohibidos) if (re.test(texto)) malos.push(`${archivo}: ${que} → "${texto.match(re)[0].trim()}"`);
    }
    // Las frases del caso nunca dicen "ventas de iPhone".
    const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
    const caso = html.slice(html.indexOf('id="caso"'), html.indexOf('id="incluye"'));
    if (/ventas de iPhone/i.test(caso)) malos.push("sección 04: 'ventas de iPhone'");
    if (/reportó[^<]*ventas de iPhone/i.test(html)) malos.push("franja de prueba: 'ventas de iPhone'");
    igual(malos, [], "problemas de copy");
  });

  console.log("\n7) Contraste");
  for (const ruta of ["index.html", "agenda.html", "no-califica.html", "terminos.html"]) {
    await prueba(`${ruta}: contraste AA y nada de texto blanco sobre celeste`, async () => {
      for (const ancho of [360, 1440]) {
        const p = await abrir(ruta, { ancho, alto: 900 });
        const r = await p.evaluate(auditarContraste);
        igual(r.blancoSobreCeleste, [], `@${ancho} texto blanco sobre celeste`);
        igual(r.problemas, [], `@${ancho} contraste`);
        await cerrar(p);
      }
    });
  }

  await navegador.close();
  const fallas = resultados.filter((r) => !r[0]);
  console.log(`\n${resultados.length - fallas.length}/${resultados.length} pruebas OK`);
  process.exit(fallas.length ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  if (navegador) await navegador.close();
  process.exit(1);
});
