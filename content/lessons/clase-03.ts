import type { Lesson } from "@/content/types";

const lesson: Lesson = {
  n: 3,
  date: "2026-08-19",
  title: "La armonía y sus funciones",
  summary:
    "De dónde salen los siete acordes de una tonalidad, por qué dejamos de decir Do y empezamos a decir I, y la regla de oro para que una secuencia de acordes suene a música.",
  tags: [
    "campo armónico",
    "armonía funcional",
    "funciones",
    "cadencias",
    "regla de oro",
    "notas cordales",
  ],
  blocks: [
    {
      kind: "prose",
      title: "Tercer miércoles",
      text: "La clase arrancó repasando el cuaderno de la clase 2 — Quique dice que estamos escribiendo un libro, y desde entonces anota más prolijo para usar los términos justos. Y después fue una sola idea de punta a punta: *armonía*. De dónde salen los acordes de una tonalidad, cómo se agrupan por lo que hacen, y qué reglas hacen que una secuencia suene a música y no a acordes sueltos.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "El campo armónico mayor",
      emoji: "🌾",
      intro:
        "Todo empieza en la escala: la receta de tonos y semitonos que ya conocemos de las teclas blancas. El campo armónico es lo que pasa cuando esa escala se pone a armar acordes.",
    },
    {
      kind: "prose",
      title: "La escala, otra vez",
      text: "Do a Re un tono, Re a Mi un tono, *Mi a Fa un semitono*, Fa a Sol un tono, Sol a La un tono, La a Si un tono, *Si a Do un semitono*. Es la misma T-T-s-T-T-T-s de siempre — y es la razón de que el piano esté armado como está: las dos junturas sin tecla negra caen justo en los semitonos de la escala de Do.",
    },
    {
      kind: "prose",
      title: "Nota sí, nota no",
      text: "Sobre cada nota de la escala se arma una tríada intercalando: *una sí, una no*. Desde Do salen Do-Mi-Sol; desde Re salen Re-Fa-La; y así con las siete.\n\nLo importante es que no elegimos las calidades: *salen solas*. Apilando únicamente notas de la escala, algunos acordes quedan mayores, otros menores y el último disminuido:\n\n*C · Dm · Em · F · G · Am · B°*\n\nÉse es el campo armónico de Do mayor. Siete acordes, todos hechos con las mismas siete notas, y por eso suenan a familia: cualquier secuencia que armes con ellos ya es música en Do.",
    },
    {
      kind: "prose",
      title: "De Do a I",
      text: "Y acá el salto grande de la clase: dejamos de hablar de *C* y empezamos a hablar de *I*. Los siete acordes se numeran I, IIm, IIIm, IV, V, VIm y VII°, y a partir de ahora las secuencias se piensan en números romanos.\n\nNo es un capricho de notación: es lo que hace que una progresión se pueda *mudar de tonalidad sin volver a aprenderla*. La vuelta que funciona en Do funciona en Sol, porque no era de Do: era de los grados.\n\nUna nota sobre la escritura: los menores se ven escritos de dos maneras — *IIm* (como en el cuaderno) o directamente en minúscula, *ii*, que ya dice menor sin la m. Son la misma cosa; los ejercicios usan la minúscula.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "Las tres funciones",
      emoji: "🏠",
      intro:
        "Siete acordes son muchos para pensarlos de a uno. La armonía funcional los agrupa por lo que hacen: hay acordes que son la casa, acordes que piden volver a ella, y acordes intermedios.",
    },
    {
      kind: "prose",
      text: "*Reposo*: I, IIIm y VIm. El I es *la casa*, adonde se tiende a volver; el IIIm y el VIm son sus primos, que comparten casi todas las notas y descansan parecido.\n\n*Tensión (dominante)*: V y VII°. Son los acordes que *piden volver* a la casa o al reposo — tocás un G en Do mayor y el oído ya sabe que falta algo.\n\n*Media tensión (subdominante)*: IIm y IV. Los intermedios: salen de casa, pero sin apurar la vuelta.",
    },
    {
      kind: "funciones",
      title: "El mapa, sonando",
      intro:
        "Tocá cada grado y escuchá a qué familia pertenece. Después las tres cadencias abajo: la diferencia entre saber que el V pide volver y *sentirlo* es apretar el botón.",
    },
    {
      kind: "prose",
      title: "La regla de oro",
      text: "Con las familias armadas, Quique dio la regla para escribir secuencias — la llamó *la regla de oro*:\n\n*En una secuencia de acordes nunca hay que repetir cuatro funciones iguales seguidas. Siempre hay que variar entre las tres funciones.*\n\nPor eso la cadencia más famosa de todos los tiempos es *V → I* — tensión y casa, lo mínimo que se puede variar — y la segunda más famosa es *IIm → V → I*: media tensión, tensión, casa. Las tres funciones en tres acordes.",
    },
    {
      kind: "prose",
      title: "Las cadencias",
      text: "Una cadencia es una manera de cerrar. Las tres de la clase:\n\n*Auténtica*: V → I. La tensión resuelve derecho a la casa.\n\n*Rota o de engaño*: V → VIm. El V promete el I y aterriza en el VIm — que también es reposo, pero no es la casa que el oído esperaba. De ahí el nombre.\n\n*Subdominante o plagal*: V → IV → I, típica de la música clásica. La subdominante se mete en el medio y ablanda la llegada.",
    },
    {
      kind: "prose",
      title: "Los ejercicios en papel",
      text: "Con las reglas en la mano, el ejercicio fue escribir cadencias en papel y que Quique las tocara improvisando una melodía arriba. Una de las que quedaron anotadas:\n\n*C | Em | Am | Dm | F | C*\n\nLeída en funciones: reposo, reposo, reposo, media, media, casa. Tres reposos seguidos — la regla de oro aguanta justo hasta ahí: uno más y la secuencia se quedaba sin viaje. Y todo sonaba bastante bien, que es la gracia de escribir con reglas: el papel ya venía con la música adentro.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "El campo armónico de cuatriadas",
      emoji: "🍀",
      intro:
        "El mismo campo, pero apilando una nota más — la séptima que ya conocemos de la clase 2. Las calidades también salen solas.",
    },
    {
      kind: "prose",
      text: "Con la nota sí / nota no llevado una vuelta más arriba, los siete grados quedan:\n\n*I∆ · IIm7 · IIIm7 · IV∆ · V7 · VIm7 · VII∅*\n\nEl triangulito *∆* es la maj7 —así lo escribe Quique, y así queda—, el V es el único con séptima menor sobre tríada mayor (el *dominante*, el que más pide volver), y el VII sale semidisminuido. Son exactamente las cuatriadas de la clase 2, sólo que ahora se sabe *de dónde salen*: no eran acordes sueltos, eran los siete pisos del mismo edificio.",
    },

    // -----------------------------------------------------------------------
    {
      kind: "section",
      title: "La regla para la melodía",
      emoji: "🎶",
      intro:
        "La armonía sola no alcanza: arriba de los acordes va una melodía. Y la melodía también tiene su regla.",
    },
    {
      kind: "prose",
      title: "Las notas cordales",
      text: "La melodía camina por la escala mayor, pero *al cambiar de grado la nota tiene que ser cordal*: tiene que pertenecer al acorde que está sonando en ese momento. Si abajo hay un C, la melodía cae en Do, Mi o Sol; si el acorde cambia a Am7, cae en La, Do, Mi o Sol.\n\nEn el cuaderno quedó el ejemplo con la progresión escrita abajo y, arriba de cada acorde, su menú de notas cordales — las teclas donde la melodía puede aterrizar cuando ese acorde suena.",
    },
    {
      kind: "prose",
      title: "Largas cordales, cortas de paso",
      text: "La excepción tiene su propia regla: *las notas largas sí o sí son cordales*; las notas cortas pueden ser *notas de paso* — escalones que unen dos cordales sin quedarse a vivir en el medio.\n\nY al pasar quedó dicho algo más grande: si a las siete notas de la escala mayor les sumás todos los sostenidos, aparece la *escala cromática* — las doce teclas. Las de paso salen de ahí: de todo lo que hay entre una cordal y la siguiente.",
    },
  ],

  homework: [
    "Inventar secuencias de acordes con la armonía funcional: variar entre las tres familias, nunca cuatro funciones iguales seguidas, y cerrar con alguna de las tres cadencias.",
    "Inventar una melodía sobre esas secuencias con la ley de las cordales: caer en nota del acorde al cambiar de grado, largas cordales, cortas de paso.",
    "Analizar canciones conocidas en Do: sacar los acordes, ponerles el número romano y la función, y ver si la regla de oro aparece sola.",
  ],

  openQuestions: [
    "La plagal quedó anotada como V → IV → I, pero la plagal de los libros es IV → I a secas. Respondida en la clase 4: la de tres acordes es la cadencia compuesta plagal, y la IV → I a secas es la subdominante auténtica.",
    "En una de las secuencias del papel no me queda claro si el cuarto acorde es F7 o F∆ (y si el B lleva ° o ∅). La cargué aparte de la clase hasta confirmar el cifrado.",
    "¿Reposo incluye al IIIm siempre, o Quique lo va a matizar después? Es el primo raro de la familia: comparte dos notas con el I pero también dos con el V.",
  ],
};

export default lesson;
