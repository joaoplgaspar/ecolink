#!/usr/bin/env bash
# Sobe um Postgres do Supabase em Docker, aplica Auth + migrações + seed e roda
# os testes pgTAP de supabase/tests. Sem Supabase CLI e sem conta: só Docker.
#
#   npm run test:banco
#
# Variáveis: ECO_DB_PORTA (padrão 54399), ECO_DB_MANTER=1 para não apagar o banco no fim.
set -euo pipefail
cd "$(dirname "$0")/.."

PORTA="${ECO_DB_PORTA:-54399}"
NOME="ecolink-banco-teste"
PG_IMG="supabase/postgres:17.6.1.054"
AUTH_IMG="supabase/gotrue:v2.183.0"
export PGPASSWORD=postgres
PSQL=(psql -h 127.0.0.1 -p "$PORTA" -d postgres -v ON_ERROR_STOP=1 -q)

limpar() { [ "${ECO_DB_MANTER:-0}" = 1 ] || docker rm -f "$NOME" >/dev/null 2>&1 || true; }
trap limpar EXIT

docker rm -f "$NOME" >/dev/null 2>&1 || true
docker run -d --name "$NOME" -e POSTGRES_PASSWORD=postgres -p "$PORTA:5432" "$PG_IMG" >/dev/null
echo "• aguardando o Postgres…"
for _ in $(seq 1 60); do
  "${PSQL[@]}" -U postgres -tc 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
sleep 2

echo "• esquema do Supabase Auth (migrações oficiais do GoTrue)"
"${PSQL[@]}" -U supabase_admin -c "alter role supabase_auth_admin with password 'postgres'"
docker run --rm --network host \
  -e DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:$PORTA/postgres?sslmode=disable" \
  -e API_EXTERNAL_URL=http://localhost -e GOTRUE_SITE_URL=http://localhost \
  -e GOTRUE_JWT_SECRET=segredo-so-para-teste-com-pelo-menos-32-caracteres \
  -e GOTRUE_DB_DRIVER=postgres "$AUTH_IMG" auth migrate >/dev/null 2>&1

for f in supabase/migrations/*.sql supabase/seed.sql; do
  echo "• $f"
  "${PSQL[@]}" -U postgres -f "$f" >/dev/null
done

echo "• testes pgTAP"
saida=$("${PSQL[@]}" -U postgres -tA -f supabase/tests/01_seguranca_e_jornada.test.sql 2>&1) || { echo "$saida"; exit 1; }
echo "$saida" | grep -E '^(ok|not ok|#)' | sed 's/^/  /'
if echo "$saida" | grep -qE '^not ok|Looks like'; then
  echo "✗ falhou"
  exit 1
fi
echo "✓ $(echo "$saida" | grep -c '^ok') verificações do banco passaram"
