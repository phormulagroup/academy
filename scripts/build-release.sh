#!/usr/bin/env bash
# Gera os dois pacotes para o cPanel (webapp e API), da MESMA versão, a partir do código atual.
#
#   scripts/build-release.sh [staging|production] [--skip-checks]
#
# Resultado em deploy/: webapp-<ambiente>.zip (para public_html) e server-<ambiente>.zip (para a pasta da app Node).
# Antes de empacotar corre os testes e o lint (sem erros) da API e da webapp; --skip-checks salta esse passo.
set -euo pipefail

ENVIRONMENT="${1:-staging}"
SKIP_CHECKS=0
[[ "${2:-}" == "--skip-checks" || "${1:-}" == "--skip-checks" ]] && SKIP_CHECKS=1
[[ "$ENVIRONMENT" == "--skip-checks" ]] && ENVIRONMENT="staging"
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Ambiente inválido: $ENVIRONMENT (staging | production)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMMIT="$(git rev-parse --short HEAD)"
DIRTY=""
[[ -n "$(git status --porcelain -- server webapp)" ]] && DIRTY="-dirty"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
VERSION="${COMMIT}${DIRTY}"
VERSION_JSON="{\"version\":\"${VERSION}\",\"environment\":\"${ENVIRONMENT}\",\"builtAt\":\"${BUILT_AT}\"}"

if [[ -n "$DIRTY" ]]; then
  echo "Aviso: há alterações por commitar (a versão fica ${VERSION})."
fi

if [[ $SKIP_CHECKS -eq 0 ]]; then
  echo "== Testes da API"
  (cd server && npm test --silent)
  echo "== Lint da webapp"
  (cd webapp && npm run lint --silent)
  echo "== Testes da webapp"
  (cd webapp && npm test --silent)
fi

echo "== Webapp ($ENVIRONMENT)"
(cd webapp && npx vite build --mode "$ENVIRONMENT")
echo "$VERSION_JSON" > webapp/dist/version.json

mkdir -p deploy
rm -f "deploy/webapp-$ENVIRONMENT.zip" "deploy/server-$ENVIRONMENT.zip"
(cd webapp/dist && zip -qr "../../deploy/webapp-$ENVIRONMENT.zip" . -x ".DS_Store" -x "*/.DS_Store")

echo "== API ($ENVIRONMENT)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
OTHER_ENV="production"; [[ "$ENVIRONMENT" == "production" ]] && OTHER_ENV="staging"
# Sem node_modules (o cPanel instala), sem media (vive fora da app: MEDIA_DIR), sem testes nem os .env dos outros ambientes
rsync -a \
  --exclude "node_modules/" --exclude "media/" --exclude "media-private/" --exclude "test/" \
  --exclude ".env.development" --exclude ".env.$OTHER_ENV" --exclude ".DS_Store" \
  --exclude "database/backups/" --exclude "*.log" \
  server/ "$STAGE/"
echo "$VERSION_JSON" > "$STAGE/version.json"
# As traduções seguem no pacote para se poderem importar no servidor (npm run translations:import:$ENVIRONMENT)
cp docs/translations/admin-redesign-translations.xlsx "$STAGE/database/translations.xlsx"
(cd "$STAGE" && zip -qr "$ROOT/deploy/server-$ENVIRONMENT.zip" . -x ".DS_Store" -x "*/.DS_Store")

echo
echo "Versão: $VERSION ($BUILT_AT)"
ls -lh "deploy/webapp-$ENVIRONMENT.zip" "deploy/server-$ENVIRONMENT.zip" | awk '{print "  " $5 "  " $9}'
cat <<MSG

Próximos passos (ver docs/deploy-staging.md):
  1. Extrair webapp-$ENVIRONMENT.zip em public_html (confirmar o .htaccess).
  2. Extrair server-$ENVIRONMENT.zip na pasta da app Node e reiniciar a app.
  3. No cPanel (Setup Node.js App > Run NPM Script): migrate:status:$ENVIRONMENT e, se houver, migrate:$ENVIRONMENT.
  4. Traduções novas: translations:check:$ENVIRONMENT e translations:import:$ENVIRONMENT.
  5. Confirmar https://<dominio>/api/health: a "version" tem de ser ${VERSION} (e https://<dominio>/version.json igual).
MSG
