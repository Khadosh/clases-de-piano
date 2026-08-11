/**
 * Escribir un WAV a mano.
 *
 * Existe porque `MediaRecorder`, que sería lo cómodo, graba en webm/opus:
 * comprimido con pérdida, pensado para voz, y encima habría que pasarlo por
 * ffmpeg antes de que `npm run calibrar` lo pueda leer. Para calibrar un
 * detector de altura, grabar con un códec que tira los agudos que no se
 * escuchan es exactamente lo que no hay que hacer.
 *
 * Un WAV PCM de 16 bits es un encabezado de 44 bytes y las muestras crudas.
 * Lo escriben los scripts de siempre sin convertir nada.
 */

/** Los pedacitos que va largando el worklet, todos seguidos en un solo array. */
export function unir(trozos: readonly Float32Array[]): Float32Array {
  let n = 0;
  for (const t of trozos) n += t.length;
  const out = new Float32Array(n);
  let i = 0;
  for (const t of trozos) {
    out.set(t, i);
    i += t.length;
  }
  return out;
}

/**
 * De muestras en coma flotante (-1 a 1) a un WAV mono de 16 bits.
 *
 * Las muestras se recortan a -1..1 antes de escalar: el micrófono puede pasarse
 * y sin recorte el número se da vuelta, que suena como un chasquido y le mete
 * ruido de banda ancha justo al detector.
 */
export function aWav(muestras: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(bytes);

  const texto = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };

  texto(0, "RIFF");
  v.setUint32(4, 36 + muestras.length * 2, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true); // tamaño del bloque fmt
  v.setUint16(20, 1, true); // 1 = PCM sin comprimir
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por muestra
  v.setUint16(34, 16, true); // bits por muestra
  texto(36, "data");
  v.setUint32(40, muestras.length * 2, true);

  for (let i = 0; i < muestras.length; i++) {
    const x = Math.max(-1, Math.min(1, muestras[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}
