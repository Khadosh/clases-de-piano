# 🎹 Cuaderno de piano

Un cuaderno de clases de piano que **se toca**. Clases con Quique Yance, los
miércoles.

No son apuntes: los acordes suenan, los ejercicios se mueven solos en el
teclado y el cifrado inglés se practica hasta que entra.

## Qué hay adentro

- **Línea de tiempo de clases** — una por miércoles, con lo que se corrigió, lo
  que se vio y lo que quedó para preguntar.
- **Laboratorio de acordes** — elegís fundamental y receta, ves las teclas y lo
  escuchás. Con modo *dictado*, que es el juego que hace el profe: sale un
  cifrado, ponés las manos, después mirás.
- **Ejercicios animados** — el ejercicio de posiciones que se desplaza, con
  metrónomo, digitación en las teclas y las dos manos en colores distintos.
- **Modo "escuchame tocar"** — el ejercicio abre el micrófono, escucha qué nota
  tocás y avanza sola cuando acertás. Sin reloj: el ritmo lo ponés vos.
- **Quiz de cifrado inglés** — del cifrado al teclado y del teclado al cifrado,
  con racha.
- **Identificador de acordes** — tocás teclas y te dice qué armaste, incluso si
  es una inversión.

## Cómo crece

Cada clase es un archivo en `content/lessons/`. Se agrega uno, se suma al
índice, y la home, los contadores, la sala de práctica y la navegación se
actualizan solas. Un commit por miércoles.

Las instrucciones completas están en [`CLAUDE.md`](./CLAUDE.md).

## Correr local

```bash
npm install
npm run dev
```

## Deploy

Es una app de Next.js 15 completamente estática (todas las rutas se
prerenderizan en el build). En Vercel: importar el repo y darle deploy, sin
configuración ni variables de entorno.

## Cómo está hecho

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4.

Sin base de datos y sin CMS. El teclado es un SVG dibujado a mano; el sonido son
samples del [Salamander Grand Piano](https://creativecommons.org/licenses/by/3.0/)
de Alexander Holm (CC-BY 3.0) servidos con Tone.js, que se cargan recién cuando
tocás algo, con osciladores de WebAudio cubriendo mientras tanto.

El motor de teoría musical vive
en [`lib/music.ts`](./lib/music.ts) y arma cada acorde apilando semitonos, igual
que como se cuenta en clase. La detección de notas por micrófono está en
[`lib/pitch.ts`](./lib/pitch.ts), también sin dependencias; `npm run test:pitch`
la verifica contra tonos sintéticos con armónicos.
