# Cuaderno de piano — guía para agregar clases

Este proyecto es el cuaderno de las clases de piano de Joaquín con Quique Yance,
los miércoles. El flujo real es: **él cuenta qué vieron en clase, Claude lo
convierte en contenido**. Nadie escribe markdown a mano.

## La regla de oro

Agregar una clase = **crear un archivo de datos y sumarlo al índice**. Nunca hay
que tocar componentes para publicar una clase nueva. Si algo que pasó en clase
no entra en ningún bloque existente, ahí sí se agrega un tipo de bloque nuevo
(ver más abajo), pero primero conviene intentar con los que ya están.

## Cómo agregar la clase N

1. Crear `content/lessons/clase-NN.ts` (dos dígitos), copiando la forma de
   `clase-01.ts`.
2. Sumarlo a `content/index.ts`: importar y agregar al array `LESSONS`.
3. `npm run build` para confirmar que compila.

Eso es todo. La home, la línea de tiempo, los contadores, la sala de práctica y
la navegación entre clases se actualizan solas.

### La fecha

Es el miércoles de esa clase, en ISO (`"2026-08-12"`). La racha de la home
cuenta miércoles consecutivos, así que la fecha importa: si hay un salto de más
de 7 días, la racha se corta (y está bien que se corte, es información real).

## Los bloques

Están definidos en `content/types.ts`. Cada uno se renderiza en
`components/Blocks.tsx`.

| Bloque | Para qué | Genera |
|---|---|---|
| `prose` | Contexto, cómo venía la mano, qué se habló | Texto. `*así*` resalta en amarillo |
| `correction` | Algo que el profe corrigió | Tarjeta con "lo que hacía" / "lo que va" + la analogía destacada |
| `quote` | Una frase del profe que quedó picando | Cita grande |
| `chord-lab` | Un set de acordes | Teclado interactivo con selector, sonido y modo dictado |
| `exercise` | El ejercicio de posiciones que se desplaza | Reproductor con variantes, metrónomo y teclado animado |
| `hands` | Un reparto de notas entre las dos manos | Teclado con las dos manos en colores + intercambio automático |
| `nomenclature` | Cifrado inglés | Tablita de ejemplos + quiz |

También hay dos campos sueltos por clase:

- `homework`: qué practicar hasta el próximo miércoles.
- `openQuestions`: lo que quedó dudoso. **Usarlo sin culpa.** Si de lo que
  contó Joaquín no se entiende del todo cómo era un ejercicio, se hace la mejor
  interpretación posible, se implementa, y se anota la duda acá para preguntarle
  al profe. Es mucho mejor que inventar en silencio.

## Acordes: no se hardcodean

Todos los acordes salen de `CHORD_QUALITIES` en `lib/music.ts`, que guarda la
**receta en semitonos** tal como la enseña el profe (mayor = `[4, 3]`).
Si en una clase aparece un acorde nuevo:

1. Agregar la entrada a `CHORD_QUALITIES` con su `stack`, su `suffix` en
   cifrado inglés, una línea de `vibe` y el número de clase en `learnedIn`.
2. Referenciar su `id` desde el bloque `chord-lab` de esa clase.

El teclado, el dictado, el quiz, el identificador de acordes y la página
`/acordes` lo levantan solos. No hay que tocar nada más.

## El micrófono

El bloque `exercise` tiene un modo "escuchame tocar": abre el micrófono, detecta
qué nota estás tocando y avanza sola cuando acertás. Vive en tres archivos:

- `lib/pitch.ts` — el detector (método de McLeod: autocorrelación normalizada).
  Escrito a mano, sin dependencias. **Sirve para una nota por vez.**
- `lib/useMicPitch.ts` — el hook que abre el micrófono y avisa nota por nota.
  Corre a 60 lecturas por segundo pero refresca React mucho menos seguido, a
  propósito: arriba hay un teclado SVG que no conviene redibujar tan rápido.
- El panel de la UI está al final de `components/ExerciseRunner.tsx`.

Reglas que ya están resueltas y conviene no romper:

- Se compara **por nota, no por octava**. El ejercicio es una figura de dedos y
  da igual dónde lo toques.
- Escuchar y reproducir son excluyentes, si no el micrófono se oye a sí mismo.
- `echoCancellation`, `noiseSuppression` y `autoGainControl` van en `false`:
  están pensados para voz y se comen las notas que se apagan.
- Hacen falta 3 lecturas iguales seguidas para dar una nota por buena. Con
  menos, el golpe del ataque (que es ruido de banda ancha) mete notas fantasma.

`npm run test:pitch` prueba el detector contra tonos sintéticos con armónicos,
de Do2 a Do6. Correlo si tocás `lib/pitch.ts`: el modo en que falla un detector
de altura es contestar la octava de arriba, y eso se ve enseguida ahí.

Pero los tonos sintéticos sólo dicen si el algoritmo está bien, no si los
umbrales sirven para un piano de verdad grabado con un celular. Para eso está
`npm run escuchar -- grabacion.wav`, que pasa una grabación por el detector y
lista tramo por tramo qué escuchó, con claridad y volumen, más las notas que la
app habría registrado. Acepta `--clarity` y `--rms` para probar umbrales sin
tocar el código: la forma de calibrar es correrlo con distintos valores sobre
una grabación donde se sabe qué se tocó.

**Los acordes no se pueden escuchar todavía.** Detectar varias notas a la vez es
otro problema (análisis espectral, no autocorrelación) y no está hecho.

## Convenciones

- **Todo en castellano rioplatense**, incluidos los nombres de variables de
  dominio (`izquierda`, `acordes`, `siguiente`). El código de infraestructura
  puede quedar en inglés donde ya lo está.
- **Notas en MIDI**: Do central (C4) = 60. Do3 = 48, Do2 = 36.
- **Nada de assets externos**: el piano es SVG y el sonido son osciladores de
  WebAudio. Sin imágenes que bajar, sin samples. Si alguna vez hace falta una
  ilustración, generarla y guardarla en `public/`, nunca linkear a un CDN.
- **Todo estático**: no hay base de datos ni CMS. Cada clase es un commit, cada
  commit es un deploy. Ese es el "incremental" del proyecto.
- El puntaje del quiz vive en memoria y se pierde al recargar. Es a propósito:
  es un juguete de práctica, no un boletín.

## Comandos

```bash
npm run dev        # desarrollo
npm run build      # build de producción (falla si hay error de tipos)
npm run typecheck  # sólo tipos
```
