#!/bin/sh
# منشی — نسخهٔ تازه را روی دیسک می‌آورد (فقط برای نصبِ گیتی)
#
#   sh tools/manshi-pull.sh                 همین حالا جلو ببر
#   sh tools/manshi-pull.sh --if-requested  فقط اگر در منشی دکمه را زده باشی
#
# حالتِ دوم برای زمان‌بندی است. کروم به‌محضِ عوض‌شدنِ manifest.json افزونه را از
# نو بار می‌کند، پس «جلو بردنِ کد» و «اعمالِ به‌روزرسانی» در عمل یک چیزند. اگر
# این اسکریپت بی‌خبر اجرا شود، منشی وسطِ کارت از نو بار می‌شود — و اگر جلسه‌ای
# در حال ثبت باشد، ثبت قطع می‌شود. پس در حالتِ --if-requested هیچ‌کاری نمی‌کند
# مگر خودت در منشی «گرفتن و اعمال» را زده باشی: منشی یک فایلِ کوچک در پوشهٔ
# snapshot می‌گذارد و این اسکریپت فقط *بودنِ* آن را می‌بیند. محتوایش خوانده
# نمی‌شود، پس چیزی از آن فایل به دستورِ گیت راه پیدا نمی‌کند.
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

# ── حالتِ «فقط اگر درخواست شده» ──
# پرچم اول پاک می‌شود و بعد کار انجام می‌شود: اگر وسطِ کار چیزی بشکند، دفعهٔ
# بعد دوباره تلاش نمی‌شود. یک درخواستِ کهنه هم اجرا نمی‌شود — دکمه‌ای که هفتهٔ
# پیش زده شده امروز معنا ندارد.
FLAG_DIR="${MANSHI_FLAG_DIR:-$HOME/manshi-data}"
FLAG="$FLAG_DIR/apply-update.json"
MAX_AGE=600

if [ "${1:-}" = "--if-requested" ]; then
  [ -f "$FLAG" ] || exit 0
  age=$(( $(date +%s) - $(stat -f %m "$FLAG" 2>/dev/null || echo 0) ))
  rm -f "$FLAG"
  if [ "$age" -gt "$MAX_AGE" ]; then say "درخواستِ کهنه ($age ثانیه) — رد شد"; exit 0; fi
  say "درخواستِ «گرفتن و اعمال» دیده شد"
fi

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
