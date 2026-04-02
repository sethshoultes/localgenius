#!/usr/bin/env bash
#
# LocalGenius Health Check
# Usage: ./scripts/health-check.sh [url]
# Default: https://localgenius.company/api/health
#
# Returns exit code 0 if healthy, 1 if degraded/unhealthy, 2 if unreachable.
# Compatible with UptimeRobot, BetterUptime, Pingdom, cron monitoring.

set -euo pipefail

URL="${1:-https://localgenius.company/api/health}"

echo "Checking: $URL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" --connect-timeout 10 --max-time 30 "$URL" 2>&1) || {
  echo "UNREACHABLE — could not connect to $URL"
  exit 2
}

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "DOWN — HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

# Parse status from JSON response
STATUS=$(echo "$BODY" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
DATABASE=$(echo "$BODY" | grep -o '"database":"[^"]*"' | head -1 | cut -d'"' -f4)
AI=$(echo "$BODY" | grep -o '"ai":"[^"]*"' | head -1 | cut -d'"' -f4)
VERSION=$(echo "$BODY" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4)
TIMESTAMP=$(echo "$BODY" | grep -o '"timestamp":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Status:    $STATUS"
echo "Version:   $VERSION"
echo "Database:  $DATABASE"
echo "AI:        $AI"
echo "Timestamp: $TIMESTAMP"
echo ""

# Parse integrations
for SVC in google meta stripe yelp email sms; do
  VAL=$(echo "$BODY" | grep -o "\"$SVC\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)
  if [ -n "$VAL" ]; then
    ICON="✓"
    [ "$VAL" = "not_configured" ] && ICON="○"
    echo "  $ICON $SVC: $VAL"
  fi
done

echo ""

case "$STATUS" in
  healthy)
    echo "HEALTHY — all systems operational"
    exit 0
    ;;
  degraded)
    echo "DEGRADED — some services unavailable"
    exit 0
    ;;
  unconfigured)
    echo "UNCONFIGURED — missing required credentials"
    exit 0
    ;;
  *)
    echo "UNHEALTHY — $STATUS"
    exit 1
    ;;
esac
