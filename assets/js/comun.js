// Lo que comparten todas las páginas: encabezado, pie, captura de origen
// (UTM), píxel de Meta, links de WhatsApp y aparición suave de secciones.
//
// El encabezado y el pie se arman desde UNA sola plantilla (abajo) para no
// mantener cinco copias. Cada página solo deja los contenedores:
//   <div id="encabezado" data-cta="#aplicar"></div>   (data-cta="" = sin botón)
//   Opcionales: data-tema="oscuro" (transparente sobre un hero oscuro hasta
//   que la página se mueve) y data-progreso (barra de lectura).
//   <div id="pie"></div>

import { CONFIG } from "../../config.js";
import { almacen, linkWhatsApp, tieneValor, reducirMovimiento } from "./utils.js";
import { iniciarPixel } from "./pixel.js";

const PARAMETROS_ORIGEN = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "ref"
];
const CLAVE_ORIGEN = "ict_origen";

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// -----------------------------------------------------------------------------
// Encabezado
// -----------------------------------------------------------------------------
// Logotipo iCTC en línea (copia de assets/img/ictc-logotipo.svg): "CTC" usa
// currentColor para tomar el color de .marca (blanco sobre el hero oscuro,
// #2D3748 con el encabezado sólido). La "i" conserva su degradado, con un id
// propio para no chocar con otros SVG de la página.
const LOGOTIPO_ICTC = `<svg class="marca__logotipo" xmlns="http://www.w3.org/2000/svg" viewBox="-40 416 1550 605" aria-hidden="true" focusable="false"><defs><linearGradient id="ictc-i-encabezado" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="0"><stop offset="0" stop-color="#1A73E8"/><stop offset="1" stop-color="#37B1AB"/></linearGradient></defs><g fill="url(#ictc-i-encabezado)"><circle cx="65" cy="521" r="65"/><rect x="10" y="623" width="110" height="351"/></g><path fill="currentColor" d="M602 554.92A251 246 0 1 0 602 915.08L532.9 832.73A135 149 0 1 1 532.9 637.27ZM630 496L1020 496L1020 586L882.5 586L882.5 974L767.5 974L767.5 586L630 586ZM1470 554.92A251 246 0 1 0 1470 915.08L1400.9 832.73A135 149 0 1 1 1400.9 637.27Z"/></svg>`;

function renderEncabezado() {
  const contenedor = document.getElementById("encabezado");
  if (!contenedor) return;
  const cta = contenedor.dataset.cta || "";
  const sobreOscuro = contenedor.dataset.tema === "oscuro";
  const conProgreso = "progreso" in contenedor.dataset;

  contenedor.outerHTML = `
    <header class="encabezado${sobreOscuro ? " encabezado--sobre-oscuro" : ""}">
      <div class="contenedor encabezado__interior">
        <a class="marca" href="index.html" aria-label="ICTC, inicio">${LOGOTIPO_ICTC}</a>
        ${cta ? `<a class="boton boton--primario boton--chico" href="${escapar(cta)}" data-cta="encabezado">Aplicar a un cupo</a>` : ""}
      </div>
      ${conProgreso ? '<span class="encabezado__progreso" aria-hidden="true"></span>' : ""}
    </header>`;

  seguirScroll(document.querySelector(".encabezado"));
}

// Encabezado sólido apenas la página se mueve + barra de progreso de lectura.
// Un solo listener pasivo, agrupado por requestAnimationFrame.
function seguirScroll(encabezado) {
  if (!encabezado) return;
  const progreso = encabezado.querySelector(".encabezado__progreso");
  let pendiente = false;
  const actualizar = () => {
    pendiente = false;
    const y = window.scrollY;
    encabezado.classList.toggle("es-solido", y > 8);
    if (progreso) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progreso.style.setProperty("--progreso", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    }
  };
  window.addEventListener("scroll", () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
  }, { passive: true });
  actualizar();
}

// -----------------------------------------------------------------------------
// Pie de página
// -----------------------------------------------------------------------------
function renderPie() {
  const contenedor = document.getElementById("pie");
  if (!contenedor) return;

  const whatsapp = String(CONFIG.whatsappAgencia || "").replace(/\D/g, "");
  const email = String(CONFIG.emailContacto || "").trim();
  const contactos = [];
  if (whatsapp) {
    contactos.push(`<a href="${escapar(linkWhatsApp(whatsapp))}" target="_blank" rel="noopener">WhatsApp +${escapar(whatsapp)}</a>`);
  }
  if (email) {
    contactos.push(`<a href="mailto:${escapar(email)}">${escapar(email)}</a>`);
  }

  const prestador = CONFIG.prestador || {};
  const dato = (valor) => escapar(tieneValor(valor) ? valor : "[PENDIENTE]");
  const faltaPrestador = ["nombre", "condicion", "cuit", "domicilio"].some((c) => !tieneValor(prestador[c]));
  const anio = new Date().getFullYear();

  const links = [
    tieneValor(CONFIG.terminosUrl) ? `<a href="${escapar(CONFIG.terminosUrl)}">Términos y condiciones</a>` : "",
    tieneValor(CONFIG.privacidadUrl) ? `<a href="${escapar(CONFIG.privacidadUrl)}">Política de privacidad</a>` : ""
  ].filter(Boolean);

  contenedor.outerHTML = `
    <footer class="pie">
      <div class="contenedor pie__interior">
        <div class="pie__marca">
          <img src="assets/img/logo-mmg.svg" alt="" width="35" height="40">
          <span>Marketing Master Top</span>
        </div>
        <p class="pie__tagline">ICTC es un producto de Marketing Master Top, la marca de Jared Farfán, “El Marketing Master”.</p>
        ${contactos.length ? `<p class="pie__contacto">Contacto: ${contactos.join(" · ")}</p>` : ""}
        <p class="pie__prestador"${faltaPrestador ? ' data-pendiente="prestador"' : ""}>Prestador del servicio: ${dato(prestador.nombre)}, ${dato(prestador.condicion)}, CUIT ${dato(prestador.cuit)}. ${dato(prestador.domicilio)}.</p>
        ${links.length ? `<nav class="pie__links" aria-label="Información legal">${links.join(' <span aria-hidden="true">·</span> ')}</nav>` : ""}
        <div class="pie__avisos">
          <p>Las cifras del caso son ventas reportadas por una tienda en Argentina. Los resultados de cada tienda dependen de su mercado, sus precios y su atención.</p>
          <p>No estamos afiliados a Apple Inc. iPhone es una marca registrada de Apple Inc.</p>
          ${CONFIG.metaPixelId ? `<p data-pendiente="consentimiento-pixel">Este sitio usa el píxel de Meta para medir anuncios.</p>` : ""}
        </div>
        <p class="pie__firma"><em>By marketingmaster.top</em></p>
        <p class="pie__copy">© ${anio} Marketing Master Top</p>
      </div>
    </footer>`;
}

// -----------------------------------------------------------------------------
// Captura de origen (UTM, fbclid, ref)
// Se guarda solo si la URL trae al menos uno; así una recarga sin parámetros
// no borra el origen real de la visita.
// -----------------------------------------------------------------------------
export function capturarOrigen() {
  const url = new URLSearchParams(window.location.search);
  const encontrados = {};
  PARAMETROS_ORIGEN.forEach((p) => {
    const valor = url.get(p);
    if (tieneValor(valor)) encontrados[p] = valor.slice(0, 500);
  });
  if (Object.keys(encontrados).length) almacen.guardar(CLAVE_ORIGEN, encontrados);
}

export function leerOrigen() {
  const guardado = almacen.leer(CLAVE_ORIGEN) || {};
  const origen = {};
  PARAMETROS_ORIGEN.forEach((p) => { origen[p] = guardado[p] || ""; });
  return origen;
}

// -----------------------------------------------------------------------------
// Links de WhatsApp de la agencia: <a data-whatsapp-agencia data-texto="…">
// Sin número configurado, el elemento se oculta (nunca un link roto).
// -----------------------------------------------------------------------------
function conectarLinksWhatsApp() {
  document.querySelectorAll("[data-whatsapp-agencia]").forEach((el) => {
    const href = linkWhatsApp(CONFIG.whatsappAgencia, el.dataset.texto || "");
    if (href) {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  });
}

// -----------------------------------------------------------------------------
// Aparición suave de secciones (fade + 8 px). Sin animación si el usuario
// pide menos movimiento o si el navegador no tiene IntersectionObserver.
// -----------------------------------------------------------------------------
function animarAlEntrar() {
  const elementos = document.querySelectorAll(".revelar");
  if (!elementos.length) return;
  // Índice para escalonar los ítems de las listas (máximo 8 pasos).
  elementos.forEach((el) => el.querySelectorAll("li").forEach((li, i) => li.style.setProperty("--i", Math.min(i, 8))));
  if (reducirMovimiento() || !("IntersectionObserver" in window)) {
    elementos.forEach((el) => el.classList.add("es-visible"));
    return;
  }
  // La clase se pone desde aquí (y no en el HTML) para que, si el JS no
  // carga, nada quede oculto.
  document.documentElement.classList.add("animar");
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("es-visible");
        observador.unobserve(entrada.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  elementos.forEach((el) => observador.observe(el));

  // Red de seguridad: a los 6 s, todo lo que siga oculto se muestra igual.
  setTimeout(() => elementos.forEach((el) => el.classList.add("es-visible")), 6000);
}

/** Corre un paso de inicialización sin que su falla tumbe a los demás. */
export function seguro(fn, nombre) {
  try {
    fn();
  } catch (error) {
    console.warn(`[ICTC] Falló ${nombre}:`, error);
  }
}

// -----------------------------------------------------------------------------
// Datos del prestador y de contacto en las páginas legales: salen de config.js
// para no repetirlos en el HTML. Lo que falta queda como [PENDIENTE].
function completarDatosLegales() {
  const prestador = CONFIG.prestador || {};
  document.querySelectorAll("[data-prestador]").forEach((el) => {
    const valor = prestador[el.dataset.prestador];
    el.textContent = tieneValor(valor) ? valor : "[PENDIENTE]";
  });
  const whatsapp = String(CONFIG.whatsappAgencia || "").replace(/\D/g, "");
  const email = String(CONFIG.emailContacto || "").trim();
  document.querySelectorAll("[data-contacto]").forEach((el) => {
    const soloEmail = el.dataset.contacto === "email";
    const partes = soloEmail ? [email] : [email, whatsapp ? "WhatsApp +" + whatsapp : ""];
    const texto = partes.filter(Boolean).join(" · ");
    el.textContent = texto || (soloEmail ? "[PENDIENTE: email laboral]" : "[PENDIENTE: email y WhatsApp laborales]");
  });
}

export function iniciarPagina() {
  seguro(renderEncabezado, "encabezado");
  seguro(renderPie, "pie");
  seguro(completarDatosLegales, "datos legales");
  seguro(capturarOrigen, "origen");
  seguro(conectarLinksWhatsApp, "links de WhatsApp");
  seguro(animarAlEntrar, "animaciones");
  if (tieneValor(CONFIG.metaPixelId)) seguro(() => iniciarPixel(CONFIG.metaPixelId), "píxel");
}
