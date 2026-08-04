// وردست — تجزیهٔ تاریخ طبیعی فارسی («فاکتور رو بفرست تا چهارشنبه هفته بعد»)
// خروجی: { title, due: 'YYYY-MM-DD' | null, recur: spec | null, matched: متن عبارت تاریخ }
// spec تکرار: { freq:'daily'|'weekly'|'monthly', interval:N, weekday?:0-6, day?:1-31|'last' }
const DateParser = (() => {
  const J = typeof Jalali !== 'undefined' ? Jalali : require('./jalali.js');

  const ZWNJ = '‌';
  const SEP = `[ ${ZWNJ}]?`;
  // پیشوند روزهای هفته → ایندکس ایرانی (شنبه=۰)
  const WD = { '': 0, 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5 };
  const MONTH_RE = J.MONTHS.join('|');

  // روزهای ترتیبی فارسی → عدد («سوم مرداد» → ۳). کلیدها بدون فاصله/نیم‌فاصله ذخیره می‌شوند.
  const ORD_ONES = { 'یکم': 1, 'اول': 1, 'دوم': 2, 'سوم': 3, 'چهارم': 4, 'پنجم': 5, 'ششم': 6, 'شیشم': 6, 'هفتم': 7, 'هشتم': 8, 'نهم': 9 };
  const ORD_MAP = { 'دهم': 10, 'یازدهم': 11, 'دوازدهم': 12, 'سیزدهم': 13, 'چهاردهم': 14, 'پانزدهم': 15, 'پونزدهم': 15, 'شانزدهم': 16, 'شونزدهم': 16, 'هفدهم': 17, 'هیفدهم': 17, 'هجدهم': 18, 'هیجدهم': 18, 'نوزدهم': 19, 'بیستم': 20, 'سیام': 30 };
  function ordinalToNum(w) {
    const k = w.replace(/[ ‌]/g, '');
    if (ORD_MAP[k] != null) return ORD_MAP[k];
    if (ORD_ONES[k] != null) return ORD_ONES[k];
    let m = k.match(/^بیستو?(.+)$/); if (m && ORD_ONES[m[1]] != null) return 20 + ORD_ONES[m[1]];
    m = k.match(/^سیو?(.+)$/); if (m && ORD_ONES[m[1]] === 1) return 31;
    return null;
  }
  // الگوی همهٔ شکل‌ها (بلندترها اول تا حریص درست بگیرد)
  const ORD_RE = `بیست${SEP}و?${SEP}(?:یکم|دوم|سوم|چهارم|پنجم|ششم|شیشم|هفتم|هشتم|نهم)|سی${SEP}و?${SEP}یکم|سی${SEP}ام|بیستم|دهم|یازدهم|دوازدهم|سیزدهم|چهاردهم|پانزدهم|پونزدهم|شانزدهم|شونزدهم|هفدهم|هیفدهم|هجدهم|هیجدهم|نوزدهم|یکم|اول|دوم|سوم|چهارم|پنجم|ششم|شیشم|هفتم|هشتم|نهم`;
  // «روزِ ترتیبی + ماه» را به «عدد + ماه» تبدیل می‌کند تا قاعدهٔ عددیِ موجود بگیردش
  function ordinalsToDigits(text) {
    return text.replace(new RegExp(`(${ORD_RE})(${SEP})(?=(?:${MONTH_RE}))`, 'g'), (mm, w) => {
      const n = ordinalToNum(w);
      return n ? `${n} ` : mm;
    });
  }

  function normalize(text) {
    return J.enDigits(text)
      .replace(/[يئ]/g, 'ی').replace(/ك/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function addDays(base, n) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + n);
    return d;
  }

  // عبارت‌های تاریخ به ترتیب اولویت (خاص‌تر اول)
  function findDate(text, now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sep = `[ ${ZWNJ}]?`;
    const nextWeek = `(?: هفته${sep}(?:ی|ٔ)? (بعد|آینده|دیگه|دیگر))?`;
    const pre = `(?:تا |برای |واسه )?`;

    const rules = [
      // «۵ مرداد» یا «مرداد ۵»
      {
        re: new RegExp(`${pre}(\\d{1,2})م? (${MONTH_RE})|${pre}(${MONTH_RE}) (\\d{1,2})م?`),
        fn: m => {
          const jd = Number(m[1] || m[4]);
          const name = m[2] || m[3];
          const jm = J.MONTHS.indexOf(name) + 1;
          if (jd < 1 || jd > 31) return null;
          const j = J.fromDate(today);
          let d = J.jalaliToDate(j.jy, jm, Math.min(jd, J.monthLength(j.jy, jm)));
          if (d < today) d = J.jalaliToDate(j.jy + 1, jm, Math.min(jd, J.monthLength(j.jy + 1, jm)));
          return d;
        }
      },
      // «پس‌فردا» / «فردا» / «امروز» / «امشب»
      { re: new RegExp(`${pre}(پس${sep}فردا)`), fn: () => addDays(today, 2) },
      { re: new RegExp(`${pre}فردا( شب| صبح)?`), fn: () => addDays(today, 1) },
      { re: new RegExp(`${pre}(امروز|امشب)`), fn: () => today },
      // «چهارشنبه» / «پنج‌شنبه هفته بعد» / «جمعه»
      {
        re: new RegExp(`${pre}(?:روز )?(?:(یک|دو|سه|چهار|پنج)${sep})?(شنبه|جمعه)${nextWeek}`),
        fn: m => {
          const idx = m[2] === 'جمعه' ? 6 : WD[m[1] || ''];
          // «سه شنبه» بدون پیشوند نباید با «شنبه» داخل کلمهٔ دیگر قاطی شود — regex بالا پیشوند را می‌گیرد
          let diff = (idx - J.weekdayIndex(today) + 7) % 7;
          if (diff === 0) diff = 7; // «شنبه» یعنی شنبهٔ بعدی، نه امروز
          if (m[3]) diff += 7;
          return addDays(today, diff);
        }
      },
      // «تا آخر هفته» → پنجشنبه
      {
        re: new RegExp(`${pre}آخر${sep}(?:این )?هفته`),
        fn: () => {
          let diff = (5 - J.weekdayIndex(today) + 7) % 7;
          return addDays(today, diff);
        }
      },
      // «تا آخر ماه»
      {
        re: new RegExp(`${pre}آخر${sep}(?:این )?ماه`),
        fn: () => {
          const j = J.fromDate(today);
          return J.jalaliToDate(j.jy, j.jm, J.monthLength(j.jy, j.jm));
        }
      },
      // «هفته بعد» تنها → شنبهٔ هفتهٔ بعد
      {
        re: new RegExp(`${pre}هفته${sep}(?:ی|ٔ)? (بعد|آینده|دیگه|دیگر)`),
        fn: () => addDays(J.startOfWeek(today), 7)
      },
      // «۳ روز دیگه»
      {
        re: new RegExp(`${pre}(\\d{1,3}) روز (دیگه|دیگر|بعد)`),
        fn: m => addDays(today, Number(m[1]))
      }
    ];

    for (const rule of rules) {
      const m = text.match(rule.re);
      if (m) {
        const d = rule.fn(m);
        if (d) return { date: d, matched: m[0].trim(), index: m.index, length: m[0].length };
      }
    }
    return null;
  }

  // عبارت‌های تکرار («هر شنبه»، «اول هر ماه»، «هر ۲ هفته»)
  function findRecur(text, today) {
    let m = text.match(/(اول|ابتدای|آخر|انتهای) هر ماه/);
    if (m) {
      const day = /اول|ابتدای/.test(m[1]) ? 1 : 'last';
      return { recur: { freq: 'monthly', interval: 1, day }, index: m.index, length: m[0].length, matched: m[0] };
    }
    // «هر <n?> روز/هفته/ماه»
    m = text.match(/هر (?:(\d{1,3}) )?(روز|هفته|ماه)/);
    if (m) {
      const interval = m[1] ? Math.max(1, Number(m[1])) : 1;
      const unit = m[2];
      let recur;
      if (unit === 'روز') recur = { freq: 'daily', interval };
      else if (unit === 'ماه') recur = { freq: 'monthly', interval, day: J.fromDate(today).jd };
      // «هر هفته» = هفتگی روی همین روز؛ «هر ۲ هفته» = هر ۱۴ روز (همان روزِ هفته حفظ می‌شود)
      else recur = interval === 1 ? { freq: 'weekly', interval: 1, weekday: J.weekdayIndex(today) } : { freq: 'daily', interval: interval * 7 };
      return { recur, index: m.index, length: m[0].length, matched: m[0] };
    }
    // «هر شنبه» / «هر سه‌شنبه» / «هر جمعه»
    m = text.match(new RegExp(`هر (?:روز )?(?:(یک|دو|سه|چهار|پنج)${SEP})?(شنبه|جمعه)`));
    if (m) {
      const weekday = m[2] === 'جمعه' ? 6 : WD[m[1] || ''];
      return { recur: { freq: 'weekly', interval: 1, weekday }, index: m.index, length: m[0].length, matched: m[0] };
    }
    return null;
  }

  // نخستین رخداد اکیداً بعد از afterDate
  function nextOccurrence(recur, afterDate) {
    const base = new Date(afterDate.getFullYear(), afterDate.getMonth(), afterDate.getDate());
    if (recur.freq === 'daily') return addDays(base, Math.max(1, recur.interval || 1));
    if (recur.freq === 'weekly') {
      let d = addDays(base, 1);
      while (J.weekdayIndex(d) !== recur.weekday) d = addDays(d, 1);
      return d;
    }
    // monthly
    let { jy, jm } = J.fromDate(base);
    const step = Math.max(1, recur.interval || 1);
    for (let guard = 0; guard < 60; guard++) {
      const len = J.monthLength(jy, jm);
      const day = recur.day === 'last' ? len : Math.min(recur.day, len);
      const cand = J.jalaliToDate(jy, jm, day);
      if (cand > base) return cand;
      jm += step; while (jm > 12) { jm -= 12; jy++; }
    }
    return addDays(base, 30);
  }

  function parse(input, now = new Date()) {
    let text = normalize(input);
    if (!text) return { title: '', due: null, recur: null, matched: null, tags: [] };
    // برچسب‌ها: #کلمه (فارسی/انگلیسی/عدد، با نیم‌فاصله و خط تیره) — از عنوان جدا می‌شوند
    const tags = [];
    text = text.replace(/#([\p{L}\p{N}_‌-]+)/gu, (_, t) => { tags.push(t); return ' '; })
      .replace(/\s+/g, ' ').trim();
    text = ordinalsToDigits(text); // «سوم مرداد» → «۳ مرداد»
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let working = text, recur = null, due = null, matched = null;
    const rec = findRecur(text, today);
    if (rec) {
      recur = rec.recur;
      matched = rec.matched;
      due = J.iso(nextOccurrence(recur, addDays(today, -1))); // نخستین رخداد از امروز
      working = (text.slice(0, rec.index) + ' ' + text.slice(rec.index + rec.length)).replace(/\s+/g, ' ').trim();
    }

    const hit = findDate(working, now);
    if (hit) {
      due = J.iso(hit.date); // تاریخ صریح، شروعِ محاسبه‌شده را جابه‌جا می‌کند
      if (!matched) matched = hit.matched;
      working = (working.slice(0, hit.index) + ' ' + working.slice(hit.index + hit.length)).replace(/\s+/g, ' ').trim();
    }

    let title = working.replace(/[،,]\s*$/, '').trim();
    if (!title) title = text; // اگر کل ورودی فقط تاریخ/تکرار بود، عنوان را خالی نگذار
    return { title, due, recur, matched, tags };
  }

  // برچسب کوتاه فارسی برای spec تکرار
  function recurLabel(recur) {
    if (!recur) return '';
    if (recur.freq === 'daily') return recur.interval === 1 ? 'هر روز' : recur.interval % 7 === 0 ? `هر ${J.faDigits(recur.interval / 7)} هفته` : `هر ${J.faDigits(recur.interval)} روز`;
    if (recur.freq === 'weekly') {
      const w = J.WEEKDAYS[recur.weekday];
      return w ? `هر ${w}` : '';
    }
    // freqِ ناشناخته (پشتیبانِ قدیمی، دادهٔ واردشده) نباید «undefined هر undefined ماه» بدهد
    if (recur.freq !== 'monthly' || recur.day == null) return '';
    const d = recur.day === 'last' ? 'آخر' : recur.day === 1 ? 'اول' : J.faDigits(recur.day);
    return recur.interval === 1 ? `${d} هر ماه` : `${d} هر ${J.faDigits(recur.interval)} ماه`;
  }

  return { parse, normalize, nextOccurrence, recurLabel };
})();

if (typeof module !== 'undefined') module.exports = DateParser;
