// agenda.html: calendario de GHL embebido, prellenado con nombre y WhatsApp.

import { CONFIG } from "../../config.js";
import { tieneValor } from "./utils.js";
import { iniciarPagina } from "./comun.js";

// 1) Leer nombre y WhatsApp que manda el formulario por la URL y QUITARLOS de
//    la barra de direcciones antes de cargar el píxel: el PageView de Meta
//    incluye la URL de la página y no queremos mandarle datos personales.
const params = new URLSearchParams(window.location.search);
const prellenado = { nombre: params.get("nombre") || "", whatsapp: params.get("whatsapp") || "" };
if (params.has("nombre") || params.has("whatsapp")) {
  params.delete("nombre");
  params.delete("whatsapp");
  const resto = params.toString();
  history.replaceState(null, "", window.location.pathname + (resto ? "?" + resto : "") + window.location.hash);
}

iniciarPagina();
renderCalendario();

function renderCalendario() {
  const contenedor = document.getElementById("calendario");
  if (!contenedor) return;

  if (!tieneValor(CONFIG.calendarioUrl)) {
    contenedor.innerHTML = `
      <div class="calendario__pendiente" data-pendiente="calendario">
        <p>Calendario pendiente de configurar</p>
      </div>`;
    return;
  }

  let url;
  try {
    url = new URL(CONFIG.calendarioUrl, window.location.href);
  } catch (_) {
    console.warn("[I.C.T.] calendarioUrl no es una URL válida.");
    return;
  }

  // Prellenado: los nombres de los parámetros salen de config.js porque GHL
  // no los documenta para el embed del calendario. Si los ignora, no pasa nada.
  const nombres = CONFIG.calendarioParametros || {};
  if (tieneValor(nombres.nombre) && prellenado.nombre) url.searchParams.set(nombres.nombre, prellenado.nombre);
  if (tieneValor(nombres.whatsapp) && prellenado.whatsapp) url.searchParams.set(nombres.whatsapp, prellenado.whatsapp);

  // Alto fijo responsive (ver .calendario__iframe en styles.css). El embed
  // estándar de GHL trae además el script link.msgsndr.com/js/form_embed.js
  // para ajustar el alto solo; no lo agregamos porque no pudimos confirmarlo
  // en documentación oficial. Si se confirma, se suma aquí.
  const iframe = document.createElement("iframe");
  iframe.className = "calendario__iframe";
  iframe.src = url.toString();
  iframe.title = "Calendario para agendar la videollamada";
  contenedor.replaceChildren(iframe);
}
