# Documentación — Diario de trabajo

Diario de trabajo de la landing de **ICTC** (Marketing Masters Group). Registra qué se hizo, cuándo, por qué y qué quedó pendiente, en orden cronológico.

- El **README** explica cómo está armado el sitio y cómo se usa.
- **CLAUDE.md** tiene las reglas que no se rompen.
- Este archivo cuenta **la historia**: decisiones, cambios, pedidos de Jared y aprendizajes.

## Cómo se usa

- Cada sesión de trabajo agrega una entrada **al final** del registro. Las entradas viejas no se editan; si algo cambió, se aclara en una entrada nueva.
- Fechas en formato `AAAA-MM-DD`. Horas en UTC si se anotan.
- Cada entrada referencia los commits que la respaldan (hash corto).
- Las decisiones se anotan con su motivo. Si la pidió Jared, se dice.
- Lo que queda abierto va en "Pendientes" de la entrada y, si es duradero, también en la lista de pendientes del README.

### Plantilla

```markdown
### AAAA-MM-DD — Título corto

**Commits:** `abc1234`
**Pedido por:** Jared / iniciativa propia

**Qué se hizo**
- …

**Decisiones y por qué**
- …

**Verificación**
- …

**Pendientes**
- [ ] …
```

---

## Registro

### 2026-10-14 — Beta: sitio estático completo

**Commits:** `94d977b` (15:42 UTC)
**Pedido por:** Jared (brief de la landing)

**Qué se hizo**
- Sitio estático en HTML, CSS y JS vanilla con ES modules. Sin build, sin npm en producción y sin frameworks; la única dependencia externa es Google Fonts.
- `index.html` con las secciones 01 a 10 y el formulario, con el copy literal del brief, en "usted" y con formato numérico colombiano:
  - 01 Hero (titular A/B).
  - 02 "¿Le pasa esto con su pauta?"
  - 03 "La mayoría mide mensajes. I.C.T. mide ventas." y el diagrama I.C.T.
  - 04 El caso: una tienda de iPhone en Argentina.
  - 05 "Qué recibe su tienda".
  - 06 "No trabajamos con cualquier tienda".
  - 07 Inversión y calculadora.
  - 08 Garantía del día 10.
  - 09 Formulario `#aplicar` ("Máximo 5 tiendas por ciudad").
  - 10 Preguntas frecuentes.
- Páginas secundarias: `agenda.html`, `no-califica.html`, `terminos.html` y `privacidad.html`.
- `config.js` como única fuente de configuración: webhook, calendario, WhatsApp, píxel, video, cupos y datos legales. Si un campo está vacío, el bloque se oculta o muestra un placeholder.
- Encabezado y pie desde una sola plantilla en `assets/js/comun.js`.
- Formulario de aplicación:
  - En pasos en móvil y completo en escritorio.
  - Calificación en el cliente (`form.js` → `calificar`).
  - `POST` JSON al webhook de GHL con timeout de 10 s.
  - Plan B por WhatsApp si el envío falla.
  - Payload con UTM, `fbclid`, `ref`, `variante_titular` y `event_id`.
- Titular A/B por `?h=`, sin parpadeo.
- Calculadora de rentabilidad que coincide con la tabla estática.
- Video del hero con carga diferida, o mock de la cotizadora si no hay video.
- Píxel de Meta opcional (`PageView`, `ViewContent`, `Lead`, `AplicacionNoCalifica`), sin datos personales.
- Identidad MMG: tokens de color con reglas de contraste AA, hexágono como sistema visual, isotipo SVG provisorio, `og-image` y favicons.
- `tests/verificar.cjs`: 27 pruebas con Playwright.
- `README.md` y `CLAUDE.md` con reglas, pendientes y cómo verificar.

**Decisiones y por qué**
- **Todo configurable en `config.js`:** que nadie tenga que tocar el HTML para cambiar links o datos, y que nunca se inventen datos (lo que falta queda vacío o `[PENDIENTE]`).
- **Calificación en el cliente:** permite redirigir al instante a `agenda.html` o a `no-califica.html`. No califica si el iPhone no es lo principal, si no puede sumar USD 1.000 o si la utilidad es menor a USD 81. "No sé" en utilidad no descalifica.
- **`event_id` compartido** entre el píxel y el payload, para que GHL deduplique cuando mande la conversión por la API de conversiones.
- **Sin datos personales hacia Meta:** `agenda.html` limpia nombre y teléfono de la URL antes de cargar el píxel.
- **Formato numérico propio** (`formatearNumero` / `formatearUSD`) en lugar de `Intl`, que en español puede no agrupar los números de 4 cifras.
- **Logo provisorio:** `logo-mmg.svg` es una recreación del PNG de 70 px hasta tener el vector oficial.

**Verificación**
- Suite de 27 pruebas en verde: sin scroll horizontal (320–1440 px), sin errores de consola, casos a/b/c del formulario, titular A/B, calculadora contra la tabla, configuración vacía y con datos, copy prohibido y contraste AA.

**Pendientes**
- Ver la lista completa en el README (webhook, calendario, píxel, WhatsApp, video, datos legales, logo oficial, etc.).

---

### 2026-10-14 — Capa premium: hero oscuro, interacciones y gráfico del caso

**Commits:** `1ec63c5` (20:18 UTC)
**Pedido por:** Jared ("premium, profesional e interactivo")

**Qué se hizo**
- Hero oscuro con brillos de marca y patrón de hexágonos al 5 %. El titular lleva un resalte en degradado y la escena se inclina hasta 6° con el mouse.
- Demo de la cotizadora que se reproduce una vez al cargar. Las tarjetas flotantes "Anuncio", "WhatsApp" y "Venta registrada" son rótulos del diagrama, no copy nuevo.
- Encabezado transparente sobre el hero que pasa a sólido al hacer scroll, con barra de progreso de lectura.
- Tarjetas con foco de luz que sigue al puntero y leve elevación. Botones con flecha y brillo.
- Diagrama 03 que se dibuja en secuencia; la flecha de vuelta se mueve lento.
- Gráfico de columnas del caso en HTML/CSS: forma de énfasis (septiembre en azul, el resto en gris de contexto con 3,63:1), un solo rótulo directo (42,00), la línea "Total 26,17" y tooltip al pasar el mouse. La tabla de al lado es la vista accesible.
- Línea de tiempo que se enciende al pasar.
- Tarjeta de precio oscura. Calculadora con deslizador (40 a 250) sincronizado con el campo, y medidor exacto de 15 hexágonos (uno por venta).
- Sello del día 10, FAQ con apertura suave, cierre con brillo lento y pie oscuro.

**Decisiones y por qué**
- **Sin librerías de animación:** todo en CSS y JS propios, para no sumar peso.
- **`prefers-reduced-motion`:** sin movimiento (ni apariciones, ni bucles, ni inclinación), pero se conserva el feedback de color y sombra. Windows suele traerlo activado, así que esa versión quieta tiene que verse completa.
- **`:hover` solo dentro de `@media (hover: hover)`**, para que en el celular no queden estados pegados.
- **Robustez:** cada inicialización corre dentro de `seguro(fn, nombre)` (si una falla, siguen las demás) y `.revelar` muestra todo a los 6 s como red de seguridad.
- **Brillos y patrones en `::before` / `::after`:** así no bajan el contraste del texto y la auditoría puede medirlo.
- **Gráfico con datos duplicados en la tabla:** si cambian los datos del caso, hay que actualizar a la vez la tabla, los `--v`, los `data-valor` y el `aria-label`.

**Arreglos**
- El brillo del hero ya no suma CLS al cargar las fuentes.
- El degradado del encabezado ya no dibuja una línea en el borde.

**Verificación**
- 29 pruebas en total. La auditoría de contraste ahora entiende el texto en degradado y los tramos transparentes.
- Peso propio: unos 160 KB sin comprimir y unos 39 KB transferidos con gzip (el brief pedía menos de 150 KB sin fuentes ni video).

---

### 2026-10-14 — Copy: sin limitar el servicio a Colombia

**Commits:** `0b2ee4a` (21:56 UTC)
**Pedido por:** Jared

**Qué se hizo**
- Hero: "Para tiendas de iPhone que ya pautan en Meta".
- Sección 06: "Tiene una tienda de iPhone y el iPhone es lo que más vende."
- README y CLAUDE.md sin la restricción geográfica; se agregó la regla 11 en CLAUDE.md.

**Decisiones y por qué**
- El servicio no se limita a Colombia: nada de "en Colombia" ni "solo trabajamos en Colombia".
- Se mantienen el español de Colombia, el formato numérico, "(hora Colombia)" en la agenda y el +57 por defecto en el WhatsApp.

---

### 2026-10-14 — Hero: imagen real del iPhone en la cotizadora

**Commits:** `c6dedbc` (22:09 UTC)
**Pedido por:** Jared (envió la imagen)

**Qué se hizo**
- Se reemplazó la silueta genérica del teléfono por la imagen enviada por Jared, con la manzana retirada por retoque.
- `<picture>` con WebP (10,6 KB) y PNG de respaldo (87 KB); el navegador descarga solo uno.

**Decisiones y por qué**
- Regla 6 de CLAUDE.md: sin logo de Apple, sin imágenes oficiales de Apple y sin la manzana.
- WebP primero para no pasarse del presupuesto de peso.

---

### 2026-10-24 — Se crea este diario de trabajo

**Pedido por:** Jared

**Qué se hizo**
- Se creó `documentacion.md` como diario de trabajo del repositorio, con la plantilla de entradas y el registro reconstruido de la construcción de la landing a partir del historial de commits.
- Se agregó en CLAUDE.md y en el README la referencia a este archivo, para que cada sesión registre su trabajo aquí.

**Estado de la landing a esta fecha**
- Beta funcional y publicable, con `noindex` en las 5 páginas.
- `config.js` sin datos reales todavía: webhook, calendario, WhatsApp, email, píxel, video, cupos y datos legales siguen `[PENDIENTE]`. El sitio funciona en modo desarrollo (el formulario muestra el payload en la consola).
- Pendientes abiertos: los de la lista del README.

---

### 2026-10-24 — El producto pasa a llamarse ICTC, con logotipo nuevo

**Commits:** `592ffa1`
**Pedido por:** Jared

**Qué se hizo**
- Logotipo de solo texto "iCTC" en dos archivos, con el contenido entregado por Jared y sin redibujar:
  - `assets/img/ictc-logotipo.svg`: para fondos claros ("CTC" en `#2D3748`).
  - `assets/img/ictc-logotipo-fondo-oscuro.svg`: para fondos oscuros ("CTC" en blanco).
- Encabezado (`comun.js` → `renderEncabezado`): el isotipo y el nombre de MMG se reemplazan por el logotipo, en línea, con `aria-label="ICTC, inicio"`. Se borró el CSS de `.marca__isotipo` y `.marca__nombre`.
- Nombre del producto cambiado a "ICTC" en `<title>` y metadatos (index, agenda y no-califica), texto visible, títulos de los dos diagramas del flujo, mensaje de WhatsApp, título del reproductor, `content_name` de `ViewContent` ("Inversión ICTC"), prefijos de consola, comentarios, `config.js`, README y CLAUDE.md.
- Sección 03: solo cambia el nombre. Se agregó el comentario `[PENDIENTE]` sobre las tarjetas porque falta el texto de la C de Cierre.
- `og-image.png`: el texto de abajo a la derecha pasa a ser el logotipo para fondo oscuro, a la misma altura.
- CLAUDE.md: apartado "Logotipo del producto". README: los dos SVG en la estructura y la C de Cierre en pendientes.

**Decisiones y por qué**
- **Logotipo en línea con `currentColor` en "CTC":** toma el color de `.marca` (blanco sobre el hero, `#2D3748` con el encabezado sólido) sin cambiar de archivo. La "i" lleva un degradado con id propio (`ictc-i-encabezado`) para no chocar con otros SVG.
- **Alto de 28 px en móvil y 32 px desde 768 px:** el ancho sale del viewBox (1550 × 605). El encabezado mantiene su alto (56 px en móvil, 68 px en escritorio).
- **Pie, favicons y apple-touch-icon sin cambios:** el pie es de Marketing Masters Group, que presta el servicio, y el logotipo es demasiado ancho para leerse en 32 px.
- **Sin inventar la C de Cierre:** no se agregó una cuarta tarjeta y se mantiene "los tres tramos" hasta que Jared defina el texto.
- **ids, clases, nombres de archivo y variables (`#ict`, `.tarjetas-ict`, `ICT_URL`) no cambian**, para no romper anclas, estilos ni la suite.
- **og-image retocada, no rehecha:** el script original no está en el repo. Se tapó el texto viejo con el mismo patrón de hexágonos tomado 128 px a la izquierda (dos períodos del patrón), con la corrección del degradado, y se compuso encima el logotipo renderizado a 4x. Se guardó en paleta de 256 colores, como la anterior (unos 128 KB).

**Verificación**
- `tests/verificar.cjs`: 29/29 OK.
- grep del nombre anterior: solo queda en la primera entrada del diario.
- Grep manual de copy prohibido: sin coincidencias.
- Capturas a 360 y 1280 px: "CTC" se ve blanco (`rgb(255, 255, 255)`) sobre el hero y `#2D3748` (`rgb(45, 55, 72)`) con el encabezado sólido. El alto del encabezado no cambió.
- Peso propio (HTML + CSS + JS): de 174.726 a 175.126 bytes (+400) y de 41.750 a 42.248 bytes con gzip.
- **Contraste de la "i" en la og-image:** sobre el fondo de esa esquina (`#2A3F5D`), el extremo azul `#1A73E8` da 2,37:1 y el celeste `#37B1AB` 4,09:1. "CTC" en blanco da 10,67:1. No se cambiaron los colores; se le avisó a Jared.

**Pendientes**
- [ ] Texto de la C de Cierre en la sección 03 (lo define Jared).
- [ ] Decidir si la "i" de la og-image necesita más contraste (fondo más oscuro detrás del logotipo o la versión clara), sin recolorear el logotipo.
- [ ] Al conectar el píxel, tener en cuenta que el `content_name` de `ViewContent` ahora es "Inversión ICTC".
- [ ] Siguen los pendientes del README.

---

### 2026-10-24 — Publicación en GitHub Pages desde la rama de trabajo

**Pedido por:** la persona que administra el sitio en GitHub Pages

**Qué se hizo**
- Se confirmó que el trabajo se hace en la rama `claude/zealous-fermi-rhv2dx`. GitHub Pages se configura para servir esa rama (carpeta `/ (root)`), así los cambios se pueden revisar en línea.
- Se anotó en CLAUDE.md y en el README que cada cambio verificado se sube a esa rama para que se vea en el sitio.

**Decisiones y por qué**
- Pages sirve la rama de trabajo, no `main`, para revisar cada cambio en línea apenas se sube.

**Pendientes**
- [ ] Cuando la beta se apruebe, pasar los cambios a `main` y apuntar Pages a `main`.
