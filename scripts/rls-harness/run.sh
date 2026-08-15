#!/usr/bin/env bash
# Local ephemeral PostgreSQL harness for RLS regression tests.
# Applies shim + ALL repo migrations to a throwaway local cluster, then runs
# scripts/rls-harness/tests.sql. NEVER touches any remote database.
#
#   ./scripts/rls-harness/run.sh          - wipe, migrate, test
#   ./scripts/rls-harness/run.sh stop     - stop and remove the local cluster
#
# Pattern borrowed from wingate-platform/scripts/testdb.sh.
set -euo pipefail

export LC_ALL=C LANG=C   # macOS: keep postmaster single-threaded during startup

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

find_pg_bin() {
  if [ -n "${WINGATE_PG_BIN:-}" ]; then echo "$WINGATE_PG_BIN"; return; fi
  local cand
  for cand in \
    /usr/local/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@17/bin \
    /usr/local/opt/postgresql@18/bin /opt/homebrew/opt/postgresql@18/bin \
    "$(dirname "$(command -v postgres 2>/dev/null || echo /nonexistent)")"; do
    if [ -x "$cand/postgres" ] && [ -x "$cand/initdb" ] && [ -x "$cand/pg_ctl" ]; then
      echo "$cand"; return
    fi
  done
  echo ""
}
PG_BIN="$(find_pg_bin)"
if [ -z "$PG_BIN" ]; then
  echo "no full postgres server toolchain found (initdb+pg_ctl+postgres)"; exit 1
fi

PGDATA_DIR="$ROOT/.rlsdb/pgdata"
PGHOST_DIR="$ROOT/.rlsdb"
PGPORT="${WINGATE_RLS_PGPORT:-54331}"
LOG="$ROOT/.rlsdb/postgres.log"
export PGUSER="${PGUSER:-$(whoami)}"
DB_URL="postgresql://$PGUSER@127.0.0.1:$PGPORT/postgres?host=$PGHOST_DIR"

psql_url() { "$PG_BIN/psql" "$DB_URL" -v ON_ERROR_STOP=1 -q "$@"; }

cluster_stop() {
  if [ -d "$PGDATA_DIR" ] && "$PG_BIN/pg_ctl" -D "$PGDATA_DIR" status >/dev/null 2>&1; then
    "$PG_BIN/pg_ctl" -D "$PGDATA_DIR" stop -m fast >/dev/null
  fi
}

if [ "${1:-}" = "stop" ]; then
  cluster_stop; rm -rf "$ROOT/.rlsdb"; echo "stopped and removed local RLS cluster"; exit 0
fi

# fresh cluster every run
cluster_stop
rm -rf "$PGDATA_DIR"
mkdir -p "$PGHOST_DIR"
"$PG_BIN/initdb" -D "$PGDATA_DIR" --auth=trust --no-locale --encoding=UTF8 >/dev/null
"$PG_BIN/pg_ctl" -D "$PGDATA_DIR" -l "$LOG" \
  -o "-p $PGPORT -k $PGHOST_DIR -c listen_addresses=127.0.0.1" start >/dev/null

trap cluster_stop EXIT

psql_url -1 -f "$ROOT/scripts/rls-harness/shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  psql_url -1 -f "$f"
done

echo "── running RLS regression tests ──"
psql_url -f "$ROOT/scripts/rls-harness/tests.sql"
echo "RLS HARNESS: ALL TESTS PASSED"
