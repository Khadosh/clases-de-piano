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
| `section` | Partir la clase en temas | Título grande + entrada en el índice de la clase |
| `prose` | Contexto, cómo venía la mano, qué se habló | Texto. `*así*` resalta en amarillo |
| `correction` | Algo que el profe corrigió | Tarjeta con "lo que hacía" / "lo que va" + la analogía destacada |
| `quote` | Una frase del profe que quedó picando | Cita grande |
| `chord-lab` | Un set de acordes | Teclado con fundamental, receta e inversión, sonido y dictado |
| `semitonos` | Por qué mi♯ es fa | Octava de Do con las distancias y un botón para reescribirlas |
| `exercise` | El ejercicio de posiciones que se desplaza | Reproductor con variantes, metrónomo, teclado animado y micrófono |
| `hands` | Un reparto de notas entre las dos manos | Teclado con las dos manos en colores + intercambio automático |
| `nomenclature` | Cifrado inglés | Tablita de ejemplos + quiz |

**Usá `section`.** Una clase con más de tres o cuatro bloques sin secciones se
lee como un chorizo. El índice de arriba de la clase se arma solo a partir de
ellas, así que dividir es gratis.

**Las citas son citas.** El bloque `quote` lleva el nombre del profe abajo, así
que ahí va sólo lo que dijo de verdad. Si el concepto está bien pero la frase
es una reconstrucción, va como `prose` sin atribuir a nadie. Ya pasó una vez de
inventar una cita que sonaba a él y no era suya.

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

El teclado, el dictado, las inversiones, el quiz, el identificador de acordes y
la página `/acordes` lo levantan solos. No hay que tocar nada más — incluidas
las inversiones, que se calculan de la cantidad de notas del `stack`.

**Armar un acorde y girarlo son la misma operación**, así que son un solo
bloque (`chord-lab` con `inversiones: true`) y no dos. Se intentó tenerlos
separados y eran dos componentes casi idénticos. Lo que sí conviene separar es
el *texto*: primero la receta, después "y además se puede girar".

## El ejercicio de posiciones

Vive en `buildExercise` y `buildExerciseCompleto`, en `lib/music.ts`. Dos cosas
que no son obvias y cuesta reconstruir:

- **Nunca vuelve al dedo que arrancó.** La última nota de la bajada de cada
  posición *ya es* la nota nueva del dedo que guía: cierre y desplazamiento son
  la misma nota, y por eso el ciclo no se corta.
- **El pivote de arriba no mueve la mano.** Al terminar la subida, el dedo 1
  está en la nota más aguda y la bajada arranca de esa misma nota. Lo único que
  pasa es que el hueco cambia de lado (`gap` pasa de `abajo` a `arriba`), o sea
  que los dedos del medio se reacomodan y el que saltea pasa a ser el agudo.

Por eso cada paso guarda su `home` y su `gap` en vez de un número de posición:
en el ejercicio completo el `gap` cambia a mitad de camino, y las cinco teclas
apoyadas (`manoEn`) no se pueden deducir del índice.

## El sonido

Vive en `lib/audio.ts` y tiene tres decisiones que no son obvias:

- **Hay un solo AudioContext y lo creamos nosotros.** Después se le pide a Tone
  que use ése (`Tone.setContext`). Si Tone arma el suyo quedan dos contextos
  compitiendo por el audio del sistema y en algunos browsers uno queda mudo —
  y el que quedaría mudo es el del micrófono.
- **Tone se importa tarde**, con `await import("tone")` adentro de `wakeAudio()`.
  Son 59 KB comprimidos y no hacen falta hasta que algo suena; como `wakeAudio()`
  siempre corre desde un gesto del usuario, baja junto con los samples. La
  página carga sin nada de eso.
- **Los osciladores no son un fallback de emergencia.** Son lo que suena en el
  primer segundo, mientras bajan los samples, y también si algún día no están.
  La app nunca queda muda.

El piano son 17 samples del Salamander Grand Piano, uno cada tres semitonos, en
`public/piano/` (ver `CREDITOS.md` ahí: es CC-BY y hay que atribuirlo, por eso
está el pie de página). Uno cada tres semitonos alcanza porque el sampler estira
el más cercano; separarlos más ya se nota.

## El pulso del ejercicio

`lib/useMetronomo.ts`. **No uses `setInterval` para tocar notas.** Antes era así
y el pulso tambaleaba: cada salto del timer tocaba la nota "ahora" y en el mismo
tick React redibujaba un teclado SVG entero, así que el tiempo de render se iba
derecho al audio.

Ahora hay dos relojes, que es la forma canónica:

- Un timer impreciso cada 25ms que agenda **contra el reloj del audio** todo lo
  que caiga en los próximos 120ms. Que el timer llegue tarde no mueve el pulso.
- Un `requestAnimationFrame` que destapa la parte visual cuando el reloj del
  audio llega a cada nota. Si se pierde un frame, se atrasa la imagen, no el
  sonido.

El bpm se lee por ref a propósito: si el efecto dependiera de él, mover el
slider cortaría y rearmaría el pulso en vez de acelerarlo.

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
- **La nota ya contada se recuerda por clase, no con su octava.** Esto es lo
  más importante de todo. El detector se equivoca de octava seguido: una nota
  real parpadea entre La3 y La4 varias veces mientras suena. Recordando la
  octava, cada parpadeo contaba como nota nueva, y de ahí salían casi todos los
  errores (17 notas inventadas en una sola pasada del ejercicio).
- **Una nota se da por soltada recién tras 6 lecturas seguidas sin sonido.** En
  el medio de una nota tenida hay baches de un frame o dos, y con un solo frame
  de silencio la misma nota volvía a contar.
- Escuchar y reproducir son excluyentes, si no el micrófono se oye a sí mismo.
- `echoCancellation`, `noiseSuppression` y `autoGainControl` van en `false`:
  están pensados para voz y se comen las notas que se apagan.
- Hacen falta 3 lecturas iguales seguidas para dar una nota por buena. Con
  menos, el golpe del ataque (que es ruido de banda ancha) mete notas fantasma.
- Si lo que tocás es la nota *siguiente* a la esperada, se saltea sin penalizar:
  quiere decir que el micrófono se comió una, y el error es nuestro. Sin eso,
  una sola nota perdida te deja trabado tocando algo que la app ya pasó.
- El `k` del método de McLeod se queda en 0.9. Cuando una nota parpadea de
  octava, la tentación es subirlo; medido contra una grabación real, subirlo
  **empeora** (a 0.97 los errores se triplican).

`npm run test:pitch` prueba el detector contra tonos sintéticos con armónicos,
de Do2 a Do6. Correlo si tocás `lib/pitch.ts`: el modo en que falla un detector
de altura es contestar la octava de arriba, y eso se ve enseguida ahí.

Pero los tonos sintéticos sólo dicen si el algoritmo está bien, no si los
umbrales sirven para un piano de verdad grabado con un celular. Para eso hay
dos herramientas, y conviene usarlas en este orden:

1. `npm run escuchar -- grabacion.wav` lista tramo por tramo qué escuchó, con
   claridad y volumen. Sirve para *mirar* una grabación y entender qué pasa.
2. `npm run calibrar -- grabacion.wav` sabe qué había que tocar (el ejercicio
   entero) y mide el error de verdad, más un barrido de umbrales.

Dos cosas de método que costaron y no hay que volver a aprender:

- **No puntúes como la app para calibrar.** La app espera nota por nota, así
  que si se desincroniza una vez, todo lo que sigue cuenta como error y el
  número deja de hablar del detector. Hay que alinear con distancia de edición
  y separar notas cambiadas, inventadas y comidas. Las *inventadas* son las que
  rompen la app.
- **Una grabación no se autocorrige y vos sí.** Tocando en vivo mirás la
  pantalla y volvés a intentar la nota; una grabación sigue de largo. Por eso
  el puntaje que da un replay siempre es más feo que el real, y no hay que
  perseguirlo hasta el cero.

Y una advertencia: sobre una sola grabación, una diferencia de uno o dos
errores es ruido. Mover un umbral se justifica cuando la mejora es grande (como
lo de la octava, que fue de 25 errores a 8) o cuando se sostiene en varias
grabaciones.

**Los acordes no se pueden escuchar todavía.** Detectar varias notas a la vez es
otro problema (análisis espectral, no autocorrelación) y no está hecho.

## Convenciones

- **Todo en castellano rioplatense**, incluidos los nombres de variables de
  dominio (`izquierda`, `acordes`, `siguiente`). El código de infraestructura
  puede quedar en inglés donde ya lo está.
- **Notas en MIDI**: Do central (C4) = 60. Do3 = 48, Do2 = 36.
- **Nada se baja de un CDN.** Todo lo que la app necesita está en el repo. El
  teclado es SVG dibujado a mano y las ilustraciones, si alguna vez hacen falta,
  se generan y se guardan en `public/`.
  La única excepción son los samples del piano (`public/piano/`, 1,3 MB), y
  están *adentro* del repo justamente para no depender de nadie. Ver abajo.
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
