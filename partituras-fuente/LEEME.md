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
