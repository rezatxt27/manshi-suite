// وردست — ماژول تاریخ جلالی (بدون وابستگی، مشترک بین داشبورد و Service Worker)
const Jalali = (() => {
  const div = (a, b) => Math.floor(a / b);

  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  // ایندکس ۰ = شنبه (شروع هفتهٔ کاری ایرانی)
  const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  function toJalali(gy, gm, gd) {
    const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) +
      div(gy2 + 399, 400) + gd + gdm[gm - 1];
    let jy = -1595 + 33 * div(days, 12053);
    days %= 12053;
    jy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
    let jm, jd;
    if (days < 186) { jm = 1 + div(days, 31); jd = 1 + (days % 31); }
    else { jm = 7 + div(days - 186, 30); jd = 1 + ((days - 186) % 30); }
    return { jy, jm, jd };
  }

  function toGregorian(jy, jm, jd) {
    jy += 1595;
    let days = -355668 + 365 * jy + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd +
      (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    let gy = 400 * div(days, 146097);
    days %= 146097;
    if (days > 36524) {
      gy += 100 * div(--days, 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * div(days, 1461);
    days %= 1461;
    if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
    let gd = days + 1;
    const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
    const sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm = 0;
    while (gm < 13 && gd > sal[gm]) gd -= sal[gm++];
    return { gy, gm, gd };
  }

  function faDigits(s) { return String(s).replace(/[0-9]/g, d => FA_DIGITS[+d]); }
  function enDigits(s) {
    return String(s)
      .replace(/[۰-۹]/g, d => String(FA_DIGITS.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  }

  function fromDate(date) {
    return toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  function jalaliToDate(jy, jm, jd) {
    const g = toGregorian(jy, jm, jd);
    return new Date(g.gy, g.gm - 1, g.gd);
  }

  function monthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    const a = jalaliToDate(jy, 1, 1).getTime();
    const b = jalaliToDate(jy + 1, 1, 1).getTime();
    return Math.round((b - a) / 86400000) === 366 ? 30 : 29;
  }

  // ایندکس روز هفتهٔ ایرانی: شنبه=۰ … جمعه=۶
  function weekdayIndex(date) { return (date.getDay() + 1) % 7; }

  function iso(date) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }

  function fromISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // «دوشنبه ۲۹ تیر ۱۴۰۵»
  function format(date, { weekday = true, year = true } = {}) {
    const j = fromDate(date);
    const parts = [];
    if (weekday) parts.push(WEEKDAYS[weekdayIndex(date)]);
    parts.push(faDigits(j.jd), MONTHS[j.jm - 1]);
    if (year) parts.push(faDigits(j.jy));
    return parts.join(' ');
  }

  // برچسب نسبی کوتاه برای چیپ‌ها: «امروز»، «فردا»، «۳ روز پیش»، «چهارشنبه ۳۱ تیر»
  function relLabel(isoDate, now = new Date()) {
    const d = fromISO(isoDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'امروز';
    if (diff === 1) return 'فردا';
    if (diff === 2) return 'پس‌فردا';
    if (diff === -1) return 'دیروز';
    if (diff < 0) return `${faDigits(-diff)} روز پیش`;
    if (diff < 7) return WEEKDAYS[weekdayIndex(d)];
    return format(d, { year: false });
  }

  function startOfWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - weekdayIndex(d));
    return d; // شنبهٔ همین هفته
  }

  return {
    toJalali, toGregorian, fromDate, jalaliToDate, monthLength,
    weekdayIndex, iso, fromISO, format, relLabel, startOfWeek,
    faDigits, enDigits, MONTHS, WEEKDAYS
  };
})();

if (typeof module !== 'undefined') module.exports = Jalali;
