#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Donna — one-shot Vercel deploy + custom domain setup
#  Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

BOLD="\033[1m"
VIOLET="\033[35m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

step() { echo -e "\n${VIOLET}${BOLD}▸ $1${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $1${RESET}"; }
die()  { echo -e "${RED}✗ $1${RESET}"; exit 1; }

echo -e "\n${BOLD}${VIOLET}Donna — Vercel Deploy${RESET}"
echo "──────────────────────────────────"

# ── 1. Check / install Vercel CLI ─────────────────────────────
step "Checking Vercel CLI"
if ! command -v vercel &>/dev/null; then
  warn "Vercel CLI not found — installing globally..."
  npm install -g vercel || die "npm install -g vercel failed. Do you have Node installed?"
fi
ok "Vercel CLI ready ($(vercel --version 2>/dev/null | head -1))"

# ── 2. Login check ────────────────────────────────────────────
step "Checking Vercel auth"
if ! vercel whoami &>/dev/null 2>&1; then
  echo "You need to log in to Vercel:"
  vercel login
fi
ok "Logged in as $(vercel whoami 2>/dev/null)"

# ── 3. Environment variables ──────────────────────────────────
step "Environment variables"
echo "Donna needs two Supabase env vars set on Vercel."
echo "You can skip this if you've already set them in the Vercel dashboard."
echo ""
read -rp "Set env vars now? (y/n): " SET_ENV

if [[ "$SET_ENV" =~ ^[Yy]$ ]]; then
  read -rp "  NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
  read -rp "  NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

  if [[ -n "$SUPABASE_URL" ]]; then
    echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force 2>/dev/null || \
    vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "$SUPABASE_URL" 2>/dev/null || true
    ok "NEXT_PUBLIC_SUPABASE_URL set"
  fi

  if [[ -n "$SUPABASE_ANON_KEY" ]]; then
    echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force 2>/dev/null || \
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "$SUPABASE_ANON_KEY" 2>/dev/null || true
    ok "NEXT_PUBLIC_SUPABASE_ANON_KEY set"
  fi
else
  warn "Skipped — make sure they're set in vercel.com → Project → Settings → Environment Variables"
fi

# ── 4. Deploy to production ───────────────────────────────────
step "Deploying to Vercel (production)"
DEPLOY_URL=$(vercel --prod --yes 2>&1 | tee /dev/stderr | grep -E "^https://" | tail -1)

if [[ -z "$DEPLOY_URL" ]]; then
  # Try to get it from vercel inspect
  DEPLOY_URL=$(vercel ls --scope=$(vercel whoami 2>/dev/null) 2>/dev/null | grep -m1 "https://" | awk '{print $2}' || true)
fi

ok "Deployed! 🎉"
[[ -n "$DEPLOY_URL" ]] && echo -e "  Live at: ${BOLD}$DEPLOY_URL${RESET}"

# ── 5. Custom domain ──────────────────────────────────────────
step "Custom domain"
read -rp "Add a custom domain? (y/n): " ADD_DOMAIN

if [[ "$ADD_DOMAIN" =~ ^[Yy]$ ]]; then
  read -rp "  Domain (e.g. donna.yourdomain.com): " CUSTOM_DOMAIN

  if [[ -n "$CUSTOM_DOMAIN" ]]; then
    echo ""
    echo "Adding $CUSTOM_DOMAIN to Vercel..."
    vercel domains add "$CUSTOM_DOMAIN" 2>&1 || true

    echo ""
    echo -e "${BOLD}Next: update your DNS records${RESET}"
    echo "──────────────────────────────────"

    # Detect if it's a subdomain or root
    DOTS=$(echo "$CUSTOM_DOMAIN" | tr -cd '.' | wc -c)
    if [[ "$DOTS" -ge 2 ]]; then
      # subdomain
      SUBDOMAIN=$(echo "$CUSTOM_DOMAIN" | cut -d. -f1)
      echo -e "Add this ${BOLD}CNAME${RESET} record in your DNS provider:"
      echo ""
      echo "  Type:   CNAME"
      echo "  Name:   $SUBDOMAIN"
      echo "  Value:  cname.vercel-dns.com"
      echo "  TTL:    Auto (or 3600)"
    else
      # root domain
      echo -e "Add these ${BOLD}A${RESET} records in your DNS provider:"
      echo ""
      echo "  Type:   A"
      echo "  Name:   @"
      echo "  Value:  76.76.21.21"
      echo ""
      echo "  Type:   A"
      echo "  Name:   www"
      echo "  Value:  76.76.21.21"
    fi

    echo ""
    echo "DNS usually propagates in 5–30 minutes."
    echo "Vercel auto-provisions SSL once it detects the record."
    echo ""
    warn "Remember: add $CUSTOM_DOMAIN as an allowed URL in Supabase → Auth → URL Configuration"
  fi
else
  ok "Skipped custom domain"
fi

# ── 6. Done ───────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}All done! Donna is live.${RESET}"
[[ -n "$DEPLOY_URL" ]] && echo -e "  Vercel URL: $DEPLOY_URL"
[[ -n "$CUSTOM_DOMAIN" && "$ADD_DOMAIN" =~ ^[Yy]$ ]] && echo -e "  Custom URL: https://$CUSTOM_DOMAIN (once DNS propagates)"
echo ""
