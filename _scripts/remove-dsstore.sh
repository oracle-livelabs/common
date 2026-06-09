#!/usr/bin/env bash
set -euo pipefail

GITIGNORE=".gitignore"
ENTRY=".DS_Store"

echo "🔍 Searching for .DS_Store files..."
count=$(find . -type f -name ".DS_Store" | wc -l | tr -d ' ')

if [[ "$count" -eq 0 ]]; then
  echo "✅ No .DS_Store files found."
else
  echo "🧹 Found $count .DS_Store files. Removing..."
  find . -type f -name ".DS_Store" -delete
  echo "✅ Removed all .DS_Store files."
fi

echo ""
echo "📄 Ensuring .DS_Store is ignored by Git..."

if [[ ! -f "$GITIGNORE" ]]; then
  echo "ℹ️  .gitignore not found. Creating one."
  echo "$ENTRY" > "$GITIGNORE"
  echo "✅ Added $ENTRY to new .gitignore"
elif grep -Fxq "$ENTRY" "$GITIGNORE"; then
  echo "✅ $ENTRY already present in .gitignore"
else
  echo "" >> "$GITIGNORE"
  echo "$ENTRY" >> "$GITIGNORE"
  echo "✅ Appended $ENTRY to .gitignore"
fi

echo ""
echo "🎉 Done."
