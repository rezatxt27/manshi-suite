// منشی — «کیوسک»: هرچه اینجاست کاملاً آفلاین محاسبه می‌شود.
// هیچ‌کدام از این توابع به شبکه دست نمی‌زنند؛ همان وعدهٔ «همه‌چیز روی دستگاه خودت».
const Kiosk = (() => {
  const J = typeof Jalali !== 'undefined' ? Jalali : require('./jalali.js');

  // ── مناسبت‌های تقویمِ شمسی ───────────────────────────
  // فقط مناسبت‌های با تاریخِ **ثابتِ شمسی**. مناسبت‌های قمری (عید فطر، تاسوعا،
  // عاشورا و…) هر سال جابه‌جا می‌شوند و تبدیلِ دقیقشان به رؤیتِ هلال بستگی دارد؛
  // حدس‌زدنشان بدتر از نگفتنشان است، پس عمداً اینجا نیستند.
  const OCCASIONS = [
    [1, 1, 'نوروز — آغاز سال نو', true],
    [1, 2, 'عید نوروز', true],
    [1, 3, 'عید نوروز', true],
    [1, 4, 'عید نوروز', true],
    [1, 12, 'روز جمهوری اسلامی', true],
    [1, 13, 'روز طبیعت (سیزده‌بدر)', true],
    [2, 1, 'بزرگداشت سعدی', false],
    [2, 12, 'روز معلم', false],
    [2, 25, 'بزرگداشت فردوسی', false],
    [3, 3, 'آزادسازی خرمشهر', false],
    [3, 14, 'رحلت امام خمینی', true],
    [3, 15, 'قیام ۱۵ خرداد', true],
    [4, 1, 'روز اصناف', false],
    [6, 1, 'روز پزشک', false],
    [6, 4, 'روز کارمند', false],
    [6, 5, 'بزرگداشت زکریای رازی', false],
    [6, 17, 'قیام ۱۷ شهریور', false],
    [6, 31, 'آغاز هفتهٔ دفاع مقدس', false],
    [7, 1, 'آغاز سال تحصیلی', false],
    [7, 8, 'بزرگداشت مولوی', false],
    [7, 13, 'روز نیروی انتظامی', false],
    [7, 20, 'بزرگداشت حافظ', false],
    [8, 13, 'روز دانش‌آموز', false],
    [9, 7, 'روز نیروی دریایی', false],
    [9, 16, 'روز دانشجو', false],
    [9, 30, 'شب یلدا', false],
    [10, 9, 'روز بصیرت', false],
    [11, 19, 'روز نیروی هوایی', false],
    [12, 5, 'روز مهندس', false],
    [12, 25, 'بزرگداشت پروین اعتصامی', false],
    [12, 29, 'ملی شدن صنعت نفت', true]
  ];

  const occasionsOf = (jy) => OCCASIONS.map(([jm, jd, title, holiday]) => ({
    jy, jm, jd, title, holiday, date: J.jalaliToDate(jy, jm, jd)
  }));

  const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const DAY = 86400000;
  const daysUntil = (target, now) => Math.round((midnight(target) - midnight(now)) / DAY);

  // مناسبت‌های پیشِ رو — امسال و سال بعد را با هم می‌بیند تا اسفند/فروردین نشکند
  function upcomingOccasions(now = new Date(), count = 4, opts = {}) {
    const j = J.fromDate(now);
    const all = [...occasionsOf(j.jy), ...occasionsOf(j.jy + 1)];
    return all
      .filter(o => (opts.holidaysOnly ? o.holiday : true) && daysUntil(o.date, now) >= 0)
      .sort((a, b) => a.date - b.date)
      .slice(0, count)
      .map(o => ({ ...o, days: daysUntil(o.date, now) }));
  }

  const nextHoliday = (now = new Date()) => upcomingOccasions(now, 1, { holidaysOnly: true })[0] || null;
  const todayOccasions = (now = new Date()) => {
    const j = J.fromDate(now);
    return OCCASIONS.filter(([jm, jd]) => jm === j.jm && jd === j.jd)
      .map(([jm, jd, title, holiday]) => ({ jm, jd, title, holiday }));
  };

  // ── شمارش معکوس ─────────────────────────────────────
  // فصل‌های شمسی: بهار ۱–۳، تابستان ۴–۶، پاییز ۷–۹، زمستان ۱۰–۱۲
  const SEASONS = ['بهار', 'تابستان', 'پاییز', 'زمستان'];
  function countdowns(now = new Date()) {
    const j = J.fromDate(now);
    const out = [];
    const nowruz = J.jalaliToDate(j.jy + 1, 1, 1);
    out.push({ key: 'nowruz', label: `نوروز ${J.faDigits(j.jy + 1)}`, days: daysUntil(nowruz, now) });

    const seasonIdx = Math.floor((j.jm - 1) / 3);
    const nextSeasonMonth = (seasonIdx + 1) * 3 + 1;
    const seasonEnd = nextSeasonMonth > 12
      ? J.jalaliToDate(j.jy + 1, 1, 1)
      : J.jalaliToDate(j.jy, nextSeasonMonth, 1);
    out.push({ key: 'season', label: `پایان ${SEASONS[seasonIdx]}`, days: daysUntil(seasonEnd, now) });

    const monthEnd = j.jm === 12
      ? J.jalaliToDate(j.jy + 1, 1, 1)
      : J.jalaliToDate(j.jy, j.jm + 1, 1);
    out.push({ key: 'month', label: `پایان ${J.MONTHS[j.jm - 1]}`, days: daysUntil(monthEnd, now) });

    // آخرِ هفتهٔ کاری — تنها شمارشی که هر روز عوض می‌شود و به کارِ برنامه‌ریزی می‌آید
    // (weekdayIndex: ۰ = شنبه … ۵ = پنجشنبه)
    const toThursday = (5 - J.weekdayIndex(now) + 7) % 7;
    out.push({ key: 'weekend', label: 'آخر هفته', days: toThursday });
    // نزدیک‌ترین اول — «۲۳۶ روز تا نوروز» نباید جلوتر از «۲۶ روز تا آخر ماه» بنشیند
    return out.sort((a, b) => a.days - b.days);
  }

  // ── اوقات شرعی (محاسباتی، بدون شبکه) ────────────────
  // روشِ مؤسسهٔ ژئوفیزیک دانشگاه تهران: فجر ۱۷٫۷° ، مغرب ۴٫۵° ، عشا ۱۴°
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const sin = d => Math.sin(d * D2R), cos = d => Math.cos(d * D2R), tan = d => Math.tan(d * D2R);
  const arcsin = x => Math.asin(x) * R2D, arccos = x => Math.acos(x) * R2D;
  const arctan2 = (y, x) => Math.atan2(y, x) * R2D, arccot = x => Math.atan(1 / x) * R2D;
  const fix = (a, b) => { a -= b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const fixHour = h => fix(h, 24);

  const TEHRAN_METHOD = { fajr: 17.7, maghrib: 4.5, isha: 14 };

  function julianDay(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = fix(arctan2(cos(e) * sin(L), cos(L)) / 15, 24);
    return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - RA };
  }

  // اوقات را برای یک روز و یک نقطه حساب می‌کند. خروجی: ساعت‌های اعشاری
  function prayerTimes(date, lat, lng, tz) {
    const jDate = julianDay(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const midDay = t => fixHour(12 - sunPosition(jDate + t).eqt);
    const sunAngleTime = (angle, t, ccw) => {
      const decl = sunPosition(jDate + t).decl;
      const v = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      if (v > 1 || v < -1) return NaN;                 // عرض‌های قطبی: خورشید طلوع/غروب ندارد
      const t2 = arccos(v) / 15;
      return midDay(t) + (ccw ? -t2 : t2);
    };
    const asrTime = (t) => {
      const decl = sunPosition(jDate + t).decl;
      return sunAngleTime(-arccot(1 + tan(Math.abs(lat - decl))), t, false);
    };

    // دو بار تکرار می‌کنیم چون هر وقت به موقعیتِ خورشید در همان لحظه وابسته است
    let times = { fajr: 5 / 24, sunrise: 6 / 24, dhuhr: 12 / 24, asr: 13 / 24, maghrib: 18 / 24, isha: 18 / 24 };
    for (let i = 0; i < 2; i++) {
      times = {
        fajr: sunAngleTime(TEHRAN_METHOD.fajr, times.fajr, true) / 24,
        sunrise: sunAngleTime(0.833, times.sunrise, true) / 24,
        dhuhr: midDay(times.dhuhr) / 24,
        asr: asrTime(times.asr) / 24,
        maghrib: sunAngleTime(TEHRAN_METHOD.maghrib, times.maghrib, false) / 24,
        isha: sunAngleTime(TEHRAN_METHOD.isha, times.isha, false) / 24
      };
    }
    const out = {};
    const shift = tz - lng / 15;
    for (const k of Object.keys(times)) {
      const h = times[k] * 24 + shift;
      out[k] = Number.isFinite(h) ? fixHour(h) : null;
    }
    // نیمه‌شب شرعی به روشِ جعفری: میانهٔ مغرب تا فجرِ فردا
    if (out.maghrib != null && out.fajr != null) {
      out.midnight = fixHour(out.maghrib + fixHour(out.fajr - out.maghrib) / 2);
    }
    return out;
  }

  const hhmm = (h) => {
    if (h == null || !Number.isFinite(h)) return '—';
    let m = Math.round(h * 60);
    m = ((m % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  // وقتِ بعدی از میان اوقاتِ اصلی — «تا اذان مغرب ۲ ساعت مانده»
  const PRAYER_LABELS = { fajr: 'اذان صبح', sunrise: 'طلوع آفتاب', dhuhr: 'اذان ظهر', asr: 'عصر', maghrib: 'اذان مغرب', isha: 'عشا' };
  function nextPrayer(times, now = new Date()) {
    const cur = now.getHours() + now.getMinutes() / 60;
    const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const k of order) {
      if (times[k] != null && times[k] > cur) {
        return { key: k, label: PRAYER_LABELS[k], at: times[k], minutes: Math.round((times[k] - cur) * 60) };
      }
    }
    return times.fajr != null
      ? { key: 'fajr', label: PRAYER_LABELS.fajr, at: times.fajr, minutes: Math.round((times.fajr + 24 - cur) * 60), tomorrow: true }
      : null;
  }

  // شهرهای ایران — مختصات برای محاسبهٔ اوقات. منطقهٔ زمانی ایران +۳:۳۰ است
  // (ساعت تابستانی از ۱۴۰۱ برداشته شده).
  const CITIES = [
    ['تهران', 35.6892, 51.3890], ['مشهد', 36.2605, 59.6168], ['اصفهان', 32.6546, 51.6680],
    ['شیراز', 29.5918, 52.5837], ['تبریز', 38.0800, 46.2919], ['کرج', 35.8400, 50.9391],
    ['اهواز', 31.3183, 48.6706], ['قم', 34.6416, 50.8746], ['کرمانشاه', 34.3142, 47.0650],
    ['رشت', 37.2808, 49.5832], ['یزد', 31.8974, 54.3569], ['کرمان', 30.2839, 57.0834],
    ['بندرعباس', 27.1865, 56.2808], ['ارومیه', 37.5527, 45.0761], ['زاهدان', 29.4963, 60.8629]
  ];
  const IRAN_TZ = 3.5;
  const cityByName = (name) => CITIES.find(c => c[0] === name) || CITIES[0];

  // ── سخنِ روز ────────────────────────────────────────
  // شعرِ کلاسیک فارسی مالکیت عمومی است. نقل‌قول‌ها ترجمهٔ آزادِ جمله‌های
  // شناخته‌شده‌اند و فقط مواردی آمده که انتسابشان محلِ مناقشه نیست.
  const P = (poet, first, second) => ({ kind: 'poem', poet, lines: [first, second] });
  const Q = (who, text) => ({ kind: 'quote', poet: who, lines: [text] });

  const SAYINGS = [
    // حافظ
    P('حافظ', 'اگر آن ترک شیرازی به دست آرد دل ما را', 'به خال هندویش بخشم سمرقند و بخارا را'),
    P('حافظ', 'یوسف گم‌گشته بازآید به کنعان غم مخور', 'کلبهٔ احزان شود روزی گلستان غم مخور'),
    P('حافظ', 'رسید مژده که ایام غم نخواهد ماند', 'چنان نماند چنین نیز هم نخواهد ماند'),
    P('حافظ', 'بنشین بر لب جوی و گذر عمر ببین', 'کاین اشارت ز جهان گذران ما را بس'),
    P('حافظ', 'مزرع سبز فلک دیدم و داس مه نو', 'یادم از کشتهٔ خویش آمد و هنگام درو'),
    P('حافظ', 'سال‌ها دل طلب جام جم از ما می‌کرد', 'وان چه خود داشت ز بیگانه تمنا می‌کرد'),
    P('حافظ', 'عیب رندان مکن ای زاهد پاکیزه‌سرشت', 'که گناه دگران بر تو نخواهند نوشت'),
    P('حافظ', 'درخت دوستی بنشان که کام دل به بار آرد', 'نهال دشمنی برکن که رنج بی‌شمار آرد'),
    P('حافظ', 'بیا تا گل برافشانیم و می در ساغر اندازیم', 'فلک را سقف بشکافیم و طرحی نو دراندازیم'),
    P('حافظ', 'ما ز یاران چشم یاری داشتیم', 'خود غلط بود آنچه ما پنداشتیم'),
    // سعدی
    P('سعدی', 'بنی‌آدم اعضای یک پیکرند', 'که در آفرینش ز یک گوهرند'),
    P('سعدی', 'تو کز محنت دیگران بی‌غمی', 'نشاید که نامت نهند آدمی'),
    P('سعدی', 'نابرده رنج گنج میسر نمی‌شود', 'مزد آن گرفت جان برادر که کار کرد'),
    P('سعدی', 'سعدیا مرد نکونام نمیرد هرگز', 'مرده آن است که نامش به نکویی نبرند'),
    P('سعدی', 'هر که در او جوهر دانایی است', 'بر همه چیزش توانایی است'),
    // مولوی
    P('مولوی', 'بشنو این نی چون شکایت می‌کند', 'از جدایی‌ها حکایت می‌کند'),
    P('مولوی', 'هر کسی کو دور ماند از اصل خویش', 'بازجوید روزگار وصل خویش'),
    P('مولوی', 'آب در کشتی هلاک کشتی است', 'آب اندر زیر کشتی پشتی است'),
    P('مولوی', 'از محبت تلخ‌ها شیرین شود', 'وز محبت مس‌ها زرین شود'),
    P('مولوی', 'تو مگو همه به جنگند و ز صلح من چه آید', 'تو یکی نه‌ای هزاری تو چراغ خود برافروز'),
    // خیام
    P('خیام', 'این قافله عمر عجب می‌گذرد', 'دریاب دمی که با طرب می‌گذرد'),
    P('خیام', 'از دی که گذشت هیچ ازو یاد مکن', 'فردا که نیامده‌ست فریاد مکن'),
    P('خیام', 'بر نامده و گذشته بنیاد مکن', 'حالی خوش باش و عمر بر باد مکن'),
    P('خیام', 'ای دوست بیا تا غم فردا نخوریم', 'وین یکدم عمر را غنیمت شمریم'),
    // فردوسی
    P('فردوسی', 'توانا بود هر که دانا بود', 'ز دانش دل پیر برنا بود'),
    P('فردوسی', 'بسی رنج بردم در این سال سی', 'عجم زنده کردم بدین پارسی'),
    P('فردوسی', 'میازار موری که دانه‌کش است', 'که جان دارد و جان شیرین خوش است'),
    // دیگران
    P('نظامی', 'هر که نامخت از گذشت روزگار', 'نیز ناموزد ز هیچ آموزگار'),
    P('باباطاهر', 'ز دست دیده و دل هر دو فریاد', 'که هر چه دیده بیند دل کند یاد'),
    P('پروین اعتصامی', 'برو کار می‌کن مگو چیست کار', 'که سرمایهٔ جاودانی است کار'),
    P('شهریار', 'آمدی جانم به قربانت ولی حالا چرا', 'بی‌وفا حالا که من افتاده‌ام از پا چرا'),
    // نقل‌قول‌ها
    Q('آلبرت انیشتین', 'خیال از دانش مهم‌تر است؛ دانش محدود است، خیال دنیا را در بر می‌گیرد.'),
    Q('ماری کوری', 'در زندگی هیچ چیز ترسناک نیست، فقط باید فهمیدش. حالا وقت آن است که بیشتر بفهمیم تا کمتر بترسیم.'),
    Q('توماس ادیسون', 'شکست نخورده‌ام؛ فقط هزاران راهی را که جواب نمی‌دهد پیدا کرده‌ام.'),
    Q('نلسون ماندلا', 'هر کاری تا وقتی که انجام نشده، ناممکن به‌نظر می‌رسد.'),
    Q('استیو جابز', 'تنها راه انجامِ کار بزرگ، دوست‌داشتنِ کاری است که می‌کنی.'),
    Q('آلن کی', 'بهترین راه پیش‌بینی آینده، ساختنِ آن است.'),
    Q('سقراط', 'تنها چیزی که می‌دانم این است که هیچ نمی‌دانم.'),
    Q('لائوتزه', 'سفر هزار فرسنگی با یک قدم آغاز می‌شود.'),
    Q('مارکوس اورلیوس', 'تو بر ذهنِ خودت قدرت داری، نه بر رویدادهای بیرون. این را بدان تا نیرو بیابی.'),
    Q('هلن کلر', 'تنها چیزِ بدتر از نابینایی، داشتنِ چشم است و نداشتنِ چشم‌انداز.'),
    Q('پیتر دراکر', 'هیچ چیز به‌اندازهٔ انجام‌دادنِ کارآمدِ کاری که اصلاً نباید انجام شود، بیهوده نیست.')
  ];

  const POETS = [...new Set(SAYINGS.map(s => s.poet))];
  const filterSayings = (mode) =>
    mode === 'poem' ? SAYINGS.filter(s => s.kind === 'poem')
      : mode === 'quote' ? SAYINGS.filter(s => s.kind === 'quote')
        : SAYINGS;

  // انتخابِ روزانه باید پایدار باشد: یک روز، یک سخن — نه هر بار رندر یک چیز تازه
  function sayingOfDay(now = new Date(), mode = 'all') {
    const pool = filterSayings(mode);
    if (!pool.length) return null;
    const key = Math.floor(midnight(now).getTime() / DAY);
    return pool[((key % pool.length) + pool.length) % pool.length];
  }
  function randomSaying(mode = 'all', not = null) {
    const pool = filterSayings(mode);
    if (!pool.length) return null;
    // پشتِ سرِ هم همان سخن را نده — «یکی دیگر» باید واقعاً چیزِ دیگری بدهد
    const choices = pool.length > 1 && not ? pool.filter(s => s.lines[0] !== not) : pool;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // ── عکسِ خبر ─────────────────────────────────────────
  // فیدها عکس را در جاهای مختلفی می‌گذارند و بعضی‌ها آدرسِ بی‌ربط یا خطرناک.
  // فقط https و فقط چیزی که واقعاً عکس به‌نظر می‌رسد قبول است — نه data: نه javascript:
  const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
  function safeImageUrl(raw, type = '') {
    const u = String(raw || '').trim();
    if (!u || !/^https:\/\//i.test(u)) return '';
    let parsed;
    try { parsed = new URL(u); } catch (_) { return ''; }
    if (parsed.protocol !== 'https:') return '';
    const looksImage = IMAGE_EXT.test(parsed.pathname) || /^image\//i.test(type) || /image/i.test(type);
    return looksImage ? parsed.href : '';
  }
  // اولین <img> داخلِ توضیحاتِ خبر — وقتی فید تگِ عکسِ جدا ندارد
  function imageFromHtml(html) {
    const m = String(html || '').match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
    return m ? safeImageUrl(m[1], 'image/*') : '';
  }

  const api = {
    OCCASIONS, CITIES, IRAN_TZ, PRAYER_LABELS, safeImageUrl, imageFromHtml,
    occasionsOf, upcomingOccasions, nextHoliday, todayOccasions, daysUntil,
    countdowns, prayerTimes, nextPrayer, hhmm, cityByName,
    sayingOfDay, randomSaying, filterSayings, SAYINGS, POETS
  };
  if (typeof globalThis !== 'undefined') globalThis.Kiosk = api;
  return api;
})();

if (typeof module !== 'undefined') module.exports = Kiosk;
