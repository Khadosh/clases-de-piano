import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 8,
  date: "2026-09-23",
  title: "Las tonalidades: escalas, armaduras y el círculo de quintas",
  summary:
    "La misma escala arrancando de cada nota, y qué signos hay que ponerle a cada una para que suene igual. De ahí salen las armaduras —el orden fijo de los sostenidos y los bemoles—, la cuenta para saber en qué tonalidad está una canción, y el círculo que ordena las quince.",
  tags: [
    "escalas mayores",
    "escalas menores",
    "armadura",
    "orden de sostenidos",
    "orden de bemoles",
    "círculo de quintas",
    "relativa menor",
    "tonalidad",
  ],
  blocks: [
    {
      kind: "section",
      title: "El repaso: la tritonal, bien escrita",
      emoji: "🔀",
      intro:
        "La clase arrancó cerrando lo de la semana pasada, y con un detalle de escritura que resultó ser el puente al tema del día.",
    },
    {
      kind: "prose",
      text: "El sustituto es el acorde de séptima que está *a una cuarta aumentada* de la fundamental del dominante — la cuarta aumentada y el tritono son la misma distancia, seis semitonos. Sobre el G7, esa nota es el Do♯.\n\nY ahí viene lo que hay que anotar: *se escribe con el bemol y no con el sostenido*. El sustituto del G7 es D♭7, no C♯7. Suena exactamente igual, se toca con los mismos dedos, y en el papel uno de los dos se lee y el otro no — que es el mismo asunto de toda la clase de hoy: la misma tecla tiene dos nombres y sólo uno es el que va.",
    },
    {
      kind: "section",
      title: "Las escalas mayores, una por cada nota",
      emoji: "🪜",
      intro:
        "La escala mayor es una receta de distancias, y la receta no cambia: lo único que cambia es desde dónde arranca.",
    },
    {
      kind: "prose",
      text: "Escrita con los grados, la mayor tiene los dos semitonos *entre el III y el IV* y *entre el VII y el VIII*. Todo lo demás son tonos. En Do eso sale con las teclas blancas y por eso Do no lleva ningún signo: los dos lugares del teclado sin negra en el medio caen justo donde la receta pide semitono.\n\nArrancando desde cualquier otra nota deja de salir gratis. En Sol, si uno sigue con blancas, entre el VII y el VIII queda un tono entero: hay que subir el fa para que vuelva a haber medio tono contra la tónica. De ahí sale el fa♯, y de ahí sale todo lo demás — cada escala nueva necesita corregir una nota más.",
    },
    {
      kind: "tonalidades",
      title: "Las quince, con sus notas",
      intro:
        "Las dos listas del cuaderno: para un lado se suman sostenidos y para el otro bemoles. Fijate que el signo nuevo siempre cae en una letra que todavía no tenía, y que ninguna letra aparece dos veces — eso es lo que decide si la nota se llama Fa♯ o Sol♭.",
    },
    {
      kind: "section",
      title: "La armadura",
      emoji: "🔑",
      intro:
        "Los signos no se escriben nota por nota: se ponen una vez al principio del renglón y valen para toda la pieza.",
    },
    {
      kind: "prose",
      text: "El orden en que aparecen es fijo y hay que sabérselo de memoria en los dos sentidos:\n\n*Sostenidos: fa · do · sol · re · la · mi · si.*\n\n*Bemoles: si · mi · la · re · sol · do · fa* — el mismo al revés.\n\nNo hay armaduras salteadas. Si hay tres sostenidos son fa, do y sol, en ese orden y no otros: una con sol♯ y sin fa♯ no existe.",
    },
    {
      kind: "armaduras",
      title: "Qué anuncia cada armadura",
      intro:
        "Elegí cuántas alteraciones y mirá dónde caen. El signo pintado es el que decide la tonalidad.",
    },
    {
      kind: "prose",
      title: "En qué tonalidad está una canción",
      text: "Para saberlo se mira la cantidad de alteraciones, y con dos cuentas alcanza:\n\n*Con sostenidos, la tónica está un semitono arriba del último.* Si la armadura dice fa♯ do♯ sol♯, el último es sol♯ y un semitono más arriba está La: *La mayor*.\n\n*Con bemoles, la tónica es el anteúltimo.* Si dice si♭ mi♭ la♭, el anteúltimo es mi♭: *Mi♭ mayor*. La única que no entra en la cuenta es la de un solo bemol, que no tiene anteúltimo — ésa es Fa mayor y se aprende suelta.\n\nSin ninguna alteración es Do mayor. Y ojo, que la armadura sola no dice todo: cada una sirve para dos tonalidades, una mayor y una menor. Cuál de las dos es lo dice la música, no el papel.",
    },
    {
      kind: "section",
      title: "Las menores y el círculo",
      emoji: "🧭",
      intro:
        "Las mismas siete notas, empezadas en otro lugar — y un dibujo que ordena las quince de una.",
    },
    {
      kind: "prose",
      text: "La escala menor tiene los semitonos en otro lado: *entre el II y el III* y *entre el V y el VI*. Y hay un atajo que evita aprenderse quince escalas más: cada armadura tiene una mayor y una menor que la comparten, porque son exactamente las mismas notas con distinta tónica. Es la *relativa menor*, y está en el sexto grado de la mayor.\n\nDo mayor y La menor no llevan signos. Sol mayor y Mi menor llevan fa♯. Mi♭ mayor y Do menor llevan tres bemoles. Sabiendo las mayores ya están las menores, y el círculo de quintas las muestra a las dos juntas.",
    },
    {
      kind: "prose",
      title: "Por qué en rueda y no en lista",
      text: "Las quince tonalidades se pueden escribir en una lista —y así están más arriba— pero puestas en círculo aparece algo que la lista esconde: *las que están cerca se parecen*.\n\nCada paso hacia la derecha sube una quinta y agrega un sostenido; cada paso hacia la izquierda baja una quinta y agrega un bemol. Como agregar un signo es cambiar una sola nota, dos tonalidades vecinas comparten seis de sus siete notas, y dos que están en la vereda de enfrente casi no comparten ninguna. La distancia en el dibujo *es* la distancia que se escucha.\n\nY doce pasos dan la vuelta entera: se sale de Do y se vuelve a Do. Eso es otra forma de decir que doce quintas son siete octavas, que es por qué el círculo cierra y no es una escalera infinita.",
    },
    {
      kind: "circulo-de-quintas",
      title: "El círculo de quintas",
      intro:
        "Afuera las mayores, adentro sus relativas menores, y en el aro de más afuera cuántas alteraciones lleva cada una. Tocá cualquiera para escucharla. Abajo del todo los dos caminos se encuentran: ahí las casillas están partidas al medio porque la misma tecla tiene dos nombres.",
    },
    {
      kind: "prose",
      title: "Lo que se lee de un vistazo",
      text: "Con el dibujo delante hay tres cosas que dejan de ser cuentas:\n\n*Los acordes de una tonalidad son las casillas pegadas.* La de la derecha es su V y la de la izquierda su IV; las tres de adentro, los tres menores. En Do: Sol y Fa a los costados, y La menor, Re menor y Mi menor justo abajo. Seis de los siete acordes de la tonalidad tocándose — el que falta es el VII°, que es disminuido y no tiene lugar en la rueda.\n\n*Transportar es correr el dibujo.* Una progresión es una forma: I–V–vi–IV es la casilla, la de la derecha, la de adentro y la de la izquierda. Movida un paso, es la misma canción un tono más arriba sin volver a aprender nada. Es lo mismo que hacen los grados, pero dibujado.\n\n*La distancia se mide en casillas.* Do y Sol están a un paso: se diferencian en una nota. Do y Fa♯ están a seis, que es lo más lejos que se puede estar, y por eso ese cambio suena a que la música se fue a otro lado.",
    },
  ],

  homework: [
    "No quedó anotada una tarea aparte, así que lo que corresponde es lo de siempre y encima esto: saberse los dos órdenes de memoria —fa do sol re la mi si, y al revés para los bemoles— y poder decir, sin pensar mucho, cuántas alteraciones lleva cualquier tonalidad y cuál es su relativa.",
    "Tocar las escalas mayores que salen más a mano —Do, Sol, Re, Fa, Si♭— diciendo en voz alta los nombres de las notas, que es donde se ve si uno está pensando la letra o la tecla.",
  ],

  openQuestions: [
    "En el apunte la sustitución tritonal quedó anotada como \"acorde 7+4\". Lo leímos como \"el acorde de séptima sobre la cuarta aumentada\", que es la distancia del tritono y da el D♭7 sobre el G7. Confirmar que era eso y no otra cosa.",
    "La digitación de las escalas sigue sin aparecer, y no se deduce de la receta: es una tabla por tonalidad y por mano. Preguntarla, aunque sea la de las cinco o seis más usadas.",
    "Las de siete alteraciones —Do♯ mayor y Do♭ mayor— están en la lista del cuaderno, pero ¿se escriben de verdad o en la práctica se usan siempre sus enarmónicas, Re♭ y Si? Lo mismo con el par Fa♯ / Sol♭, que quedó en el medio.",
    "Lo de que las casillas vecinas del círculo son los acordes de la tonalidad —el IV y el V a los costados, los tres menores adentro— no salió en clase: lo dedujimos del dibujo y está verificado contra el campo armónico, pero conviene preguntarle si él lo usa así o si le parece un atajo que confunde.",
    "De las menores vimos la natural (con los semitonos en II-III y V-VI) y las relativas. ¿La armónica y la melódica de la clase 6 se estudian también en las quince tonalidades, o alcanza con la natural para leer una armadura?",
  ],
};

export default lesson;
