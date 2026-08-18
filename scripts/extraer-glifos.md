# De dónde salen los glifos del pentagrama

Todo lo que en `components/Pentagrama.tsx` se dibuja como símbolo —las claves,
las cabezas de las notas, los silencios, las banderas y las alteraciones— vive
en `lib/glifos.ts` y son contornos de la fuente **Gonville** (Simon Tatham),
sacados de **VexFlow** (MIT), que los trae como datos de glifo. Se dibujaron a
mano primero y a tamaño real se leían; al lado de una edición de verdad eran un
garabato. El contorno de un símbolo musical es un problema de tipógrafo y ya
estaba resuelto.

Receta, por si hay que extraer otro (una fusa, un doble sostenido):

1. `npm pack opensheetmusicdisplay` y descomprimir. Adentro de
   `build/opensheetmusicdisplay.min.js` está la tabla de glifos de VexFlow
   (buscar `glyphs:{`). Los códigos que ya usamos: claves `v83`/`v79`, cabezas
   `vb`/`v81`/`v1d`, silencios `v7c`/`va5`/`v3c`/`v55`, banderas
   `v54`/`v9a`/`v3f`/`v8f`/`v47`/`v2a`, alteraciones `v18`/`v44`/`v4e`. El
   resto de los códigos se encuentra buscando `code_head` y `code_flag` en el
   mismo archivo.
2. El campo `o` del glifo es una lista de operaciones: `m x y` (moveTo),
   `l x y` (lineTo) y `b destX destY c1x c1y c2x c2y` — ojo que en las curvas
   **el destino va primero** y los puntos de control después, al revés que en
   SVG.
3. El eje y va **para arriba** (coordenadas de fuente): al pasar a SVG se
   niega.
4. La escala: **333⅓ unidades de fuente por espacio de pentagrama**. Con eso
   las medidas dan las canónicas (la clave de sol: 4,5 espacios sobre su línea
   y 2,6 por debajo). Cada familia trae su origen puesto donde VexFlow lo
   apoya — la convención exacta está en el comentario de `lib/glifos.ts`.
5. Antes de pegarlo, mirarlo sobre un pentagrama dibujado, grande y a tamaño
   real a la vez. Es un script de un rato y es la diferencia entre corregir y
   adivinar.
