# De dónde salen las claves del pentagrama

Las claves de `components/Pentagrama.tsx` (`TRAZO_CLAVE_SOL` y
`TRAZO_CLAVE_FA`) son los contornos de la fuente **Gonville** (Simon Tatham),
sacados de **VexFlow** (MIT), que los trae como datos de glifo. Se dibujaron a
mano primero, con trazos superpuestos, y a tamaño real se leían; al lado de una
edición de verdad eran un garabato. El contorno de una clave es un problema de
tipógrafo y ya estaba resuelto.

Receta, por si hay que volver a extraerlos (otro glifo, otra figura):

1. `npm pack opensheetmusicdisplay` y descomprimir. Adentro de
   `build/opensheetmusicdisplay.min.js` está la tabla de glifos de VexFlow
   (buscar `glyphs:{`). La clave de sol es `v83`, la de fa es `v79`.
2. El campo `o` del glifo es una lista de operaciones: `m x y` (moveTo),
   `l x y` (lineTo) y `b destX destY c1x c1y c2x c2y` — ojo que en las curvas
   **el destino va primero** y los puntos de control después, al revés que en
   SVG.
3. El eje y va **para arriba** (coordenadas de fuente): al pasar a SVG se
   niega.
4. La escala: **333⅓ unidades de fuente por espacio de pentagrama**. Con eso
   las medidas dan las canónicas (la de sol: 4,5 espacios sobre su línea y 2,6
   por debajo). El origen del glifo ya está sobre la línea que la clave nombra,
   que es la misma convención de `yDeAltura`, así que no hay que trasladar
   nada: se escala y listo.
5. Antes de pegarlo, mirarlo sobre un pentagrama dibujado, grande y a tamaño
   real a la vez. Es un script de un rato y es la diferencia entre corregir y
   adivinar.
