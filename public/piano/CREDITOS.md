# Los samples del piano

Son del **Salamander Grand Piano**, de **Alexander Holm**, publicado bajo
**Creative Commons Attribution 3.0** (CC-BY 3.0).

Las copias que están acá salieron del repositorio de audio de Tone.js
(<https://github.com/Tonejs/audio>, carpeta `salamander`), que es de donde las
toman los ejemplos de la librería. Son las versiones en mp3 a bitrate bajo, no
los originales sin comprimir.

## Qué hay

Diecisiete notas, una cada tres semitonos, de Do2 a Do6:

```
C2  Ds2 Fs2 A2
C3  Ds3 Fs3 A3
C4  Ds4 Fs4 A4
C5  Ds5 Fs5 A5
C6
```

Alcanza con una cada tres semitonos porque el sampler estira la más cercana
para las notas del medio. Estirar más de un semitono y medio ya se empieza a
notar, así que la separación no conviene agrandarla. En total son ~1,3 MB.

## Si alguna vez hay que reponerlos

```bash
BASE=https://raw.githubusercontent.com/Tonejs/audio/master/salamander
for n in C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6; do
  curl -sL -o "public/piano/$n.mp3" "$BASE/$n.mp3"
done
```

Si no están, la app no se rompe: `lib/audio.ts` se da cuenta y toca con
osciladores, que es como sonaba antes.
