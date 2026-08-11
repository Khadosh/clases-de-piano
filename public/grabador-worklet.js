/**
 * Junta las muestras crudas del micrófono y se las pasa a la página.
 *
 * Es un AudioWorklet y no un ScriptProcessorNode (que sería más corto) porque
 * el ScriptProcessor corre en el hilo principal: cualquier render de React en
 * el medio se come muestras, y una grabación con huecos no sirve para calibrar
 * nada. Acá corre en el hilo de audio, que es lo único que no se interrumpe.
 *
 * Vive en public/ y no en lib/ porque un worklet se carga por URL, no se
 * importa. Es nuestro igual: no baja de ningún CDN.
 */
class Grabador extends AudioWorkletProcessor {
  process(entradas) {
    const canal = entradas[0]?.[0];
    // Sin entrada conectada `process` igual se llama; devolver true la mantiene
    // viva hasta que la página corte el nodo.
    if (canal && canal.length) {
      // Copia obligatoria: el búfer que llega se reusa en el frame siguiente.
      this.port.postMessage(new Float32Array(canal));
    }
    return true;
  }
}

registerProcessor("grabador", Grabador);
