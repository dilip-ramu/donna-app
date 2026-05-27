#!/usr/bin/env bash
# deploy-vaultr.sh — push Vaultr integration to git + Vercel
# Run from the donna-app directory: bash deploy-vaultr.sh
# Requires: vercel CLI installed and authenticated (vercel whoami)

set -e

BOLD="\033[1m"
GREEN="\033[32m"
VIOLET="\033[35m"
RESET="\033[0m"

step() { echo -e "\n${VIOLET}${BOLD}▶  $1${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }

step "Pushing code to GitHub..."
git push origin main

step "Adding/updating Vercel env vars..."

# Load values from .env.local (server-side only vars)
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | grep 'VAULTR_' | xargs) 2>/dev/null || true
fi

add_env() {
  local key="$1"
  local value="$2"
  if [ -n "$value" ]; then
    echo "$value" | vercel env add "$key" production --force 2>/dev/null && ok "$key set" || true
  else
    echo "  ⚠ $key not found in .env.local — skipping"
  fi
}

add_env "VAULTR_SUPABASE_URL"    "$VAULTR_SUPABASE_URL"
add_env "VAULTR_SERVICE_ROLE_KEY" "$VAULTR_SERVICE_ROLE_KEY"
add_env "VAULTR_APP_URL"          "$VAULTR_APP_URL"

step "Deploying to Vercel (production)..."
vercel --prod --yes

echo ""
echo -e "${GREEN}${BOLD}✅  Done! Finance mode is live.${RESET}"
echo -e "   Check: https://vercel.com/diliptr-s-projects/donna-app"
