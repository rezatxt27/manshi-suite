// منشی — بررسی نسخهٔ تازه
// منشی از فروشگاه کروم نصب نمی‌شود، پس خودش به‌روز نمی‌شود. اینجا فقط
// *خبر می‌دهد* که نسخهٔ تازه‌ای هست؛ دانلود و نصب دستِ خودِ کاربر است.
// هیچ داده‌ای فرستاده نمی‌شود — فقط یک درخواستِ خواندنیِ ساده به گیت‌هاب.
const Updater = (() => {
  const REPO = 'rezatxt27/manshi-suite';
  const API = `https://api.github.com/repos/${REPO}/releases/latest`;
  const PAGE = `https://github.com/${REPO}/releases/latest`;
  const CHECK_EVERY_MS = 24 * 3600 * 1000;

  // «۰٫۹٫۶» یا «v0.9.6» → [0, 9, 6]
  function parseVersion(v) {
    const en = String(v || '')
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[٫٬]/g, '.')
      .trim().replace(/^v/i, '');
    const m = en.match(/\d+(?:\.\d+)*/);
    if (!m) return null;
    return m[0].split('.').map(n => parseInt(n, 10) || 0);
  }

  // مثبت اگر a تازه‌تر باشد، منفی اگر b، صفر اگر برابر
  function compareVersions(a, b) {
    const x = parseVersion(a), y = parseVersion(b);
    if (!x || !y) return 0;
    const n = Math.max(x.length, y.length);
    for (let i = 0; i < n; i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  const isNewer = (remote, current) => compareVersions(remote, current) > 0;

  // پاسخِ گیت‌هاب — فقط چیزی که لازم داریم و فقط اگر سالم باشد
  function parseRelease(raw) {
    let d = raw;
    if (typeof raw === 'string') { try { d = JSON.parse(raw); } catch (_) { return null; } }
    if (!d || typeof d !== 'object' || d.draft) return null;
    const version = parseVersion(d.tag_name || d.name);
    if (!version) return null;
    // آدرس فقط اگر https و روی خودِ گیت‌هاب باشد — نه هر چیزی که در پاسخ آمده
    let url = PAGE;
    try {
      const u = new URL(String(d.html_url || ''));
      if (u.protocol === 'https:' && /(^|\.)github\.com$/.test(u.hostname)) url = u.href;
    } catch (_) { /* پیش‌فرض بماند */ }
    return {
      version: version.join('.'),
      name: String(d.name || d.tag_name || '').slice(0, 120),
      notes: String(d.body || '').slice(0, 2000),
      url,
      at: d.published_at || ''
    };
  }

  const dueForCheck = (lastAt, now = Date.now()) => !lastAt || (now - lastAt) >= CHECK_EVERY_MS;

  const api = { REPO, API, PAGE, CHECK_EVERY_MS, parseVersion, compareVersions, isNewer, parseRelease, dueForCheck };
  if (typeof globalThis !== 'undefined') globalThis.Updater = api;
  return api;
})();

if (typeof module !== 'undefined') module.exports = Updater;
