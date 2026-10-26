# CLAUDE.md — Landing ICTC (Marketing Master Top)

Guía para las próximas sesiones de Claude Code en este repo. Leer completa antes de tocar nada.

## Qué es

Landing estática (HTML + CSS + JS vanilla con ES modules, **sin build ni npm en producción**, solo Google Fonts como dependencia externa) para vender ICTC a tiendas que venden principalmente iPhone (revendedores oficiales o no oficiales, y tiendas de electrónica). El mercado inicial es **Argentina**; más adelante, el resto de Latinoamérica. El tráfico es tibio y llega casi todo desde el celular. Hay un solo objetivo y un solo CTA: **"Aplicar a un cupo"**, que lleva al formulario `#aplicar`.

- **Marca:** ICTC es un producto de **Marketing Master Top**, la marca personal de Jared Farfán ("El Marketing Master"). Marketing Masters Group es el equipo de Jared, pero **no aparece en el sitio**.
- Subdominio definitivo: `ictc.marketingmaster.top`.

- Toda la configuración está en `config.js`. Nunca se hardcodean links, IDs ni datos legales en el HTML o el JS.
- Encabezado y pie: una sola plantilla en `assets/js/comun.js`.
- Ver el README para la estructura y la lista de pendientes.
- **Publicación:** la versión final 1 está en `main` (2026-10-26, pedido de Jared). GitHub Pages tiene que servir `main`, carpeta `/ (root)`; hasta que se cambie en Settings → Pages, sigue mostrando `claude/zealous-fermi-rhv2dx`. Pages tarda uno o dos minutos en actualizar.
- `documentacion.md` es el diario de trabajo y el **handoff**: al empezar, leer su bloque "Handoff: estado actual"; al terminar cada sesión, reescribir ese bloque y agregar una entrada al final del registro con la plantilla del archivo (qué se hizo, decisiones, verificación, pendientes y commits).

## El copy se cambia solo si Jared lo pide, y siempre con voseo

El texto visible es el aprobado por Jared. Se pueden ajustar saltos de línea y jerarquía visual, pero **no** reescribir, resumir, "mejorar" ni agregar frases de venta. Si algo del copy parece mal, se le avisa a Jared; no se corrige por cuenta propia. Ningún texto nuevo se publica sin su aprobación, salvo que él delegue la decisión de forma explícita (como hizo el 2026-10-24 con la versión para Argentina; ver `documentacion.md`).

## Reglas de contenido (no se rompen)

1. El copy aprobado se usa literal (ver arriba).
2. Español rioplatense con **voseo** en todo el texto visible ("vos tenés", "aplicá", "escribinos"). Esto incluye mensajes de error, textos de ayuda y `aria-label`. Nada de "usted" (singular) ni de tuteo ("tú", "tienes", "puedes"). "Ustedes" sí vale: es el plural en Argentina. Los textos legales van en tercera persona ("la Tienda", "el Prestador"). Esto vale para el código; la versión en español neutro la genera `idioma.js` (regla 15).
3. El caso dice "ventas", nunca "ventas de iPhone", porque no se conoce el mix.
4. Hay un solo caso: una tienda anónima en Argentina. Nunca "nuestros clientes" ni "cientos de tiendas". Ya no se dice "en otro país": el caso es del país donde se lanza.
5. La promesa es **15 ventas de iPhone atribuidas a Meta y registradas en el CRM en 30 días, contados desde el día 0** (el día en que se encienden los anuncios). Es el objetivo, no una garantía; ningún texto puede sugerir lo contrario. Una venta solo de accesorios no cuenta. La garantía siempre va con sus condiciones. En el hero, Jared la escribió así, y va literal: "El objetivo: 15 ventas extra de iPhone en 30 días. Cómo: Aplicando el sistema ICTC."
6. Sin logo de Apple, sin imágenes oficiales de Apple, sin la manzana. "iPhone" se usa solo como nombre del producto que venden las tiendas.
7. Sin testimonios, logos de clientes, contadores falsos, temporizadores ni "solo hoy".
8. Números con punto de miles y coma decimal (USD 6.280, USD 26,17), como se usa en Argentina. En JS, usar `formatearNumero` / `formatearUSD` de `assets/js/utils.js`; no usar `Intl`, que en español puede no agrupar los números de 4 cifras.
9. No inventar datos, cifras, testimonios ni logos. Lo que falta se deja como `[PENDIENTE]` visible o vacío en `config.js`.
10. Los cupos por ciudad (`CONFIG.cupos`) solo llevan datos reales. Vacío = la franja no se muestra.
11. Argentina: `lang="es-AR"`, horarios en hora Argentina (UTC-3) y WhatsApp con prefijo fijo +54 9 en el formulario, sin selector de país. El copy no dice "solo trabajamos en Argentina", porque después se suma el resto de Latinoamérica.
12. No se dice que Marketing Master Hub está basado en GoHighLevel, ni se explica qué recibe la tienda que ya tiene GoHighLevel propio (plan de USD 150). Solo se dice el precio.
13. Cobro: suscripción de **Mercado Pago** con débito automático. Los precios se muestran en USD (210 o 150 por mes), con la nota "Pesificamos el costo al momento de realizar el pago." (pedido de Jared, 2026-10-26). El tipo de cambio que se usa para pesificar no está definido: no se escribe. Nada de Stripe, de "Visa o Mastercard" ni de cobro desde España.
14. El cupo (máximo 5 tiendas por ciudad durante el año de lanzamiento) es un límite que se pone el prestador, **no una exclusividad**.
15. **Español neutro fuera de Argentina** (pedido de Jared, 2026-10-26). El HTML y el JS se escriben **siempre** en rioplatense; `assets/js/idioma.js` pasa los textos a español neutro con tuteo ("tú tienes", "elige", "escríbenos", "para ti", "el dinero") cuando el visitante no está en Argentina.
   - **Cómo detecta:** por la zona horaria del dispositivo (`America/Argentina/*` y sus alias = Argentina). No por IP: el sitio es estático y no hay servidor que la vea; usar un servicio externo de geolocalización mandaría la IP de cada visitante a un tercero.
   - `?es=ar` / `?es=neutro` fuerzan una variante y la sesión la recuerda. `CONFIG.espanolNeutroFueraDeArgentina = false` lo apaga.
   - **Si se agrega texto con voseo o un argentinismo nuevo, hay que sumar su forma neutra al diccionario `PALABRAS` o `FRASES` de `idioma.js`** (con artículo si cambia el género, como "la plata" → "el dinero"). La prueba "Fuera de Argentina" falla si queda voseo en la versión neutra.
   - Solo cambia el idioma. El contenido argentino (hora Argentina, Mercado Pago, pesificación, formulario +54 9, legales) es igual en las dos variantes.

## Producto (resumen; el detalle está en `documentacion.md`, entrada del 2026-10-24)

- **ICTC:** Interrupción, Captura, Tracking y Cierre. La "C" de Cierre es el playbook de cierre de ventas.
- **Entregables:** estructura validada de campañas en Meta y el pedido de anuncios (ángulos y estilos); landing con cotizadora y panel de administración; acceso a Marketing Master Hub (CRM, conversaciones, dashboards y contactos, usuarios ilimitados); tracking por servidor con la API de Conversiones; playbook de cierre; mantenimiento de hasta 4 h por mes, que incluye los guiones de los anuncios. Ya **no** hay "5 sesiones de capacitación", reporte mensual ni actualización de precios de la cotizadora (la tienda la autogestiona).
- **Onboarding:** hasta 10 h, unas 2 h por día durante 5 días, entre el pago y el día 0. La tienda graba los anuncios apenas recibe los guiones.
- **Precio:** USD 210 por mes, o USD 150 si la tienda ya tiene GoHighLevel propio. Más USD 1.000 por mes de pauta nueva que la tienda paga directo a Meta, y los costos de terceros (API de WhatsApp). Sin permanencia: la cancelación vale al final del mes pagado.
- **Garantía del día 10:** si no hay al menos 1 venta de iPhone o 30 conversaciones calificadas (llegó por la cotizadora con un modelo elegido, vio el precio y lo aprobó), la tienda **elige**: reembolso de la cuota del primer mes y fin de la relación, o seguir sin reembolso. Condiciones: onboarding completo; USD 1.000 por mes activos desde el día 0; responder en 10 minutos o menos en horario comercial; registrar cada venta en el CRM; no alterar la estructura validada de campañas; usar la cotizadora, el CRM y el playbook como se explicaron. Se verifica con una llamada, el historial de cambios de Meta, el uso del CRM y las conversaciones en el Hub.
- **Prestador:** Jared Ezequiel Farfán Borges, monotributista (factura C), CUIT y domicilio en `config.js` (`CONFIG.prestador`). El pie y las páginas legales leen esos datos de ahí (`data-prestador`); no se escriben en el HTML.

## Identidad visual (resumen)

**Colores** (variables en `:root` de `styles.css`):

| Token | Valor | Uso |
|---|---|---|
| `--mmg-azul` | `#1A73E8` | Primario: botón principal, acentos |
| `--mmg-gris` | `#4A4A4A` | Primario: texto del cuerpo |
| `--mmg-azul-2` | `#2D3748` | Títulos, fondos oscuros |
| `--mmg-celeste` | `#37B1AB` | Solo acentos, íconos, bordes y viñetas |
| `--mmg-fondo-suave` | `#F5F7FA` | Fondos alternos |

Degradados:
- `--mmg-grad-logo`: azul → gris, vertical, igual al isotipo.
- `--mmg-grad-oscuro`: azul → `#2D3748`. Sirve para fondos con texto blanco.
- `--mmg-grad-acento`: azul → celeste. Solo para bordes y detalles, **nunca** de fondo con texto.

**Contraste** (WCAG 2.x, AA):
- Blanco sobre `#2D3748`: 11,99:1. Blanco sobre `#4A4A4A`: 8,86:1. Libres.
- Blanco sobre `#1A73E8`: 4,51:1. Solo en negrita o 18 px o más.
- **Nunca texto blanco sobre celeste** (2,61:1). Texto sobre celeste: `#2D3748` (4,59:1).
- **Celeste como texto sobre blanco también falla** (2,61:1). Para texto en tono celeste sobre fondos claros, usar `--mmg-celeste-texto` (`#247571`: 5,44:1 sobre blanco y 5,07:1 sobre fondo suave). El celeste puro como texto solo va sobre `#2D3748` (4,59:1).
- Azul `#1A73E8` como texto sobre `#F5F7FA`: 4,2:1. Solo vale para texto grande.
- Sobre los fondos oscuros (hero, franja, pie: `--oscuro-1/2/3`, de `#141B27` a `#232E40`) el texto va en blanco, `--texto-sobre-oscuro` (`#CBD5E0`) o `--texto-suave-sobre-oscuro` (`#A9B4C4`). Los acentos van en `--mmg-azul-claro` (`#8FBEFF`) y `--mmg-celeste-claro` (`#6FD1CB`), que son tintes aclarados de la marca con 5,5:1 o más.
- Los brillos y patrones decorativos van en `::before` / `::after`, nunca en el fondo del elemento que tiene texto. Así no bajan el contraste y la auditoría los puede medir.
- Letra chica gris: `--color-texto-suave` (`#5A6170`), del mismo tamaño que el cuerpo.

**Tipografía:**
- Cuerpo en **Lato** (400, 700, 900 y 400 itálica).
- Títulos con la pila `--font-titulos`: Bahnschrift, Barlow (Google Fonts), Segoe UI, Arial. Es provisoria y se cambia en una sola variable.
- Nunca texto de menos de 14 px.

**Formas:**
- **Hexágono vertical** (`--hexagono`, `clip-path`) como sistema: marco de I/C/T/C, viñetas celestes de las listas importantes (grises en "no es para vos" y "no incluye"), hitos de la línea de tiempo, números de las condiciones y patrón del hero al 5 %.
- Listas con ícono (`.lista-hex--iconos`, secciones 02, 03 y 06): cada punto lleva un hexágono con el degradado del logo y un ícono blanco de trazo (SVG en línea, decorativo, `aria-hidden`), y las frases clave en negrita. La negrita no cambia el copy.
- Antetítulos "01)" a "11)" en la fuente de títulos. Si se agrega o se quita una sección, se renumeran todas las siguientes (en el HTML y en los comentarios del CSS).
- Línea de tiempo del onboarding: cada hito hexagonal lleva el número del paso ("01" a "05") con un contador de CSS.
- `.seccion--continua`: sin espacio arriba, para una sección que sigue a otra del mismo fondo y continúa su tema (la 03 después de la 02).
- Radios de 12 px en tarjetas y 10 px en botones.
- Sombras frías `rgba(45,55,72,.08)`.
- Foco: outline celeste de 3 px más un anillo `#2D3748`, para cumplir 3:1 en cualquier fondo.

**Estética:** premium, sobria, técnica y basada en datos. Sin emojis en el cuerpo, sin stock de gente, sin parallax, sin cursores personalizados, sin librerías de animación y sin pantalla de carga.

**Interacciones aprobadas** (pedido de Jared: "premium, profesional e interactivo"):
- Hero oscuro con brillos de marca y una demo de la cotizadora que se reproduce una vez al cargar. Las tarjetas flotantes son "Anuncio", "WhatsApp" y "Venta registrada": rótulos del diagrama, no copy nuevo.
- Escena del hero que se inclina hasta 6° con el mouse.
- Encabezado transparente sobre el hero que se vuelve sólido al hacer scroll, con barra de progreso.
- Tarjetas `.tarjeta--foco` con un foco de luz que sigue al puntero y una leve elevación.
- Diagrama de la sección 04 que se dibuja en orden; la flecha de vuelta se mueve lento.
- Gráfico del caso con barras que crecen.
- Línea de tiempo que se enciende al pasar.
- Deslizador y medidor de 15 hexágonos en la calculadora.
- Sello del día 10, FAQ con apertura suave, y listas que aparecen escalonadas.

**Política de `prefers-reduced-motion`:** sin movimiento (ni apariciones, ni bucles, ni inclinación, ni desplazamientos al pasar el mouse), pero se conservan los cambios de color y sombra como respuesta. Ojo: Windows suele traerlo activado, así que esos usuarios ven la versión quieta, completa y visible. Todo el `:hover` va dentro de `@media (hover: hover)`. Los movimientos al pasar el mouse van además dentro de `(prefers-reduced-motion: no-preference)`.

**Robustez:**
- Cada inicialización corre dentro de `seguro(fn, nombre)`: si falla una, siguen las demás.
- `.revelar` tiene una red de seguridad: a los 6 s todo se muestra.
- La clase `.animar` la pone el JS, así que sin JS nada queda oculto.

**Logo de Marketing Master Top:** el hexágono "MM" de `assets/img/logo-mmg.svg` (el nombre del archivo quedó de antes). Es una recreación provisoria del PNG de 70 px; se reemplaza por el vector oficial cuando exista. Va en el pie y en la imagen para compartir.

**Logotipo del producto** ("iCTC", solo texto):
- `assets/img/ictc-logotipo.svg`: para fondos claros ("CTC" en `#2D3748`).
- `assets/img/ictc-logotipo-fondo-oscuro.svg`: para fondos oscuros ("CTC" en blanco).
- En el encabezado va en línea, desde `comun.js`, con "CTC" en `currentColor`: toma el color de `.marca` (blanco sobre el hero y `#2D3748` con el encabezado sólido). Alto de 28 px en móvil y 32 px desde 768 px.
- Colores: la "i" en degradado `#1A73E8` → `#37B1AB`; "CTC" en `#2D3748` o en blanco.
- No se redibuja ni se recolorea.
- El favicon (`ictc-favicon.svg`, `favicon-32.png`) y el apple-touch-icon son la "i" del logotipo, con su degradado. El pie lleva el isotipo y el nombre de Marketing Master Top.
- En los textos, el nombre del producto se escribe **"ICTC"**, en mayúsculas y sin puntos; "iCTC" es solo la forma del logotipo.

## Lógica de calificación (`assets/js/form.js` → `calificar`)

**No califica** si se cumple cualquiera de estas:

| Campo | Valor | `motivo_no_califica` |
|---|---|---|
| `iphone_principal` | "No" | `iphone_no_es_principal` |
| `suma_1000` | "No" | `no_puede_sumar_1000` |
| `utilidad` | "Menos de USD 60" o "USD 60 a 80" | `utilidad_menor_a_81` |

En cualquier otro caso, **califica**. "No sé" en utilidad y "Nadie todavía" en graba **no** descalifican, porque se resuelven en la llamada. Los anuncios activos en Meta y el Instagram los revisa el equipo antes de la llamada (biblioteca de anuncios); el formulario no los usa para calificar.

**WhatsApp (`normalizarCelularArgentino`):** se guarda como `+549` + código de área sin 0 + número sin 15 (10 dígitos, el primero de 1 a 3). Acepta 54, 9 o 0 adelante. Si quedan 12 dígitos con un 15 después del código de área, pide sacarlo en vez de adivinar.

- Califica → `agenda.html?nombre=…&whatsapp=…` y evento `Lead` del píxel.
- No califica → `no-califica.html` y evento personalizado `AplicacionNoCalifica`.

Ambos eventos llevan `eventID` igual al `event_id` del payload. Desde el navegador **nunca** se mandan a Meta nombre ni teléfono.

**Gráfico del caso (sección 05):**
- Es HTML/CSS en `index.html`: cada barra lleva su valor en `style="--v:…"`, con escala fija de 0 a 45.
- Forma "énfasis": septiembre en azul, el resto en `--barra-contexto`, y un solo rótulo directo (42,00) más la línea "Total 26,17".
- La tabla de al lado es la vista accesible.
- **Si cambian los datos del caso, hay que actualizar a la vez la tabla, los `--v`, los `data-valor` y el `aria-label` del gráfico.**

**Calculadora (sección 08):**
- Ventas para cubrir = `Math.ceil(1210 / U)`.
- Lo que queda = `15 × U − 1210`.
- Aviso si `U < 81`. Solo acepta enteros mayores que 0; "1.200" se lee como 1200.
- La tabla estática y la calculadora deben coincidir para 81, 90, 100, 120 y 150.
- El deslizador (de 40 a 250) y el campo se sincronizan en los dos sentidos. El deslizador arranca "sin valor" hasta que se usa.
- El medidor tiene 15 hexágonos, uno por venta. La parte azul de cada hexágono es `1210 / U − i` (fracción exacta de lo que cubre el costo) y el resto, celeste, es lo que queda.

## Cómo verificar antes de cada commit

1. Levantar el servidor y correr la suite (necesita Playwright y Chromium en la máquina):
   ```bash
   python3 -m http.server 8080 &
   NODE_PATH="$(npm root -g)" node tests/verificar.cjs            # todas
   ICT_SOLO="Calculadora|c\)" NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # solo algunas
   ICT_CAPTURAS=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs              # + capturas en tests/capturas/
   ```
   Si la red sale por un proxy, exportar `HTTPS_PROXY`: el script se lo pasa a Chromium para cargar Google Fonts.
2. **Mirar las capturas** a 360×800, 768×1024 y 1440×900, en especial el hero, la tabla del caso en móvil, el formulario y el pie.
3. La suite ya cubre:
   - Sin scroll horizontal (320–1440 px) y sin errores en la consola.
   - Un `h1` por página.
   - Formulario: casos a, b y c, validación y foco al primer error.
   - Payload con UTM y `variante_titular`.
   - Titular A/B.
   - Calculadora contra la tabla, incluido el borde U = 80.
   - Configuración vacía y con datos: cupos, video, píxel, webhook OK y caído, calendario.
   - Botón fijo en móvil.
   - Copy prohibido: "usted" y tuteo, "nuestros clientes", la manzana, urgencia falsa, y "ventas de iPhone" en el caso.
   - Contraste AA y nada de texto blanco sobre celeste.
   - Deslizador y medidor exactos.
   - Encabezado transparente que pasa a sólido, e inclinación desactivada con reduced-motion.
4. Revisión manual rápida:
   ```bash
   grep -rniE "\busted\b|\btú\b|nuestros clientes|solo hoy|stripe|colombia" --include=*.html --include=*.js .
   ```
5. Si se cambia el copy de precios, actualizar a la vez el texto, la tabla de la sección 08 y las constantes de `main.js`.
6. **Peso:** el brief pedía menos de 150 KB sin fuentes ni video.
   - Lo propio de las 5 páginas (HTML, CSS y JS) pesa unos 198 KB sin comprimir y unos 48 KB con gzip (medido el 2026-10-26); los borradores legales suman unos 14 KB.
   - No sumar peso sin necesidad; si se agrega algo, medirlo.
7. **Lighthouse móvil:** 90 o más en rendimiento, accesibilidad y buenas prácticas.
   - Mide con un servidor que comprima (`npx serve .`), no con `python3 -m http.server`.
   - En este tipo de contenedor el resultado varía entre corridas; correrlo 3 veces.
   - El SEO da bajo a propósito mientras esté el `noindex` de la beta.
