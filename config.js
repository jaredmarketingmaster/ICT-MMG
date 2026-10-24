// =============================================================================
// Configuración del sitio ICTC — Marketing Master Top
// -----------------------------------------------------------------------------
// Este es el ÚNICO archivo que hay que tocar para cambiar links, precios,
// cupos o datos legales. El resto del código lee de aquí.
//
// Regla general: si un campo queda vacío (""), la página se degrada sola
// (oculta el bloque, muestra un placeholder o usa el plan B). Nunca se
// inventan datos: lo que no es real se deja vacío o como "[PENDIENTE]".
// =============================================================================

export const CONFIG = {
  titularPorDefecto: "A",               // "A" | "B". La URL manda: ?h=a o ?h=b
  webhookUrl: "",                       // [PENDIENTE] Inbound Webhook del workflow de GHL
  calendarioUrl: "",                    // [PENDIENTE] URL de embed del calendario de GHL (30 min)
  whatsappAgencia: "",                  // [PENDIENTE] WhatsApp laboral de Jared: 549 + código de área sin 0 + número sin 15
  emailContacto: "",                    // [PENDIENTE] email laboral de Jared
  metaPixelId: "",                      // [PENDIENTE] píxel de Marketing Master Top
  videoHero: "",                        // [PENDIENTE] URL del video del hero (YouTube, Vimeo o .mp4)
  precioContinuidad: 60,                // [PENDIENTE] propuesta, a confirmar
  cupos: [],                            // ej. [{ ciudad: "Tucumán", disponibles: 4 }] — solo datos reales
  terminosUrl: "terminos.html",
  privacidadUrl: "privacidad.html",
  // Datos del prestador: se usan en el pie y en las páginas legales.
  prestador: {
    nombre: "Jared Ezequiel Farfán Borges",
    condicion: "monotributista",
    cuit: "20-40331496-0",
    domicilio: "San Martín 1500, T4107 Yerba Buena, Tucumán, Argentina"
  },

  // ---------------------------------------------------------------------------
  // Campos opcionales agregados en la beta (no estaban en el brief original)
  // ---------------------------------------------------------------------------

  // Imagen de portada del video del hero. Con YouTube se toma sola la miniatura
  // del video; con Vimeo o .mp4 conviene definirla. Si queda vacía, se muestra
  // una portada con los colores de la marca y el botón de play.
  videoPortada: "",                     // [PENDIENTE] ej. "assets/img/portada-video.jpg"

  // Captura del Administrador de anuncios del caso (con datos tapados).
  // Si queda vacía, el bloque no se muestra.
  capturaCaso: "",                      // [PENDIENTE] ej. "assets/img/caso-ads-manager.png"

  // Nombres de los parámetros que acepta el calendario de GHL para prellenar
  // el nombre y el teléfono. [PENDIENTE] verificar con el calendario real: si
  // GHL usa otros nombres, se cambian aquí. Dejar "" para no prellenar.
  calendarioParametros: { nombre: "first_name", whatsapp: "phone" }
};
