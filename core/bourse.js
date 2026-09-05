// منشی — «بورس»: بیشترین رشد و افتِ نمادها از دیدهٔ بازارِ TSETMC.
//
// یک عقب‌نشینیِ آگاهانه از قاعدهٔ market.js:
//   آنجا نوشته شده «نامِ هر قلم از جدولِ خودمان می‌آید و فقط عدد از سایت خوانده
//   می‌شود». برای ده قلمِ ارز و سکه شدنی است؛ برای هفتصد نماد نه — کلِ فایدهٔ
//   این کارت نشان‌دادنِ *نامِ* برنده است و آن نام از سرور می‌آید. پس به‌جای
//   جدولِ محلی، نام را مهار می‌کنیم: کنترل‌کاراکترها و جهت‌دهنده‌های یونیکد حذف،
//   و سقفِ طول. درج در صفحه هم همیشه با textContent است، نه innerHTML.
//
// درصدِ تغییر خودمان حساب می‌شود ((پایانی − دیروز) ÷ دیروز)، نه از سرور —
// همان کاری که market.js با ارز می‌کند.
const Bourse = (() => {
  const NAME_MAX = 40;
  const TSETMC_URL = 'https://cdn.tsetmc.com/api/ClosingPrice/GetMarketWatch?market=0&paperTypes[0]=1';

  // کنترل‌کاراکتر و جهت‌دهنده‌های یونیکد (RLO و مانندش) می‌توانند متنِ کنارشان را
  // وارونه نشان بدهند. متن اینجا فقط داده است، پس همه‌شان دور ریخته می‌شوند.
  function cleanName(v) {
    return String(v == null ? '' : v)
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, NAME_MAX);
  }

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // hEven عددِ «HHMMSS» است: ۱۲۲۹۳۵ یعنی ۱۲:۲۹:۳۵
  function hhmmOf(hEven) {
    const n = Math.trunc(num(hEven));
    if (n <= 0 || n > 235959) return '';
    const h = Math.floor(n / 10000), m = Math.floor(n / 100) % 100;
    if (h > 23 || m > 59) return '';
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function parseRow(r) {
    if (!r || typeof r !== 'object') return null;
    const symbol = cleanName(r.lva);
    const yesterday = num(r.py);
    const close = num(r.pcl);
    // نمادِ بازنشده، متوقف یا تازه‌پذیرفته‌شده: دیروز یا پایانی صفر است و
    // درصدش یا بی‌معنی می‌شود یا بی‌نهایت. اصلاً وارد فهرست نمی‌شود.
    if (!symbol || yesterday <= 0 || close <= 0) return null;
    const last = num(r.pdv);
    return {
      symbol,
      name: cleanName(r.lvc),
      close,
      last: last > 0 ? last : close,
      yesterday,
      changePct: ((close - yesterday) / yesterday) * 100,
      volume: num(r.qtj),
      value: num(r.qtc),
      trades: num(r.ztt),
      at: hhmmOf(r.hEven)
    };
  }

  // پاسخ در کلیدِ marketwatch می‌آید، ولی نامِ کلید قبلاً عوض شده و باز هم
  // می‌شود. پس اگر آن نبود، دنبالِ اولین آرایه‌ای می‌گردیم که سطرهایش lva دارند.
  function rowsIn(d) {
    if (Array.isArray(d)) return d;
    if (!d || typeof d !== 'object') return [];
    if (Array.isArray(d.marketwatch)) return d.marketwatch;
    for (const v of Object.values(d)) {
      if (Array.isArray(v) && v.some(x => x && typeof x === 'object' && 'lva' in x)) return v;
    }
    return [];
  }

  function parseMarketWatch(raw) {
    let d = raw;
    if (typeof raw === 'string') {
      try { d = JSON.parse(raw); } catch (_) { return []; }
    }
    const out = [];
    for (const r of rowsIn(d)) {
      const row = parseRow(r);
      if (row) out.push(row);
    }
    return out;
  }

  // نمادی که امروز اصلاً معامله نشده درصدش صفر است و بی‌جا بالای فهرست می‌نشیند
  const traded = (r) => r.trades > 0 && r.volume > 0;

  // فقط مرتب‌کردن کافی نیست: اگر بازار منفی باشد، شش‌تای اولِ فهرستِ نزولی هم
  // منفی‌اند و زیرِ عنوانِ «بیشترین رشد» می‌نشینند. علامت هم باید شرط باشد،
  // حتی اگر یعنی فهرست کوتاه‌تر — یا خالی — دربیاید.
  function topMovers(rows, { dir = 'up', count = 5 } = {}) {
    const up = dir === 'up';
    const list = (rows || []).filter(r => traded(r) && (up ? r.changePct > 0 : r.changePct < 0));
    list.sort((a, b) => (up ? b.changePct - a.changePct : a.changePct - b.changePct));
    return list.slice(0, Math.max(0, count));
  }

  function mostActive(rows, count = 5) {
    const list = (rows || []).filter(traded);
    list.sort((a, b) => b.value - a.value);
    return list.slice(0, Math.max(0, count));
  }

  // زمانِ آخرین معاملهٔ کلِ بازار — «آخرین بروزرسانی» بی‌معنی است وقتی بازار
  // بسته و ما ساعتِ ۱۸ فایل را گرفته‌ایم. این عدد از خودِ داده می‌آید.
  function lastTradeAt(rows) {
    let best = '';
    for (const r of (rows || [])) {
      if (r.at && r.at > best) best = r.at;
    }
    return best;
  }

  function stats(rows) {
    const t = (rows || []).filter(traded);
    return {
      traded: t.length,
      up: t.filter(r => r.changePct > 0).length,
      down: t.filter(r => r.changePct < 0).length
    };
  }

  const api = {
    TSETMC_URL, NAME_MAX,
    cleanName, hhmmOf, parseRow, parseMarketWatch,
    topMovers, mostActive, lastTradeAt, stats
  };
  if (typeof globalThis !== 'undefined') globalThis.Bourse = api;
  return api;
})();

if (typeof module !== 'undefined') module.exports = Bourse;
