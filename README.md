# ICTC — Landing de venta (beta)

Landing de **ICTC**, el sistema de adquisición de clientes de **Marketing Master Top** (la marca de Jared Farfán, "El Marketing Master") para tiendas que venden principalmente iPhone. El mercado inicial es Argentina; el sitio está en español rioplatense, con voseo.

- **I**nterrupción: estructura validada de campañas en Meta y el pedido de anuncios.
- **C**aptura: landing con cotizadora conectada al WhatsApp de la tienda y a Marketing Master Hub (CRM).
- **T**racking: tracking por servidor con la API de Conversiones de Meta.
- **C**ierre: playbook de cierre de ventas.

La página tiene un solo objetivo: que la tienda que califica complete la aplicación y agende una videollamada de 30 minutos. Hay un solo CTA, **"Aplicar a un cupo"**.

Es un sitio estático: HTML, CSS y JavaScript vanilla (ES modules). No tiene build, ni npm, ni frameworks; la única dependencia externa es Google Fonts.

**Diseño:** capa premium con interacciones en CSS y JS propios, sin librerías:
- Hero oscuro con una demo de la cotizadora.
- Encabezado que pasa de transparente a sólido.
- Gráfico del caso.
- Calculadora con deslizador y medidor.
- Línea de tiempo que se enciende al pasar.

Con `prefers-reduced-motion` se ve igual de completa, pero sin movimiento. El detalle está en `CLAUDE.md`.

## Estructura

```
index.html            Landing (secciones 01 a 10 + formulario)
agenda.html           "Tu tienda califica" + calendario de GHL
no-califica.html      "Gracias por tu sinceridad"
terminos.html         BORRADOR de términos (Argentina, Mercado Pago), en revisión legal
privacidad.html       BORRADOR de privacidad (Ley 25.326), en revisión legal
config.js             ← TODO lo editable (links, precios, cupos, píxel, datos legales)
assets/
  css/styles.css      variables · base · layout · componentes · secciones · utilidades
  js/utils.js         formato de números (punto de miles, coma decimal), sessionStorage seguro
  js/comun.js         encabezado y pie (una sola plantilla), UTM, píxel, links de WhatsApp
  js/main.js          index: titular A/B, cupos, video/mock, calculadora, botón fijo
  js/form.js          formulario: pasos, validación, calificación, envío, plan B
  js/pixel.js         píxel de Meta (solo si hay ID)
  js/agenda.js        calendario embebido y prellenado
  img/logo-mmg.svg    isotipo "MM" de Marketing Master Top (recreación provisoria, ver abajo)
  img/logo-mmg-isotipo-70px.png   original
  img/ictc-logotipo.svg          logotipo iCTC para fondos claros
  img/ictc-logotipo-fondo-oscuro.svg   logotipo iCTC para fondos oscuros
  img/ictc-favicon.svg           favicon: la "i" del logotipo
  img/og-image.png    1200×630 para compartir
  img/favicon-32.png, apple-touch-icon.png   generados desde ictc-favicon.svg
tests/verificar.cjs   verificación automática (Playwright), no se usa en producción
herramientas/         plantilla y script para regenerar og-image.png
CLAUDE.md             reglas para las próximas sesiones de Claude Code
documentacion.md      diario de trabajo: historia, decisiones y cambios por sesión
```

## Correrlo localmente

Los ES modules no funcionan abriendo el archivo con doble clic (`file://`): hace falta un servidor estático.

```bash
python3 -m http.server 8080
# o
npx serve .
```

Luego, abrir <http://localhost:8080>.

Para probar la variante B del titular y los UTM:
<http://localhost:8080/?utm_source=meta&utm_campaign=test&fbclid=abc&h=b>

## Publicar en GitHub Pages

1. Subir el repo a GitHub.
2. Ir a **Settings → Pages**. En **Source**, elegir *Deploy from a branch*, la rama `main` y la carpeta `/ (root)`.
   Durante la beta, el sitio de prueba se publica desde la rama `claude/zealous-fermi-rhv2dx`, que es donde se suben los cambios.
3. La URL queda en `https://<usuario>.github.io/<repo>/`. Si se usa un dominio propio, se configura en la misma pantalla.
4. El subdominio definitivo es `ictc.marketingmaster.top`. `og:url`, `og:image` y `twitter:image` ya apuntan ahí con URL **absoluta**; si cambia el dominio, hay que cambiarlas.

## Qué se edita en `config.js`

| Campo | Para qué | Si queda vacío |
|---|---|---|
| `titularPorDefecto` | `"A"` o `"B"`. La URL manda: `?h=a` / `?h=b` | Se usa la A |
| `webhookUrl` | Inbound Webhook del workflow de GHL | **Modo desarrollo**: no envía nada, muestra el payload en la consola y el aviso "Webhook no configurado" |
| `calendarioUrl` | URL de embed del calendario de GHL | `agenda.html` muestra "Calendario pendiente de configurar" |
| `calendarioParametros` | Nombres de los parámetros para prellenar nombre y teléfono | `""` = no prellena |
| `whatsappAgencia` | WhatsApp laboral de Jared, sin `+`: 549 + código de área sin 0 + número sin 15 | Se ocultan el botón de WhatsApp y el contacto del pie; en las legales se ve `[PENDIENTE]` |
| `emailContacto` | Email laboral de Jared (pie y legales) | No se muestra; en las legales se ve `[PENDIENTE]` |
| `metaPixelId` | Píxel de Meta | No se carga ningún script de Meta |
| `videoHero` / `videoPortada` | Video del hero (YouTube, Vimeo o .mp4) y su portada | Se muestra el mock de la cotizadora |
| `capturaCaso` | Imagen del Administrador de anuncios (sección 04) | El bloque no existe |
| `precioContinuidad` | Precio en la FAQ "¿Qué pasa si cancelo?" | Se quita esa frase |
| `cupos` | `[{ ciudad: "Tucumán", disponibles: 4 }]`, **solo datos reales** | La franja de cupos no se muestra |
| `terminosUrl` / `privacidadUrl` | Links legales | El link no se muestra |
| `prestador` | `nombre`, `condicion`, `cuit` y `domicilio`: pie y páginas legales | Se ve `[PENDIENTE]` |

Los datos del caso (sección 04) están dos veces en `index.html`: en la tabla y en el gráfico (`style="--v:…"`, `data-valor` y `aria-label`). Si cambian, hay que actualizar ambos.

El precio (USD 210 / 150), la pauta (USD 1.000) y la cuenta de 1.210 están en el **copy**, no en `config.js`. Si cambian, hay que tocar `index.html` (texto y tabla de la sección 07) y las constantes de `assets/js/main.js` (`COSTO_MENSUAL`, `VENTAS_OBJETIVO`, `UTILIDAD_MINIMA`).

## Formulario → GoHighLevel

El formulario hace un `POST` JSON a `webhookUrl` con un tiempo máximo de 10 segundos. El payload trae:

- Todos los campos: `nombre`, `whatsapp` (E.164 de celular argentino, ej. `+5491123456789`), `tienda`, `instagram` (sin @), `ciudad`, `iphone_principal`, `pauta_actual`, `suma_1000`, `utilidad`, `graba`, `decisor`, `privacidad`.
- `califica` (true/false) y `motivo_no_califica`: lista con `iphone_no_es_principal`, `no_puede_sumar_1000` y/o `utilidad_menor_a_81`.
- `variante_titular` (`"A"`/`"B"`).
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `fbclid`, `ref` (vacíos si no vinieron).
- `pagina`, `enviado_en` (ISO 8601), `user_agent`.
- `event_id`: el mismo ID del evento `Lead` / `AplicacionNoCalifica` del píxel. GHL lo usa para **deduplicar** cuando mande la conversión por la API de conversiones.

Si el envío falla, aparece el botón **"Enviar por WhatsApp"** con las respuestas ya escritas (necesita `whatsappAgencia`).

Después del envío: si califica, va a `agenda.html?nombre=…&whatsapp=…`; si no, a `no-califica.html`. `agenda.html` borra esos datos de la URL antes de cargar el píxel, para no mandarle datos personales a Meta.

## Logo provisorio

`assets/img/logo-mmg.svg` es una **recreación provisoria; reemplazar por el vector oficial cuando exista**. Se calcó del PNG de 70 px: hexágono regular vertical con el degradado azul→gris y "MM" trazado como líneas. Para cambiarlo, basta con reemplazar el archivo (se usa en el pie y el favicon; el encabezado lleva el logotipo iCTC) y regenerar `og-image.png`. Los favicons son la "i" de iCTC y no dependen de este archivo.

**Imagen para compartir:** `og-image.png` sale de `herramientas/og-image.html`. Para cambiar el texto, se edita esa plantilla y se corre `NODE_PATH="$(npm root -g)" node herramientas/og-image.cjs`.

## Verificar antes de cada commit

```bash
python3 -m http.server 8080 &                       # en la raíz del repo
NODE_PATH="$(npm root -g)" node tests/verificar.cjs  # requiere Playwright + Chromium
ICT_CAPTURAS=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # además guarda capturas en tests/capturas/
```

La verificación cubre:

- Que no haya scroll horizontal entre 320 y 1440 px, ni errores en la consola.
- Los tres casos del formulario y la validación.
- El titular A/B.
- La calculadora contra la tabla.
- La configuración vacía y con datos: cupos, video, píxel, webhook OK y caído, calendario.
- El botón fijo en móvil.
- Una búsqueda de copy prohibido.
- Contraste AA, sin texto blanco sobre celeste.

## Pendientes

**En `config.js`:**
- [ ] `webhookUrl`: Inbound Webhook del workflow de GHL.
- [ ] `calendarioUrl`: embed del calendario de 30 minutos.
- [ ] `calendarioParametros`: confirmar con el calendario real qué parámetros acepta GHL para prellenar (por defecto `first_name` y `phone`).
- [ ] `whatsappAgencia`: WhatsApp laboral de Jared.
- [ ] `emailContacto`: email laboral de Jared.
- [ ] `metaPixelId`.
- [ ] `videoHero` y, si no es YouTube, `videoPortada`.
- [ ] `precioContinuidad`: USD 60 es una propuesta, a confirmar (si al cancelar se puede conservar el CRM y la cotizadora).
- [ ] `cupos`: solo cuando haya datos reales.
- [ ] `capturaCaso`: captura del Administrador de anuncios con datos tapados.

**En el contenido y la técnica:**
- [ ] Revisión de Jared de toda la versión para Argentina (copy en voseo decidido por Claude a pedido suyo, ver `documentacion.md`).
- [ ] Moneda en que Mercado Pago debita la suscripción. La landing no lo dice; si es en pesos, falta definir el tipo de cambio para las legales.
- [ ] Validar el punto "Si trabaja con una agencia…" de la sección 02 (`data-pendiente="validar-agencias"`).
- [ ] Revisión del abogado de los borradores de `terminos.html` y `privacidad.html`: resolver cada `[PENDIENTE]` y quitar el aviso de BORRADOR.
- [ ] Banner de consentimiento del píxel: lo define el abogado.
- [ ] Apuntar `ictc.marketingmaster.top` a GitHub Pages (registro CNAME en el DNS y dominio personalizado en Settings → Pages). Las URLs absolutas de `og:url`, `og:image` y `twitter:image` ya usan ese subdominio.
- [ ] Vector oficial del logo.
- [ ] **Probar el webhook real desde el navegador.** Si GHL no responde con encabezados CORS, el navegador bloquea el envío y todo cae al plan B de WhatsApp. No se pudo verificar desde este entorno.
- [ ] Confirmar si el embed del calendario necesita el script de autoajuste de GHL (`form_embed.js`). Hoy el iframe tiene un alto fijo responsive.
- [ ] En el Administrador de eventos de Meta, apagar la "coincidencia avanzada automática" para que el píxel no lea los campos del formulario.
- [ ] Al lanzar: quitar `<meta name="robots" content="noindex, nofollow">` de las 5 páginas.
