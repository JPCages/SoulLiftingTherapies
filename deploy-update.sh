#!/usr/bin/env bash
# Apply the latest fixes (booking layout, progress-photo button, image uploads)
# and push to GitHub so Railway redeploys.
set -e
cd "$(dirname "$0")"
if [ ! -f ./SLT-update.bundle ]; then
  echo "ERROR: SLT-update.bundle not found in this folder."
  echo "In File Explorer, right-click it -> 'Always keep on this device', then re-run."
  exit 1
fi
echo ">> Verifying bundle..."
git bundle verify ./SLT-update.bundle
echo ">> Applying latest commit..."
git fetch ./SLT-update.bundle main
git reset --hard FETCH_HEAD
echo ">> Pushing to GitHub (origin main)..."
git push origin main
echo ""
echo "===================================================="
echo " DONE. Pushed. Railway will now rebuild & redeploy."
echo " You can delete SLT-update.bundle and deploy-update.sh"
echo "===================================================="
