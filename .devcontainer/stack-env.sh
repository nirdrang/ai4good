export VIEWER_EXCLUDE="-x studio,imgproxy,logflare,vector,supavisor"
for name in SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET \
            SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET; do
  export "$name=${!name:-viewer-placeholder}"
done
