# De dónde salió cada partitura

Los `.mxl` de acá son **MusicXML comprimido**: partituras como datos, que es lo
único que se puede importar de verdad. Un PDF es una foto, y sacarle las notas es
otro problema entero (reconocimiento óptico de partituras), así que de un PDF no
entra nada.

Están guardados en el repo para que el import se pueda volver a correr sin
depender de que el sitio de origen siga en pie, y para poder comparar cuando algo
del dibujo no cierre.

```sh
node --experimental-strip-types scripts/importar-musicxml.mjs \
  partituras-fuente/Canon_in_D_easy.mxl --slug canon-en-re --hasta 8
```

Escupe el objeto listo para pegar en `content/partituras.ts` y, por la salida de
error, **el informe de lo que no pudo importar**. Ese informe es la mitad del
valor: nuestro modelo es más pobre que MusicXML —una voz por mano, sin tresillos,
sin compases incompletos— y es mejor que lo diga a que lo tape en silencio.

| Archivo | Obra | Compositor |
|---|---|---|
| `Canon_in_D_easy.mxl` | Canon en Re | Pachelbel (1653–1706) |
| `Bach_Minuet_in_G_Major_BWV_Anh._114.mxl` | Minueto en Sol, BWV Anh. 114 | Christian Petzold (1677–1733) |
| `Fur_Elise_fingered.mxl` | Para Elisa, WoO 59 | Beethoven (1770–1827) |
| `Sonate_No._14_Moonlight_1st_Movement.mxl` | Claro de luna, Op. 27 nº 2 | Beethoven (1770–1827) |
| `Ode_to_Joy_Easy_variation.mxl` | Oda a la alegría (variación fácil, en Sol) | Beethoven (1770–1827) |

Las tres obras son de **dominio público**: los compositores murieron hace más de
dos siglos. Los archivos vienen de la biblioteca de MuseTrainer
(`github.com/musetrainer/library`), que junta transcripciones de dominio público.

Dos cosas para tener en cuenta al traer una nueva:

- **De dominio público es la obra, no necesariamente el archivo.** Una
  transcripción moderna puede tener su propia licencia, y un arreglo nuevo no es
  de dominio público aunque el tema original lo sea. Lo seguro es quedarse con
  compositores muertos hace rato y con archivos que declaren su licencia.
- **Los archivos subidos por gente tienen errores.** El importador avisa cuando un
  compás del archivo no cierra la cuenta, y ya sirvió: de las versiones de Para
  Elisa de esa biblioteca, una tiene el compás 8 corto y desalinea todo lo que
  sigue. Por eso se importó otra.

## Las de Mutopia: LilyPond, no MusicXML

`mutopia/` tiene los archivos tal cual están en el espejo de Mutopia en GitHub
(`github.com/MutopiaProject/MutopiaProject`, carpeta `ftp/`), con el nombre de
su carpeta adelante para saber de dónde salió cada uno. Mutopia guarda
**LilyPond** (`.ly`), no MusicXML, y no hay conversor bueno de uno al otro: el
que existe perdía puntillos y mezclaba voces. Por eso hay un lector propio,
`scripts/lilypond-a-musicxml.mjs`, que lee el subconjunto que usan estos
archivos y escribe MusicXML para el importador de siempre:

```sh
npm run importar:mutopia     # regenera content/partituras-mutopia.ts entero
npm run lilypond -- pieza.ly # sólo la conversión, para mirar una
```

La ficha de cada pieza (título, número en el libro, dificultad, tempo de
estudio, qué mirar) vive en `scripts/importar-mutopia.mjs`; las notas salen
del archivo. El `.ts` generado no se edita a mano.

| Archivo | Obra | Compositor |
|---|---|---|
| `BachJS-BWVAnh115-anna-magdalena-05.ly` | Minueto en Sol menor, BWV Anh. 115 | Christian Petzold (1677–1733), atribuido |
| `BurgmullerJFF-O100-25EF-NN.ly` | 25 estudios fáciles, op. 100, nº 1 a 13 y 15 a 18 | Friedrich Burgmüller (1806–1874) |

Todos declaran `"Public Domain"` en su header: el que los tipeó los puso en
dominio público. Los 19 al 25 del op. 100 no están en Mutopia. **El 14 (La
Styrienne) está en Mutopia y quedó afuera a propósito**: el archivo usa
`\set Timing.measurePosition` para acomodar un *da capo* con casillas partidas
a mitad de compás, y nuestro modelo no tiene forma de decir eso; importado,
la grilla de compases se desalinea desde ahí.

