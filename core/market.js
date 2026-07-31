// منشی — «بازار»: خواندنِ قیمت ارز، طلا و سکه از صفحهٔ عمومیِ یک سایتِ قیمت.
//
// دو تصمیمِ امنیتی که عمداً گرفته شده:
//  ۱) هیچ متنی از صفحهٔ بیرونی مستقیم وارد رابط نمی‌شود. نامِ هر قلم از جدولِ
//     خودمان می‌آید و فقط **عدد** از سایت خوانده می‌شود. پس عنوانِ آلوده جایی ندارد.
//  ۲) عددها با Number ساخته می‌شوند، نه با eval یا innerHTML.
//
// و یک تصمیمِ محصولی: سایت برای ارز «درصد تغییر» نمی‌دهد. به‌جای وابسته‌شدن به
// یک سرویسِ دیگر، هر بار که قیمت گرفته می‌شود همان‌جا ذخیره می‌شود و تغییر را از
// تاریخچهٔ خودمان حساب می‌کنیم — کاملاً محلی، مثلِ بقیهٔ منشی.
const Market = (() => {
  const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';

  // «۱۸۸,۲۵۰» یا «-۱۶۱,۸۹۰» → عدد. هرچه رقم نباشد دور ریخته می‌شود.
  function toNumber(raw) {
    let s = String(raw == null ? '' : raw);
    for (let i = 0; i < 10; i++) s = s.split(FA[i]).join(String(i)).split(AR[i]).join(String(i));
    s = s.replace(/[٫،]/g, '.').replace(/,/g, '');
    const m = s.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

  // جدولِ خودمان: از روی متنِ سایت تشخیص می‌دهیم کدام قلم است، ولی برچسبِ نمایشی
  // را از همین‌جا برمی‌داریم. ترتیب مهم است — خاص‌ترها اول.
  const CURRENCY_MAP = [
    ['usd', /دلار\s*آمریکا/, 'دلار آمریکا'],
    ['eur', /^یورو|قیمت\s*یورو/, 'یورو'],
    ['aed', /درهم/, 'درهم امارات'],
    ['gbp', /پوند/, 'پوند انگلیس'],
    ['try', /لیر\s*ترکیه/, 'لیر ترکیه']
  ];
  const GOLD_MAP = [
    ['emami', /سکه\s*امامی/, 'سکه امامی'],
    ['bahar', /بهار\s*آزادی/, 'سکه بهار آزادی'],
    ['nim', /نیم\s*سکه/, 'نیم‌سکه'],
    ['rob', /ربع\s*سکه/, 'ربع‌سکه'],
    ['gerami', /سکه\s*گرمی/, 'سکه گرمی'],
    ['gram18', /گرم\s*طلای\s*18|طلای\s*18\s*عیار/, 'طلای ۱۸ عیار'],
    ['mesghal', /آبشده|مثقال/, 'مثقال طلا'],
    ['ounce', /انس\s*طلا/, 'انس طلا'],
    ['silver', /انس\s*نقره/, 'انس نقره']
  ];
  const matchKey = (map, text) => map.find(([, re]) => re.test(text)) || null;

  const rowsOf = (html) => {
    const out = [];
    const re = /<tr\b[^>]*\btitle="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let m;
    while ((m = re.exec(html))) out.push({ title: stripTags(m[1]), body: m[2] });
    return out;
  };
  const cellsOf = (body) => {
    const out = [];
    const re = /<td\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/gi;
    let m;
    while ((m = re.exec(body))) out.push({ cls: m[1], text: stripTags(m[2]) });
    return out;
  };

  // صفحهٔ ارز: هر ردیف نام + خرید + فروش دارد؛ «فروش» ملاکِ نمایش است
  function parseCurrencies(html) {
    const out = [];
    for (const { title, body } of rowsOf(html)) {
      const cells = cellsOf(body);
      const name = cells.find(c => /currName/.test(c.cls))?.text || title;
      const hit = matchKey(CURRENCY_MAP, name) || matchKey(CURRENCY_MAP, title);
      if (!hit) continue;
      const sell = toNumber(cells.find(c => /sellPrice/.test(c.cls))?.text);
      const buy = toNumber(cells.find(c => /buyPrice/.test(c.cls))?.text);
      const value = sell != null ? sell : buy;
      if (value == null || value <= 0) continue;
      if (out.some(x => x.key === hit[0])) continue;
      out.push({ key: hit[0], label: hit[2], value, unit: 'تومان', group: 'ارز', change: null });
    }
    return out;
  }

  // صفحهٔ طلا: قیمت و تغییرِ روز در دو خانه‌اند — «۱۸,۳۴۱,۱۱۰ تومان…» و «-۱۶۱,۸۹۰(-۰.۸۷%)»
  const MAX_SANE_PERCENT = 40;   // بالاتر از این، دادهٔ سایت خراب است نه بازار
  function parseGold(html) {
    const out = [];
    for (const { title, body } of rowsOf(html)) {
      const hit = matchKey(GOLD_MAP, title);
      if (!hit) continue;
      if (out.some(x => x.key === hit[0])) continue;
      const cells = cellsOf(body).filter(c => /priceTd/.test(c.cls));
      if (!cells.length) continue;
      const dollar = /\$/.test(cells[0].text);
      const value = toNumber(cells[0].text);
      if (value == null || value <= 0) continue;
      let change = null;
      if (cells[1]) {
        const cm = cells[1].text.match(/(-?[\d۰-۹٠-٩,،٫.]+)\s*\(\s*(-?[\d۰-۹٠-٩٫.]+)\s*%?\s*\)/);
        const amount = cm ? toNumber(cm[1]) : null;
        const percent = cm ? toNumber(cm[2]) : null;
        // «سکه گرمی: -۹۷٪» در دادهٔ واقعی دیده شد — عددِ خراب را نشان نده
        if (amount != null && percent != null && Math.abs(percent) <= MAX_SANE_PERCENT) {
          change = { amount, percent };
        }
      }
      out.push({
        key: hit[0], label: hit[2], value,
        unit: dollar ? 'دلار' : 'تومان',
        group: dollar ? 'جهانی' : (/سکه/.test(hit[2]) ? 'سکه' : 'طلا'),
        change
      });
    }
    return out;
  }

  // ── تاریخچهٔ محلی ────────────────────────────────────
  // یک عکسِ فوری در روز. ۳۰ روز نگه می‌داریم — هم برای «تغییر نسبت به دیروز»
  // و هم برای نمودارِ کوچکِ هفتگی، بدون هیچ سرویسِ تاریخچه‌ای.
  const MAX_SNAPSHOTS = 30;
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

  function pushSnapshot(history, items, now = new Date()) {
    const list = Array.isArray(history) ? [...history] : [];
    const key = dayKey(now);
    const snap = { day: key, at: new Date(now).toISOString(), values: {} };
    for (const it of items) if (it.value != null) snap.values[it.key] = it.value;
    if (!Object.keys(snap.values).length) return list;
    const idx = list.findIndex(s => s.day === key);
    if (idx > -1) list[idx] = snap; else list.push(snap);
    list.sort((a, b) => a.day.localeCompare(b.day));
    return list.slice(-MAX_SNAPSHOTS);
  }

  // تغییر نسبت به آخرین روزِ **قبل از امروز** — نه نسبت به عکسِ فوریِ همین امروز
  function changeFrom(history, key, value, now = new Date()) {
    const today = dayKey(now);
    const past = (history || []).filter(s => s.day < today && s.values && s.values[key] != null);
    if (!past.length || value == null) return null;
    const prev = past[past.length - 1].values[key];
    if (!prev) return null;
    const amount = value - prev;
    return { amount, percent: (amount / prev) * 100, since: past[past.length - 1].day };
  }

  // تغییری که خودِ سایت داده مقدم است؛ وگرنه از تاریخچهٔ خودمان
  function withChange(items, history, now = new Date()) {
    return items.map(it => it.change ? it : { ...it, change: changeFrom(history, it.key, it.value, now) });
  }

  // آخرین n روزِ یک قلم — برای نمودار کوچک
  function seriesOf(history, key, n = 7) {
    return (history || []).filter(s => s.values && s.values[key] != null)
      .slice(-n).map(s => ({ day: s.day, value: s.values[key] }));
  }

  // ۱۸۳۴۱۱۱۰ → «۱۸٬۳۴۱٬۱۱۰»
  function faPrice(n) {
    if (n == null || !Number.isFinite(n)) return '—';
    const s = Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US').replace(/,/g, '٬') : String(n);
    return s.replace(/\d/g, d => FA[+d]);
  }
  const faPercent = (p) => (p == null ? '' : `${Math.abs(p).toFixed(1).replace(/\d/g, d => FA[+d])}٪`);

  const api = {
    toNumber, parseCurrencies, parseGold, pushSnapshot, changeFrom, withChange,
    seriesOf, faPrice, faPercent, CURRENCY_MAP, GOLD_MAP, MAX_SNAPSHOTS
  };
  if (typeof globalThis !== 'undefined') globalThis.Market = api;
  return api;
})();

if (typeof module !== 'undefined') module.exports = Market;
