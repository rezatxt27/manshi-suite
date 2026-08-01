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

const version = process.argv[2];
if (!version) { console.error('نسخه داده نشد'); process.exit(1); }

const body = extract(readFileSync('CHANGELOG.md', 'utf8'), version);
process.stdout.write(body || `نسخهٔ ${toFa(version)}`);
