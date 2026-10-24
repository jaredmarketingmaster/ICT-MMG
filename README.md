# I.C.T. — Landing de venta (beta)

Landing de **I.C.T.**, el sistema de adquisición de clientes de **Marketing Masters Group** para dueños de tiendas de iPhone:

- **I**nterrupción: campañas en Meta.
- **C**aptura: cotizadora conectada al WhatsApp de la tienda y a un CRM.
- **T**racking: cada venta atribuida a la campaña que la generó.

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
agenda.html           "Su tienda califica" + calendario de GHL
no-califica.html      "Gracias por su sinceridad"
terminos.html         [PENDIENTE] texto legal
privacidad.html       [PENDIENTE] texto legal
config.js             ← TODO lo editable (links, precios, cupos, píxel, datos legales)
assets/
  css/styles.css      variables · base · layout · componentes · secciones · utilidades
  js/utils.js         formato de números colombiano, sessionStorage seguro
  js/comun.js         encabezado y pie (una sola plantilla), UTM, píxel, links de WhatsApp
  js/main.js          index: titular A/B, cupos, video/mock, calculadora, botón fijo
  js/form.js          formulario: pasos, validación, calificación, envío, plan B
  js/pixel.js         píxel de Meta (solo si hay ID)
  js/agenda.js        calendario embebido y prellenado
  img/logo-mmg.svg    isotipo (recreación provisoria, ver abajo)
  img/logo-mmg-isotipo-70px.png   original
  img/og-image.png    1200×630 para compartir
  img/favicon-32.png, apple-touch-icon.png
tests/verificar.cjs   verificación automática (Playwright), no se usa en producción
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
3. La URL queda en `https://<usuario>.github.io/<repo>/`. Si se usa un dominio propio, se configura en la misma pantalla.
4. Con la URL definitiva, completar en `index.html` las URLs **absolutas** de `og:image`, `twitter:image` y `og:url` (ver la lista de pendientes).

## Qué se edita en `config.js`

| Campo | Para qué | Si queda vacío |
|---|---|---|
| `titularPorDefecto` | `"A"` o `"B"`. La URL manda: `?h=a` / `?h=b` | Se usa la A |
| `webhookUrl` | Inbound Webhook del workflow de GHL | **Modo desarrollo**: no envía nada, muestra el payload en la consola y el aviso "Webhook no configurado" |
| `calendarioUrl` | URL de embed del calendario de GHL | `agenda.html` muestra "Calendario pendiente de configurar" |
| `calendarioParametros` | Nombres de los parámetros para prellenar nombre y teléfono | `""` = no prellena |
| `whatsappAgencia` | Número internacional sin `+` | Se ocultan el botón de WhatsApp y el contacto del pie |
| `emailContacto` | Email del pie | No se muestra |
| `metaPixelId` | Píxel de Meta | No se carga ningún script de Meta |
| `videoHero` / `videoPortada` | Video del hero (YouTube, Vimeo o .mp4) y su portada | Se muestra el mock de la cotizadora |
| `capturaCaso` | Imagen del Administrador de anuncios (sección 04) | El bloque no existe |
| `precioContinuidad` | Precio en la FAQ "¿Qué pasa si cancelo?" | Se quita esa frase |
| `cupos` | `[{ ciudad: "Medellín", disponibles: 4 }]`, **solo datos reales** | La franja de cupos no se muestra |
| `terminosUrl` / `privacidadUrl` | Links legales | El link no se muestra |
| `prestador` | Datos legales del pie | Se ve `[PENDIENTE]` |

Los datos del caso (sección 04) están dos veces en `index.html`: en la tabla y en el gráfico (`style="--v:…"`, `data-valor` y `aria-label`). Si cambian, hay que actualizar ambos.

El precio (USD 210 / 150), la pauta (USD 1.000) y la cuenta de 1.210 están en el **copy**, no en `config.js`. Si cambian, hay que tocar `index.html` (texto y tabla de la sección 07) y las constantes de `assets/js/main.js` (`COSTO_MENSUAL`, `VENTAS_OBJETIVO`, `UTILIDAD_MINIMA`).

## Formulario → GoHighLevel

El formulario hace un `POST` JSON a `webhookUrl` con un tiempo máximo de 10 segundos. El payload trae:

- Todos los campos: `nombre`, `whatsapp` (E.164, ej. `+573001234567`), `tienda`, `instagram` (sin @), `ciudad`, `iphone_principal`, `pauta_actual`, `suma_1000`, `utilidad`, `graba`, `decisor`, `privacidad`.
- `califica` (true/false) y `motivo_no_califica`: lista con `iphone_no_es_principal`, `no_puede_sumar_1000` y/o `utilidad_menor_a_81`.
- `variante_titular` (`"A"`/`"B"`).
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `fbclid`, `ref` (vacíos si no vinieron).
- `pagina`, `enviado_en` (ISO 8601), `user_agent`.
- `event_id`: el mismo ID del evento `Lead` / `AplicacionNoCalifica` del píxel. GHL lo usa para **deduplicar** cuando mande la conversión por la API de conversiones.

Si el envío falla, aparece el botón **"Enviar por WhatsApp"** con las respuestas ya escritas (necesita `whatsappAgencia`).

Después del envío: si califica, va a `agenda.html?nombre=…&whatsapp=…`; si no, a `no-califica.html`. `agenda.html` borra esos datos de la URL antes de cargar el píxel, para no mandarle datos personales a Meta.

## Logo provisorio

`assets/img/logo-mmg.svg` es una **recreación provisoria; reemplazar por el vector oficial cuando exista**. Se calcó del PNG de 70 px: hexágono regular vertical con el degradado azul→gris y "MM" trazado como líneas. Para cambiarlo, basta con reemplazar el archivo (se usa en el encabezado, el pie y el favicon) y regenerar `favicon-32.png`, `apple-touch-icon.png` y `og-image.png`.

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
- [ ] `whatsappAgencia`.
- [ ] `emailContacto`.
- [ ] `metaPixelId`.
- [ ] `videoHero` y, si no es YouTube, `videoPortada`.
- [ ] `precioContinuidad`: USD 60 es una propuesta, a confirmar.
- [ ] `cupos`: solo cuando haya datos reales.
- [ ] `prestador`: nombre, NIF y domicilio.
- [ ] `capturaCaso`: captura del Administrador de anuncios con datos tapados.

**En el contenido y la técnica:**
- [ ] Validar el punto "Si trabaja con una agencia…" de la sección 02 (`data-pendiente="validar-agencias"`).
- [ ] Textos legales de `terminos.html` y `privacidad.html` (revisión del abogado).
- [ ] Banner de consentimiento del píxel: lo define el abogado.
- [ ] URLs absolutas de `og:image`, `twitter:image` y `og:url` cuando haya dominio.
- [ ] Vector oficial del logo.
- [ ] **Probar el webhook real desde el navegador.** Si GHL no responde con encabezados CORS, el navegador bloquea el envío y todo cae al plan B de WhatsApp. No se pudo verificar desde este entorno.
- [ ] Confirmar si el embed del calendario necesita el script de autoajuste de GHL (`form_embed.js`). Hoy el iframe tiene un alto fijo responsive.
- [ ] En el Administrador de eventos de Meta, apagar la "coincidencia avanzada automática" para que el píxel no lea los campos del formulario.
- [ ] Al lanzar: quitar `<meta name="robots" content="noindex, nofollow">` de las 5 páginas.
