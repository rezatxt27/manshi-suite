// منشی — منطقِ خالصِ برنامهٔ روز و تطبیقِ جلسه‌ها.
//
// این‌ها تا امروز داخل app.js بودند و هیچ تستی نداشتند، در حالی که منطقِ واقعیِ
// محصول‌اند: وقت آزاد، تشخیصِ سریِ جلسه‌های تکراری، و وصل‌کردنِ جلسهٔ ضبط‌شده به
// رویدادِ تقویم. هیچ‌کدام به DOM یا حافظه دست نمی‌زنند، پس مستقیم تست می‌شوند.
const Agenda = (() => {
  const J = typeof Jalali !== 'undefined' ? Jalali
    : (typeof require !== 'undefined' ? require('./jalali.js') : null);

  // پنجرهٔ کاری برای محاسبهٔ وقت آزاد
  const DAY_START_H = 8, DAY_END_H = 20;
  const MIN_GAP = 20;   // کمتر از این، «وقت آزاد» حساب نمی‌شود

  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const normTitle = t => (t || '').replace(/\s+/g, '').toLowerCase();

  // startedAt گاهی عدد است و گاهی رشتهٔ ISO (پشتیبانِ منشی) — تفریقِ رشته‌ها NaN
  // می‌دهد و مرتب‌سازی بی‌صدا از کار می‌افتد؛ همیشه از این تابع رد شود.
  function sessionTime(s) {
    const v = s && s.startedAt;
    if (typeof v === 'number') return v;
    const t = v ? new Date(v).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  }
  const byNewest = (a, b) => sessionTime(b) - sessionTime(a);

  // ── وقت آزاد ────────────────────────────────────────
  // items باید از قبل بر اساس start مرتب باشند و {start, end} تاریخ داشته باشند.
  function freeGaps(items, day, now) {
    const ws = new Date(day); ws.setHours(DAY_START_H, 0, 0, 0);
    const we = new Date(day); we.setHours(DAY_END_H, 0, 0, 0);
    let cursor = new Date(sameDay(day, now) ? Math.max(ws.getTime(), now.getTime()) : ws.getTime());
    const gaps = [];
    for (const it of items || []) {
      if (it.start > cursor) {
        const min = Math.round((it.start - cursor) / 60000);
        if (min >= MIN_GAP) gaps.push({ start: new Date(cursor), end: new Date(it.start), min });
      }
      if (it.end > cursor) cursor = new Date(it.end);
    }
    if (we > cursor) {
      const min = Math.round((we - cursor) / 60000);
      if (min >= MIN_GAP) gaps.push({ start: new Date(cursor), end: we, min });
    }
    return gaps;
  }

  // ── سریِ جلسه‌های تکراری ─────────────────────────────
  // «جلسهٔ هفتگی تیم فروش #۳» و «جلسهٔ هفتگی تیم فروش #۴» یک سری‌اند.
  function seriesKey(title) {
    const base = (title || '')
      .replace(/[‌‏ً-ْٔ]/g, '')   // نیم‌فاصله و اعراب/همزهٔ رویِ حرف
      .replace(/[#(){}[\]\-–—_.:،,]/g, ' ')
      .replace(/[0-9۰-۹٠-٩]+/g, ' ')   // ارقامِ لاتین، فارسی و عربی
      .toLowerCase();
    // واژه‌های عمومی حذف می‌شوند؛ ولی اگر چیزی نماند، خودِ عنوان ملاک است
    const stripped = base
      .replace(/(هفتگی|روزانه|ماهانه|جلسه|نشست|weekly|daily|monthly|sync|meeting|call)/gi, ' ')
      .replace(/\s+/g, '').trim();
    return stripped || base.replace(/\s+/g, '').trim();
  }

  function sessionSeries(s, sessions) {
    const k = seriesKey(s && s.title);
    if (!k) return [s];
    return (sessions || []).filter(o => seriesKey(o && o.title) === k).sort(byNewest);
  }

  // ── وصل‌کردن جلسه به رویدادِ تقویم ───────────────────
  // امتیازدهی به‌جای تطبیقِ صرفِ عنوان: عنوانِ یکسان ۳، شباهت ۲، همان‌روز ۱.
  // آستانهٔ ۲ یعنی همان‌روز بودن به‌تنهایی کافی نیست.
  function matchEventForSession(s, events) {
    const target = normTitle(s && s.title);
    const sDay = s && s.startedAt ? new Date(s.startedAt) : null;
    let best = null, bestScore = 0;
    for (const e of events || []) {
      const et = normTitle(e && e.title);
      let score = 0;
      if (target && et === target) score += 3;
      else if (target.length >= 3 && et && (et.includes(target) || target.includes(et))) score += 2;
      if (sDay && e && sameDay(e.start, sDay)) score += 1;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return bestScore >= 2 ? best : null;
  }

  // ── متن‌های کوتاه ───────────────────────────────────
  function cleanMeetUrl(url) {
    if (!url) return '';
    const m = String(url).match(/https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+=%]+/);
    return m ? m[0].replace(/[.,)]+$/, '') : '';
  }

  function humanDur(min) {
    min = Math.max(0, Math.round(min));
    const h = Math.floor(min / 60), m = min % 60;
    if (h && m) return `${J.faDigits(h)} ساعت و ${J.faDigits(m)} دقیقه`;
    if (h) return `${J.faDigits(h)} ساعت`;
    return `${J.faDigits(m)} دقیقه`;
  }

  function staleLabel(days) {
    if (days == null) return 'بدون سابقهٔ تماس';
    if (days <= 0) return 'آخرین تماس: امروز';
    if (days === 1) return 'آخرین تماس: دیروز';
    if (days < 7) return `آخرین تماس: ${J.faDigits(days)} روز پیش`;
    if (days < 30) return `آخرین تماس: ${J.faDigits(Math.floor(days / 7))} هفته پیش`;
    return `آخرین تماس: ${J.faDigits(Math.floor(days / 30))} ماه پیش`;
  }

  // نرمال‌سازی برای جست‌وجو: رقم فارسی/عربی → لاتین، ي/ك عربی → ی/ک فارسی،
  // حذف نیم‌فاصله و اعراب. بدون این، جست‌وجوی «۷» متنِ «7» را پیدا نمی‌کند.
  function searchNorm(s) {
    return J.enDigits(String(s || ''))
      .replace(/[ىيﻯﻰﻱﻲ]/g, 'ی')
      .replace(/[كﻙﻚ]/g, 'ک')
      .replace(/[‌‏‎]/g, '')
      .replace(/[ً-ْ]/g, '')
      .toLowerCase()
      .trim();
  }

  return {
    DAY_START_H, DAY_END_H, MIN_GAP,
    sameDay, normTitle, sessionTime, byNewest,
    freeGaps, seriesKey, sessionSeries, matchEventForSession,
    cleanMeetUrl, humanDur, staleLabel, searchNorm
  };
})();

if (typeof module !== 'undefined') module.exports = Agenda;
