// Página principal (index.html): titular A/B, cupos, video o mock del hero,
// calculadora de rentabilidad, botón fijo en móvil, evento ViewContent,
// interacciones (escena inclinable, tarjetas con foco, línea de tiempo) y
// formulario.

import { CONFIG } from "../../config.js";
import { almacen, formatearNumero, formatearUSD, tieneValor, reducirMovimiento } from "./utils.js";
import { iniciarPagina, seguro } from "./comun.js";
import { rastrear } from "./pixel.js";
import { iniciarFormulario } from "./form.js";

// Números de la cuenta de rentabilidad (sección 08). Si cambia el precio,
// hay que cambiar también el texto y la tabla estática de index.html.
const COSTO_MENSUAL = 1210;   // USD 1.000 de pauta + USD 210 de cuota
const VENTAS_OBJETIVO = 15;
const UTILIDAD_MINIMA = 81;   // por debajo, la cuenta conservadora no deja ganancia

// -----------------------------------------------------------------------------
// Titular A/B. Prioridad: ?h= en la URL > variante ya vista en la sesión >
// CONFIG.titularPorDefecto. Un script en el <head> de index.html aplica la
// misma regla antes de pintar, para que el titular no parpadee.
// -----------------------------------------------------------------------------
const CLAVE_VARIANTE = "ict_variante";

function decidirVariante() {
  const deUrl = (new URLSearchParams(window.location.search).get("h") || "").toUpperCase();
  const deSesion = almacen.leer(CLAVE_VARIANTE);
  const porDefecto = String(CONFIG.titularPorDefecto || "A").toUpperCase();
  const variante = ["A", "B"].includes(deUrl) ? deUrl
    : ["A", "B"].includes(deSesion) ? deSesion
    : ["A", "B"].includes(porDefecto) ? porDefecto : "A";
  document.documentElement.setAttribute("data-h", variante.toLowerCase());
  almacen.guardar(CLAVE_VARIANTE, variante);
  return variante;
}

// -----------------------------------------------------------------------------
// Cupos por ciudad (solo datos reales; lista vacía = franja oculta)
// -----------------------------------------------------------------------------
function renderCupos() {
  const franja = document.getElementById("cupos");
  if (!franja) return;
  const cupos = (Array.isArray(CONFIG.cupos) ? CONFIG.cupos : [])
    .filter((c) => c && tieneValor(c.ciudad) && Number.isInteger(Number(c.disponibles)) && Number(c.disponibles) >= 0);
  if (!cupos.length) { franja.hidden = true; return; }

  const lista = franja.querySelector("ul");
  lista.innerHTML = "";
  cupos.forEach(({ ciudad, disponibles }) => {
    const n = Number(disponibles);
    const li = document.createElement("li");
    li.className = "chip" + (n === 0 ? " chip--completo" : "");
    li.textContent = n === 0 ? `${ciudad}: completo`
      : `${ciudad}: ${n} ${n === 1 ? "cupo disponible" : "cupos disponibles"}`;
    lista.appendChild(li);
  });
  franja.hidden = false;
}

// -----------------------------------------------------------------------------
// Video del hero con carga diferida. Sin video → queda el mock de la cotizadora.
// -----------------------------------------------------------------------------
function analizarVideo(url) {
  let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) {
    return {
      tipo: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1`,
      portada: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
      vertical: /shorts\//i.test(url)
    };
  }
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (m) return { tipo: "iframe", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&dnt=1`, portada: "", vertical: false };
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) return { tipo: "video", src: url, portada: "", vertical: false };
  return null;
}

function renderVideo() {
  const visual = document.getElementById("hero-visual");
  if (!visual || !tieneValor(CONFIG.videoHero)) return;
  const video = analizarVideo(String(CONFIG.videoHero).trim());
  if (!video) { console.warn("[ICTC] videoHero no es de YouTube, Vimeo ni .mp4; se muestra el mock."); return; }

  const portada = tieneValor(CONFIG.videoPortada) ? CONFIG.videoPortada : video.portada;
  const contenedor = document.createElement("div");
  contenedor.className = "video" + (video.vertical ? " video--vertical" : "");
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "video__portada";
  boton.setAttribute("aria-label", "Reproducir video");
  if (portada) {
    const img = document.createElement("img");
    img.src = portada;
    img.alt = "";
    img.decoding = "async";
    boton.appendChild(img);
  }
  boton.insertAdjacentHTML("beforeend",
    '<span class="video__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>');
  contenedor.appendChild(boton);

  boton.addEventListener("click", () => {
    let reproductor;
    if (video.tipo === "iframe") {
      reproductor = document.createElement("iframe");
      reproductor.src = video.src;
      reproductor.title = "Video de ICTC";
      reproductor.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      reproductor.allowFullscreen = true;
    } else {
      reproductor = document.createElement("video");
      reproductor.src = video.src;
      reproductor.controls = true;
      reproductor.autoplay = true;
      reproductor.playsInline = true;
    }
    reproductor.className = "video__reproductor";
    contenedor.replaceChildren(reproductor);
    reproductor.focus();
  }, { once: true });

  visual.replaceChildren(contenedor);
}

// -----------------------------------------------------------------------------
// Calculadora de rentabilidad (sección 08)
// -----------------------------------------------------------------------------

/** Acepta "90", "1.200" (punto de miles), "$90" o "USD 90". Solo enteros > 0. */
export function leerUtilidad(texto) {
  const limpio = String(texto || "").replace(/usd|\$|\s/gi, "");
  let numero = null;
  if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) numero = Number(limpio.replace(/\./g, ""));
  else if (/^\d+$/.test(limpio)) numero = Number(limpio);
  return numero !== null && numero > 0 && Number.isSafeInteger(numero) ? numero : null;
}

export function calcularRentabilidad(utilidad) {
  return {
    ventasParaCubrir: Math.ceil(COSTO_MENSUAL / utilidad),
    quedaCon15: VENTAS_OBJETIVO * utilidad - COSTO_MENSUAL,
    sinGanancia: utilidad < UTILIDAD_MINIMA
  };
}

function iniciarCalculadora() {
  const entrada = document.getElementById("calc-utilidad");
  if (!entrada) return;
  const salidaVentas = document.getElementById("calc-ventas");
  const salidaQueda = document.getElementById("calc-queda");
  const aviso = document.getElementById("calc-aviso");
  const ayuda = document.getElementById("calc-ayuda");
  const rango = document.getElementById("calc-rango");
  const medidor = document.getElementById("calc-medidor");

  // Medidor: un hexágono por cada una de las 15 ventas del objetivo. La parte
  // azul de cada uno es lo que se va en cubrir los USD 1.210 (puede ser una
  // fracción); el resto, en celeste, es lo que queda.
  const rellenos = [];
  if (medidor && !medidor.children.length) {
    for (let i = 0; i < VENTAS_OBJETIVO; i++) {
      const hex = document.createElement("span");
      hex.className = "medidor__hex";
      const relleno = document.createElement("span");
      relleno.className = "medidor__relleno";
      hex.appendChild(relleno);
      medidor.appendChild(hex);
      rellenos.push(relleno);
    }
  }
  function pintarMedidor(utilidad) {
    if (!medidor) return;
    medidor.classList.toggle("tiene-valor", utilidad !== null);
    const cobertura = utilidad === null ? 0 : COSTO_MENSUAL / utilidad; // ventas que cubren el costo
    rellenos.forEach((r, i) => r.style.setProperty("--p", Math.max(0, Math.min(1, cobertura - i)).toFixed(3)));
  }

  function moverRango(utilidad) {
    if (!rango) return;
    if (utilidad === null) {
      rango.setAttribute("data-sin-valor", "");
      rango.value = rango.min;
    } else {
      rango.removeAttribute("data-sin-valor");
      rango.value = Math.min(Number(rango.max), Math.max(Number(rango.min), utilidad));
    }
    const pct = (rango.value - rango.min) / (rango.max - rango.min) * 100;
    rango.style.setProperty("--pct", (utilidad === null ? 0 : pct).toFixed(1) + "%");
  }

  function actualizar({ desdeRango = false } = {}) {
    const texto = entrada.value.trim();
    const utilidad = leerUtilidad(texto);
    ayuda.hidden = utilidad !== null || texto === "";
    entrada.setAttribute("aria-invalid", utilidad === null && texto !== "" ? "true" : "false");
    if (!desdeRango) moverRango(utilidad);
    pintarMedidor(utilidad);

    if (utilidad === null) {
      salidaVentas.textContent = "—";
      salidaQueda.textContent = "—";
      salidaQueda.classList.remove("es-negativo");
      aviso.hidden = true;
      return;
    }
    const r = calcularRentabilidad(utilidad);
    salidaVentas.textContent = formatearNumero(r.ventasParaCubrir);
    salidaQueda.textContent = formatearUSD(r.quedaCon15);
    salidaQueda.classList.toggle("es-negativo", r.quedaCon15 < 0);
    aviso.hidden = !r.sinGanancia;
  }

  entrada.addEventListener("input", () => actualizar());
  if (rango) {
    rango.addEventListener("input", () => {
      entrada.value = rango.value;
      moverRango(Number(rango.value));
      actualizar({ desdeRango: true });
    });
  }
  actualizar();
}

// -----------------------------------------------------------------------------
// Interacciones con mouse: escena del hero que se inclina unos grados y
// tarjetas con un foco de luz que sigue al puntero. En pantallas táctiles no
// se activan; con reduced-motion, la escena no se mueve.
// -----------------------------------------------------------------------------
const conMouse = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function iniciarEscena() {
  const escena = document.querySelector("[data-inclinar]");
  const hero = document.getElementById("hero");
  if (!escena || !hero || !conMouse() || reducirMovimiento()) return;
  const MAX = 6; // grados
  let cuadro = 0;
  hero.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(cuadro);
    cuadro = requestAnimationFrame(() => {
      const r = escena.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      escena.style.setProperty("--ry", (Math.max(-1, Math.min(1, x)) * MAX).toFixed(2) + "deg");
      escena.style.setProperty("--rx", (Math.max(-1, Math.min(1, -y)) * MAX).toFixed(2) + "deg");
    });
  });
  hero.addEventListener("pointerleave", () => {
    escena.style.setProperty("--rx", "0deg");
    escena.style.setProperty("--ry", "0deg");
  });
}

function iniciarFocoTarjetas() {
  if (!conMouse()) return;
  document.querySelectorAll(".tarjeta--foco").forEach((tarjeta) => {
    tarjeta.addEventListener("pointermove", (e) => {
      const r = tarjeta.getBoundingClientRect();
      tarjeta.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
      tarjeta.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
    });
  });
}

// -----------------------------------------------------------------------------
// Línea de tiempo (sección 06): cada hito se enciende al pasar por la mitad
// de la pantalla. Sin IntersectionObserver o con reduced-motion, todos
// encendidos desde el principio.
// -----------------------------------------------------------------------------
function iniciarLineaTiempo() {
  const hitos = document.querySelectorAll(".linea-tiempo li");
  if (!hitos.length) return;
  const encenderTodos = () => hitos.forEach((li) => li.classList.add("es-activo"));
  if (reducirMovimiento() || !("IntersectionObserver" in window)) { encenderTodos(); return; }
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("es-activo"); observador.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -45% 0px", threshold: 0 });
  hitos.forEach((li) => observador.observe(li));
  setTimeout(encenderTodos, 8000); // red de seguridad
}

// -----------------------------------------------------------------------------
// Botón fijo en móvil: aparece después del hero y se oculta con el formulario
// a la vista.
// -----------------------------------------------------------------------------
function iniciarCtaMovil() {
  const cta = document.getElementById("cta-movil");
  const hero = document.getElementById("hero");
  const aplicar = document.getElementById("aplicar");
  if (!cta || !hero || !aplicar || !("IntersectionObserver" in window)) return;

  let pasoHero = false;
  let formularioVisible = false;
  const actualizar = () => cta.classList.toggle("es-visible", pasoHero && !formularioVisible);

  new IntersectionObserver(([e]) => {
    pasoHero = !e.isIntersecting && e.boundingClientRect.top < 0;
    actualizar();
  }).observe(hero);

  new IntersectionObserver(([e]) => {
    formularioVisible = e.isIntersecting;
    actualizar();
  }).observe(aplicar);
}

// -----------------------------------------------------------------------------
// ViewContent cuando la sección 08 (inversión) entra en pantalla, una vez.
// -----------------------------------------------------------------------------
function observarInversion() {
  const seccion = document.getElementById("inversion");
  if (!seccion || !tieneValor(CONFIG.metaPixelId) || !("IntersectionObserver" in window)) return;
  const observador = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    rastrear("ViewContent", { content_name: "Inversión ICTC" });
    observador.disconnect();
  }, { threshold: 0.25 });
  observador.observe(seccion);
}

// -----------------------------------------------------------------------------
// Datos de config que aparecen dentro del contenido
// -----------------------------------------------------------------------------
function renderDatosConfig() {
  // FAQ "¿Qué pasa si cancelo?": precio de continuidad. Sin precio, se quita la frase.
  const continuidad = document.querySelector("[data-continuidad]");
  if (continuidad) {
    const precio = Number(CONFIG.precioContinuidad);
    if (tieneValor(CONFIG.precioContinuidad) && precio > 0) {
      continuidad.querySelector("[data-precio-continuidad]").textContent = formatearNumero(precio);
      continuidad.hidden = false;
    } else {
      continuidad.remove();
    }
  }

  // Captura del caso: si no hay imagen, el bloque no existe.
  const captura = document.getElementById("caso-captura");
  if (captura) {
    if (tieneValor(CONFIG.capturaCaso)) {
      const img = document.createElement("img");
      img.src = CONFIG.capturaCaso;
      img.alt = "Captura del Administrador de anuncios de la tienda, con los datos tapados";
      img.loading = "lazy";
      img.decoding = "async";
      captura.appendChild(img);
      captura.hidden = false;
    } else {
      captura.remove();
    }
  }
}

// -----------------------------------------------------------------------------
// Cada paso corre aislado: si uno falla, los demás siguen (el formulario,
// sobre todo, nunca depende de los adornos).
let variante = "A";
seguro(() => { variante = decidirVariante(); }, "titular A/B");
iniciarPagina();
seguro(renderCupos, "cupos");
seguro(renderVideo, "video");
seguro(renderDatosConfig, "datos de config");
seguro(iniciarCalculadora, "calculadora");
seguro(iniciarCtaMovil, "botón fijo");
seguro(observarInversion, "ViewContent");
seguro(iniciarEscena, "escena del hero");
seguro(iniciarFocoTarjetas, "tarjetas");
seguro(iniciarLineaTiempo, "línea de tiempo");
seguro(() => iniciarFormulario({ obtenerVariante: () => variante }), "formulario");
