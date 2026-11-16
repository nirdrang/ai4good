#!/usr/bin/env bash
set -uo pipefail
cd /workspaces/ai4good
eval "$(bunx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"
path=$(grep -oE '/discovery/[0-9a-f-]+/[0-9a-f-]+' /tmp/viewer-seed.txt)
org=$(echo "$path" | cut -d/ -f3); project=$(echo "$path" | cut -d/ -f4)
token=$(curl -s "$API_URL/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H 'content-type: application/json' \
  -d "{\"email\":\"preview-ngo@ai4good.example\",\"password\":\"${VIEWER_NGO_PASSWORD:-viewer-kitchen-2026}\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("access_token",""))')
[ -n "$token" ] || { echo "smoke: sign-in failed"; exit 0; }
call() {
  curl -s -w '\nHTTP %{http_code}\n' "$API_URL/functions/v1/$1" -H "apikey: $ANON_KEY" -H "authorization: Bearer $token" \
    -H 'content-type: application/json' -d "$2" | tail -c 600
}
scope="\"organizationId\":\"$org\",\"projectId\":\"$project\""
echo "conversation: $(call discovery-conversation "{$scope}")"
echo "opening: $(call discovery-message "{\"mode\":\"opening\",\"message\":\"\",\"answers\":[],\"expectedCharge\":\"free\",\"userMessageId\":\"opening-$project\",$scope}")"
