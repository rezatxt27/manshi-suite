#!/bin/sh
# منشی — نسخهٔ تازه را روی دیسک می‌آورد (فقط برای نصبِ گیتی)
#
# کروم افزونهٔ unpacked را هیچ‌وقت خودش به‌روز نمی‌کند. این اسکریپت فقط
# فایل‌های روی دیسک را جلو می‌برد؛ اعمالش در خودِ منشی با دکمهٔ «اعمال» است،
# چون بارِ دوبارهٔ افزونه ثبتِ در جریانِ یک جلسه را قطع می‌کند و آن تصمیم باید
# دستِ آدم باشد.
#
# عمداً محافظه‌کار است — همین پوشه جایی است که توسعه هم در آن انجام می‌شود:
#   • تغییرِ ذخیره‌نشده باشد؟ دست نمی‌زند.
#   • روی شاخهٔ main نباشی؟ دست نمی‌زند.
#   • فقط fast-forward؛ هیچ مرج و هیچ ریبیسی، تا تاریخچه دست‌نخورده بماند.
set -u

PATH=/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin
export PATH

REPO=$(cd "$(dirname "$0")/.." 2>/dev/null && pwd) || exit 0
LOG="$HOME/Library/Logs/manshi-pull.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null

say() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M')" "$1" >> "$LOG"; }

cd "$REPO" || exit 0

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { say "کلونِ گیت نیست: $REPO"; exit 0; }

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
[ "$branch" = "main" ] || { say "روی شاخهٔ $branch هستی، نه main — رد شد"; exit 0; }

[ -z "$(git status --porcelain)" ] || { say "تغییرِ ذخیره‌نشده هست — رد شد"; exit 0; }

before=$(git rev-parse --short HEAD)
git fetch --quiet origin main 2>>"$LOG" || { say "fetch نشد (اینترنت؟)"; exit 0; }
git merge --ff-only --quiet origin/main 2>>"$LOG" || { say "fast-forward نشد — دست‌نخورده ماند"; exit 0; }
after=$(git rev-parse --short HEAD)

if [ "$before" = "$after" ]; then
  say "از قبل تازه بود ($after)"
else
  version=$(sed -n 's/.*"version"[^"]*"\([^"]*\)".*/\1/p' manifest.json | head -1)
  say "به‌روز شد: $before → $after (نسخهٔ $version) — در منشی «اعمال» را بزن"
fi
