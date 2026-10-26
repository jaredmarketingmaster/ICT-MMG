// Variante de idioma: español rioplatense (voseo) para Argentina, español
// neutro (tuteo) para el resto.
//
// Cómo se decide (sin servidor y sin mandar datos a terceros):
//   1. ?es=ar o ?es=neutro en la URL (para probar o para links de anuncios).
//      La elección queda en la sesión.
//   2. Zona horaria del dispositivo: America/Argentina/* (o sus alias viejos)
//      = Argentina. Cualquier otra = neutro.
//   3. Si el navegador no informa la zona horaria, queda Argentina.
// Un script en el <head> de cada página aplica la misma regla ANTES de pintar
// (atributo data-idioma en <html>) para que no se vea el texto argentino y
// después el neutro. Este módulo traduce y avisa con la clase .idioma-listo.
//
// El HTML siempre se escribe en rioplatense (es la versión aprobada). El
// neutro sale de este diccionario: si se agrega texto nuevo con voseo, hay que
// sumar sus formas acá (la prueba "Español neutro" lo detecta).

import { CONFIG } from "../../config.js";

// Forma rioplatense → forma neutra. Las mayúsculas iniciales se respetan solas.
const PALABRAS = {
  // Presente (vos → tú)
  invertís: "inviertes", respondés: "respondes", sabés: "sabes", trabajás: "trabajas",
  medís: "mides", terminás: "terminas", perdés: "pierdes", podés: "puedes",
  obtenés: "obtienes", pagás: "pagas", grabás: "grabas", tenés: "tienes",
  decidís: "decides", querés: "quieres", cancelás: "cancelas", necesitás: "necesitas",
  elegís: "eliges", preferís: "prefieres", seguís: "sigues", pedís: "pides",
  sos: "eres", aplicás: "aplicas", recibís: "recibes", vendés: "vendes",
  // Imperativo
  completá: "completa", cotizá: "cotiza", elegí: "elige", escribí: "escribe",
  revisá: "revisa", aceptá: "acepta", intentá: "intenta", tené: "ten",
  aplicá: "aplica", escribinos: "escríbenos", contanos: "cuéntanos",
  // Pronombre
  vos: "tú"
  // Léxico rioplatense (con artículo, en FRASES)
};
// Frases que tienen que ir antes que las palabras sueltas.
const FRASES = [
  ["para vos", "para ti"], ["Para vos", "Para ti"],
  ["la plata", "el dinero"], ["La plata", "El dinero"] // "plata" es femenino; "dinero", masculino
];

const ZONAS_ARGENTINA = /^America\/(Argentina\/|Buenos_Aires$|Catamarca$|Cordoba$|Jujuy$|Mendoza$|Rosario$)/;
const ATRIBUTOS = ["aria-label", "placeholder", "title", "alt", "data-texto"];
const CLAVE_SESION = "ict_idioma";

/** "ar" | "neutro". Misma regla que el script del <head>. */
export function detectarVariante() {
  try {
    const deUrl = new URLSearchParams(window.location.search).get("es");
    if (deUrl === "ar" || deUrl === "neutro") {
      try { sessionStorage.setItem(CLAVE_SESION, deUrl); } catch (_) { /* sin almacenamiento */ }
      return deUrl;
    }
    let guardada = null;
    try { guardada = sessionStorage.getItem(CLAVE_SESION); } catch (_) { /* sin almacenamiento */ }
    if (guardada === "ar" || guardada === "neutro") return guardada;
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (zona) return ZONAS_ARGENTINA.test(zona) ? "ar" : "neutro";
  } catch (_) { /* navegador sin Intl: queda Argentina */ }
  return "ar";
}

let variante = null;
export function varianteActual() {
  if (variante) return variante;
  const activada = CONFIG.espanolNeutroFueraDeArgentina !== false;
  variante = activada ? detectarVariante() : "ar";
  return variante;
}

const patron = new RegExp(
  "(?<![\\p{L}])(" + Object.keys(PALABRAS).sort((a, b) => b.length - a.length).join("|") + ")(?![\\p{L}])",
  "giu"
);

/** Pasa un texto de rioplatense a neutro (si la variante es neutra). */
export function traducir(texto) {
  if (varianteActual() !== "neutro" || !texto) return texto;
  let salida = String(texto);
  for (const [de, a] of FRASES) salida = salida.split(de).join(a);
  return salida.replace(patron, (original) => {
    const neutra = PALABRAS[original.toLowerCase()];
    if (!neutra) return original;
    return original[0] === original[0].toUpperCase() ? neutra[0].toUpperCase() + neutra.slice(1) : neutra;
  });
}

const IGNORAR = /^(SCRIPT|STYLE|NOSCRIPT)$/;

function traducirAtributos(el) {
  ATRIBUTOS.forEach((a) => {
    if (!el.hasAttribute(a)) return;
    const valor = el.getAttribute(a);
    const nuevo = traducir(valor);
    if (nuevo !== valor) el.setAttribute(a, nuevo);
  });
}

function traducirTexto(nodo) {
  if (nodo.parentNode && IGNORAR.test(nodo.parentNode.nodeName)) return;
  const nuevo = traducir(nodo.nodeValue);
  if (nuevo !== nodo.nodeValue) nodo.nodeValue = nuevo; // solo si cambia: evita bucles con el observador
}

/** Traduce un nodo y todo lo que tenga adentro (textos y atributos). */
function traducirNodo(nodo) {
  if (nodo.nodeType === Node.TEXT_NODE) { traducirTexto(nodo); return; }
  if (nodo.nodeType !== Node.ELEMENT_NODE || IGNORAR.test(nodo.nodeName)) return;
  traducirAtributos(nodo);
  const recorrido = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) traducirTexto(n);
    else if (!IGNORAR.test(n.nodeName)) traducirAtributos(n);
  }
}

/**
 * Traduce la página entera y lo que se agregue después (encabezado, pie,
 * errores del formulario, avisos). No hace nada en la variante argentina.
 */
let aplicado = false;
export function aplicarIdioma() {
  if (aplicado) return; // se llama al cargar este módulo y otra vez desde comun.js
  aplicado = true;
  const raiz = document.documentElement;
  const v = varianteActual();
  raiz.setAttribute("data-idioma", v);
  if (v === "neutro") {
    raiz.lang = "es";
    document.title = traducir(document.title);
    traducirNodo(document.body);
    new MutationObserver((cambios) => {
      cambios.forEach((c) => {
        if (c.type === "characterData") traducirTexto(c.target);
        else if (c.type === "attributes") traducirAtributos(c.target);
        else c.addedNodes.forEach(traducirNodo);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  }
  raiz.classList.add("idioma-listo");
}

// Corre apenas se carga (cada página lo incluye solo en el <head>).
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicarIdioma);
else aplicarIdioma();
