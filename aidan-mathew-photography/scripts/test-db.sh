#!/usr/bin/env bash
# Runs the migrations and behavioural tests against a throwaway local PostgreSQL database.
# Usage: DATABASE_URL=postgres://user@localhost/amp_test scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DATABASE_URL:?Set DATABASE_URL to an EMPTY local test database}"
PSQL=(psql "$DB" -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f supabase/tests/00_local_stubs.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f supabase/seed.sql
echo "PASS migrations and seed applied"
"${PSQL[@]}" -f supabase/tests/10_behaviour.sql

# Two admins confirm two different requests for the same date at the same moment.
confirm() {
  "${PSQL[@]}" -c "set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
    begin; select public.update_booking_status('$1', 'confirmed'); select pg_sleep(1.5); commit;" >/dev/null 2>&1 && echo ok || echo rejected
}
confirm 50000000-0000-0000-0000-000000000001 > /tmp/c1 &
sleep 0.2
confirm 50000000-0000-0000-0000-000000000002 > /tmp/c2 &
wait
CONFIRMED=$("${PSQL[@]}" -tAc "select count(*) from public.booking_requests where event_date = current_date + 400 and status = 'confirmed'")
if [ "$CONFIRMED" = "1" ] && [ "$(cat /tmp/c1 /tmp/c2 | sort | tr '\n' ' ')" = "ok rejected " ]; then
  echo "PASS simultaneous confirmations cannot overbook a date"
else
  echo "FAIL concurrency: confirmed=$CONFIRMED results=$(cat /tmp/c1 /tmp/c2)"; exit 1
fi
