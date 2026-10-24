// Formulario de aplicación (#aplicar): pasos en móvil, validación,
// calificación en el cliente, envío al webhook de GHL y plan B por WhatsApp.

import { CONFIG } from "../../config.js";
import { linkWhatsApp, tieneValor } from "./utils.js";
import { leerOrigen } from "./comun.js";
import { pixelActivo, rastrear, rastrearPersonalizado } from "./pixel.js";

const TIEMPO_MAXIMO_ENVIO = 10000; // ms
const MEDIA_PASOS = "(max-width: 767.98px)";

// Respuestas que descalifican. "No sé" (utilidad) y "Nadie todavía" (graba)
// NO descalifican: se resuelven en la llamada.
const UTILIDADES_BAJAS = ["Menos de USD 60", "USD 60 a 80"];

// Etiquetas para el resumen de WhatsApp (mismo texto que ve el usuario).
const ETIQUETAS = {
  nombre: "Nombre",
  whatsapp: "WhatsApp",
  tienda: "Tienda",
  instagram: "Instagram",
  ciudad: "Ciudad",
  iphone_principal: "¿El iPhone es lo que más venden?",
  pauta_actual: "¿Cuánto invierten hoy en pauta al mes?",
  suma_1000: "¿Pueden sumar USD 1.000 al mes de pauta nueva, pagados a Meta?",
  utilidad: "¿Cuánto le deja en promedio cada iPhone?",
  graba: "¿Quién grabaría los anuncios?",
  decisor: "¿Quién toma la decisión?"
};

const MENSAJES = {
  nombre: "Escriba su nombre.",
  whatsappColombia: "Escriba un celular de 10 dígitos que empiece por 3.",
  whatsappOtro: "Escriba un número válido, solo con dígitos.",
  whatsappCompleto: "Escriba el número completo con el código del país, solo con dígitos.",
  tienda: "Escriba el nombre de la tienda.",
  instagram: "Escriba el usuario de Instagram de la tienda.",
  instagramFormato: "Revise el usuario: solo letras, números, puntos y guiones bajos.",
  ciudad: "Escriba la ciudad.",
  opcion: "Elija una opción.",
  privacidad: "Para enviar la aplicación, acepte la política de privacidad."
};

// -----------------------------------------------------------------------------
// Lógica de calificación (exportada para poder probarla aparte)
// -----------------------------------------------------------------------------
export function calificar(respuestas) {
  const motivos = [];
  if (respuestas.iphone_principal === "No") motivos.push("iphone_no_es_principal");
  if (respuestas.suma_1000 === "No") motivos.push("no_puede_sumar_1000");
  if (UTILIDADES_BAJAS.includes(respuestas.utilidad)) motivos.push("utilidad_menor_a_81");
  return { califica: motivos.length === 0, motivo_no_califica: motivos };
}

/** Instagram con o sin @, o pegado como link. Se guarda sin @. */
export function normalizarInstagram(valor) {
  let usuario = String(valor || "").trim();
  const enLink = usuario.match(/instagram\.com\/([^/?#\s]+)/i);
  if (enLink) usuario = enLink[1];
  return usuario.replace(/^@+/, "").trim();
}

// -----------------------------------------------------------------------------
export function iniciarFormulario({ obtenerVariante }) {
  const form = document.getElementById("form-aplicacion");
  if (!form) return;

  const pasos = Array.from(form.querySelectorAll("[data-paso]"));
  const textoPaso = form.querySelector("[data-paso-texto]");
  const barra = form.querySelector("[data-progreso-barra]");
  const btnVolver = form.querySelector('[data-accion="volver"]');
  const btnSiguiente = form.querySelector('[data-accion="siguiente"]');
  const btnEnviar = form.querySelector('[data-accion="enviar"]');
  const estado = form.querySelector("[data-estado]");
  const avisoDev = form.querySelector("[data-aviso-dev]");
  const linkPrivacidad = form.querySelector("[data-link-privacidad]");
  const textoEnviar = btnEnviar.textContent;
  const media = window.matchMedia(MEDIA_PASOS);
  let pasoActual = 1;
  let enviando = false;

  // Link de privacidad desde config (sin link roto si falta).
  if (linkPrivacidad) {
    if (tieneValor(CONFIG.privacidadUrl)) linkPrivacidad.href = CONFIG.privacidadUrl;
    else linkPrivacidad.replaceWith(document.createTextNode(linkPrivacidad.textContent));
  }

  // Aviso discreto de modo desarrollo.
  if (avisoDev) avisoDev.hidden = tieneValor(CONFIG.webhookUrl);

  // Los botones vienen deshabilitados en el HTML para que, sin JS, el
  // formulario no se envíe con los datos en la URL.
  btnSiguiente.disabled = false;
  btnEnviar.disabled = false;

  // Ejemplo de formato solo para celulares de Colombia.
  const inputWhatsApp = form.elements.namedItem("whatsapp");
  const selectPrefijo = form.elements.namedItem("prefijo");
  const valorPrefijo = form.querySelector("[data-prefijo-valor]");
  const actualizarEjemplo = () => {
    const otro = selectPrefijo.value === "otro";
    if (valorPrefijo) valorPrefijo.textContent = otro ? "Otro" : "+" + selectPrefijo.value;
    inputWhatsApp.placeholder = selectPrefijo.value === "57" ? "300 000 0000"
      : otro ? "Código de país y número" : "";
  };
  selectPrefijo.addEventListener("change", actualizarEjemplo);
  actualizarEjemplo();

  // ---------------------------------------------------------------------------
  // Pasos (solo en móvil)
  // ---------------------------------------------------------------------------
  const enModoPasos = () => media.matches;

  function mostrarPaso(numero, { enfocar = false } = {}) {
    pasoActual = numero;
    const modoPasos = enModoPasos();
    form.classList.toggle("formulario--pasos", modoPasos);

    pasos.forEach((paso) => {
      paso.hidden = modoPasos && Number(paso.dataset.paso) !== numero;
    });

    if (textoPaso) textoPaso.textContent = `Paso ${numero} de ${pasos.length}`;
    if (barra) barra.style.width = `${(numero / pasos.length) * 100}%`;

    btnVolver.hidden = !modoPasos || numero === 1;
    btnSiguiente.hidden = !modoPasos || numero === pasos.length;
    btnEnviar.hidden = modoPasos && numero !== pasos.length;

    if (enfocar) {
      const titulo = pasos[numero - 1].querySelector("[data-paso-titulo]");
      if (titulo) titulo.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: "auto", block: "start" });
    }
  }

  media.addEventListener("change", () => mostrarPaso(pasoActual));
  mostrarPaso(1);

  btnSiguiente.addEventListener("click", () => {
    if (validarPaso(1)) mostrarPaso(2, { enfocar: true });
  });
  btnVolver.addEventListener("click", () => mostrarPaso(1, { enfocar: true }));

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------
  const campo = (nombre) => form.elements.namedItem(nombre);

  function mostrarError(nombre, mensaje) {
    const error = form.querySelector(`[data-error-de="${nombre}"]`);
    const control = campo(nombre);
    const elementos = control instanceof RadioNodeList ? Array.from(control) : [control];
    elementos.forEach((el) => el && el.setAttribute("aria-invalid", mensaje ? "true" : "false"));
    if (error) {
      error.textContent = mensaje || "";
      error.hidden = !mensaje;
    }
    return !mensaje;
  }

  function validarTexto(nombre, mensaje) {
    return mostrarError(nombre, campo(nombre).value.trim() ? "" : mensaje);
  }

  function telefonoE164() {
    const prefijo = campo("prefijo").value; // "57", "54"… o "otro"
    let digitos = campo("whatsapp").value.replace(/\D/g, "");
    if (prefijo === "otro") return { valido: /^\d{8,15}$/.test(digitos), numero: "+" + digitos };
    if (prefijo === "57") {
      // Si pegó el número con el 57 adelante, lo aceptamos igual.
      if (digitos.length === 12 && digitos.startsWith("57")) digitos = digitos.slice(2);
      return { valido: /^3\d{9}$/.test(digitos), numero: "+57" + digitos };
    }
    if (digitos.startsWith(prefijo) && digitos.length > 10) digitos = digitos.slice(prefijo.length);
    return { valido: /^\d{6,14}$/.test(digitos), numero: "+" + prefijo + digitos };
  }

  function validarWhatsApp() {
    const prefijo = campo("prefijo").value;
    const { valido } = telefonoE164();
    const mensaje = prefijo === "57" ? MENSAJES.whatsappColombia
      : prefijo === "otro" ? MENSAJES.whatsappCompleto : MENSAJES.whatsappOtro;
    return mostrarError("whatsapp", valido ? "" : mensaje);
  }

  function validarInstagram() {
    const usuario = normalizarInstagram(campo("instagram").value);
    if (!usuario) return mostrarError("instagram", MENSAJES.instagram);
    return mostrarError("instagram", /^[A-Za-z0-9._]{1,30}$/.test(usuario) ? "" : MENSAJES.instagramFormato);
  }

  function validarOpcion(nombre) {
    return mostrarError(nombre, campo(nombre).value ? "" : MENSAJES.opcion);
  }

  const VALIDADORES = {
    1: [
      ["nombre", () => validarTexto("nombre", MENSAJES.nombre)],
      ["whatsapp", validarWhatsApp],
      ["tienda", () => validarTexto("tienda", MENSAJES.tienda)],
      ["instagram", validarInstagram],
      ["ciudad", () => validarTexto("ciudad", MENSAJES.ciudad)]
    ],
    2: [
      ...["iphone_principal", "pauta_actual", "suma_1000", "utilidad", "graba", "decisor"]
        .map((n) => [n, () => validarOpcion(n)]),
      ["privacidad", () => mostrarError("privacidad", campo("privacidad").checked ? "" : MENSAJES.privacidad)]
    ]
  };

  /**
   * Valida un paso y (si se pide) enfoca el primer error. Si el paso estaba
   * oculto (error en el paso 1 al enviar desde el paso 2), primero lo muestra.
   */
  function validarPaso(numero, { enfocar = true } = {}) {
    let primerError = null;
    VALIDADORES[numero].forEach(([nombre, validar]) => {
      if (!validar() && !primerError) primerError = nombre;
    });
    if (primerError && enfocar) {
      if (enModoPasos() && pasoActual !== numero) mostrarPaso(numero);
      enfocarCampo(primerError);
    }
    return !primerError;
  }

  function enfocarCampo(nombre) {
    const control = campo(nombre);
    const el = control instanceof RadioNodeList ? control[0] : control;
    if (el) el.focus();
  }

  // Revalidar mientras escribe o al elegir una opción, solo si ese campo ya
  // estaba marcado con error (no se regaña antes de tiempo). No se usa
  // "focusout" a propósito: si el error desaparece al perder el foco, el botón
  // "Siguiente" se mueve en medio del toque y el toque no le llega.
  const TODOS = new Map([...VALIDADORES[1], ...VALIDADORES[2]]);
  function revalidar(e) {
    const nombre = e.target.name === "prefijo" ? "whatsapp" : e.target.name;
    const control = campo(nombre);
    const el = control instanceof RadioNodeList ? control[0] : control;
    if (el && el.getAttribute("aria-invalid") === "true" && TODOS.has(nombre)) TODOS.get(nombre)();
  }
  form.addEventListener("input", revalidar);
  form.addEventListener("change", revalidar);

  // ---------------------------------------------------------------------------
  // Payload
  // ---------------------------------------------------------------------------
  function leerRespuestas() {
    const valor = (n) => String(campo(n).value || "").trim();
    return {
      nombre: valor("nombre"),
      whatsapp: telefonoE164().numero,
      tienda: valor("tienda"),
      instagram: normalizarInstagram(valor("instagram")),
      ciudad: valor("ciudad"),
      iphone_principal: valor("iphone_principal"),
      pauta_actual: valor("pauta_actual"),
      suma_1000: valor("suma_1000"),
      utilidad: valor("utilidad"),
      graba: valor("graba"),
      decisor: valor("decisor"),
      privacidad: campo("privacidad").checked
    };
  }

  function crearEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "ict-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function armarPayload() {
    const respuestas = leerRespuestas();
    return {
      ...respuestas,
      ...calificar(respuestas),
      variante_titular: obtenerVariante(),
      ...leerOrigen(),
      pagina: window.location.href,
      enviado_en: new Date().toISOString(),
      user_agent: navigator.userAgent,
      // Mismo ID que el evento del píxel, para que GHL deduplique al mandar
      // la conversión por la API de conversiones de Meta.
      event_id: crearEventId()
    };
  }

  function resumenWhatsApp(payload) {
    const lineas = Object.entries(ETIQUETAS).map(([clave, etiqueta]) => {
      const valor = clave === "instagram" ? "@" + payload.instagram : payload[clave];
      return etiqueta.endsWith("?") ? `${etiqueta} ${valor}` : `${etiqueta}: ${valor}`;
    });
    return ["Hola, quiero aplicar a un cupo de ICTC. Estas son mis respuestas:", "", ...lineas].join("\n");
  }

  // ---------------------------------------------------------------------------
  // Envío
  // ---------------------------------------------------------------------------
  async function enviarAlWebhook(payload) {
    if (!tieneValor(CONFIG.webhookUrl)) {
      console.info("[ICTC] Webhook no configurado: no se envió nada. Payload:", payload);
      return;
    }
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_ENVIO);
    try {
      const respuesta = await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controlador.signal
      });
      if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    } finally {
      clearTimeout(temporizador);
    }
  }

  function limpiarEstado() {
    estado.replaceChildren();
    estado.hidden = true;
    estado.classList.remove("formulario__estado--error");
  }

  function mostrarFallo(payload) {
    const href = linkWhatsApp(CONFIG.whatsappAgencia, resumenWhatsApp(payload));
    const mensaje = document.createElement("p");
    mensaje.textContent = href
      ? "No pudimos enviar su aplicación. Puede enviarla por WhatsApp: sus respuestas ya van escritas."
      : "No pudimos enviar su aplicación. Revise su conexión e intente de nuevo.";
    estado.replaceChildren(mensaje);
    if (href) {
      const boton = document.createElement("a");
      boton.className = "boton boton--whatsapp";
      boton.href = href;
      boton.target = "_blank";
      boton.rel = "noopener";
      boton.textContent = "Enviar por WhatsApp";
      estado.appendChild(boton);
    }
    estado.classList.add("formulario__estado--error");
    estado.hidden = false;
    (estado.querySelector("a") || btnEnviar).focus();
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (enviando) return;

    // Enter en el paso 1 (móvil) = "Siguiente".
    if (enModoPasos() && pasoActual === 1) {
      if (validarPaso(1)) mostrarPaso(2, { enfocar: true });
      return;
    }

    // Validar todo y marcar todos los errores; el foco va al primero (si el
    // error está en el paso 1, validarPaso vuelve a él).
    const paso1Valido = validarPaso(1);
    const paso2Valido = validarPaso(2, { enfocar: paso1Valido });
    if (!paso1Valido || !paso2Valido) return;

    const payload = armarPayload();
    enviando = true;
    btnEnviar.disabled = true;
    btnVolver.disabled = true;
    btnEnviar.textContent = "Enviando…";
    limpiarEstado();

    try {
      await enviarAlWebhook(payload);
    } catch (error) {
      console.warn("[ICTC] Falló el envío al webhook:", error);
      enviando = false;
      btnEnviar.disabled = false;
      btnVolver.disabled = false;
      btnEnviar.textContent = textoEnviar;
      mostrarFallo(payload);
      return;
    }

    // Píxel: Lead si califica; evento personalizado si no. Sin datos personales.
    if (payload.califica) rastrear("Lead", {}, payload.event_id);
    else rastrearPersonalizado("AplicacionNoCalifica", {}, payload.event_id);

    const destino = payload.califica
      ? "agenda.html?" + new URLSearchParams({ nombre: payload.nombre, whatsapp: payload.whatsapp }).toString()
      : "no-califica.html";

    // Pequeña espera para que el píxel alcance a salir antes de cambiar de página.
    setTimeout(() => window.location.assign(destino), pixelActivo() ? 400 : 0);
  });
}
