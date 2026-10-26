#!/usr/bin/env bash
# Base de dados LOCAL de testes (MySQL 8.0 numa instância própria, porta 3307), isolada da staging e dos outros projetos.
# Usa o MySQL 8.0 (e não o 9.x) porque o driver da API ainda não suporta a autenticação do MySQL 9.
#
#   scripts/local-db.sh start    arranca a instância (cria-a na primeira vez)
#   scripts/local-db.sh clone    copia a staging (só lê) para a BD local: esquema e dados, sem logs; apaga as definições de SMTP locais
#   scripts/local-db.sh stop     pára a instância
#   scripts/local-db.sh status   diz se está a correr
#
# Depois, na pasta server: npm run dev:local (a API usa esta BD, nunca a staging).
set -euo pipefail

BIN="/opt/homebrew/opt/mysql@8.0/bin"
DATA="$HOME/.local/share/academy-mysql80"
PORT=3307
SOCK="$DATA/mysql.sock"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

running() { "$BIN/mysqladmin" --protocol=tcp -h127.0.0.1 -P$PORT -uroot ping >/dev/null 2>&1; }

case "${1:-status}" in
  start)
    if running; then echo "Já está a correr (porta $PORT)."; exit 0; fi
    if [[ ! -d "$DATA/mysql" ]]; then
      mkdir -p "$DATA"
      "$BIN/mysqld" --initialize-insecure --datadir="$DATA" --basedir=/opt/homebrew/opt/mysql@8.0 >/dev/null 2>&1
    fi
    nohup "$BIN/mysqld" --datadir="$DATA" --basedir=/opt/homebrew/opt/mysql@8.0 --port=$PORT --bind-address=127.0.0.1 --socket="$SOCK" \
      --mysqlx=OFF --log-error="$DATA/error.log" >/dev/null 2>&1 &
    for _ in $(seq 1 40); do running && break; sleep 0.5; done
    running || { echo "Não arrancou: ver $DATA/error.log" >&2; exit 1; }
    "$BIN/mysql" --protocol=tcp -h127.0.0.1 -P$PORT -uroot -e "
      CREATE DATABASE IF NOT EXISTS academy_local CHARACTER SET utf8mb4;
      CREATE USER IF NOT EXISTS 'academy_local'@'%' IDENTIFIED WITH mysql_native_password BY 'academy_local';
      GRANT ALL ON academy_local.* TO 'academy_local'@'%';"
    echo "A correr na porta $PORT (BD academy_local, utilizador academy_local)."
    ;;
  clone)
    running || { echo "Arranque primeiro: scripts/local-db.sh start" >&2; exit 1; }
    (cd "$ROOT/server" && node scripts/clone-to-local.js)
    ;;
  stop)
    running && "$BIN/mysqladmin" --protocol=tcp -h127.0.0.1 -P$PORT -uroot shutdown && echo "Parada." || echo "Não estava a correr."
    ;;
  status)
    running && echo "A correr (porta $PORT)." || echo "Parada."
    ;;
  *) echo "Uso: $0 start|clone|stop|status" >&2; exit 1 ;;
esac
