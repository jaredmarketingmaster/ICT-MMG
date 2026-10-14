// Píxel de Meta. Solo se carga si CONFIG.metaPixelId tiene valor.
// Regla: desde el navegador NO se mandan datos personales a Meta (ni nombre
// ni teléfono). Eso lo hace GHL con la API de conversiones, usando el mismo
// event_id que se manda en el payload del formulario para deduplicar.

let activo = false;

export function iniciarPixel(pixelId) {
  if (activo || !pixelId) return false;

  // Código base oficial del píxel, reescrito para que sea legible.
  if (!window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  // Sin configuración automática: el píxel no lee botones ni metadatos de la
  // página por su cuenta. (La "coincidencia avanzada automática" se apaga
  // además en el Administrador de eventos; ver README.)
  window.fbq("set", "autoConfig", false, String(pixelId));
  window.fbq("init", String(pixelId));
  window.fbq("track", "PageView");
  activo = true;
  return true;
}

export const pixelActivo = () => activo;

/** Evento estándar (Lead, ViewContent…). */
export function rastrear(evento, parametros = {}, eventId) {
  if (!activo) return;
  window.fbq("track", evento, parametros, eventId ? { eventID: eventId } : undefined);
}

/** Evento personalizado (AplicacionNoCalifica). */
export function rastrearPersonalizado(evento, parametros = {}, eventId) {
  if (!activo) return;
  window.fbq("trackCustom", evento, parametros, eventId ? { eventID: eventId } : undefined);
}
