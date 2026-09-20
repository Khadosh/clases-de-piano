"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icono from "./Icono";
import Pentagrama from "./Pentagrama";
import EdicionCompleta from "./EdicionCompleta";
import Midi from "./Midi";
import { getAudioContext, notaOff, notaOn, pararTodo, wakeAudio } from "@/lib/audio";
import { useMidi } from "@/lib/useMidi";
import { arrancarReloj, type Pulso } from "@/lib/reloj";
import { avanzar, seguimientoDesde, type EstadoDelSeguimiento } from "@/lib/seguimiento";
import { duracionDeCompas, duracionDeEvento, ubicar, vocesDe } from "@/lib/pentagrama";
import type { Pieza } from "@/content/partituras";

/**
 * Una pieza: el pentagrama, el reproductor y el modo de seguirte.
 *
 * Lo que hace que valga la pena que la partitura sea *datos* y no una imagen:
 * la app sabe qué nota es cada cosa, así que puede tocarla, marcarte dónde va
 * mientras suena, empezar desde el compás que le señales y —con el teclado
 * enchufado— esperarte a vos en vez de irse sola.
 */

export type Manos = "ambas" | "derecha" | "izquierda";

/** Una nota suelta, con la duración que le toca a ella y no a su vecina. */
interface NotaSuelta {
  t: number;
  midi: number;
  duracion: number;
}

/** Un instante: todo lo que hay que tocar junto para que la pieza avance. */
interface Momento {
  t: number;
  compas: number;
  midis: number[];
}

/** El chip que se prende y se apaga: el mismo dibujo en todos los controles. */
const chip = (activo: boolean) =>
  `rounded-xl px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
    activo ? "bg-tiza text-noche" : "bg-carta-2 text-humo hover:text-tiza"
  }`;

/**
 * El botón de una acción primaria (tocar, seguir): mismo molde que `chip`,
 * un poco más grande, y con uno de los dos únicos acentos de todo el riel —
 * `sol` para "arrancame" y `brasa` para "esto está pasando, tocá para
 * parar". Nada de un color por botón: antes cada uno tenía el suyo (verde,
 * violeta, naranja) y competían todos entre sí.
 */
const chipAccion = (estado: "listo" | "activo") =>
  `rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
    estado === "activo" ? "bg-brasa text-noche" : "bg-sol text-noche hover:brightness-110"
  }`;

/** Una etiqueta de sección: bloque en desktop (adentro del riel), en línea en el celular. */
const etiqueta = "text-xs tracking-[0.2em] text-humo uppercase lg:mb-2 lg:block";

/**
 * Opciones que se excluyen entre sí, como **un solo control partido en
 * gajos** y no tres pastillas sueltas. Además de leerse como una sola cosa,
 * es lo que hace que cada grupo entre en una línea del riel: las pastillas
 * con su aire propio envolvían a dos renglones apenas la palabra era larga.
 */
function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { valor: T; nombre: string }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-noche/60 p-1 lg:flex lg:w-full">
      {opciones.map((o) => (
        <button
          key={o.valor}
          onClick={() => onCambio(o.valor)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition lg:flex-1 lg:px-1 ${
            valor === o.valor ? "bg-tiza text-noche" : "text-humo hover:text-tiza"
          }`}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

export default function Partitura({ pieza }: { pieza: Pieza }) {
  const [manos, setManos] = useState<Manos>("ambas");
  const [sonando, setSonando] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [i, setI] = useState(0);
  const [errores, setErrores] = useState(0);
  /** Las notas que te comiste y la partitura dio por pasadas para alcanzarte. */
  const [comidas, setComidas] = useState(0);
  const [bpm, setBpm] = useState(pieza.bpm);
  const [desdeCompas, setDesdeCompas] = useState(0);
  /** El pedazo que se está practicando, en compases (ambos inclusive). */
  const [recorte, setRecorte] = useState<{ desde: number; hasta: number } | null>(null);
  const [repetir, setRepetir] = useState(false);
  const [metronomo, setMetronomo] = useState(false);
  /** En loop: cada vuelta sube 4 bpm. El speed trainer de toda la vida. */
  const [acelerando, setAcelerando] = useState(false);
  const [vista, setVista] = useState<"cuaderno" | "edicion">("cuaderno");
  const pararRef = useRef<(() => void) | null>(null);
  /**
   * El metrónomo, cuando corre: en qué pulso va. `null` es que no corre. Es
   * un reloj aparte de la pieza (`lib/reloj.ts`) y por eso lo comparten los
   * dos modos: escuchándola se suma a la grilla de la pasada; siguiéndote es
   * el único reloj que hay.
   */
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const relojRef = useRef<(() => void) | null>(null);
  /**
   * Hasta cuándo (reloj del audio) dura la cuenta previa del seguimiento.
   * Mientras tanto las teclas no cuentan: todavía no entraste.
   */
  const cuentaHastaRef = useRef(0);
  /**
   * La pasada que está sonando, para que el metrónomo prendido a mitad de
   * camino se sume a su grilla en vez de arrancar una propia.
   */
  const pasadaRef = useRef<{ arranque: number; segundosPorRedonda: number } | null>(null);
  const repetirRef = useRef(repetir);
  repetirRef.current = repetir;
  // Por ref porque el loop se rearma solo desde adentro de un closure viejo:
  // el bpm que subió el acelerando tiene que llegarle al arranque siguiente.
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const metronomoRef = useRef(metronomo);
  metronomoRef.current = metronomo;
  const acelerandoRef = useRef(acelerando);
  acelerandoRef.current = acelerando;
  const tocarRef = useRef<((desde: number) => void) | null>(null);

  /**
   * La pieza en dos vistas: las notas sueltas para tocarla y los instantes para
   * seguirte.
   *
   * Van separadas porque **cada nota conserva su duración**. Antes se juntaban
   * en un solo instante con la duración más larga, y en la Oda a la alegría eso
   * hacía que las negras de la derecha sonaran un compás entero, como la
   * redonda de la izquierda: quedaba todo pisado.
   */
  const { notas, momentos } = useMemo(() => {
    // Cada mano puede traer más de una voz, y para tocar y para seguirte da lo
    // mismo de cuál venga cada nota: lo que importa es cuándo suena.
    const filas: [Manos, ReturnType<typeof ubicar>][] = [
      ...vocesDe(pieza.derecha).map(
        (v) => ["derecha", ubicar(v, pieza.compas)] as [Manos, ReturnType<typeof ubicar>],
      ),
      ...vocesDe(pieza.izquierda).map(
        (v) => ["izquierda", ubicar(v, pieza.compas)] as [Manos, ReturnType<typeof ubicar>],
      ),
    ];
    const notas: NotaSuelta[] = [];
    const por = new Map<number, Momento>();
    for (const [mano, fila] of filas) {
      if (manos !== "ambas" && manos !== mano) continue;
      // **Una ligada no se vuelve a atacar: alarga a la anterior.** Es todo lo
      // que una ligadura significa para el sonido. Vale también para el que te
      // sigue: la continuación no es un instante nuevo, no hay que tocarla.
      let anteriores = new Map<number, NotaSuelta>();
      for (const n of fila) {
        if (n.midis.length === 0) {
          anteriores = new Map();
          continue;
        }
        const duracion = duracionDeEvento(n);
        if (n.ligada) {
          const seguidas = new Map<number, NotaSuelta>();
          for (const midi of n.midis) {
            const previa = anteriores.get(midi);
            if (previa) {
              previa.duracion += duracion;
              seguidas.set(midi, previa);
            } else {
              // Una ligada sin nota anterior es un error de datos: mejor que
              // suene a que desaparezca en silencio.
              const suelta = { t: n.t, midi, duracion };
              notas.push(suelta);
              seguidas.set(midi, suelta);
            }
          }
          anteriores = seguidas;
          continue;
        }
        anteriores = new Map();
        for (const midi of n.midis) {
          const suelta = { t: n.t, midi, duracion };
          notas.push(suelta);
          anteriores.set(midi, suelta);
        }
        const clave = Math.round(n.t * 1e6);
        const previo = por.get(clave);
        if (previo) previo.midis.push(...n.midis);
        else por.set(clave, { t: n.t, compas: n.compas, midis: [...n.midis] });
      }
    }
    return {
      notas: notas.sort((a, b) => a.t - b.t),
      momentos: [...por.values()].sort((a, b) => a.t - b.t),
    };
  }, [pieza, manos]);

  const finMusical = notas.reduce((s, n) => Math.max(s, n.t + n.duracion), 0);
  const totalCompases =
    Math.ceil(finMusical / duracionDeCompas(pieza.compas) - 1e-9) || 1;

  const largoCompas = duracionDeCompas(pieza.compas);

  const pararReloj = useCallback(() => {
    relojRef.current?.();
    relojRef.current = null;
    cuentaHastaRef.current = 0;
    setPulso(null);
  }, []);

  const encenderReloj = useCallback(
    (o: { arranque: number; segundosPorRedonda: () => number; cuenta: boolean }) => {
      pararReloj();
      cuentaHastaRef.current = o.cuenta ? o.arranque : 0;
      relojRef.current = arrancarReloj({ compas: pieza.compas, ...o, mostrar: setPulso });
    },
    [pararReloj, pieza.compas],
  );

  const parar = useCallback(() => {
    pararRef.current?.();
    pararRef.current = null;
    pararReloj();
    pasadaRef.current = null;
    setTocando(false);
    setSonando(null);
  }, [pararReloj]);

  /**
   * Toca la pieza. Todo se agenda de una contra el reloj del audio y la imagen
   * va por `requestAnimationFrame` — los dos relojes de siempre. Si el navegador
   * se traba, se atrasa el dibujo y no el sonido.
   */
  const tocar = useCallback(
    async (desde: number) => {
      pararRef.current?.();
      setSiguiendo(false);
      // Con un pedazo recortado se toca el pedazo: el arranque se mete adentro
      // y el final llega hasta la barra del último compás del recorte.
      if (recorte) desde = Math.min(Math.max(desde, recorte.desde), recorte.hasta);
      const fin = recorte
        ? Math.min(finMusical, (recorte.hasta + 1) * largoCompas)
        : finMusical;
      // **Hay que esperar el piano.** Acá se agenda la pieza entera de una, así
      // que si los samples todavía no llegaron quedan cuarenta segundos
      // agendados con los osciladores y ya no hay vuelta atrás. Se nota
      // muchísimo en la mano izquierda: los graves con oscilador casi no suenan.
      setCargando(true);
      await wakeAudio();
      setCargando(false);
      const ctx = getAudioContext();
      if (!ctx) return;
      setTocando(true);

      const t0Musical = desde * largoCompas;
      // Una redonda dura cuatro negras, así que el bpm de negra manda. Se lee
      // por ref al arrancar cada pasada: el acelerando del loop lo va subiendo.
      const segundosPorRedonda = (60 / bpmRef.current) * 4;
      // **El metrónomo te cuenta un compás antes de entrar.** Sin eso, con el
      // loop puesto la música arranca sola y nunca sabés cuándo poner las
      // manos: la vuelta empieza con un compás de cuenta y recién ahí suena.
      // El click es del reloj aparte, clavado al tempo de esta pasada.
      const cuentaPrevia = metronomoRef.current ? largoCompas * segundosPorRedonda : 0;
      const arranque = ctx.currentTime + 0.15 + cuentaPrevia;
      const aSegundos = (t: number) => arranque + (t - t0Musical) * segundosPorRedonda;
      pasadaRef.current = { arranque, segundosPorRedonda };
      if (metronomoRef.current) {
        encenderReloj({ arranque, segundosPorRedonda: () => segundosPorRedonda, cuenta: true });
      }

      // **No se agenda la pieza entera: se agenda lo que viene.** La primera
      // versión mandaba todo de una y el botón de parar no podía parar nada —
      // cada nota ya tenía su apagado agendado y Tone la había soltado de su
      // lista. Ahora cada nota son dos eventos, apretar y soltar, y un timer
      // los va despachando 150ms antes de su hora contra el reloj del audio
      // (los dos relojes de siempre, como el metrónomo). Parar es dejar de
      // despachar y soltar lo apretado: las notas que faltaban nunca llegan a
      // existir.
      type Evento = { t: number; tipo: "on" | "off"; midi: number; dur: number };
      const eventos: Evento[] = [];
      for (const n of notas) {
        if (n.t < t0Musical - 1e-9) continue;
        if (n.t >= fin - 1e-9) continue;
        const dur = n.duracion * segundosPorRedonda * 0.95;
        eventos.push({ t: aSegundos(n.t), tipo: "on", midi: n.midi, dur });
        eventos.push({ t: aSegundos(n.t) + dur, tipo: "off", midi: n.midi, dur });
      }
      eventos.sort((a, b) => a.t - b.t);
      let proximo = 0;
      const despachar = () => {
        const horizonte = ctx.currentTime + 0.15;
        while (proximo < eventos.length && eventos[proximo].t <= horizonte) {
          const e = eventos[proximo++];
          if (e.tipo === "on") notaOn(e.midi, e.t, e.dur);
          else notaOff(e.midi, e.t);
        }
      };
      despachar();
      const timer = setInterval(despachar, 25);

      let raf = 0;
      const mirar = () => {
        const t = t0Musical + (ctx.currentTime - arranque) / segundosPorRedonda;
        if (t >= fin) {
          // El pedazo en loop: al llegar a la barra vuelve a arrancar. Es para
          // lo que existe el recorte — el pasaje que no sale se repite hasta
          // que salga, sin volver a apuntarle al botón. Con el acelerando
          // puesto, cada vuelta sube 4 bpm: el speed trainer de toda la vida.
          if (repetirRef.current && recorte) {
            if (acelerandoRef.current) {
              const nuevo = Math.min(bpmRef.current + 4, 160);
              bpmRef.current = nuevo;
              setBpm(nuevo);
            }
            tocarRef.current?.(recorte.desde);
            return;
          }
          clearInterval(timer);
          pararReloj();
          pasadaRef.current = null;
          setTocando(false);
          setSonando(null);
          return;
        }
        // Durante la cuenta previa no hay nada que resaltar todavía.
        setSonando(t < t0Musical ? null : t);
        raf = requestAnimationFrame(mirar);
      };
      raf = requestAnimationFrame(mirar);

      pararRef.current = () => {
        cancelAnimationFrame(raf);
        clearInterval(timer);
        pararTodo();
        pararReloj();
        pasadaRef.current = null;
      };
    },
    [notas, largoCompas, finMusical, recorte, encenderReloj, pararReloj],
  );
  tocarRef.current = tocar;

  useEffect(() => () => pararRef.current?.(), []);

  // ---- Seguirte a vos ------------------------------------------------------

  const caja = useRef<HTMLDivElement>(null);
  /**
   * El seguimiento entre tecla y tecla vive en `lib/seguimiento.ts` como un
   * valor: acá sólo se lo guarda por ref y se copia a estado lo que se dibuja.
   * `i` va aparte porque también lo mueve tocar un compás del pentagrama.
   */
  const seguimientoRef = useRef<EstadoDelSeguimiento>(seguimientoDesde(0));
  const instantesRef = useRef<number[][]>([]);
  const limiteRef = useRef(0);
  instantesRef.current = useMemo(() => momentos.map((m) => m.midis), [momentos]);
  // Con recorte, el seguimiento no puede saltar más allá de su última nota.
  const primeroAfuera = recorte === null ? -1 : momentos.findIndex((m) => m.compas > recorte.hasta);
  limiteRef.current = primeroAfuera < 0 ? momentos.length : primeroAfuera;
  const iRef = useRef(i);
  iRef.current = i;
  const siguiendoRef = useRef(siguiendo);
  siguiendoRef.current = siguiendo;

  /** Una tecla mientras te sigue: se juega `avanzar` y se dibuja lo que cambió. */
  const alTocar = useCallback((midi: number) => {
    if (!siguiendoRef.current) return;
    // Durante la cuenta previa del metrónomo no entraste todavía.
    const ac = getAudioContext();
    if (ac && ac.currentTime < cuentaHastaRef.current) return;
    const antes = { ...seguimientoRef.current, i: iRef.current };
    const despues = avanzar(antes, instantesRef.current, midi, limiteRef.current);
    seguimientoRef.current = despues;
    if (despues.i !== antes.i) setI(despues.i);
    if (despues.deMas !== antes.deMas) setErrores(despues.deMas);
    if (despues.comidas !== antes.comidas) setComidas(despues.comidas);
  }, []);

  const { estado: estadoMidi, dispositivos } = useMidi({ caja, onNota: ({ midi }) => alTocar(midi) });
  const hayTeclado = estadoMidi === "conectado";

  const momentoActual = siguiendo ? momentos[i] : null;
  // Con recorte, el seguimiento también termina en la barra del recorte.
  const terminada =
    siguiendo &&
    (i >= momentos.length ||
      (recorte !== null && (momentos[i]?.compas ?? Infinity) > recorte.hasta));

  /**
   * Un compás de cuenta antes de seguirte: el tiempo de poner las manos y de
   * agarrar el tempo. Es del metrónomo y no de "seguime": sin él no hay
   * reloj, así que no hay qué contar — la partitura te espera igual.
   */
  const contarParaSeguir = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Acá no hay pasada: el reloj es el único tempo, y el slider lo mueve en vivo.
    const segundosPorRedonda = () => (60 / bpmRef.current) * 4;
    encenderReloj({
      arranque: ctx.currentTime + 0.15 + largoCompas * segundosPorRedonda(),
      segundosPorRedonda,
      cuenta: true,
    });
  };

  const arrancarSeguimiento = () => {
    wakeAudio();
    parar();
    setSiguiendo(true);
    const desde = recorte
      ? Math.min(Math.max(desdeCompas, recorte.desde), recorte.hasta)
      : desdeCompas;
    setI(indiceDelCompas(momentos, desde));
    setErrores(0);
    setComidas(0);
    seguimientoRef.current = seguimientoDesde(0);
    if (metronomoRef.current) contarParaSeguir();
  };

  const dejarDeSeguir = () => {
    setSiguiendo(false);
    pararReloj();
  };

  // Llegaste al final: el metrónomo no tiene más nada que marcar.
  useEffect(() => {
    if (terminada) pararReloj();
  }, [terminada, pararReloj]);

  /**
   * El chip del metrónomo, y qué pasa si lo prendés en el medio: con la
   * pieza sonando, el click se suma a su grilla sin cuenta previa; mientras
   * te sigo, un compás de cuenta para agarrar el tempo, y recién después
   * vuelven a contar las teclas. Apagarlo lo calla, siempre.
   */
  const alternarMetronomo = () => {
    const puesto = !metronomo;
    setMetronomo(puesto);
    metronomoRef.current = puesto;
    if (!puesto) {
      pararReloj();
      return;
    }
    if (pasadaRef.current) {
      const { arranque, segundosPorRedonda } = pasadaRef.current;
      encenderReloj({ arranque, segundosPorRedonda: () => segundosPorRedonda, cuenta: false });
    } else if (siguiendo && !terminada) {
      contarParaSeguir();
    }
  };

  /**
   * El metrónomo en pantalla: durante la cuenta previa los números grandes
   * (es lo que te dice cuándo entrar), después el pulso del compás con el
   * tiempo actual prendido. Mismo tamaño en los dos, para que no salte.
   */
  const estadoReloj = pulso && (
    <div className="flex items-center gap-3">
      <span className="text-xs tracking-[0.2em] text-humo uppercase">
        {pulso.cuenta !== null ? "Entrás en" : "Pulso"}
      </span>
      <div className="flex gap-2.5 font-display text-2xl font-black">
        {Array.from({ length: pieza.compas.numerador }, (_, k) => {
          const prendido = pulso.cuenta !== null ? pulso.cuenta === k + 1 : pulso.pulso === k;
          return (
            <span
              key={k}
              className={
                !prendido ? "text-borde" : pulso.cuenta !== null ? "text-sol" : "text-tiza"
              }
            >
              {k + 1}
            </span>
          );
        })}
      </div>
    </div>
  );

  // El estado de "seguirte" —compás, cuántas van, errores— y el metrónomo
  // aparecen en dos lugares distintos según el tamaño de pantalla (pegado al
  // pie de la partitura en desktop, adentro de la barra de tocar en el
  // celular), pero es el mismo contenido en los dos: se arma acá una sola vez.
  const estadoSeguimiento = (siguiendo || pulso !== null) && (
    <div className="rounded-2xl bg-noche px-4 py-3 sm:px-5 sm:py-4">
      {estadoReloj && <div className={siguiendo ? "mb-3" : ""}>{estadoReloj}</div>}
      {!siguiendo ? null : terminada ? (
        <>
          <p className="font-display text-2xl font-bold text-menta">
            Hasta el final <Icono de="festejo" />
          </p>
          <p className="mt-1 text-sm text-humo">
            {errores === 0 && comidas === 0
              ? "Sin una nota de más ni una de menos."
              : [
                  errores > 0 && `${errores} ${errores === 1 ? "nota" : "notas"} que no iban`,
                  comidas > 0 && `${comidas} que ${comidas === 1 ? "faltó" : "faltaron"}`,
                ]
                  .filter(Boolean)
                  .join(", y ") + "."}
          </p>
          <button onClick={arrancarSeguimiento} className={`mt-3 ${chipAccion("listo")}`}>
            Otra vez
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <p className="text-xs tracking-[0.2em] text-humo uppercase">Compás</p>
              <p className="font-display text-3xl font-black text-sol">
                {(momentoActual?.compas ?? 0) + 1}
                <span className="text-base text-humo">/{totalCompases}</span>
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.2em] text-humo uppercase">Van</p>
              <p className="font-mono text-lg">
                {i}/{momentos.length}
              </p>
            </div>
            {errores > 0 && (
              <p className="font-mono text-sm text-brasa">{errores} de más</p>
            )}
            {comidas > 0 && (
              <p className="font-mono text-sm text-brasa">{comidas} de menos</p>
            )}
          </div>
          <p className="mt-2 hidden text-xs text-humo sm:block">
            La partitura avanza cuando tocás todas las notas de ese instante,
            no con el reloj: el metrónomo marca el pulso pero no te apura. La
            octava no importa. Si te comés una nota y seguís, te alcanza en la
            que viene. Tocá un compás del pentagrama para saltar ahí.
          </p>
        </>
      )}
    </div>
  );

  return (
    // En desktop son dos tarjetas hermanas ADENTRO de la columna de siempre:
    // la hoja (la partitura, cerrada por los cuatro lados) y el riel de
    // controles a su derecha, `sticky` mientras la hoja sigue para abajo. El
    // par respeta el mismo `max-w-5xl` que todo el sitio — se probó romperlo
    // con un full-bleed y se volvió: rompía la simetría de la app, y el
    // `100vw` del truco cuenta la barra de scroll, así que metía overflow
    // horizontal en cualquier máquina con scrollbars de verdad. El estado de
    // "seguirte" no va en el riel: es información sobre LA PARTITURA, así que
    // queda pegado al pie de la hoja, no a los botones. En el celular todo
    // vuelve a ser una sola tarjeta apilada, con la barra de tocar pegada al
    // pie de la ventana.
    <div ref={caja} className="max-lg:card lg:flex lg:items-start lg:gap-5">
        {/* La hoja: la partitura, una tarjeta que cierra. */}
        <div className="lg:card lg:min-w-0 lg:flex-1">
          {vista === "edicion" && pieza.fuente ? (
            <div className="p-4 print:partitura-papel">
              <EdicionCompleta fuente={pieza.fuente} />
            </div>
          ) : (
            <div className="overflow-x-auto p-4 print:partitura-papel">
              <Pentagrama
                derecha={pieza.derecha}
                izquierda={pieza.izquierda}
                compas={pieza.compas}
                tonalidad={pieza.tonalidad}
                sonando={siguiendo ? (momentoActual?.t ?? null) : sonando}
                apagada={
                  manos === "derecha" ? "izquierda" : manos === "izquierda" ? "derecha" : undefined
                }
                rango={recorte ?? undefined}
                onCompas={(c) => {
                  setDesdeCompas(c);
                  if (siguiendo) {
                    setI(indiceDelCompas(momentos, c));
                    seguimientoRef.current = { ...seguimientoRef.current, puestas: [] };
                  } else {
                    tocar(c);
                  }
                }}
              />
              <p className="mt-2 text-xs text-humo print:hidden">
                ¿Una nota no se deja leer? Primero decidí cuál te parece que es,
                y después apoyale el mouse o el dedo: te la sopla — y si con lo
                demás que suena forma un acorde conocido, también.
              </p>
            </div>
          )}

          {/* Sólo en desktop: en el celular este mismo estado vive adentro de
              la barra de tocar, más abajo. El borde superior dorado es la
              única marca de que esto está vivo — una sombra no se nota casi
              nada sobre un fondo ya oscuro. */}
          {estadoSeguimiento && (
            <div className="hidden print:hidden lg:sticky lg:bottom-4 lg:z-10 lg:mx-4 lg:mb-4 lg:block lg:overflow-hidden lg:rounded-2xl lg:border lg:border-t-2 lg:border-borde lg:border-t-sol">
              {estadoSeguimiento}
            </div>
          )}
        </div>

        {/* El riel: toda la configuración y el disparador de reproducción,
            un único panel — la misma tarjeta que la partitura (`lg:card`),
            no dos piezas pegadas con cinta. Adentro, tres secciones con el
            mismo ritmo: una etiqueta en bloque, sus controles, un borde que
            separa a la siguiente. */}
        {/* `contents` en el celular: el <aside> tiene que desaparecer como
            caja. `position: sticky` no "flota" en el aire — necesita que su
            padre directo sea alto, porque es contra ESE padre que se mide
            cuánto puede recorrer antes de despegarse. Con el <aside> como
            caja propia, su contenido es casi toda su altura, así que no
            había margen para pegarse a nada: quedaba tal cual caía en el
            documento, a catorce mil píxeles de la partitura del Claro de
            luna. `contents` saca al <aside> del medio en el celular — sus
            hijos pasan a ser hijos directos de la tarjeta entera, que sí es
            alta — y en desktop vuelve a ser una caja real, con su propia
            tarjeta, para poder ser el riel `sticky`. */}
        <aside className="contents print:hidden lg:sticky lg:top-20 lg:card lg:block lg:w-[256px] lg:shrink-0 lg:overflow-hidden">
          {/* La vista (nuestro cuaderno o la edición completa, si hay de dónde)
              y el botón de imprimir. En el papel no hay ni una cosa ni la
              otra: se elige antes de imprimir, así que las dos quedan afuera
              de la hoja. */}
          <div className="flex flex-wrap items-center gap-2 px-4 pt-4 lg:p-4">
            {pieza.fuente && (
              <>
                <span className={etiqueta}>Vista</span>
                <Segmentado
                  opciones={[
                    { valor: "cuaderno", nombre: "el cuaderno" },
                    { valor: "edicion", nombre: "edición" },
                  ]}
                  valor={vista}
                  onCambio={setVista}
                />
                {vista === "edicion" && (
                  <span className="text-xs text-humo">
                    la partitura original, con lo que nuestra transcripción
                    todavía no tiene — lo que suena sigue siendo lo nuestro
                  </span>
                )}
              </>
            )}
            <button
              onClick={() => window.print()}
              className={`${chip(false)} flex items-center justify-center gap-1.5 lg:w-full`}
            >
              <Icono de="imprimir" /> Imprimir
            </button>
          </div>

          {/* Manos y compases: qué se toca. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-borde/60 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-4 lg:p-4">
            <div>
              <span className={etiqueta}>Manos</span>
              <Segmentado
                opciones={[
                  { valor: "izquierda", nombre: "izquierda" },
                  { valor: "derecha", nombre: "derecha" },
                  { valor: "ambas", nombre: "las dos" },
                ]}
                valor={manos}
                onCambio={(m) => {
                  parar();
                  setManos(m);
                }}
              />
            </div>

            {/* El pedazo: practicar sólo un rango de compases, con repetición. */}
            {totalCompases > 1 && (
              <div>
                <span className={etiqueta}>Compases</span>
                <span className="flex flex-wrap items-center gap-1.5 text-sm text-humo">
                  <input
                    type="number"
                    min={1}
                    max={totalCompases}
                    value={recorte ? recorte.desde + 1 : 1}
                    onChange={(e) => {
                      parar();
                      const desde = Math.min(
                        Math.max(Number(e.target.value) - 1, 0),
                        totalCompases - 1,
                      );
                      const hasta = Math.max(recorte?.hasta ?? totalCompases - 1, desde);
                      setRecorte({ desde, hasta });
                      setDesdeCompas(desde);
                    }}
                    className="w-13 rounded-xl bg-carta-2 px-2 py-1.5 text-center font-mono text-sm"
                    aria-label="Desde el compás"
                  />
                  <span>al</span>
                  <input
                    type="number"
                    min={1}
                    max={totalCompases}
                    value={recorte ? recorte.hasta + 1 : totalCompases}
                    onChange={(e) => {
                      parar();
                      const hasta = Math.min(
                        Math.max(Number(e.target.value) - 1, 0),
                        totalCompases - 1,
                      );
                      const desde = Math.min(recorte?.desde ?? 0, hasta);
                      setRecorte({ desde, hasta });
                      setDesdeCompas(desde);
                    }}
                    className="w-13 rounded-xl bg-carta-2 px-2 py-1.5 text-center font-mono text-sm"
                    aria-label="Hasta el compás"
                  />
                </span>
              </div>
            )}
            {recorte && (
              <span className="flex flex-wrap items-center gap-1.5 text-sm text-humo">
                <button onClick={() => setRepetir(!repetir)} className={chip(repetir)}>
                  ⟳ en loop
                </button>
                {repetir && (
                  <button
                    onClick={() => setAcelerando(!acelerando)}
                    className={chip(acelerando)}
                    title="Cada vuelta del loop sube 4 bpm"
                  >
                    acelerando
                  </button>
                )}
                <button
                  onClick={() => {
                    parar();
                    setRecorte(null);
                    setRepetir(false);
                    setAcelerando(false);
                    setDesdeCompas(0);
                  }}
                  className="text-xs underline decoration-dotted underline-offset-2 hover:text-tiza"
                >
                  toda la pieza
                </button>
              </span>
            )}
          </div>

          {/* Tocar, seguir, metrónomo, bpm. En el celular esta franja queda
              pegada al pie de la ventana: es lo que se usa mientras suena,
              así que tiene que estar siempre a mano del pulgar. En desktop
              ya no arma su propia tarjeta —la tarjeta es todo el riel—, es
              sólo la última sección, separada con el mismo borde que las
              otras dos. */}
          <div className="sticky bottom-0 z-10 rounded-b-[inherit] border-t border-borde/60 bg-noche-2/95 backdrop-blur lg:static lg:rounded-none lg:border-borde/60 lg:bg-transparent lg:backdrop-blur-none">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-2 lg:p-4">
              {tocando ? (
                <button onClick={parar} className={`${chipAccion("activo")} flex justify-center`}>
                  ■ Parar
                </button>
              ) : (
                <button
                  onClick={() => tocar(desdeCompas)}
                  disabled={cargando}
                  className={`${chipAccion("listo")} flex justify-center disabled:opacity-60`}
                >
                  {cargando ? "…" : "▶ Escucharla"}
                </button>
              )}

              <button
                onClick={siguiendo ? dejarDeSeguir : arrancarSeguimiento}
                className={`${chipAccion(siguiendo ? "activo" : "listo")} flex items-center justify-center gap-1.5`}
              >
                {siguiendo ? (
                  "■ Dejar de seguirme"
                ) : (
                  <>
                    <Icono de={hayTeclado ? "piano" : "dedo"} /> Seguime
                  </>
                )}
              </button>

              <button
                onClick={alternarMetronomo}
                className={`${chip(metronomo)} lg:w-full`}
                title="Un compás de cuenta para entrar y el pulso marcado mientras suena — escuchándola o siguiéndote"
              >
                <Icono de="metronomo" /> metrónomo
              </button>

              {desdeCompas > 0 && (
                <span className="whitespace-nowrap rounded-xl bg-carta-2 px-3 py-1.5 font-mono text-xs text-humo lg:w-full lg:text-center">
                  desde el compás {desdeCompas + 1}
                  <button
                    onClick={() => setDesdeCompas(0)}
                    className="ml-2 underline decoration-dotted underline-offset-2 hover:text-tiza"
                  >
                    al principio
                  </button>
                </span>
              )}

              <label className="ml-auto flex items-center gap-2 whitespace-nowrap text-sm text-humo lg:ml-0 lg:mt-1">
                <span className="font-mono">{bpm} bpm</span>
                <input
                  type="range"
                  min={30}
                  max={160}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-24 accent-sol sm:w-36 lg:w-full"
                />
              </label>
            </div>

            {/* Sólo en el celular: en desktop este mismo estado ya se ve
                pegado al pie de la partitura, arriba. */}
            {estadoSeguimiento && (
              <div className="border-t border-borde/60 px-4 pb-4 lg:hidden">
                <div className="mt-3">{estadoSeguimiento}</div>
              </div>
            )}
          </div>

          {siguiendo && (
            <div className="border-t border-borde/60 px-4 py-4 lg:p-4">
              <Midi
                estado={estadoMidi}
                dispositivos={dispositivos}
                pista="— tocá la pieza y te sigo"
                invitacion="¿Tenés un teclado? Conectalo y la partitura te espera a vos"
                cierre="Con el teclado conectado, la partitura no se va sola: avanza cuando tocás lo que dice, y se queda esperándote si te trabás."
              />
            </div>
          )}
        </aside>
    </div>
  );
}

/** El primer instante que cae en ese compás, para poder empezar desde ahí. */
function indiceDelCompas(momentos: Momento[], compas: number): number {
  const i = momentos.findIndex((m) => m.compas >= compas);
  return i < 0 ? 0 : i;
}
