#!/usr/bin/env bash
# Carga los secretos de Actions en el repo nuevo de GitHub.
#
# Por qué existe: el 08/09/2026 el proyecto se movió de `alejandroalfredoocampo-web/notebooks`
# a `aocampo-cordobanotebooks/notebooks-com-ar` con un mirror. Un mirror lleva los commits,
# NO los secretos: el repo nuevo nació con cero. Desde entonces el scrape diario y el worker
# de emails fallan todos los días con "Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY".
#
# Los valores NO están en este repo ni pueden leerse del repo viejo (GitHub nunca devuelve un
# secreto una vez guardado). Salen de: Supabase → Project Settings → API; Resend → API Keys;
# y la clave SSH de paridad en ~/.ssh/notebooks_paridad_deploy.
#
# Uso:
#   bash website/scripts/cargar-secrets-github.sh
#
# El script nunca imprime un valor en pantalla ni lo pasa como argumento de línea de comandos
# (se manda por stdin, así no queda visible en `ps`).

set -euo pipefail

REPO="aocampo-cordobanotebooks/notebooks-com-ar"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_LOCAL="$RAIZ/website/.env.local"

echo "Repo destino: $REPO"
echo

command -v gh >/dev/null || { echo "Falta el gh CLI."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh sin sesión. Corré: gh auth login"; exit 1; }

# --- helpers ---------------------------------------------------------------

# Lee una variable de website/.env.local sin imprimirla.
de_env_local() {
  [ -f "$ENV_LOCAL" ] || return 1
  local val
  val="$(grep -E "^$1=" "$ENV_LOCAL" | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//')"
  [ -n "$val" ] || return 1
  printf '%s' "$val"
}

poner() { # poner NOMBRE VALOR
  printf '%s' "$2" | gh secret set "$1" --repo "$REPO"
  echo "  ✅ $1"
}

pedir() { # pedir NOMBRE "de dónde se saca"
  local nombre="$1" donde="$2" val
  if gh secret list --repo "$REPO" --json name -q '.[].name' 2>/dev/null | grep -qx "$nombre"; then
    read -r -p "  $nombre ya está cargado. ¿Reemplazarlo? [s/N] " r
    [ "${r:-n}" = "s" ] || { echo "  ⏭  $nombre sin cambios"; return; }
  fi
  echo "  $nombre — $donde"
  read -r -s -p "  Pegá el valor (no se muestra): " val
  echo
  [ -n "$val" ] || { echo "  ⏭  vacío, salteado"; return; }
  poner "$nombre" "$val"
}

# --- 1. Los dos que están en la máquina ------------------------------------

echo "1) Desde website/.env.local"
if v="$(de_env_local SUPABASE_URL)"; then poner SUPABASE_URL "$v"; else
  echo "  ⚠️  SUPABASE_URL no está en .env.local — se pide abajo"; fi
if v="$(de_env_local SUPABASE_ANON_KEY)"; then poner SUPABASE_ANON_KEY "$v"; else
  echo "  ⚠️  SUPABASE_ANON_KEY no está en .env.local — se pide abajo"; fi
echo

# --- 2. Los que sólo tiene Ale ---------------------------------------------

echo "2) A mano (no están en ningún archivo de la máquina)"
de_env_local SUPABASE_URL >/dev/null || pedir SUPABASE_URL "Supabase → Project Settings → API → Project URL"
de_env_local SUPABASE_ANON_KEY >/dev/null || pedir SUPABASE_ANON_KEY "Supabase → Project Settings → API → anon public"
pedir SUPABASE_SERVICE_ROLE_KEY "Supabase → Project Settings → API → service_role (secreta, da acceso total)"
pedir RESEND_API_KEY            "Resend → API Keys. Sin esto el worker de emails corre en dry-run y no manda nada"
pedir EMAIL_FROM                "La dirección remitente de las alertas, ej: alertas@notebooks.com.ar"
echo

# --- 3. La clave de paridad -------------------------------------------------

echo "3) CN_DEPLOY_KEY (deploy key de sólo lectura de cordoba-notebooks)"
KEY="$HOME/.ssh/notebooks_paridad_deploy"
if [ -f "$KEY" ]; then
  read -r -p "  Encontré $KEY. ¿Cargarla? [S/n] " r
  if [ "${r:-s}" != "n" ]; then
    gh secret set CN_DEPLOY_KEY --repo "$REPO" < "$KEY" && echo "  ✅ CN_DEPLOY_KEY"
    echo "  ⚠️  Acordate: la pública tiene que estar como Deploy key en"
    echo "     aocampo-cordobanotebooks/cordoba-notebooks (el repo se movió de cuenta)."
  fi
else
  echo "  No está $KEY. Ver el paso 'Las dos mitades de la llave' en 08-correr-esto-sin-tu-maquina.md"
fi
echo

# --- 4. Variable (no es secreto) -------------------------------------------

gh variable set SITE_URL --repo "$REPO" --body "https://www.notebooks.com.ar"
echo "  ✅ SITE_URL (variable, no secreto)"
echo

echo "Cargados:"
gh secret list --repo "$REPO"
echo
echo "Para probar sin esperar al cron de mañana:"
echo "  gh workflow run 'Scrape diario' --repo $REPO"
echo "  gh run watch --repo $REPO"
