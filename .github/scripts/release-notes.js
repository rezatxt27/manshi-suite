// بخشِ مربوط به یک نسخه را از CHANGELOG درمی‌آورد.
// عنوان‌ها با رقمِ فارسی نوشته می‌شوند («## ۱٫۰٫۲ — …») ولی نسخه در
// manifest.json لاتین است، پس اول تبدیل می‌کنیم.
const { readFileSync } = require('fs');

const FA = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (s) => String(s).replace(/\d/g, d => FA[+d]);

// «1.0.2» → الگویی که هم «۱٫۰٫۲» را می‌گیرد هم «۱.۰.۲»
function headingPattern(version) {
  const parts = version.split('.').map(toFa);
  return new RegExp('^##\\s+' + parts.join('[٫.]') + '(?:\\s|$)');
}

function extract(changelog, version) {
  const lines = changelog.split('\n');
  const want = headingPattern(version);
  const start = lines.findIndex(l => want.test(l.trim()));
  if (start === -1) return '';
  // تا عنوانِ نسخهٔ بعدی، یا تا انتها
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end)
    .join('\n')
    .replace(/^\s*---\s*$/gm, '')   // جداکنندهٔ ته بخش لازم نیست
    .trim();
}

// هر ریلیز پایینش همین راهنما را دارد. کسی که از لینکِ «نسخهٔ تازه» به اینجا
// می‌رسد نباید جای دیگری دنبالِ دستورِ به‌روزرسانی بگردد — و مهم‌ترین نکته‌اش
// (همان پوشهٔ قبلی) باید همین‌جا به چشمش بخورد، نه در README.
const FOOTER = `---

### چطور به‌روز کنم؟

۱. از بخشِ **Assets** همین صفحه فایلِ \`manshi-<نسخه>.zip\` را بگیرید و باز کنید.
۲. فایل‌های داخلش را **در همان پوشه‌ای** بریزید که منشی از آن اجرا می‌شود و بگذارید جایگزین شوند.
۳. در \`chrome://extensions\` روی کارتِ منشی دکمهٔ **⟳** را بزنید.

جلسه‌ها، کارها و تنظیماتتان دست نمی‌خورد.

> ⚠️ **پوشهٔ تازه نسازید و اسمِ پوشه را عوض نکنید.** کروم شناسهٔ افزونه را از
> مسیرِ پوشه می‌سازد؛ مسیر که عوض شود، منشیِ «تازه‌ای» با حافظهٔ خالی بالا می‌آید
> و داده‌هایتان در نسخهٔ قبلی جا می‌مانند.

اگر با \`git clone\` نصب کرده‌اید، به‌جای هر سه قدم: \`sh tools/manshi-pull.sh\``;

function notes(changelog, version) {
  // «1.9.0» → «۱٫۹٫۰»، مثل عنوان‌های CHANGELOG — جداکننده در فارسی «٫» است
  const body = extract(changelog, version) || `نسخهٔ ${toFa(version).replace(/\./g, '٫')}`;
  return body + '\n\n' + FOOTER;
}

if (require.main === module) {
  const version = process.argv[2];
  if (!version) { console.error('نسخه داده نشد'); process.exit(1); }
  process.stdout.write(notes(readFileSync('CHANGELOG.md', 'utf8'), version));
}

module.exports = { extract, notes, headingPattern, FOOTER };
