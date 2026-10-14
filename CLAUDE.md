# CLAUDE.md — Landing I.C.T. (Marketing Masters Group)

Guía para las próximas sesiones de Claude Code en este repo. Leer completa antes de tocar nada.

## Qué es

Landing estática (HTML + CSS + JS vanilla con ES modules, **sin build ni npm en producción**, solo Google Fonts como dependencia externa) para vender I.C.T. a dueños de tiendas de iPhone en Colombia. El tráfico es tibio y llega casi todo desde el celular. Hay un solo objetivo y un solo CTA: **"Aplicar a un cupo"**, que lleva al formulario `#aplicar`.

- Toda la configuración está en `config.js`. Nunca se hardcodean links, IDs ni datos legales en el HTML o el JS.
- Encabezado y pie: una sola plantilla en `assets/js/comun.js`.
- Ver el README para la estructura y la lista de pendientes.

## El copy se cambia solo si Jared lo pide, y siempre en "usted"

El texto visible es literal del brief. Se pueden ajustar saltos de línea y jerarquía visual, pero **no** reescribir, resumir, "mejorar" ni agregar frases de venta. Si algo del copy parece mal, se le avisa a Jared; no se corrige por cuenta propia.

## Reglas de contenido (no se rompen)

1. El copy aprobado se usa literal (ver arriba).
2. Trato de "usted" y español de Colombia en todo el texto visible. Nada de voseo ni de "tú". Esto incluye mensajes de error, textos de ayuda y `aria-label`.
3. El caso dice "ventas", nunca "ventas de iPhone", porque no se conoce el mix.
4. Hay un solo caso: una tienda en Argentina. Nunca "nuestros clientes" ni "cientos de tiendas".
5. Las 15 ventas son el objetivo, no una garantía. La garantía siempre va con sus condiciones.
6. Sin logo de Apple, sin imágenes oficiales de Apple, sin la manzana. "iPhone" se usa solo como nombre del producto que venden las tiendas.
7. Sin testimonios, logos de clientes, contadores falsos, temporizadores ni "solo hoy".
8. Números en formato colombiano: punto de miles y coma decimal (USD 6.280, USD 26,17). En JS, usar `formatearNumero` / `formatearUSD` de `assets/js/utils.js`; no usar `Intl`, que en español puede no agrupar los números de 4 cifras.
9. No inventar datos, cifras, testimonios ni logos. Lo que falta se deja como `[PENDIENTE]` visible o vacío en `config.js`.
10. Los cupos por ciudad (`CONFIG.cupos`) solo llevan datos reales. Vacío = la franja no se muestra.

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
- Letra chica gris: `--color-texto-suave` (`#5A6170`), del mismo tamaño que el cuerpo.

**Tipografía:**
- Cuerpo en **Lato** (400, 700, 900 y 400 itálica).
- Títulos con la pila `--font-titulos`: Bahnschrift, Barlow (Google Fonts), Segoe UI, Arial. Es provisoria y se cambia en una sola variable.
- Nunca texto de menos de 14 px.

**Formas:**
- **Hexágono vertical** (`--hexagono`, `clip-path`) como sistema: marco de I/C/T, viñetas celestes de las listas importantes (grises en "no es para usted" y "no incluye"), hitos de la línea de tiempo, números de las condiciones y patrón del hero al 5 %.
- Antetítulos "01)" a "10)" en la fuente de títulos.
- Radios de 12 px en tarjetas y 10 px en botones.
- Sombras frías `rgba(45,55,72,.08)`.
- Foco: outline celeste de 3 px más un anillo `#2D3748`, para cumplir 3:1 en cualquier fondo.

**Estética:** sobria, técnica y basada en datos. Sin emojis en el cuerpo, sin stock de gente, sin parallax ni cursores. Animación: solo fade + 8 px al entrar y transiciones de botones, y nada con `prefers-reduced-motion`.

**Logo:** `assets/img/logo-mmg.svg` es una recreación provisoria del PNG de 70 px. Se reemplaza por el vector oficial cuando exista. El nombre oficial es **Marketing Masters Group** (con S).

## Lógica de calificación (`assets/js/form.js` → `calificar`)

**No califica** si se cumple cualquiera de estas:

| Campo | Valor | `motivo_no_califica` |
|---|---|---|
| `iphone_principal` | "No" | `iphone_no_es_principal` |
| `suma_1000` | "No" | `no_puede_sumar_1000` |
| `utilidad` | "Menos de USD 60" o "USD 60 a 80" | `utilidad_menor_a_81` |

En cualquier otro caso, **califica**. "No sé" en utilidad y "Nadie todavía" en graba **no** descalifican, porque se resuelven en la llamada.

- Califica → `agenda.html?nombre=…&whatsapp=…` y evento `Lead` del píxel.
- No califica → `no-califica.html` y evento personalizado `AplicacionNoCalifica`.

Ambos eventos llevan `eventID` igual al `event_id` del payload. Desde el navegador **nunca** se mandan a Meta nombre ni teléfono.

**Calculadora (sección 07):**
- Ventas para cubrir = `Math.ceil(1210 / U)`.
- Lo que queda = `15 × U − 1210`.
- Aviso si `U < 81`. Solo acepta enteros mayores que 0; "1.200" se lee como 1200.
- La tabla estática y la calculadora deben coincidir para 81, 90, 100, 120 y 150.

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
   - Copy prohibido: tú/vos, "nuestros clientes", la manzana, urgencia falsa, y "ventas de iPhone" en el caso.
   - Contraste AA y nada de texto blanco sobre celeste.
4. Revisión manual rápida:
   ```bash
   grep -rniE "\btú\b|\bvos\b|nuestros clientes|solo hoy" --include=*.html --include=*.js .
   ```
5. Si se cambia el copy de precios, actualizar a la vez el texto, la tabla de la sección 07 y las constantes de `main.js`.
6. Peso objetivo: menos de 150 KB sin fuentes ni video. Lighthouse móvil: 90 o más en rendimiento, accesibilidad y buenas prácticas. El SEO da bajo a propósito mientras esté el `noindex` de la beta.
