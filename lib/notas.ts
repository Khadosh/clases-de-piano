/**
 * De lecturas sueltas a notas.
 *
 * El detector (`lib/pitch.ts`) contesta sesenta veces por segundo "ahora oigo
 * un la". Eso no son notas: es un chorro. Este módulo lo convierte en notas, y
 * resultó ser donde estaba casi todo el problema del micrófono — no en el
 * detector, que es el sospechoso obvio.
 *
 * Vive aparte de React y del Web Audio a propósito. Antes esta lógica estaba
 * adentro de un `useEffect`, enredada con `getUserMedia` y `requestAnimation-
 * Frame`, y para probar un cambio hacía falta levantar el server, abrir un
 * browser con micrófono falso y esperar cuarenta segundos de audio. Acá se
 * prueba con un array a mano (`npm run test:notas`), que es lo que permite
 * jugar con grabaciones distintas sin tocar la app.
 */

/**
 * Qué se oyó en un instante: las **clases** de nota (0 = do … 11 = si).
 *
 * Es una lista y no una nota sola aunque hoy siempre venga una, porque los
 * acordes van a traer varias y no quiero que eso sea un cambio de firma en
 * todos lados. Monofónico es el caso donde la lista tiene un elemento.
 *
 * Van clases y no notas con octava porque el detector se equivoca de octava
 * seguido: una nota real parpadea entre La3 y La4 varias veces mientras suena.
 * Mirando la clase, el parpadeo es invisible.
 */
export type Clases = readonly number[];

export interface Lectura<T = unknown> {
  /** Vacío = silencio. Oír nada es oír el conjunto vacío, y así hay una sola puerta. */
  clases: Clases;
  /** Cuándo se tomó, en milisegundos. Cualquier reloj sirve mientras sea uno solo. */
  t: number;
  /** 0 a 1. Sólo se usa para elegir cuál lectura del tramo representa la nota. */
  claridad?: number;
  /** Lo que el que llama quiera arrastrar hasta el otro lado (la lectura entera). */
  dato?: T;
}

export interface Nota<T = unknown> {
  clases: Clases;
  /** Cuándo empezó a sonar. */
  desde: number;
  /** La lectura más limpia del tramo: la que conviene mostrar. */
  dato: T;
}

export interface OpcionesSegmentador {
  /**
   * Cuánto tiene que durar un tramo para creerle, en milisegundos.
   *
   * Es *la* regla, y es de sentido común: si en "la si la" el si duró veinte
   * milisegundos, ese si no existió. Una nota de piano de verdad dura cientos
   * de milisegundos; lo que dura treinta es el golpe del ataque, una tecla
   * vecina rozada, o el detector enganchando un armónico un instante.
   *
   * Ojo con la tentación de contar lecturas en vez de medir tiempo: la ventana
   * del analizador son ~46ms y avanzamos de a ~17ms, así que **las ventanas se
   * pisan casi enteras** y un blip de 20ms cae adentro de tres o cuatro
   * seguidas. "Tres lecturas iguales" nunca fueron 50ms de evidencia: eran el
   * mismo instante mirado tres veces.
   */
  duracionMinimaMs?: number;
  /**
   * Cuánto silencio hace falta para dar la nota por soltada, en milisegundos.
   *
   * En el medio de una nota tenida hay baches de un frame o dos —el sonido
   * decae, pasa por debajo del umbral y vuelve— y con un bache alcanzaba para
   * que la misma nota volviera a contar.
   */
  silencioMs?: number;
  /** Al menos esta cantidad de lecturas, por si el loop corre muy lento. */
  lecturasMinimas?: number;
}

export const POR_DEFECTO: Required<OpcionesSegmentador> = {
  duracionMinimaMs: 50,
  silencioMs: 100,
  lecturasMinimas: 2,
};

/** ¿Son el mismo conjunto de clases? El orden no importa. */
export function mismasClases(a: Clases, b: Clases): boolean {
  if (a.length !== b.length) return false;
  for (const c of a) if (!b.includes(c)) return false;
  return true;
}

/**
 * El segmentador, para usar en vivo: se le pasa lectura por lectura y devuelve
 * una nota en el instante exacto en que se confirma, o `null`.
 *
 * La gracia está en *cuándo* avisa. No avisa cuando el tramo aparece sino
 * cuando ya duró lo suficiente, y un tramo que no llega a durar muere sin
 * avisar y **sin tocar la última nota contada**. De ahí sale gratis el colapso
 * de "la si la": el si no avisa nunca, y el la que viene después es la misma
 * clase que la última avisada, así que tampoco cuenta.
 */
export function crearSegmentador<T>(opciones: OpcionesSegmentador = {}) {
  const { duracionMinimaMs, silencioMs, lecturasMinimas } = {
    ...POR_DEFECTO,
    ...opciones,
  };

  let ultima: Clases | null = null;
  let tramo: {
    clases: Clases;
    desde: number;
    lecturas: number;
    mejor: Lectura<T>;
    avisado: boolean;
  } | null = null;
  let calladoDesde: number | null = null;

  return {
    /**
     * Una lectura. Devuelve la nota si recién ahora se confirma, o `null`.
     * Con `clases` vacío es silencio.
     */
    lectura(l: Lectura<T>): Nota<T> | null {
      if (l.clases.length === 0) {
        if (calladoDesde === null) calladoDesde = l.t;
        if (l.t - calladoDesde >= silencioMs) {
          ultima = null;
          tramo = null;
        }
        return null;
      }
      calladoDesde = null;

      if (!tramo || !mismasClases(tramo.clases, l.clases)) {
        tramo = {
          clases: l.clases,
          desde: l.t,
          lecturas: 1,
          mejor: l,
          avisado: false,
        };
      } else {
        tramo.lecturas++;
        if ((l.claridad ?? 0) > (tramo.mejor.claridad ?? 0)) tramo.mejor = l;
      }

      if (
        tramo.avisado ||
        tramo.lecturas < lecturasMinimas ||
        l.t - tramo.desde < duracionMinimaMs
      ) {
        return null;
      }
      tramo.avisado = true;
      if (ultima && mismasClases(ultima, tramo.clases)) return null;
      ultima = tramo.clases;
      return {
        clases: tramo.clases,
        desde: tramo.desde,
        dato: tramo.mejor.dato as T,
      };
    },
  };
}

/**
 * Lo mismo pero de una: una tira entera de lecturas y las notas que salen. Es
 * la forma que usan los tests y los scripts de calibración.
 */
export function segmentar<T>(
  lecturas: readonly Lectura<T>[],
  opciones: OpcionesSegmentador = {},
): Nota<T>[] {
  const seg = crearSegmentador<T>(opciones);
  const out: Nota<T>[] = [];
  for (const l of lecturas) {
    const nota = seg.lectura(l);
    if (nota) out.push(nota);
  }
  return out;
}
