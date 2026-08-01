#!/bin/sh
# بازرسیِ امنیتیِ پیش از انتشار — روی محتوایی که واقعاً کامیت می‌شود، نه فایل‌های کاری.
# اگر چیزی پیدا کند با کدِ ۱ برمی‌گردد و (به‌عنوان hookِ pre-push) جلوی پوش را می‌گیرد.
#
# اجرای دستی:  sh .github/scripts/security-check.sh
set -u

RED=$(printf '\033[31m'); GRN=$(printf '\033[32m'); YLW=$(printf '\033[33m'); OFF=$(printf '\033[0m')
fail=0
say()  { printf '%s\n' "$1"; }
bad()  { printf '%s✗%s %s\n' "$RED" "$OFF" "$1"; fail=1; }
good() { printf '%s✓%s %s\n' "$GRN" "$OFF" "$1"; }

say ""
say "──────── بازرسی امنیتی پیش از انتشار ────────"

# هم آنچه الان کامیت می‌شود (--cached) و هم کلِ تاریخچه.
# نگاه‌کردن فقط به تاریخچه، رازی را که همین حالا داری اضافه می‌کنی نمی‌بیند.
# نکته: --cached باید *قبل* از الگو بیاید، وگرنه گیت خطا می‌دهد و چون خطا را
# دور می‌ریختیم، بررسی بی‌صدا «پاک» گزارش می‌شد.
scan_all() {
  { git grep --cached -nIE "$1" 2>/dev/null
    git grep -nIE "$1" $(git rev-list --all 2>/dev/null) 2>/dev/null
  } | head -5
}

# ۱) کلید، توکن، کلید خصوصی
SECRETS='sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.'
hits=$(scan_all "$SECRETS")
if [ -n "$hits" ]; then bad "کلید یا توکن پیدا شد:"; printf '%s\n' "$hits" | sed 's/^/    /'
else good "کلید، توکن و کلید خصوصی: پاک (staged + کلِ تاریخچه)"; fi

# ۲) آدرس مخفیِ تقویم
hits=$(scan_all 'calendar\.google\.com/calendar/ical/[A-Za-z0-9%._-]{20,}')
if [ -n "$hits" ]; then bad "آدرس iCal واقعی پیدا شد:"; printf '%s\n' "$hits" | sed 's/^/    /'
else good "آدرس iCal: پاک"; fi

# ۳) ایمیل روی دامنه‌های غیرنمونه
#    example.com / example.org / acme.com / vendor.io / *.google.com مجازند (داده‌های ساختگیِ تست)
bademails=$(git grep --cached -hoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' 2>/dev/null \
  | grep -viE '@(example\.(com|org|net)|acme\.com|vendor\.io|[a-z.]*google\.com|users\.noreply\.github\.com|anthropic\.com)$' \
  | sort -u | head -5)
if [ -n "$bademails" ]; then bad "ایمیل روی دامنهٔ واقعی:"; printf '%s\n' "$bademails" | sed 's/^/    /'
else good "ایمیل‌ها: همه روی دامنهٔ نمونه/رزروشده"; fi

# ۴) شمارهٔ تلفن ایرانی
hits=$(git grep --cached -noE '(\+98|0098|09)[0-9]{9}' 2>/dev/null | head -3)
if [ -n "$hits" ]; then bad "شمارهٔ تلفن:"; printf '%s\n' "$hits" | sed 's/^/    /'
else good "شمارهٔ تلفن: پیدا نشد"; fi

# ۵) اجرای پویا در کدِ محصول
hits=$(git grep --cached -nE '\beval\(|new Function\(|document\.write' -- '*.js' 2>/dev/null | grep -v '^tests/' | head -3)
if [ -n "$hits" ]; then bad "اجرای پویا در کدِ محصول:"; printf '%s\n' "$hits" | sed 's/^/    /'
else good "eval / new Function / document.write: نیست"; fi

# ۶) فایل‌هایی که هرگز نباید کامیت شوند
hits=$(git ls-files | grep -iE '(^|/)\.env|\.pem$|\.p12$|\.keystore$|id_rsa|secret|credentials|backup.*\.json$|\.ics$' | head -5)
if [ -n "$hits" ]; then bad "فایلِ حساس در مخزن:"; printf '%s\n' "$hits" | sed 's/^/    /'
else good "فایلِ حساس: هیچ‌کدام"; fi

# ۷) تنظیماتِ محلیِ ابزار (مسیرهای دستگاه)
if git ls-files | grep -q '^\.claude/'; then bad ".claude/ کامیت شده (مسیرهای دستگاهِ توست)"
else good ".claude/ نادیده گرفته شده"; fi

# ۸) تست‌ها — کدِ شکسته نباید منتشر شود
if command -v node >/dev/null 2>&1; then
  if out=$(node tests/run.js 2>&1); then
    good "تست‌ها: $(printf '%s' "$out" | tail -1 | tr -d '\n')"
  else
    bad "تست‌ها شکست خوردند:"; printf '%s\n' "$out" | tail -5 | sed 's/^/    /'
  fi
else
  printf '%s!%s node نصب نیست — تست‌ها اجرا نشد\n' "$YLW" "$OFF"
fi

say "─────────────────────────────────────────────"
if [ "$fail" -eq 0 ]; then
  printf '%s✓ همه‌چیز پاک است — آمادهٔ انتشار%s\n\n' "$GRN" "$OFF"
else
  printf '%s✗ بازرسی رد شد — تا وقتی موارد بالا درست نشده، پوش نکن%s\n' "$RED" "$OFF"
  say "  (اگر مطمئنی اشتباهِ ابزار است:  git push --no-verify)"
  say ""
fi
exit "$fail"
