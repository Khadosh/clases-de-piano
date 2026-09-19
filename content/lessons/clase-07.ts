import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 7,
  date: "2026-09-16",
  title: "Voicing, texturas y la sustitución tritonal",
  summary:
    "Una clase cargada de teoría que salió del repaso: dónde va cada nota del acorde (y por qué la izquierda no toca la tercera), las texturas —los cuatro tipos y las tres del piano— y el dominante que se cambia por el que está a un tritono.",
  tags: [
    "voicing",
    "posición abierta",
    "posición cerrada",
    "texturas",
    "plaqué",
    "pum-chá",
    "arpegios",
    "sustitución tritonal",
    "jazz",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Séptimo miércoles",
      text: "Arrancamos repasando la vuelta de la clase pasada y ahí Quique empezó a fluir: de cada cosa que sonaba salía una observación, y de cada observación un tema. No hubo cuaderno de vuelta nueva; hubo tres ideas grandes, una atrás de la otra. La primera salió de escuchar cómo estaba armando los acordes con la izquierda.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Voicing: dónde va cada nota",
      emoji: "⚖️",
      intro:
        "Un acorde son las mismas tres o cuatro notas se toquen como se toquen. *Cómo* se reparten entre las manos y a qué altura va cada una es otra cosa, y tiene nombre: voicing.",
    },
    {
      kind: "correction",
      title: "La tercera no va en la izquierda",
      emoji: "⚖️",
      problem:
        "La izquierda tocaba el acorde entero y cerrado —1, 3 y 5 apilados— en la zona grave. Suena cargado, oscuro, y se pisa con lo que hace la derecha.",
      fix: "Muchas veces la tercera de la mano izquierda directamente no se toca: la izquierda pone la fundamental y la quinta (o la fundamental y la séptima) y la tercera sube a la derecha. Es una elección: se saca de ahí a propósito para que no quede un sonido cargado ni oscuro.",
      analogy:
        "Es un poco lo que se hace en una orquesta: cada nota tiene que estar equilibrada para que los sonidos no saturen ni se anulen.",
    },
    {
      kind: "prose",
      text: "Y ojo con lo que parece decir eso: la tercera es justamente la nota que determina si un acorde es mayor o menor, así que no puede faltar. No falta: se muda de mano y de registro. Un acorde con la tercera abajo, pegada a la fundamental, se ensucia; el mismo acorde con la tercera arriba, en la derecha, tiene el mismo color y respira. No es que esté prohibido tocarla con la izquierda, pero en general el acorde se arma *abierto*: dos dedos en la izquierda y dos —o tres, duplicando una voz— en la derecha.\n\n*Posición cerrada*: 1-3-5, todo junto. Es más oscura, más densa, y la densidad es como un día nublado. Cuanto más grave, más denso todavía.\n\n*Posición abierta*: cada nota del acorde separada de su vecina por una cuarta, una quinta o una sexta. Las mismas notas, con aire en el medio.",
    },
    {
      kind: "prose",
      title: "El voicing a dos manos",
      text: "Dos repartos: *1 y 5 en la izquierda, 3 y 7 en la derecha*, o *1 y 7 en la izquierda, 3 y 5 en la derecha*. En los dos la fundamental está abajo y la tercera está arriba, que es la regla. Y a veces se puede duplicar alguna nota entre las dos manos para acentuarla: la fundamental otra vez arriba, o la quinta.",
    },
    {
      kind: "voicing",
      title: "El mismo acorde, repartido",
      intro:
        "Elegí un acorde y escuchalo cerrado, abierto con cada reparto, y a una mano. Las notas no cambian nunca; fijate en el aro, que marca la tercera, y en cómo se mueve de la izquierda a la derecha. El botón de *cerrada y después abierta* es la comparación de la clase.",
    },
    {
      kind: "prose",
      title: "El voicing a una mano",
      text: "Cuando el acorde lo lleva una sola mano, suele *esquivar la fundamental* y suele ir *invertido*. La fundamental la pone el bajo —o la completa el oído— y lo que queda, tercera, quinta y séptima, se gira hasta que caiga cómodo. Mucha influencia del jazz: es el voicing con el que un pianista acompaña mientras el contrabajo pone las fundamentales.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Texturas",
      emoji: "🧶",
      intro:
        "La textura es cómo se entrelaza lo que suena: la forma en que se combinan y se relacionan los elementos melódicos, rítmicos y armónicos. La palabra viene de los tejidos, y la imagen sirve: cuántos hilos hay y cómo se cruzan.",
    },
    {
      kind: "prose",
      title: "Los cuatro tipos",
      text: "*Monofonía*: una sola línea melódica, sin acompañamiento. Si tocan varios instrumentos, hacen todos lo mismo.\n\n*Melodía acompañada*: una melodía y, debajo, acordes que la sostienen. Es lo que conocemos generalmente: la voz arriba y el piano o la guitarra abajo.\n\n*Homofonía*: dos o más líneas melódicas que se mueven a la vez, con ritmo idéntico. La más aguda es la principal y las otras la siguen cambiando de nota en el mismo momento.\n\n*Polifonía*: varias líneas melódicas independientes que suenan simultáneamente, cada una con su ritmo. Chopin.",
    },
    {
      kind: "prose",
      title: "Y en el piano, tres",
      text: "*Plaqué*: el acorde planchado. Se toca entero y se lo deja sonando lo que dura el compás, hasta el que viene.\n\n*Pum-chá*: el bajo en la fundamental —pum— y el acorde en la derecha —chá—, desplazado y girado, que es lo que hace que suene a acompañamiento y no a dos manos tocando lo mismo.\n\n*Arpegios*: las notas del acorde de a una, con una mano o con las dos. Pueden ser secuenciales o intercalados, y el orden es *1 · 5 · 3 · 7*: fundamental, quinta, tercera, séptima.",
    },
    {
      kind: "texturas",
      title: "Escucharlas",
      intro:
        "Arriba, una vuelta tocada en plaqué, pum-chá o arpegios, en loop y con el teclado diciendo qué mano pone qué. Y en la otra pestaña la misma frase de cuatro compases vestida de las cuatro texturas: la melodía no cambia nunca, cambia todo lo demás.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "La sustitución tritonal",
      emoji: "🔀",
      intro:
        "Lo último de la clase, y otra herramienta del jazz: el dominante se puede cambiar por otro dominante que está a un tritono de distancia.",
    },
    {
      kind: "prose",
      text: "Desde la fundamental del acorde dominante se cuenta un tritono —*seis semitonos*, hacia arriba o hacia abajo, que da lo mismo porque es la mitad justa de la octava— y ahí se arma otro dominante. Ese acorde puede reemplazar al original porque *comparten dos notas*: la tercera y la séptima del G7 son Si y Fa, y el D♭7 tiene Fa y Do♭, que es la misma tecla que el Si. El tritono de adentro del acorde es el mismo, y con él la tensión que pide resolver. Lo que cambia es el bajo: en vez de saltar de Sol a Do, baja de Re♭ a Do, un semitono. Muy usado en el jazz, sobre todo en la ii – V – I.",
    },
    {
      kind: "sustitucion-tritonal",
      title: "La tabla, y la vuelta con y sin",
      intro:
        "Cada X7 de Do mayor con su sustituto al lado, las dos notas que comparten en amarillo, y abajo la ii – V – I de las dos maneras. Escuchá el bajo.",
    },
  ],

  homework: [
    "No hubo tarea oficial: seguir practicando lo que venimos viendo, pero aplicando esto. La vuelta de la clase 6 con la izquierda en 1-5 o 1-7 y la tercera arriba, y la misma vuelta pasada por las tres texturas: plaqué, pum-chá y arpegios.",
  ],

  openQuestions: [
    "En el apunte dice que la sustitución tritonal reemplaza \"el acorde de VII dominante\". Lo pusimos como el V7 —el G7 en Do— que es el dominante que se sustituye en el jazz y el que comparte las dos notas con el D♭7. El VII° también tiene el Si y el Fa adentro, así que a lo mejor de ahí vino. Confirmar que era el V.",
    "Los arpegios quedaron anotados como 1-5-3-7/8, pero el \"7/8\" es un agregado nuestro: entendimos que va la séptima si el acorde la tiene y la octava si no. Preguntar si es así o si el orden era otro.",
    "\"Secuenciales o intercalados\" en los arpegios: lo interpretamos como que en el secuencial una mano hace 1 · 5 · 3 · 7 y la otra sigue una octava arriba, y en el intercalado las manos se alternan nota por nota. Preguntar cómo lo toca él.",
    "En el plaqué, \"lo que dura el compás\": ¿el acorde se deja sonando hasta el próximo cambio de acorde, o hay que volver a atacarlo en cada compás aunque no cambie?",
    "El voicing a una mano sin la fundamental: ¿vale también para las tríadas (quedarían dos notas) o es sólo para las cuatriadas?",
    "En el reparto 1-7 / 3-5 la derecha lleva la tercera y la quinta, que están a una tercera entre sí: ¿va así, pegadas, o la derecha se abre también (la quinta abajo y la tercera arriba, Sol4 · Mi5) para que todo el acorde quede a cuartas, quintas y sextas como dijo?",
  ],
};

export default lesson;
