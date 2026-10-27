#!/usr/bin/env bash
# Los tests de las clases de piano, sin ventana y con tope: lo que corre el
# integrador del estudio antes de juntar una rama en main (puente/integrador.mjs)
# y lo que corrés vos antes de entregar. Sale con 0 si está todo verde.
#   ./test.sh            todo: el typecheck y cada `test:*` de package.json
#   ./test.sh <filtro>   sólo los `test:*` que contengan el filtro (p. ej. ritmo)
# Acepta y descarta los argumentos del estudio («afectado --desde …»): acá no
# hay mapa de pruebas, se corre todo (son segundos).
set -uo pipefail
cd "$(dirname "$0")"
filtro=""
case "${1:-}" in afectado|"") ;; *) filtro="$1" ;; esac
TOPE="${TEST_TOPE:-150}"
con_tope() { perl -e 'alarm shift; exec @ARGV or die "no pude ejecutar $ARGV[0]: $!\n"' "$TOPE" "$@"; }

status=0
correr() { # <nombre> <comando…>
	local nombre="$1"; shift
	local t0=$SECONDS out
	out="$(con_tope "$@" 2>&1)"; local s=$?
	if [ "$s" -eq 0 ]; then
		echo "✓ $nombre ($((SECONDS - t0)) s)"
	else
		status=1
		[ "$s" -eq 142 ] && echo "✗ $nombre pasó el tope de ${TOPE} s" || echo "✗ $nombre (exit $s)"
		echo "$out" | tail -25
	fi
}

[ -z "$filtro" ] && correr "typecheck" npm run -s typecheck
for s in $(node -e 'const s=require("./package.json").scripts; console.log(Object.keys(s).filter(k=>k.startsWith("test:")).join(" "))'); do
	case "$s" in *"$filtro"*) correr "$s" npm run -s "$s" ;; esac
done

if [ "$status" -eq 0 ]; then echo "✓ todo verde"; else echo "✗ algo falló"; fi
exit "$status"
