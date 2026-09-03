import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 5,
  date: "2026-09-02",
  title: "Acordes de paso: los dominantes secundarios",
  summary:
    "La lógica del G7 → C aplicada a cada acorde de la escala: los dominantes secundarios como puente entre acordes, los efectivos que se van del campo, y la melodía que camina por grado conjunto.",
  tags: [
    "dominantes secundarios",
    "acordes de paso",
    "dominantes efectivos",
    "campo armónico",
    "grado conjunto",
    "cantabile",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Quinto miércoles",
      text: "Arranqué mostrando lo que había hecho con la tarea: melodías sobre secuencias de acordes, con las notas guía primero y la frase después. Quique dijo que iba bien, y de ahí salieron varios tips en dos frentes: cómo dar *conexión entre los acordes* y cómo mejorar las melodías. El grueso de la clase fue el primero.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Conectar los acordes",
      emoji: "🧲",
      intro:
        "Entre dos acordes de una secuencia se puede meter un tercero que no es de la secuencia: un *acorde de paso*. Hay dos opciones — los dominantes secundarios y los acordes disminuidos — y la clase se fue casi entera en la primera.",
    },
    {
      kind: "prose",
      title: "La misma lógica del G7",
      text: "Todo parte de lo que ya sabíamos: el G7 es el dominante principal de Do mayor y lleva *indefectiblemente* a C. La fórmula del dominante es *X7*: un acorde mayor con séptima menor. Y la pregunta de la clase fue: ¿por qué sólo el G7? Si la fórmula funciona sobre Sol, funciona sobre cualquier nota.\n\nSe construye igual: sobre una nota de la escala se arma el X7, y ese acorde lleva a lo que está *cinco semitonos arriba* — la misma distancia que hay de Sol a Do. Arrancando por Do: el C7 lleva a Fa, que en nuestra escala es mayor. El D7 lleva a Sol. El E7 lleva a La, que en la escala es menor, así que lleva a *Am*. Y así hasta cerrar la vuelta.",
    },
    {
      kind: "dominantes-secundarios",
      title: "La tabla de Do mayor",
      intro:
        "Cada X7 con el acorde adonde lleva, para escuchar la llegada de a una — fijate en la nota pintada, que es la que Do mayor no tiene. Después, la vuelta: elegí una progresión y metele los de paso, con y sin, que es donde se entiende para qué están.",
    },
    {
      kind: "prose",
      title: "Los que llevan a otro campo: los efectivos",
      text: "En la lista de la clase faltaba uno. El F7 se arma igual que los demás, pero cae en *Si♭*, que no está en Do mayor: lleva indefectiblemente a otro campo armónico. A ésos Quique los llamó *dominantes efectivos*: toda dominante que te saca del campo es efectiva.\n\nQuedó nombrado sin entrar en detalle, con una vuelta de tuerca para pensar: los secundarios se convierten en efectivos *cambiando el mayor por menor y viceversa* en el acorde de llegada. El A7 que lleva a Dm es secundario; si lo hacés llegar a *D* mayor, ese D ya no es de Do mayor, y el mismo A7 pasó a ser efectivo. En la tabla está el botón para oír las dos llegadas y comparar.",
    },
    {
      kind: "prose",
      title: "La otra opción: los disminuidos",
      text: "Los acordes disminuidos son la segunda manera de conectar acordes. Quedó dicho que existen como acorde de paso y que se usan para lo mismo, pero el cómo —sobre qué nota se arman y hacia dónde van— quedó para la próxima. Está anotado abajo para preguntar.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "La melodía, otra vez",
      emoji: "🎼",
      intro:
        "Sobre lo que llevé, dos ideas: cómo ir de una nota cordal a la siguiente, y qué mirar cuando algo te gusta.",
    },
    {
      kind: "prose",
      title: "Puentes por grado conjunto",
      text: "Para ir de una nota del acorde a otra, la melodía puede hacer *puentes* con las notas del medio: caminar por grado conjunto —de a un escalón de la escala— en vez de saltar directo. No es que los saltos estén prohibidos, pero son los menos. La idea de fondo sigue siendo la de la clase 4: pensar siempre una melodía *cantabile*, que se pueda cantar — y lo que se canta, en general, camina.",
    },
    {
      kind: "prose",
      title: "Lo que caracteriza a un artista",
      text: "Y un comentario para adelante: haciendo esto voy a ir encontrando pedacitos que me gustan — un giro de acordes, una manera de armar una frase. Esos fragmentos tienen nombre (no me lo acordé al salir) y son lo que *caracteriza a un artista*: a veces es cómo arma los acordes y otras veces cómo fabrica las melodías. Vale la pena anotarlos cuando aparecen.",
    },
  ],

  homework: [
    "Seguir con las melodías sobre secuencias, ahora metiendo dominantes secundarios como acordes de paso entre los acordes: antes de cada acorde, su X7.",
    "En la melodía, conectar las notas cordales por grado conjunto —puentes, no saltos— y que siga siendo cantabile: frases, respiraciones, figuras distintas.",
  ],

  openQuestions: [
    "Los acordes disminuidos como acordes de paso quedaron sólo nombrados: ¿sobre qué nota se arman y hacia dónde llevan? ¿Son el disminuido con séptima (los cuatro de tres semitonos) o la tríada?",
    "Los dominantes efectivos: quedó la idea de que son los que llevan a otro campo armónico, y que un secundario se vuelve efectivo dando vuelta el mayor/menor de la llegada. ¿Es exactamente eso, o \"efectivo\" nombra algo más?",
    "En la tabla no aparece un dominante para el VII (Bdim). Interpretamos que es porque el X7 que le tocaría, Fa♯7, no se arma sobre ninguna nota de la escala — y porque a un disminuido no se llega. Confirmar.",
    "Los fragmentos que caracterizan a un artista —el giro de acordes o de melodía que uno se apropia—: ¿cómo se llamaban?",
    "La tarea no quedó dicha con todas las letras; la de arriba es lo que se desprende de la clase.",
  ],
};

export default lesson;
