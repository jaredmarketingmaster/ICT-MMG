// Utilidades compartidas.

import { traducir } from "./idioma.js";

/**
 * Formato numérico argentino (rioplatense): punto de miles y coma decimal.
 * No usa Intl a propósito: según la versión de ICU, el español puede no
 * agrupar los números de 4 cifras (1040 en vez de 1.040).
 *   formatearNumero(6280)        → "6.280"
 *   formatearNumero(26.17, 2)    → "26,17"
 *   formatearNumero(-160)        → "−160" (signo menos tipográfico)
 */
export function formatearNumero(valor, decimales = 0) {
  const negativo = valor < 0;
  const [entero, fraccion] = Math.abs(valor).toFixed(decimales).split(".");
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (negativo ? "−" : "") + conMiles + (fraccion ? "," + fraccion : "");
}

/** "USD 1.040" / "USD −160" */
export function formatearUSD(valor, decimales = 0) {
  return "USD " + formatearNumero(valor, decimales);
}

/**
 * Acceso a sessionStorage que nunca rompe la página (modo privado,
 * navegadores embebidos de Instagram con almacenamiento bloqueado, etc.).
 */
const memoria = new Map();

export const almacen = {
  leer(clave) {
    try {
      const valor = window.sessionStorage.getItem(clave);
      if (valor !== null) return JSON.parse(valor);
    } catch (_) { /* sessionStorage bloqueado: usamos la memoria */ }
    return memoria.has(clave) ? memoria.get(clave) : null;
  },
  guardar(clave, valor) {
    memoria.set(clave, valor);
    try {
      window.sessionStorage.setItem(clave, JSON.stringify(valor));
    } catch (_) { /* se queda en memoria mientras dure la página */ }
  }
};

/** Link de WhatsApp a partir del número en formato internacional sin "+". */
export function linkWhatsApp(numero, texto = "") {
  const limpio = String(numero || "").replace(/\D/g, "");
  if (!limpio) return "";
  // El mensaje precargado sale en la variante de idioma del visitante.
  return "https://wa.me/" + limpio + (texto ? "?text=" + encodeURIComponent(traducir(texto)) : "");
}

/** true si el valor tiene contenido real (no vacío, no null). */
export function tieneValor(valor) {
  return valor !== undefined && valor !== null && String(valor).trim() !== "";
}

/** Usuario prefiere menos movimiento. */
export const reducirMovimiento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
