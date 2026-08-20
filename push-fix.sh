#!/usr/bin/env bash
# One-time: apply the reconstructed commit from the bundle and push to GitHub.
set -e
cd "$(dirname "$0")"

if [ ! -f ./SLT-fix.bundle ]; then
  echo "ERROR: SLT-fix.bundle not found in this folder."
  echo "In File Explorer, right-click SLT-fix.bundle -> 'Always keep on this device', then re-run."
  exit 1
fi

echo ">> Verifying bundle..."
git bundle verify ./SLT-fix.bundle

echo ">> Applying reconstructed commit..."
git fetch ./SLT-fix.bundle main
git reset --hard FETCH_HEAD

echo ">> Pushing to GitHub (origin main)..."
git push origin main

echo ""
echo "===================================================="
echo " DONE. Pushed to GitHub. Railway will now rebuild."
echo " You can delete SLT-fix.bundle and push-fix.sh."
echo "===================================================="
