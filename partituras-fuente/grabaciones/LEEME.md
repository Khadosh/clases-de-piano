# Las grabaciones de las piezas propias

El JSON que baja `/grabar` con lo que se tocó en el teclado MIDI: cada nota
con su milisegundo, su velocidad y —desde septiembre de 2026— cuánto duró.
Están acá por lo mismo que los `.mxl`: para poder volver a importar cuando el
importador mejore, y para comparar cuando el dibujo no cierre con lo que se
tocó.

```sh
npm run importar:grabacion -- partituras-fuente/grabaciones/pum-cha-en-la-menor.json \
  --bpm 84 --slug pum-cha-en-la-menor --titulo "Pum-chá en La menor" --tonica 9 --modo menor
```

Escupe el objeto listo para pegar en `content/partituras.ts` con `revisar`
ya escrito, y por la salida de error lo que supuso: el bpm si no se lo
pasaron, las notas sin note-off, las duraciones raras.

| Archivo | Pieza | Qué es |
|---|---|---|
| `pum-cha-en-la-menor.json` | Pum-chá en La menor | El primer pum-chá, 19 de septiembre de 2026. Sin note-off: es anterior a que el grabador los guardara. |
| `pum-cha-con-los-de-paso.json` | Pum-chá en La menor, con los de paso | Un día después, con el C7 rodado y el E7 plaqué. Importada con `--pulso izquierda`; el C7 se corrigió a mano (ver el `revisar` de la pieza). Sin note-off. |
| `pum-cha-con-los-de-paso-toma-2.json` | la misma | La segunda toma, minutos después, ya con note-off. Confirma la primera: mismo C7 con el Si natural y el Do3 rozado, mismo acorde final casi sin velocidad. Con las duraciones de verdad sale todo staccato (corchea y aire), así que se importa con `--sin-duracion --ventana 100`. |
