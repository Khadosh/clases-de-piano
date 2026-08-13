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
| `figuras` | Las figuras y el árbol de división | Árbol que suena + tabla de las siete figuras |
| `compases` | Simples, compuestos y la subdivisión | Máquina de compases con metrónomo y el botón de la constante |
| `secuencia` | Enlazar una progresión girando los acordes | Teclado con el acorde anterior en gris y el puntaje de cuánto te moviste |

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
   Si no apila terceras (como los sus), además su `grados`.
2. Referenciar su `id` desde el bloque `chord-lab` de esa clase.

El teclado, el dictado, las inversiones, el quiz, el identificador de acordes y
la página `/acordes` lo levantan solos. No hay que tocar nada más — incluidas
las inversiones, que se calculan de la cantidad de notas del `stack`.

**Los acordes se escriben con la letra que les toca, no con la tecla que son.**
Mi♭ menor es `Mi♭ · Sol♭ · Si♭`, aunque Sol♭ y Fa♯ sean el mismo dedo. La regla
es una sola y está en `deletrearAcorde()`: cada nota del acorde usa su propia
letra, y una tríada salta de a letra por medio (Mi Sol Si). Con eso el signo
sale solo y no hay tabla de excepciones. Las recetas que no apilan terceras
—sus2 va 1-2-5, sus4 va 1-4-5— lo declaran en su campo `grados`.

Es lo primero que se rompe si alguien vuelve a escribir `NOTES_ES[pc]` para
mostrar la nota de un acorde: eso da la tecla, no el nombre, y aparecen cosas
como "Mi♭ menor = Re♯ · Fa♯ · La♯". Para mostrar notas de un acorde va
`notasDeAcorde()` / `notasDeInversion()`; `noteName()` es sólo para teclas
sueltas, donde no hay contexto que decida.

Cuando la letra correcta pide un doble signo (Si aumentado sería Si Re♯ Fa♯♯)
escribimos la tecla llana: Si · Re♯ · Sol. Es mentira en el papel y es lo que se
lee de un vistazo, que acá gana.

**El dictado se responde en el teclado.** Se aprietan las teclas y la app
corrige. El criterio es el musical y no el literal: tienen que estar las mismas
notas, en cualquier octava y en cualquier orden, y el bajo tiene que ser el que
corresponde. Eso acepta cualquier disposición razonable y a la vez no deja
pasar una inversión por otra — de hecho "las notas están bien pero el bajo no"
es un caso aparte, porque es *el* error típico de las inversiones.

Corrige recién cuando el acorde está completo. Ir marcando tecla por tecla
convertiría el ejercicio en adivinar por descarte.

**El rango del teclado se calcula, no se elige.** Un `<Keyboard from to>` con
números a mano se rompe callado: si una nota cae afuera no se dibuja mal, no se
dibuja, y el ejercicio queda sin respuesta posible. Ya pasó con Bm7 en un
teclado de 55 a 79. Para mostrar un acorde va `rangoParaAcorde(pitches)`.

**Armar un acorde y girarlo son la misma operación**, así que son un solo
bloque (`chord-lab` con `inversiones: true`) y no dos. Se intentó tenerlos
separados y eran dos componentes casi idénticos. Lo que sí conviene separar es
el *texto*: primero la receta, después "y además se puede girar".

## El enlace de acordes

`lib/enlace.ts`. Se da una progresión en estado fundamental y hay que ir
girando cada acorde para moverse poco. Tres cosas que costaron:

- **Son dos criterios y no uno.** `bajo` (el del profe) mira sólo la nota más
  grave; `mano` mira todo el acorde. No son dos formas de decir lo mismo: sobre
  la progresión de la clase 2 los recorridos óptimos coinciden en 3 de 8. Y
  `mano` a solas se queda pegado a una posición y deja un pedal, que suena
  inmóvil — por eso el criterio del bajo da mejores resultados en piano solo.
- **El óptimo es el del camino entero, no el de cada paso.** Ir eligiendo lo
  más barato en cada acorde es lo primero que uno escribe y está mal: la
  disposición más cómoda para el acorde 2 puede dejar la mano pésima para el 3.
  Va programación dinámica sobre todas las disposiciones.
- **El total NO es la suma de los mínimos de cada paso.** Ese número es más
  chico y mentiroso, porque cada mínimo se calcula desde la posición mala en la
  que estabas: llegó a mostrar "moviste 29, el mínimo era 0" en una progresión
  cuyo mínimo real es 4. El de cada paso sirve para el "acá se podía menos" de
  cada acorde; abajo va el del camino entero.

**No corrige, puntúa.** Muy seguido hay dos inversiones igual de buenas y decir
"la correcta es ésta" sería mentir. Muestra cuánto moviste contra el mínimo, y
podés empatar el óptimo por otro camino.

## El examen

Cada clase termina con un examen de ocho preguntas, y **no hay que escribirlo**:
se genera de los bloques de esa misma clase. `temarioDe()` en `content/index.ts`
mira qué acordes tocó, si vio inversiones y si vio lo de los semitonos, y
`lib/examen.ts` arma las preguntas con eso. Una clase nueva trae su examen sola.

Dos decisiones:

- **Se genera distinto cada vez.** Si las preguntas fueran fijas se aprendería
  la respuesta en vez de la receta.
- **Siempre hay al menos una de armar en el teclado.** Es la única que no se
  puede acertar de casualidad; las de opciones tienen una chance en cuatro.

Si en una clase aparece un tipo de pregunta nuevo, va en `lib/examen.ts` como
una fábrica más y se suma al pozo. No hace falta tocar el componente.

## El ritmo

`lib/ritmo.ts`, y sale todo de una sola idea, que es como lo explica el profe:
**una figura se define por en cuántas partes divide a la redonda**. La negra es
4 porque la redonda entra cuatro veces. Ese mismo número es el denominador del
compás, así que el 4 de 3/4 no es "cuatro" de nada: es *la negra*.

Con eso no hay tabla de casos en ningún lado:

- Las figuras se **dibujan** solas (`components/FiguraSVG.tsx`): cabeza llena de
  la negra para abajo, plica de la blanca para abajo, y las banderas son los
  pasos que hay desde la negra. Si aparece una figura nueva se dibuja sin tocar
  el componente. Los símbolos de Unicode (𝅘𝅥𝅮) no se usan: casi ninguna fuente
  los trae y en el celular salen cuadraditos.
- Un compás es **compuesto** si el numerador es múltiplo de 3 y no menor que 6.
  Sale de multiplicar un simple por la constante del profe: numerador ×3,
  denominador ×2. Por eso 3/8 *no* es compuesto — es un simple de tres tiempos.
- **En un compuesto el pulso lleva puntillo.** Es lo que más cuesta y no se ve
  en el número: en 6/8 no se cuentan seis tiempos, se cuentan dos negras con
  puntillo. El denominador dice en qué se subdivide, no qué se cuenta.

`npm run test:ritmo` prueba todo eso contra casos escritos a mano, incluido el
que importa: 3/4 y 6/8 tienen las mismas seis corcheas y distinto lugar de los
golpes.

El metrónomo de `Compases` reusa `useMetronomo`, que cuenta subdivisiones y no
tiempos: por eso el bpm que se le pasa es el pulso por las partes de cada
tiempo.

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
qué nota estás tocando y avanza sola cuando acertás.

Son cuatro capas y **conviene entenderlas separadas**, porque el error más caro
que cometimos fue asumir que el problema estaba en la primera cuando estaba en
la tercera:

| Capa | Archivo | Qué hace |
|---|---|---|
| Detectar | `lib/pitch.ts` | De un búfer de audio a "esto suena a un la". Método de McLeod, sin dependencias. **Una nota por vez.** |
| Segmentar | `lib/notas.ts` | De un chorro de lecturas a *notas*. Acá está la regla de la duración. |
| Puntuar | `lib/puntaje.ts` | De notas a "vas bien / te comí una / eso está mal". Acá está la ventana de resync. |
| Mostrar | `lib/useMicPitch.ts` + `components/ExerciseRunner.tsx` | El micrófono, React y la UI. |

Las dos del medio **no saben nada de React ni de Web Audio**, y eso es a
propósito: se prueban con un array escrito a mano (`npm run test:notas`, corre
en milisegundos). Antes vivían adentro de un `useEffect` y para probar un
cambio había que levantar el server, abrir Chromium con micrófono falso y
esperar cuarenta segundos de audio. Es la diferencia entre poder experimentar y
no poder.

Los scripts de calibración importan **esos mismos módulos**, no una copia. Hubo
una época en que `calibrar-mic.mjs` reescribía la lógica y un comentario pedía
mantener las dos versiones en sincronía; ese tipo de acuerdo se rompe, y cuando
se rompe el script sigue dando números prolijos que ya no dicen nada.

Reglas que ya están resueltas y conviene no romper:

- Se compara **por nota, no por octava**. El ejercicio es una figura de dedos y
  da igual dónde lo toques.
- **La nota ya contada se recuerda por clase, no con su octava.** Esto es lo
  más importante de todo. El detector se equivoca de octava seguido: una nota
  real parpadea entre La3 y La4 varias veces mientras suena. Recordando la
  octava, cada parpadeo contaba como nota nueva, y de ahí salían casi todos los
  errores (17 notas inventadas en una sola pasada del ejercicio).
- **Una nota se da por soltada recién tras 100ms de silencio.** En el medio de
  una nota tenida hay baches de un frame o dos, y con un solo frame de silencio
  la misma nota volvía a contar.
- Escuchar y reproducir son excluyentes, si no el micrófono se oye a sí mismo.
- `echoCancellation`, `noiseSuppression` y `autoGainControl` van en `false`:
  están pensados para voz y se comen las notas que se apagan.
- **Una nota se cree recién cuando duró 50ms, y se mide el tiempo del tramo, no
  la cantidad de lecturas.** Es la regla que más errores sacó. La idea es de
  Joaquín y es de sentido común: si en "la si la" el si duró veinte
  milisegundos, ese si no existió.

  Antes se contaban lecturas iguales seguidas ("tres y va") y no alcanzaba, por
  un motivo que no se ve: la ventana del analizador son 2048 muestras (~46ms) y
  avanzamos de a un frame (~17ms), así que **las ventanas se pisan casi
  enteras**. Un blip de 20ms cae adentro de tres o cuatro ventanas consecutivas
  y junta sus tres confirmaciones solo. Tres lecturas nunca fueron 50ms de
  evidencia: eran el mismo instante mirado tres veces.

  Lo lindo es que sale gratis: un tramo corto muere sin avisar y sin tocar la
  última nota contada, así que "la si la" se colapsa en un solo la.

- **Si lo que tocaste aparece en las próximas 3 notas, se salta hasta ahí.**
  Esto es lo que evita el arrastre, que resultó ser la causa de casi todos los
  errores que se ven en pantalla. Cuando el micrófono se come una nota, la app
  se queda esperándola y a partir de ahí *todo* lo que tocás bien sale marcado
  en rojo. Sobre una grabación real: con ventana 1 (que era lo que había) 33
  errores en pantalla, con 2 nueve, con 3 dos.

  De ahí para arriba no mejora, sólo se vuelve difícil que te marque un error
  de verdad.

- **Las dos reglas se necesitan, y juntas piden umbrales distintos que por
  separado.** Con la ventana de resync conviene la duración *más baja*: una
  nota inventada la absorbe la ventana, una nota comida no. Por eso 50ms y no
  100ms, que fue la primera respuesta mirando sólo la alineación y era peor
  (7 errores en pantalla contra 2).
- El `k` del método de McLeod se queda en 0.9. Cuando una nota parpadea de
  octava, la tentación es subirlo; medido contra una grabación real, subirlo
  **empeora** (a 0.97 los errores se triplican).

`npm run test:notas` prueba las dos capas del medio contra tiras de lecturas
escritas a mano: el "la si la" con el si de 20ms, el parpadeo de octava, el
bache en el medio de una nota tenida, la nota comida que no tiene que arrastrar
el resto. Correlo con cualquier cambio ahí; tarda milisegundos.

`npm run test:pitch` prueba el detector contra tonos sintéticos con armónicos,
de Do2 a Do6. Correlo si tocás `lib/pitch.ts`: el modo en que falla un detector
de altura es contestar la octava de arriba, y eso se ve enseguida ahí.

Pero los tonos sintéticos sólo dicen si el algoritmo está bien, no si los
umbrales sirven para un piano de verdad grabado con un celular. Para eso hay
tres herramientas, y conviene usarlas en este orden:

0. **`/grabar`** (la página, no está en la navegación) graba el micrófono y,
   si hay un teclado MIDI conectado, lo que tocaste de verdad — las dos cosas
   **con el mismo reloj**. Baja un WAV PCM que los scripts leen sin convertir
   nada y un JSON con las notas.

   Que las dos cosas salgan de la misma página no es comodidad: si el audio se
   grabara en el celular y el MIDI en la compu habría que alinear dos relojes a
   mano, y 50ms de error ahí arruinan justo lo que se quiere medir.

   Graba con el micrófono de la máquina y no por la salida del teclado a
   propósito. Nuestros errores vienen del micrófono, la sala y el control de
   ganancia; con audio limpio se mide un problema que no tenemos.

1. `npm run escuchar -- grabacion.wav` lista tramo por tramo qué escuchó, con
   claridad y volumen. Sirve para *mirar* una grabación y entender qué pasa.
2. `npm run calibrar -- grabacion.wav [--midi grabacion.json]` mide el error.
   **Con `--midi` sabe qué tocaste de verdad**; sin él tiene que suponer que la
   interpretación fue perfecta, y entonces tocar mal cuenta como que el
   detector oyó mal, sin forma de separar una cosa de la otra. Con el MIDI
   además informa cuánto tarda la app en enterarse de cada nota (medido: 90ms,
   que son 40 del detector más los 50 de nuestra regla de duración).

Tres cosas de método que costaron y no hay que volver a aprender:

- **Hacen falta los dos números, y miden cosas distintas.** `calibrar` imprime
  la alineación (notas cambiadas, inventadas y comidas, con distancia de
  edición) *y* cuántos errores te marcaría la app en pantalla. La alineación
  dice qué tan bien oye el detector; el simulacro dice cuántas veces te va a
  decir que te equivocaste sin que te hayas equivocado. **Mirar uno solo lleva
  a la decisión equivocada**, y ya pasó: por la alineación, 100ms de duración
  mínima parecía la mejor opción, y en pantalla daba 7 errores contra los 2 de
  50ms. El que se siente es el segundo.
- **El browser no sirve para comparar números.** Sirve para ver que algo anda
  de punta a punta y que no hay errores de JS, nada más. Dos corridas del mismo
  test con micrófono falso, mismo código y mismo server, dieron 65 bien / 3 al
  lado y 59 / 9: el arranque del audio falso y el ritmo del
  `requestAnimationFrame` cambian entre corridas lo suficiente como para tapar
  cualquier diferencia que estemos buscando.

  El instrumento de medición es `npm run calibrar`, que corre sobre un archivo
  y da exactamente lo mismo siempre. Si un cambio se juzga por el browser, se
  está midiendo el ruido. (Perseguí un "empeoró de 65/2 a 59/9" que no existía.)
- **Una grabación no se autocorrige y vos sí.** Tocando en vivo mirás la
  pantalla y volvés a intentar la nota; una grabación sigue de largo. Por eso
  el puntaje que da un replay siempre es más feo que el real, y no hay que
  perseguirlo hasta el cero.

Y una advertencia: sobre una sola grabación, una diferencia de uno o dos
errores es ruido. Mover un umbral se justifica cuando la mejora es grande (como
lo de la octava, que fue de 25 errores a 8, o lo de la duración más el resync,
que fue de 45 errores en pantalla a 2) o cuando se sostiene en varias
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
