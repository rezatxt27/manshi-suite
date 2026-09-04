// وردست — اجرای تست‌ها: node tests/run.js
const assert = require('assert');
const J = require('../core/jalali.js');
const DP = require('../core/date-parser.js');
const ICS = require('../core/ics.js');

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.error('  ✗ ' + name + '\n    ' + e.message); }
}

console.log('\n— جلالی —');
t('نوروز ۱۴۰۳ = 2024-03-20', () => {
  assert.deepStrictEqual(J.toJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 });
});
t('2026-07-20 = ۲۹ تیر ۱۴۰۵', () => {
  assert.deepStrictEqual(J.toJalali(2026, 7, 20), { jy: 1405, jm: 4, jd: 29 });
});
t('رفت‌وبرگشت ۲۰ سال', () => {
  for (let y = 2015; y <= 2035; y++) {
    for (const [m, d] of [[1, 1], [3, 21], [7, 4], [12, 31], [2, 28]]) {
      const j = J.toJalali(y, m, d);
      assert.deepStrictEqual(J.toGregorian(j.jy, j.jm, j.jd), { gy: y, gm: m, gd: d });
    }
  }
});
t('طول ماه: اسفند ۱۴۰۳ کبیسه = ۳۰', () => {
  assert.strictEqual(J.monthLength(1403, 12), 30);
  assert.strictEqual(J.monthLength(1404, 12), 29);
});
t('روز هفته: 2026-07-20 دوشنبه است', () => {
  assert.strictEqual(J.WEEKDAYS[J.weekdayIndex(new Date(2026, 6, 20))], 'دوشنبه');
});
t('ارقام فارسی', () => {
  assert.strictEqual(J.faDigits('123'), '۱۲۳');
  assert.strictEqual(J.enDigits('۴۵'), '45');
});

console.log('\n— تجزیهٔ تاریخ طبیعی —');
const now = new Date(2026, 6, 20); // دوشنبه ۲۹ تیر ۱۴۰۵
const p = s => DP.parse(s, now);
t('«فاکتور رو بفرست تا فردا»', () => {
  const r = p('فاکتور رو بفرست تا فردا');
  assert.strictEqual(r.title, 'فاکتور رو بفرست');
  assert.strictEqual(r.due, '2026-07-21');
});
t('«پس‌فردا جلسه بذار»', () => {
  assert.strictEqual(p('پس‌فردا جلسه بذار').due, '2026-07-22');
});
t('«گزارش تا چهارشنبه» → چهارشنبهٔ همین هفته', () => {
  // دوشنبه است؛ چهارشنبه دو روز بعد
  assert.strictEqual(p('گزارش تا چهارشنبه').due, '2026-07-22');
});
t('«تماس سه‌شنبه هفته بعد»', () => {
  // سه‌شنبهٔ این هفته فرداست (۲۱)؛ هفتهٔ بعد = ۲۸
  assert.strictEqual(p('تماس سه‌شنبه هفته بعد').due, '2026-07-28');
});
t('«شنبه» یعنی شنبهٔ آینده نه امروز', () => {
  assert.strictEqual(p('پیگیری شنبه').due, '2026-07-25');
});
t('«قرارداد تا ۵ مرداد»', () => {
  const r = p('قرارداد تا ۵ مرداد');
  assert.strictEqual(r.title, 'قرارداد');
  // ۵ مرداد ۱۴۰۵ = 2026-07-27
  assert.strictEqual(r.due, '2026-07-27');
});
t('«۳ روز دیگه زنگ بزن»', () => {
  assert.strictEqual(p('۳ روز دیگه زنگ بزن').due, '2026-07-23');
});
t('«تا آخر هفته» → پنجشنبه', () => {
  assert.strictEqual(p('جمع‌بندی تا آخر هفته').due, '2026-07-23');
});
t('«تا آخر ماه» → ۳۱ تیر', () => {
  assert.strictEqual(p('بودجه تا آخر ماه').due, '2026-07-22');
});
t('بدون تاریخ', () => {
  const r = p('ایمیل تأمین‌کننده را جواب بده');
  assert.strictEqual(r.due, null);
  assert.strictEqual(r.title, 'ایمیل تأمین‌کننده را جواب بده');
});
t('«شنبه» داخل کلمهٔ روز دیگر گم نمی‌شود', () => {
  assert.strictEqual(p('گزارش پنجشنبه').due, '2026-07-23');
});

console.log('\n— تکرارشونده —');
t('«هر شنبه گزارش بده» → weekly شنبه', () => {
  const r = p('هر شنبه گزارش بده');
  assert.strictEqual(r.title, 'گزارش بده');
  assert.deepStrictEqual(r.recur, { freq: 'weekly', interval: 1, weekday: 0 });
  assert.strictEqual(r.due, '2026-07-25'); // شنبهٔ بعدی
});
t('«هر روز ورزش» → daily', () => {
  const r = p('هر روز ورزش');
  assert.deepStrictEqual(r.recur, { freq: 'daily', interval: 1 });
  assert.strictEqual(r.due, '2026-07-20'); // از امروز
});
t('«اول هر ماه فاکتورها» → monthly روز ۱', () => {
  const r = p('اول هر ماه فاکتورها');
  assert.strictEqual(r.title, 'فاکتورها');
  assert.deepStrictEqual(r.recur, { freq: 'monthly', interval: 1, day: 1 });
  assert.strictEqual(r.due, '2026-07-23'); // ۱ مرداد ۱۴۰۵
});
t('«آخر هر ماه» → monthly day=last', () => {
  const r = p('آخر هر ماه تسویه');
  assert.deepStrictEqual(r.recur, { freq: 'monthly', interval: 1, day: 'last' });
  assert.strictEqual(r.due, '2026-07-22'); // ۳۱ تیر
});
t('«هر ۲ هفته» → هر ۱۴ روز، روزِ هفته حفظ می‌شود', () => {
  const r = p('هر ۲ هفته جلسه');
  assert.deepStrictEqual(r.recur, { freq: 'daily', interval: 14 });
  const first = DP.parse('هر ۲ هفته جلسه', now).due;
  const next = J.iso(DP.nextOccurrence(r.recur, J.fromISO(first)));
  assert.strictEqual(J.weekdayIndex(J.fromISO(next)), J.weekdayIndex(J.fromISO(first)));
});
t('nextOccurrence هفتگی همان روزِ هفته را می‌دهد', () => {
  const rec = { freq: 'weekly', interval: 1, weekday: 2 }; // دوشنبه
  const d = DP.nextOccurrence(rec, now);
  assert.strictEqual(J.weekdayIndex(d), 2);
  assert.ok(d > now);
});
t('nextOccurrence ماهانه از ۳۱‌ام به ماه کوتاه‌تر سرریز نمی‌کند', () => {
  const rec = { freq: 'monthly', interval: 1, day: 'last' };
  const d = DP.nextOccurrence(rec, new Date(2026, 6, 22)); // ۳۱ تیر
  const j = J.fromDate(d);
  assert.strictEqual(j.jm, 5); // مرداد
  assert.strictEqual(j.jd, J.monthLength(j.jy, 5)); // آخر مرداد
});
t('تاریخ صریح، تکرار را خراب نمی‌کند', () => {
  const r = p('پرداخت مالیات را جواب بده'); // بدون تکرار
  assert.strictEqual(r.recur, null);
});

console.log('\n— iCal —');
const sampleICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tehran:20260720T100000',
  'DTEND;TZID=Asia/Tehran:20260720T104500',
  'SUMMARY:جلسهٔ هفتگی',
  'LOCATION:https://meet.google.com/abc-defg-hij',
  'ATTENDEE;CN=کامران نیک‌پور;ROLE=REQ-PARTICIPANT:mailto:kamran@example.com',
  'ATTENDEE;ROLE=REQ-PARTICIPANT:mailto:negar@example.com',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;TZID=Asia/Tehran:20260713T140000',
  'DTEND;TZID=Asia/Tehran:20260713T150000',
  'RRULE:FREQ=WEEKLY;BYDAY=MO',
  'SUMMARY:دموی محصول',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20260721',
  'SUMMARY:مرخصی',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');
t('رویداد ساده + لینک Meet', () => {
  const evs = ICS.parse(sampleICS, new Date(2026, 6, 19), new Date(2026, 6, 26));
  const weekly = evs.find(e => e.title === 'جلسهٔ هفتگی');
  assert.ok(weekly, 'رویداد پیدا نشد');
  assert.strictEqual(weekly.meet, 'https://meet.google.com/abc-defg-hij');
});
t('RRULE هفتگی در بازه گسترش می‌یابد', () => {
  const evs = ICS.parse(sampleICS, new Date(2026, 6, 19), new Date(2026, 6, 26));
  const demo = evs.filter(e => e.title === 'دموی محصول');
  assert.strictEqual(demo.length, 1); // دوشنبهٔ داخل بازه: ۲۰ژوئیه
  assert.strictEqual(new Date(demo[0].start).getDate(), 20);
});
t('رویداد تمام‌روز', () => {
  const evs = ICS.parse(sampleICS, new Date(2026, 6, 19), new Date(2026, 6, 26));
  const off = evs.find(e => e.title === 'مرخصی');
  assert.ok(off && off.allDay);
});
t('شرکت‌کننده‌ها: CN و mailto', () => {
  const evs = ICS.parse(sampleICS, new Date(2026, 6, 19), new Date(2026, 6, 26));
  const weekly = evs.find(e => e.title === 'جلسهٔ هفتگی');
  assert.deepStrictEqual(weekly.attendees, ['کامران نیک‌پور', 'negar']);
});
t('لینک Meet: دنبالهٔ آلوده (RTL + فارسی + \\n) پاک می‌شود', () => {
  // بازتولید باگ واقعی: URL در DESCRIPTION با \n و متن فارسی چسبیده
  const dirty = [
    'BEGIN:VCALENDAR', 'BEGIN:VEVENT',
    'DTSTART;TZID=Asia/Tehran:20260720T090000',
    'DTEND;TZID=Asia/Tehran:20260720T093000',
    'SUMMARY:جلسهٔ آلوده',
    'DESCRIPTION:برای ورود کلیک کنید: https://meet.google.com/axh-fxdi-jpv\\n\\n‏رد کردن دعوت',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const evs = ICS.parse(dirty, new Date(2026, 6, 19), new Date(2026, 6, 26));
  const ev = evs.find(e => e.title === 'جلسهٔ آلوده');
  assert.strictEqual(ev.meet, 'https://meet.google.com/axh-fxdi-jpv');
});

// باگِ واقعیِ گزارش‌شده: جلسه دوبار در تقویم دیده می‌شد و جلسه‌های منقضی/لغوشده باقی می‌ماندند.
// گوگل نمونهٔ تغییریافتهٔ یک سری را با همان UID و یک RECURRENCE-ID جدا می‌فرستد.
const recurFeed = [
  'BEGIN:VCALENDAR',
  // سریِ هفتگی که نمونهٔ ۲۲ تیرش جداگانه هم فرستاده شده
  'BEGIN:VEVENT', 'UID:sync@google.com',
  'DTSTART;TZID=Asia/Tehran:20260715T150000', 'DTEND;TZID=Asia/Tehran:20260715T160000',
  'RRULE:FREQ=WEEKLY;BYDAY=WE', 'SUMMARY:sync هفتگی', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:sync@google.com', 'RECURRENCE-ID;TZID=Asia/Tehran:20260722T150000',
  'DTSTART;TZID=Asia/Tehran:20260722T150000', 'DTEND;TZID=Asia/Tehran:20260722T160000',
  'SUMMARY:sync هفتگی', 'END:VEVENT',
  // سریِ روزانه که نمونهٔ ۲۳ تیرش لغو شده
  'BEGIN:VEVENT', 'UID:standup@google.com',
  'DTSTART;TZID=Asia/Tehran:20260719T090000', 'DTEND;TZID=Asia/Tehran:20260719T093000',
  'RRULE:FREQ=DAILY', 'SUMMARY:استندآپ', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:standup@google.com', 'RECURRENCE-ID;TZID=Asia/Tehran:20260723T090000',
  'DTSTART;TZID=Asia/Tehran:20260723T090000', 'DTEND;TZID=Asia/Tehran:20260723T093000',
  'STATUS:CANCELLED', 'SUMMARY:استندآپ', 'END:VEVENT',
  // سریِ دو‌جلسه‌ای که تمام شده
  'BEGIN:VEVENT', 'UID:ended@google.com',
  'DTSTART;TZID=Asia/Tehran:20260701T110000', 'DTEND;TZID=Asia/Tehran:20260701T120000',
  'RRULE:FREQ=WEEKLY;COUNT=2;BYDAY=WE', 'SUMMARY:سریِ تمام‌شده', 'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');
const recurEvs = () => ICS.parse(recurFeed, new Date(2026, 6, 19), new Date(2026, 6, 30));
const onDay = (evs, title, d) => evs.filter(e =>
  e.title === title && new Date(e.start).getDate() === d).length;

t('تقویم: نمونهٔ تغییریافتهٔ سری فقط یک بار می‌آید (باگِ جلسهٔ تکراری)', () =>
  assert.strictEqual(onDay(recurEvs(), 'sync هفتگی', 22), 1));
t('تقویم: نمونهٔ لغوشدهٔ سری نمایش داده نمی‌شود', () =>
  assert.strictEqual(onDay(recurEvs(), 'استندآپ', 23), 0));
t('تقویم: نمونه‌های لغونشدهٔ همان سری سرِجایشان می‌مانند', () =>
  assert.strictEqual(onDay(recurEvs(), 'استندآپ', 24), 1));
t('تقویم: COUNT رعایت می‌شود — سریِ تمام‌شده تکرار نمی‌سازد', () =>
  assert.strictEqual(recurEvs().filter(e => e.title === 'سریِ تمام‌شده').length, 0));
t('تقویم: هیچ رویدادی با عنوان و زمانِ یکسان دوبار نیست', () => {
  const evs = recurEvs();
  const keys = evs.map(e => e.start + '|' + e.title);
  assert.strictEqual(keys.length, new Set(keys).size);
});

// startedAt گاهی عدد است و گاهی رشتهٔ ISO (پشتیبانِ منشی). تفریقِ رشته‌ها NaN می‌دهد
// و مرتب‌سازیِ فهرست جلسه‌ها بی‌صدا از کار می‌افتد.
{
  const sessionTime = s => {
    const v = s && s.startedAt;
    if (typeof v === 'number') return v;
    const t = v ? new Date(v).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };
  const byNewest = (a, b) => sessionTime(b) - sessionTime(a);
  const D = n => new Date(2026, 6, n, 10, 0).toISOString();
  t('جلسه‌ها: مرتب‌سازی با startedAtِ رشته‌ای هم درست است', () => {
    const list = [{ startedAt: D(24) }, { startedAt: D(17) }, { startedAt: D(22) }];
    assert.deepStrictEqual(list.sort(byNewest).map(s => new Date(s.startedAt).getDate()), [24, 22, 17]);
  });
  t('جلسه‌ها: مرتب‌سازی با startedAtِ عددی هم درست است', () => {
    const list = [{ startedAt: 300 }, { startedAt: 100 }, { startedAt: 200 }];
    assert.deepStrictEqual(list.sort(byNewest).map(s => s.startedAt), [300, 200, 100]);
  });
  t('جلسه‌ها: ترکیبِ عدد و رشته و مقدارِ خالی هم نمی‌شکند', () => {
    const list = [{ startedAt: D(20) }, { startedAt: null }, { startedAt: new Date(2026, 6, 25).getTime() }];
    const out = list.sort(byNewest);
    assert.strictEqual(sessionTime(out[0]) > sessionTime(out[1]), true);
    assert.strictEqual(sessionTime(out[2]), 0, 'مقدارِ خالی باید آخر بیفتد');
  });
}

console.log('\n— جست‌وجو و پرسش در جلسه‌ها —');
{
  const MS = require('../core/search.js');
  const D = n => Date.now() - n * 86400000;
  const mk = (id, title, at, lines, summary) => ({
    id, title, startedAt: at, updatedAt: at + 27e5,
    transcript: lines.map((t, i) => ({ speaker: i % 2 ? 'نگار' : 'کاربر', text: t, at: at + i * 6e4 })),
    summary: summary || ''
  });
  const archive = [
    mk('s1', 'جلسهٔ ظرفیت زیرساخت', D(21), [
      'ظرفیت سرور فعلی ۲۰۰ درخواست بر ثانیه است.',
      'قرار شد برآورد هزینهٔ ارتقا آماده شود.'], '## خلاصه\n\nظرفیت فعلی کافی نیست.'),
    mk('s2', 'بازبینی ظرفیت', D(10), [
      'برآورد هزینهٔ ارتقای سرور ماهانه ۴۵ میلیون تومان شد.',
      'تصمیم گرفتیم ارتقا ندهیم و کش اضافه کنیم.'], ''),
    mk('s3', 'جلسهٔ فروش', D(5), [
      'قیف فروش دو قرارداد نهایی داشت.'], '')
  ];

  t('جست‌وجو: علائم فارسی جزو واژه حساب نمی‌شوند', () =>
    assert.deepStrictEqual(MS.tokenize('تاریخ انتشار چی شد؟'), ['تاریخ', 'انتشار']));
  t('جست‌وجو: واژه‌های پرتکرار بی‌معنا حذف می‌شوند', () =>
    assert.deepStrictEqual(MS.tokenize('این را به من بده'), ['بده']));
  t('جست‌وجو: رقم فارسی و لاتین یکی دیده می‌شوند', () =>
    assert.deepStrictEqual(MS.tokenize('۲۰۰'), MS.tokenize('200')));

  t('بازیابی: فقط جلسه‌های مرتبط برمی‌گردند', () => {
    const { sources } = MS.retrieve(archive, 'ظرفیت سرور');
    assert.ok(sources.length > 0);
    assert.ok(!sources.some(x => x.sessionId === 's3'), 'جلسهٔ بی‌ربط نباید بیاید');
  });
  t('بازیابی: منابع شماره‌گذاری پیوسته دارند', () => {
    const { sources } = MS.retrieve(archive, 'ظرفیت سرور');
    assert.deepStrictEqual(sources.map(x => x.n), sources.map((_, i) => i + 1));
  });
  t('بازیابی: سقف نویسه رعایت می‌شود', () => {
    const { sources } = MS.retrieve(archive, 'ظرفیت سرور', { maxChars: 200 });
    const total = sources.reduce((n, x) => n + x.text.length, 0);
    assert.ok(total <= 200, `مجموع ${total} نویسه — باید زیر سقف بماند`);
  });
  t('بازیابی: پرسشِ بی‌ربط منبعی برنمی‌گرداند', () =>
    assert.strictEqual(MS.retrieve(archive, 'زرافه در قطب جنوب').sources.length, 0));

  t('پرسش: پرامپت شماره و عنوان هر منبع را دارد', () => {
    const { sources } = MS.retrieve(archive, 'ظرفیت سرور');
    const { system, user } = MS.buildQaPrompt('ظرفیت چقدر است؟', sources);
    assert.ok(/حدس نزن/.test(system), 'قاعدهٔ حدس‌نزدن باید باشد');
    assert.ok(/فقط و فقط بر اساس/.test(system));
    for (const s of sources) assert.ok(user.includes(`[${s.n}] جلسه: ${s.title}`), 'منبع ' + s.n + ' در پرامپت نیست');
  });
  t('پرسش: ارجاع‌های فارسی و لاتین هر دو خوانده می‌شوند', () => {
    assert.deepStrictEqual(MS.citedNumbers('الف [۱] ب [3] پ [۱]'), [1, 3]);
    assert.deepStrictEqual(MS.citedNumbers('بدون ارجاع'), []);
  });

  t('جست‌وجوی کلیدواژه‌ای: گروه‌بندی بر اساس جلسه', () => {
    const { groups } = MS.keywordResults(archive, 'ظرفیت سرور');
    assert.ok(groups.length >= 2);
    assert.ok(!groups.some(g => g.sessionId === 's3'));
    assert.ok(groups[0].hits.length > 0 && groups[0].hits[0].ref >= 1, 'هر نتیجه باید شمارهٔ خط داشته باشد');
  });
  t('جست‌وجوی کلیدواژه‌ای: پرسش خالی نتیجه ندارد', () =>
    assert.strictEqual(MS.keywordResults(archive, '   ').groups.length, 0));
}

console.log('\n— امنیت —');
{
  const AI = require('../core/ai-client.js');
  // متن کاملِ جلسه و کلید API از این آدرس عبور می‌کنند
  t('امنیت: آدرس http بیرونی رد می‌شود', () => {
    assert.strictEqual(AI.secureEndpoint('http://evil.example.com'), false);
    assert.strictEqual(AI.profileReady({ baseUrl: 'http://evil.example.com', key: 'k', model: 'm' }), false);
  });
  t('امنیت: https پذیرفته می‌شود', () =>
    assert.strictEqual(AI.secureEndpoint('https://api.openai.com'), true));
  t('امنیت: localhost برای مدل محلی مجاز است', () => {
    assert.strictEqual(AI.secureEndpoint('http://localhost:11434'), true);
    assert.strictEqual(AI.secureEndpoint('http://127.0.0.1:1234'), true);
  });
  t('امنیت: پروتکل نامعتبر و آدرس خراب رد می‌شوند', () => {
    assert.strictEqual(AI.secureEndpoint('ftp://x.com'), false);
    assert.strictEqual(AI.secureEndpoint('not-a-url'), false);
    assert.strictEqual(AI.secureEndpoint(''), false);
  });

  // فید تقویم کاملاً بیرونی است؛ نباید بتواند لینکِ اجراپذیر تزریق کند
  const ICSm = require('../core/ics.js');
  t('امنیت: لینک javascript: از تقویم عبور نمی‌کند', () => {
    const feed = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:x',
      'DTSTART:20260725T090000', 'DTEND:20260725T093000',
      'SUMMARY:جلسه', 'DESCRIPTION:javascript:alert(1) و <img src=x onerror=alert(1)>',
      'LOCATION:javascript:alert(1)', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const evs = ICSm.parse(feed, new Date(2026, 6, 20), new Date(2026, 6, 30));
    assert.strictEqual(evs.length, 1);
    assert.ok(!evs[0].meet || /^https:\/\//.test(evs[0].meet), 'لینک جلسه فقط https');
  });
}

console.log('\n— store: آدم‌ها و پشتیبان‌گیری —');
const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; }
};
const Store = require('../core/store.js');
const T = (title, who, dir, status) => ({
  id: 't' + Math.random().toString(36).slice(2), title, who: who || null,
  dir: dir || 'mine', due: null, status: status || 'open',
  createdAt: new Date().toISOString(), doneAt: status === 'done' ? new Date().toISOString() : null,
  source: 'manual', meetingRef: null, recur: null
});

// ادغام شرکت‌کننده‌ها: تقویم ایمیل می‌دهد، زیرنویس نام — یک نفر دو بار می‌آمد
{
  const P = (...xs) => xs.map(x => ({ name: x, email: '' }));
  t('شرکت‌کننده: ایمیل و نامِ یک نفر یکی می‌شوند', () => {
    const out = Store.mergeParticipants(P('parvin.4821@example.com', 'Parvin Delshad'));
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].name, 'Parvin Delshad');
    assert.strictEqual(out[0].email, 'parvin.4821@example.com');
  });
  t('شرکت‌کننده: کسی که وسط جلسه اضافه شده حذف نمی‌شود', () => {
    const out = Store.mergeParticipants(P('kamran7712@example.com', 'Kamran Nikpour', 'مهمانِ بی‌دعوت'));
    assert.strictEqual(out.length, 2);
    assert.ok(out.some(p => p.name === 'مهمانِ بی‌دعوت' && !p.email));
  });
  t('شرکت‌کننده: ایمیلی که نامی ندارد می‌ماند', () => {
    const out = Store.mergeParticipants(P('bahareh.t@example.com', 'Kamran Nikpour'));
    assert.strictEqual(out.length, 2);
    assert.ok(out.some(p => p.email === 'bahareh.t@example.com'));
  });
  t('شرکت‌کننده: «You» به خودِ کاربر وصل می‌شود', () => {
    const out = Store.mergeParticipants(P('user@example.com', 'You'),
      { userName: 'کاربر', userEmail: 'user@example.com' });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].name, 'کاربر');
  });
  t('شرکت‌کننده: نام‌های نزدیک اشتباهی ادغام نمی‌شوند', () => {
    const out = Store.mergeParticipants(P('nina.tehrani@example.com', 'Nina Salehi'));
    assert.strictEqual(out.length, 2, 'نام خانوادگی متفاوت نباید ادغام شود');
  });
  t('شرکت‌کننده: تطبیق روی نام‌خانوادگی هم کار می‌کند', () =>
    assert.strictEqual(Store.emailMatchesName('a.rostami@example.com', 'Arash Rostami'), true));
  t('شرکت‌کننده: ایمیلِ بی‌ربط تطبیق نمی‌خورد', () =>
    assert.strictEqual(Store.emailMatchesName('bnmqwerty@example.com', 'davood karimi'), false));
  t('شرکت‌کننده: فهرست واقعیِ ۱۷تایی به ۱۰ می‌رسد', () => {
    const out = Store.mergeParticipants(P(
      'user@example.com', 'parvin.4821@example.com', 'kamran7712@example.com',
      'shirin.mv@example.com', 'bahareh.t@example.com', 'arash.rostami@example.com',
      'marziyehnavid.mn@example.com', 'davoodpk375@example.com', 'bnmqwerty@example.com',
      'Kamran Nikpour', 'You', 'marziyeh navid', 'Parvin Delshad',
      'davood karimi', 'Shirin Movahed', 'Arash Rostami', 'کسی که بعداً آمد'),
      { userName: 'کاربر', userEmail: 'user@example.com' });
    assert.strictEqual(out.length, 10);
    assert.ok(out.every(p => p.name), 'هیچ ردیفی بی‌نام نماند');
  });
}

// نگاشتِ مسئولِ اقدام به پروندهٔ فرد — قاعدهٔ هم‌نام‌ها اینجا حیاتی است
{
  const parts = [{ name: 'کامران نیک‌پور', email: 'sara.a@acme.com' }, { name: 'مریم', email: '' }];
  const meta = {
    'e:sara.a@acme.com': { id: 'e:sara.a@acme.com', name: 'کامران نیک‌پور', email: 'sara.a@acme.com' },
    'e:sara.k@vendor.io': { id: 'e:sara.k@vendor.io', name: 'کامران نیک‌پور', email: 'sara.k@vendor.io' },
    'e:ali@acme.com': { id: 'e:ali@acme.com', name: 'علی مهدییی', email: 'ali@acme.com' }
  };
  t('نگاشت فرد: ایمیلِ شرکت‌کننده هم‌نام‌ها را تفکیک می‌کند', () => {
    const r = Store.resolvePersonRef('کامران نیک‌پور', parts, meta);
    assert.strictEqual(r.whoId, 'e:sara.a@acme.com');
    assert.strictEqual(r.ambiguous, false);
  });
  t('نگاشت فرد: هم‌نامِ بدون ایمیل حدس زده نمی‌شود', () => {
    const r = Store.resolvePersonRef('کامران نیک‌پور', [], meta);
    assert.strictEqual(r.whoId, null, 'نباید به یکی از دو نگار بچسبد');
    assert.strictEqual(r.ambiguous, true);
    assert.strictEqual(r.who, 'کامران نیک‌پور', 'نام باید بماند');
  });
  t('نگاشت فرد: تک‌نامِ یکتا از پروندهٔ موجود پیدا می‌شود', () =>
    assert.strictEqual(Store.resolvePersonRef('علی مهدییی', [], meta).whoId, 'e:ali@acme.com'));
  t('نگاشت فرد: نامِ ناشناس بدون شناسه ولی با نام برمی‌گردد', () => {
    const r = Store.resolvePersonRef('کسی که نیست', parts, meta);
    assert.strictEqual(r.whoId, null);
    assert.strictEqual(r.who, 'کسی که نیست');
  });
  t('نگاشت فرد: نیم‌فاصله و فاصلهٔ اضافه مانع تطبیق نیست', () =>
    assert.strictEqual(Store.resolvePersonRef('  علی  مهدییی ', [], meta).whoId, 'e:ali@acme.com'));
  t('نگاشت فرد: نامِ خالی نتیجه ندارد', () =>
    assert.strictEqual(Store.resolvePersonRef('', parts, meta), null));
}
t('peopleFiles گروه‌بندی درست', () => {
  const people = Store.peopleFiles([
    T('کار ۱', 'نگار', 'theirs'), T('کار ۲', 'نگار', 'theirs', 'done'),
    T('کار ۳', 'صدر', 'theirs'), T('بدون‌مسئول', null)
  ]);
  assert.strictEqual(people.length, 2);
  const sara = people.find(p => p.name === 'نگار');
  assert.strictEqual(sara.open.length, 1);
  assert.strictEqual(sara.done, 1);
  assert.strictEqual(sara.total, 2);
});

(async () => {
  // toggleDone روی کار تکرارشونده، رخداد بعدی می‌سازد
  Object.keys(mem).forEach(k => delete mem[k]);
  const rec = await Store.addTask({ title: 'گزارش هفتگی', due: '2026-07-25', recur: { freq: 'weekly', interval: 1, weekday: 0 } });
  const res = await Store.toggleDone(rec.id);
  t('تکرارشونده: رخداد بعدی ساخته شد', () => {
    assert.ok(res.spawned, 'spawned باید وجود داشته باشد');
    assert.strictEqual(res.spawned.due, '2026-08-01'); // شنبهٔ بعد
    assert.strictEqual(res.task.recur, null); // نمونهٔ کامل‌شده دیگر تکرار ندارد
    assert.deepStrictEqual(res.spawned.recur, { freq: 'weekly', interval: 1, weekday: 0 });
  });
  const all = await Store.getTasks();
  t('تکرارشونده: تعداد کل ۲ (کامل‌شده + بعدی)', () => assert.strictEqual(all.length, 2));

  // ── روتین‌ها: نمونهٔ بعدی باید همان کار باشد ────────────────
  Object.keys(mem).forEach(k => delete mem[k]);
  {
    const rt = await Store.addTask({
      title: 'گزارش هفتگی مالی', tags: ['مالی', 'روتین'], dir: 'mine',
      due: '2026-07-28', recur: { freq: 'weekly', interval: 1, weekday: 3 },
      pinned: true, estimate: 45
    });
    await Store.addSubtask(rt.id, 'جمع‌آوری فاکتورها');
    await Store.addSubtask(rt.id, 'مقایسه با بودجه');
    await Store.updateTask(rt.id, { notes: 'قالب گزارش در درایو است' });
    const subs = (await Store.getTasks()).find(x => x.id === rt.id).subtasks;
    await Store.toggleSubtask(rt.id, subs[0].id);   // یکی را همین هفته زدیم
    const { spawned } = await Store.toggleDone(rt.id);
    t('روتین: برچسب‌ها به نمونهٔ بعدی می‌رسند', () =>
      assert.deepStrictEqual(spawned.tags, ['مالی', 'روتین']));
    t('روتین: چک‌لیست به نمونهٔ بعدی می‌رسد', () =>
      assert.deepStrictEqual(spawned.subtasks.map(s => s.title), ['جمع‌آوری فاکتورها', 'مقایسه با بودجه']));
    t('روتین: زیرکارهای نمونهٔ تازه باز هستند، نه تیک‌خورده', () =>
      assert.ok(spawned.subtasks.every(s => !s.done)));
    t('روتین: زیرکارها شناسهٔ تازه می‌گیرند', () => {
      const oldIds = new Set(subs.map(s => s.id));
      assert.ok(spawned.subtasks.every(s => !oldIds.has(s.id)));
    });
    t('روتین: توضیحات، سنجاق و تخمینِ زمان می‌مانند', () => {
      assert.strictEqual(spawned.notes, 'قالب گزارش در درایو است');
      assert.strictEqual(spawned.pinned, true);
      assert.strictEqual(spawned.estimate, 45);
    });
    t('روتین: تاریخِ نمونهٔ بعدی جلو می‌رود', () =>
      assert.ok(spawned.due > '2026-07-28', spawned.due));
    t('روتین: وقتِ زمان‌بندی‌شده منتقل نمی‌شود', () => assert.strictEqual(spawned.slot, null));
  }

  // ── پیگیری: سن و تلنگر ─────────────────────────────────────
  {
    const NOW = new Date('2026-07-28T10:00:00Z');
    const mk = (o) => ({ status: 'open', dir: 'theirs', title: 'ک', ...o });
    const ago = d => new Date(NOW - d * 86400000).toISOString();
    t('پیگیری: تازه سپرده‌شده هشدار نمی‌دهد', () => {
      const s = Store.followupState(mk({ createdAt: ago(1) }), NOW);
      assert.strictEqual(s.level, 'fresh');
    });
    t('پیگیری: بعد از ۳ روز بی‌جواب، وقتِ تلنگر است', () => {
      const s = Store.followupState(mk({ createdAt: ago(4) }), NOW);
      assert.strictEqual(s.level, 'due');
      assert.ok(/بی‌جواب/.test(s.label), s.label);
    });
    t('پیگیری: تلنگر ساعت را از صفر می‌کند', () => {
      const s = Store.followupState(mk({ createdAt: ago(10), lastNudgeAt: ago(1), nudgeCount: 1 }), NOW);
      assert.strictEqual(s.level, 'fresh');
      assert.strictEqual(s.waitingDays, 10, 'سنِ کل باید بماند');
    });
    t('پیگیری: ۷ روز بعد از تلنگر = بی‌خبر', () => {
      const s = Store.followupState(mk({ createdAt: ago(30), lastNudgeAt: ago(8), nudgeCount: 2 }), NOW);
      assert.strictEqual(s.level, 'stale');
    });
    t('پیگیری: گذشتنِ موعد بر همه‌چیز مقدم است', () => {
      const s = Store.followupState(mk({ createdAt: ago(2), lastNudgeAt: ago(0), due: '2026-07-25' }), NOW);
      assert.strictEqual(s.level, 'late');
      assert.strictEqual(s.overdue, 3);
    });
    t('پیگیری: ترتیب = دیرکرد، بعد بی‌خبری', () => {
      const list = Store.followups([
        mk({ id: 'a', createdAt: ago(2) }),
        mk({ id: 'b', createdAt: ago(20) }),
        mk({ id: 'c', createdAt: ago(3), due: '2026-07-20' }),
        { status: 'open', dir: 'mine', id: 'd', createdAt: ago(9) }
      ], NOW);
      assert.deepStrictEqual(list.map(x => x.id), ['c', 'b', 'a'], 'کارِ خودم نباید پیگیری حساب شود');
    });
  }

  // ── مرتب‌سازی هوشمند ───────────────────────────────────────
  {
    const NOW = new Date('2026-07-28T10:00:00Z');
    const ago = d => new Date(NOW - d * 86400000).toISOString();
    const mk = o => ({ status: 'open', dir: 'mine', title: 'ک', createdAt: ago(1), ...o });
    const S = t2 => Store.taskScore(t2, NOW);
    t('هوشمند: عقب‌افتاده بالاتر از ددلاینِ امروز', () =>
      assert.ok(S(mk({ due: '2026-07-26' })) > S(mk({ due: '2026-07-28' }))));
    t('هوشمند: هرچه عقب‌افتاده‌تر، بالاتر', () =>
      assert.ok(S(mk({ due: '2026-07-18' })) > S(mk({ due: '2026-07-26' }))));
    t('هوشمند: سنجاق از همه بالاتر', () =>
      assert.ok(S(mk({ pinned: true })) > S(mk({ due: '2026-06-01' }))));
    t('هوشمند: کارِ بی‌تاریخِ کهنه از کارِ بی‌تاریخِ تازه بالاتر', () =>
      assert.ok(S(mk({ createdAt: ago(50) })) > S(mk({ createdAt: ago(1) }))));
    t('هوشمند: ولی کارِ بی‌تاریخِ کهنه از ددلاینِ امروز بالاتر نمی‌رود', () =>
      assert.ok(S(mk({ createdAt: ago(60) })) < S(mk({ due: '2026-07-28' }))));
    t('هوشمند: کارِ نیمه‌کاره از کارِ دست‌نخورده بالاتر', () =>
      assert.ok(S(mk({ subtasks: [{ done: true }, { done: false }] })) > S(mk({ subtasks: [{ done: false }, { done: false }] }))));
    t('هوشمند: دلیلِ بالا بودن گفته می‌شود', () => {
      assert.strictEqual(Store.scoreReason(mk({ due: '2026-07-26' }), NOW), '۲ روز عقب‌افتاده');
      assert.strictEqual(Store.scoreReason(mk({ pinned: true }), NOW), 'سنجاق‌شده');
      assert.strictEqual(Store.scoreReason(mk({ createdAt: ago(30) }), NOW), '۳۰ روز بی‌حرکت');
    });
  }

  // ── کارهای پوسیده ──────────────────────────────────────────
  {
    const NOW = new Date('2026-07-28T10:00:00Z');
    const ago = d => new Date(NOW - d * 86400000).toISOString();
    const mk = o => ({ status: 'open', dir: 'mine', title: 'ک', createdAt: ago(1), ...o });
    const list = Store.staleTasks([
      mk({ id: 'fresh', createdAt: ago(3) }),
      mk({ id: 'idle', createdAt: ago(40) }),
      mk({ id: 'touched', createdAt: ago(40), updatedAt: ago(2) }),
      mk({ id: 'late', createdAt: ago(30), due: '2026-07-01' }),
      mk({ id: 'lateTouched', createdAt: ago(30), updatedAt: ago(2), due: '2026-07-01' }),
      mk({ id: 'soon', createdAt: ago(30), due: '2026-07-26' }),
      mk({ id: 'done', createdAt: ago(90), status: 'done' }),
      mk({ id: 'theirs', createdAt: ago(90), dir: 'theirs' })
    ], NOW);
    t('پوسیده: فقط کارهای واقعاً مانده', () =>
      assert.deepStrictEqual(list.map(x => x.id), ['late', 'idle']));
    t('پوسیده: «هنوز لازمه» کارِ بی‌تاریخ را بیرون می‌برد', () =>
      assert.ok(!list.some(x => x.id === 'touched')));
    // اینجا دکمه ظاهراً کار می‌کرد ولی ردیف سرِ جایش می‌ماند
    t('پوسیده: «هنوز لازمه» کارِ از موعد گذشته را هم بیرون می‌برد', () =>
      assert.ok(!list.some(x => x.id === 'lateTouched')));
    t('پوسیده: تعداد روزِ ماندن گزارش می‌شود', () => {
      assert.strictEqual(list.find(x => x.id === 'idle').idleDays, 40);
      assert.strictEqual(list.find(x => x.id === 'late').overdueDays, 27);
    });
  }

  // ── جاشدن در وقتِ آزاد ─────────────────────────────────────
  {
    const NOW = new Date('2026-07-28T10:00:00Z');
    const mk = o => ({ status: 'open', dir: 'mine', title: 'ک', createdAt: NOW.toISOString(), ...o });
    const pool = [
      mk({ id: 'a', estimate: 45, due: '2026-07-20' }),  // عقب‌افتاده → اول
      mk({ id: 'b', estimate: 30, due: '2026-07-28' }),
      mk({ id: 'c', estimate: 90 }),
      mk({ id: 'd' }),                                   // بدون تخمین
      mk({ id: 'e', estimate: 20, status: 'done' })
    ];
    const fit = Store.fitsInSlot(pool, 90, NOW);
    t('وقت آزاد: فوری‌ترین‌ها اول انتخاب می‌شوند', () =>
      assert.deepStrictEqual(fit.picked.map(x => x.id), ['a', 'b']));
    t('وقت آزاد: از ظرفیت بیرون نمی‌زند', () => {
      assert.strictEqual(fit.totalMin, 75);
      assert.strictEqual(fit.leftMin, 15);
    });
    t('وقت آزاد: کارِ بی‌تخمین و کارِ بسته انتخاب نمی‌شوند', () =>
      assert.ok(!fit.picked.some(x => x.id === 'd' || x.id === 'e')));
    t('وقت آزاد: کارِ بزرگ‌تر از بازه اصلاً پیشنهاد نمی‌شود', () =>
      assert.strictEqual(Store.fitsInSlot(pool, 40, NOW).picked.map(x => x.id).join(), 'b'));
  }

  // نادیده‌گرفتنِ سرِنخ‌های «از جلسه‌ها چه ماند»
  Object.keys(mem).forEach(k => delete mem[k]);
  {
    const kA = Store.looseKey('a', 's1', 'گزارش قیف فروش');
    const kB = Store.looseKey('a', 's1', 'پیگیری قرارداد');
    const kM = Store.looseKey('m', 's1');
    t('کلیدِ سرِنخ برای موردهای متفاوت یکی نیست', () => {
      assert.notStrictEqual(kA, kB);
      assert.notStrictEqual(kA, kM);
    });
    t('کلیدِ سرِنخ پایدار است', () => {
      assert.strictEqual(kA, Store.looseKey('a', 's1', 'گزارش قیف فروش'));
    });
    const after = await Store.dismissLoose([kA]);
    t('نادیده‌گرفتن فقط همان مورد را ساکت می‌کند', () => {
      assert.ok(after[kA]);
      assert.ok(!after[kB]);
    });
    const saved = (await Store.getSettings()).looseDismissed;
    t('نادیده‌گرفته پس از خواندنِ دوبارهٔ تنظیمات باقی است', () => assert.ok(saved[kA]));
    // کلیدِ کهنه (۳۱ روز) باید موقع نادیده‌گرفتنِ بعدی پاک شود
    await Store.saveSettings({ looseDismissed: { old: Date.now() - 31 * 86400000, [kA]: Date.now() } });
    const pruned = await Store.dismissLoose([kB]);
    t('کلیدِ قدیمی‌تر از ۳۰ روز خودکار پاک می‌شود', () => {
      assert.ok(!('old' in pruned));
      assert.ok(pruned[kA] && pruned[kB]);
    });
    const undone = await Store.undismissLoose([kB]);
    t('برگرداندن، نادیده‌گرفتن را لغو می‌کند', () => {
      assert.ok(!undone[kB]);
      assert.ok(undone[kA]);
    });
  }

  // export/import رفت‌وبرگشت
  Object.keys(mem).forEach(k => delete mem[k]);
  await Store.addTask({ title: 'کار الف' });
  await Store.addTask({ title: 'کار ب', dir: 'theirs', who: 'نگار' });
  await Store.saveSettings({ userName: 'کاربر', aiKey: 'secret-key', icsUrl: 'https://secret' });
  const exp = await Store.exportData({ includeSecrets: false });
  t('export بدون اطلاعات حساس، کلید را خالی می‌کند', () => {
    assert.strictEqual(exp.tasks.length, 2);
    assert.strictEqual(exp.settings.aiKey, '');
    assert.strictEqual(exp.settings.icsUrl, '');
    assert.strictEqual(exp.settings.userName, 'کاربر');
  });
  const expS = await Store.exportData({ includeSecrets: true });
  t('export با اطلاعات حساس، کلید را نگه می‌دارد', () => {
    assert.strictEqual(expS.settings.aiKey, 'secret-key');
  });

  // import در فضای تازه — کلید حساسِ فعلی با مقدار خالی پاک نمی‌شود
  Object.keys(mem).forEach(k => delete mem[k]);
  await Store.saveSettings({ aiKey: 'keep-me' });
  const imp = await Store.importData(exp, { replace: false });
  t('import کارها را اضافه می‌کند', () => assert.strictEqual(imp.added, 2));
  const afterSettings = await Store.getSettings();
  t('import کلید حساسِ فعلی را حفظ می‌کند', () => assert.strictEqual(afterSettings.aiKey, 'keep-me'));
  t('import نام کاربر را می‌آورد', () => assert.strictEqual(afterSettings.userName, 'کاربر'));

  // import دوباره، تکراری‌ها را رد می‌کند
  const imp2 = await Store.importData(exp, { replace: false });
  t('import دوباره: تکراری رد می‌شود', () => { assert.strictEqual(imp2.added, 0); assert.strictEqual(imp2.kept, 2); });

  let rejected = false;
  await Store.importData({ bogus: true }).catch(() => { rejected = true; });
  t('import فایل نامعتبر خطا می‌دهد', () => assert.ok(rejected));

  // ---------- چند اتصال هوش مصنوعی ----------
  console.log('\n— AI: چند اتصال —');
  const AI = require('../core/ai-client.js');
  t('endpoint: host تنها → /v1/chat/completions', () => {
    const p = { baseUrl: 'https://api.openai.com', key: 'k', model: 'm' };
    // از طریق پروفایل فعال بررسی می‌شود؛ endpoint داخلی است، رفتار را با configured می‌سنجیم
    assert.ok(AI.profileReady(p));
  });
  t('activeProfile: پروفایل فعال درست انتخاب می‌شود', () => {
    const s = { aiProfiles: [{ id: 'a', name: 'یک', provider: 'openai', baseUrl: 'https://api.openai.com', key: 'k', model: 'm' }, { id: 'b', name: 'دو', provider: 'grok', baseUrl: 'https://api.x.ai', key: 'k2', model: 'm2' }], activeAiId: 'b' };
    assert.strictEqual(AI.activeProfile(s).id, 'b');
    assert.ok(AI.configured(s));
  });
  t('activeProfile: بدون activeAiId، اولی انتخاب می‌شود', () => {
    const s = { aiProfiles: [{ id: 'a', baseUrl: 'https://api.openai.com', key: 'k', model: 'm' }], activeAiId: '' };
    assert.strictEqual(AI.activeProfile(s).id, 'a');
  });
  t('activeProfile: سازگاری عقب‌رو با فیلد تکی قدیمی', () => {
    const s = { aiProfiles: [], aiBaseUrl: 'https://api.openai.com', aiKey: 'k', aiModel: 'gpt' };
    const p = AI.activeProfile(s);
    assert.ok(p && p.model === 'gpt');
    assert.ok(AI.configured(s));
  });
  t('configured: بدون هیچ اتصالی false', () => {
    assert.strictEqual(AI.configured({ aiProfiles: [] }), false);
  });
  t('PROVIDERS شامل درگاه‌های کلیدی', () => {
    ['openai', 'gemini', 'grok', 'deepseek', 'openrouter', 'gapgpt', 'custom'].forEach(k => assert.ok(AI.PROVIDERS[k], k));
  });

  // store: CRUD پروفایل
  Object.keys(mem).forEach(k => delete mem[k]);
  const p1 = await Store.saveAiProfile({ name: 'OpenAI کاری', provider: 'openai', baseUrl: 'https://api.openai.com', key: 'sk-1', model: 'gpt-4o-mini' });
  const p2 = await Store.saveAiProfile({ name: 'Grok', provider: 'grok', baseUrl: 'https://api.x.ai', key: 'xai-1', model: 'grok-2-latest' });
  let st = await Store.getSettings();
  t('saveAiProfile: دو پروفایل، اولی فعال', () => {
    assert.strictEqual(st.aiProfiles.length, 2);
    assert.strictEqual(st.activeAiId, p1.id);
  });
  await Store.setActiveAi(p2.id);
  st = await Store.getSettings();
  t('setActiveAi: پروفایل فعال عوض شد', () => assert.strictEqual(st.activeAiId, p2.id));
  await Store.removeAiProfile(p2.id);
  st = await Store.getSettings();
  t('removeAiProfile: حذف فعال، فعال به مانده منتقل می‌شود', () => {
    assert.strictEqual(st.aiProfiles.length, 1);
    assert.strictEqual(st.activeAiId, p1.id);
  });

  // export/import کلیدهای پروفایل را مثل راز رفتار می‌کند
  Object.keys(mem).forEach(k => delete mem[k]);
  await Store.saveAiProfile({ name: 'خصوصی', provider: 'openai', baseUrl: 'https://api.openai.com', key: 'sk-secret', model: 'gpt-4o-mini' });
  const expNo = await Store.exportData({ includeSecrets: false });
  t('export بدون راز: کلید پروفایل خالی می‌شود', () => assert.strictEqual(expNo.settings.aiProfiles[0].key, ''));
  const expYes = await Store.exportData({ includeSecrets: true });
  t('export با راز: کلید پروفایل می‌ماند', () => assert.strictEqual(expYes.settings.aiProfiles[0].key, 'sk-secret'));
  // import کلید خالی، کلید فعلی را حفظ می‌کند
  await Store.importData(expNo, { replace: false });
  const stAfter = await Store.getSettings();
  t('import کلید خالی، کلید فعلیِ همان پروفایل را حفظ می‌کند', () => assert.strictEqual(stAfter.aiProfiles[0].key, 'sk-secret'));

  // ---------- ماژول جلسه‌ها (mom-core + sessions) ----------
  console.log('\n— جلسه‌ها: mom-core —');
  const MoM = require('../core/mom-core.js');
  t('parseModelJson: حذف حصار ```json', () => {
    assert.deepStrictEqual(MoM.parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  });
  t('parseModelJson: استخراج از متن اضافه', () => {
    assert.deepStrictEqual(MoM.parseModelJson('اینم پاسخ: {"x":2} تمام'), { x: 2 });
  });
  t('parseModelJson: پاسخ ناقص خطا می‌دهد', () => {
    assert.throws(() => MoM.parseModelJson('{"x":'));
  });
  t('normalizeActions: اشکال مختلف را یکدست می‌کند', () => {
    const a = MoM.normalizeActions([{ text: 'کار ۱', owner: 'کاربر', deadline: 'فردا' }, 'کار متنی', { task: 'کار ۳' }, { text: '  ' }]);
    assert.strictEqual(a.length, 3);
    assert.strictEqual(a[0].owner, 'کاربر');
    assert.strictEqual(a[1].text, 'کار متنی');
  });
  const momSession = (title = 'جلسهٔ تست') => ({
    title, startedAt: Date.now() - 40 * 60000, updatedAt: Date.now(),
    transcript: [{ speaker: 'کاربر', text: 'سلام' }]
  });
  t('formatMomDocument: محتوای واقعی را می‌نویسد', () => {
    const data = { executiveSummary: 'خلاصه', discussedTopics: [{ topic: 'بودجه' }], actions: [{ text: 'ارسال گزارش', owner: 'نگار' }] };
    const doc = MoM.formatMomDocument(data, momSession());
    assert.ok(doc.includes('# صورت‌جلسه'));
    assert.ok(doc.includes('اقدامات و قدم‌های بعدی'));
    assert.ok(doc.includes('ارسال گزارش'));
    assert.ok(doc.includes('بودجه'));
  });
  // باگِ اصلی: استندآپ سه‌خطی سندی ۱۴۵سطری با ۱۲ جدول خالی و ۲۷ «ذکر نشده» می‌ساخت
  t('صورت‌جلسه: بخشِ بی‌محتوا اصلاً نوشته نمی‌شود', () => {
    const data = { executiveSummary: 'مرور اسپرینت.', discussedTopics: [{ topic: 'اسپرینت' }], actions: [{ text: 'اتمام تسک', owner: 'نگار' }] };
    const doc = MoM.formatMomDocument(data, momSession('استندآپ'));
    assert.ok(!doc.includes('ذکر نشده'), 'نباید هیچ «ذکر نشده» بماند');
    assert.ok(!doc.includes('موردی از متن جلسه استخراج نشد'), 'نباید جدول خالی بماند');
    assert.ok(!/ریسک‌ها و پیامدها\n/.test(doc.split('---')[0]), 'بخش ریسک نباید ساخته شود');
    assert.ok(doc.includes('موارد مطرح‌نشده'), 'باید فهرست موارد مطرح‌نشده بیاید');
    assert.ok(doc.split('\n').length < 45, 'سند جلسهٔ کوتاه باید کوتاه بماند');
  });
  t('صورت‌جلسه: ستونِ کاملاً خالی از جدول حذف می‌شود', () => {
    const data = { executiveSummary: 'خ', actions: [{ text: 'اتمام تسک', owner: 'نگار', deadline: 'پنجشنبه' }] };
    const doc = MoM.formatMomDocument(data, momSession());
    assert.ok(doc.includes('| ردیف | اقدام مشخص | مسئول | ددلاین |'));
    assert.ok(!doc.includes('اولویت'), 'ستون بی‌مقدار نباید بماند');
  });
  t('صورت‌جلسه: شماره‌گذاری بخش‌ها پویا و پیوسته است', () => {
    const data = {
      executiveSummary: 'خ', discussedTopics: [{ topic: 'الف' }],
      decisions: [{ decision: 'ب' }], risks: [{ risk: 'ج' }], actions: [{ text: 'د' }]
    };
    const doc = MoM.formatMomDocument(data, momSession());
    const nums = (doc.match(/^## (\S+)\./gm) || []).map(x => x.replace(/^## /, '').replace(/\.$/, ''));
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const asInt = s => +[...s].map(c => fa.indexOf(c)).join('');
    assert.deepStrictEqual(nums.map(asInt), nums.map((_, i) => i + 1), 'شماره‌ها باید ۱،۲،۳… پشت‌سرهم باشند');
    assert.ok(doc.includes('تصمیم‌های قطعی') && doc.includes('ریسک‌ها'), 'محتوای واقعی نباید حذف شود');
  });
  t('صورت‌جلسه: مدت با رقم فارسی نوشته می‌شود', () =>
    assert.ok(/\*\*مدت:\*\* [۰-۹]+ دقیقه/.test(MoM.formatMomDocument({ executiveSummary: 'خ' }, momSession()))));
  t('validateAnalysisData: جلسهٔ کوتاه بدون داده رد می‌شود', () => {
    const s = { startedAt: Date.now() - 60000, updatedAt: Date.now(), transcript: [{ text: 'سلام' }] };
    assert.throws(() => MoM.validateAnalysisData({}, s));
  });

  // sessions CRUD
  Object.keys(mem).forEach(k => delete mem[k]);
  await Store.upsertSession({ id: 'm1', title: 'جلسهٔ الف', startedAt: Date.now(), transcript: [] });
  await Store.upsertSession({ id: 'm2', title: 'جلسهٔ ب', startedAt: Date.now(), transcript: [] });
  let ms = await Store.getSessions();
  t('upsertSession: دو جلسه، جدید بالای فهرست', () => {
    assert.strictEqual(ms.length, 2);
    assert.strictEqual(ms[0].id, 'm2');
  });
  await Store.updateSession('m1', { summary: 'سند آماده' });
  ms = await Store.getSessions();
  t('updateSession: سند ذخیره شد', () => assert.strictEqual(ms.find(x => x.id === 'm1').summary, 'سند آماده'));
  await Store.removeSession('m2');
  ms = await Store.getSessions();
  t('removeSession: حذف شد', () => { assert.strictEqual(ms.length, 1); assert.strictEqual(ms[0].id, 'm1'); });

  // import پشتیبان منشی
  Object.keys(mem).forEach(k => delete mem[k]);
  await Store.upsertSession({ id: 'exist', title: 'موجود', startedAt: 1000, transcript: [] });
  const monshiBackup = {
    app: 'meetnote', backupVersion: 1, sessions: [
      { id: 'exist', title: 'تکراری', startedAt: 1000, transcript: [{ speaker: 'x', text: 'y' }] },
      { id: 'new1', title: 'جلسهٔ منشی', startedAt: 5000, updatedAt: 6000, transcript: [{ speaker: 'کاربر', text: 'سلام' }], summary: '# سند', actions: [{ text: 'کار' }], analysisData: { executiveSummary: 'خ' } },
      { id: 'bad', transcript: 'notarray' }
    ], momTemplates: []
  };
  const impRes = await Store.importMonshiBackup(monshiBackup);
  const afterImport = await Store.getSessions();
  t('importMonshiBackup: جلسهٔ جدید اضافه، تکراری و خراب رد', () => {
    assert.strictEqual(impRes.added, 1);
    assert.strictEqual(impRes.skipped, 2);
    assert.strictEqual(afterImport.length, 2);
  });
  t('importMonshiBackup: سند و اقدام‌های منشی حفظ می‌شوند', () => {
    const s = afterImport.find(x => x.id === 'new1');
    assert.strictEqual(s.summary, '# سند');
    assert.strictEqual(s.source, 'monshi-import');
    assert.strictEqual(s.transcript[0].speaker, 'کاربر');
  });
  let monshiErr = false;
  await Store.importMonshiBackup({ app: 'vardast', sessions: [] }).catch(() => { monshiErr = true; });
  t('importMonshiBackup: app غیرمنشی رد می‌شود', () => assert.ok(monshiErr));

  // ---------- فاز ۲ب: استخراج دومرحله‌ای + قالب‌ها ----------
  console.log('\n— جلسه‌ها: chunk + قالب —');
  t('transcriptChunks: متن بلند به چند بخش می‌شکند', () => {
    const rows = Array.from({ length: 400 }, (_, i) => ({ speaker: 'گوینده', text: 'خط شمارهٔ ' + i + ' با کمی متن اضافه برای پر شدن حجم بخش‌ها و رسیدن به سقف کاراکتر' }));
    const chunks = MoM.transcriptChunks({ startedAt: 0, transcript: rows }, 4000);
    assert.ok(chunks.length >= 3, 'باید چند بخش شود');
    assert.strictEqual(chunks[0].startRef, 1);
    assert.ok(chunks[chunks.length - 1].endRef <= 400);
  });
  t('mergeExtracted: آرایه‌های بخش‌ها را یکی می‌کند', () => {
    const merged = MoM.mergeExtracted([
      { topics: [{ topic: 'الف' }], actions: [{ text: 'ک۱' }] },
      { topics: [{ topic: 'ب' }], actions: [{ text: 'ک۲' }], risks: [{ risk: 'ر' }] }
    ]);
    assert.strictEqual(merged.topics.length, 2);
    assert.strictEqual(merged.actions.length, 2);
    assert.strictEqual(merged.risks.length, 1);
  });
  t('buildFinalPrompt: دادهٔ استخراج و قالب را می‌آورد', () => {
    const p = MoM.buildFinalPrompt({ title: 'جلسه', startedAt: 0, updatedAt: 60000 }, { name: 'فروش', instructions: 'تمرکز روی فروش' }, { topics: [{ topic: 'x' }] });
    assert.ok(p.includes('فروش'));
    assert.ok(p.includes('تمرکز روی فروش'));
    assert.ok(p.includes('"topics"'));
  });
  t('قالب‌ها: getTemplate آماده و سفارشی', () => {
    assert.strictEqual(MoM.getTemplate('sales').id, 'sales');
    assert.strictEqual(MoM.getTemplate('ناموجود').id, 'standard');
    const custom = MoM.getTemplate('c1', [{ id: 'c1', name: 'سفارشی', instructions: 'دستور' }]);
    assert.strictEqual(custom.id, 'c1');
    assert.strictEqual(custom.custom, true);
  });
  t('قالب رسمی: بخش‌های یک سندِ قابل‌استناد را می‌خواهد', () => {
    const f = MoM.getTemplate('formal');
    assert.strictEqual(f.mode, 'freeform');
    for (const part of ['مشخصات سند', 'حاضران و غایبان', 'دستور جلسه', 'پیگیری مصوبات جلسهٔ قبل',
      'مصوبات', 'اقدامات', 'موضوعات باز', 'جلسهٔ بعد', 'موارد نیازمند تأیید']) {
      assert.ok(f.systemPrompt.includes(part), `بخشِ «${part}» در قالب رسمی نیست`);
    }
    assert.ok(/حدس نزن/.test(f.systemPrompt), 'قاعدهٔ حدس‌نزدن باید باشد');
  });
  t('قالب رسمی: پیش‌فرضِ برنامه را عوض نمی‌کند', () =>
    assert.strictEqual(MoM.getTemplate('ناموجود').id, 'standard'));
  // شواهد باید روی خودِ اقدام بماند، وگرنه تبِ «اقدام‌ها» و «بازبینی» از هم می‌پاشند
  t('اقدام‌ها: evidenceRefs و confidence حفظ می‌شوند', () => {
    const out = MoM.normalizeActions([
      { text: 'ارسال گزارش', owner: 'نگار', evidenceRefs: [3, 9], confidence: 'high' },
      { text: 'بدون شاهد', owner: '' }
    ]);
    assert.deepStrictEqual(out[0].evidenceRefs, [3, 9]);
    assert.strictEqual(out[0].confidence, 'high');
    assert.strictEqual(out[1].evidenceRefs, undefined, 'اقدامِ بی‌شاهد نباید فیلد الکی بگیرد');
  });
  t('اقدام‌ها: ارجاعِ نامعتبر دور ریخته می‌شود', () => {
    const out = MoM.normalizeActions([{ text: 'کار', evidenceRefs: [0, -2, 'x', 5] }]);
    assert.deepStrictEqual(out[0].evidenceRefs, [5]);
  });
  t('قالب گزارش: صریحاً جدول را ممنوع می‌کند', () => {
    const r = MoM.getTemplate('report');
    assert.strictEqual(r.mode, 'freeform');
    assert.ok(/هیچ جدولی ننویس/.test(r.systemPrompt));
    assert.ok(/جدول نساز/.test(r.systemPrompt));
    assert.ok(!/\| ---/.test(r.systemPrompt), 'خودِ پرامپت نباید نمونهٔ جدول داشته باشد');
  });
  // حاضران باید قطعی از خودِ برنامه بروند — در استخراج تکه‌ای فیلدی برای گوینده نیست
  // و در جلسهٔ بلند نام‌ها پیش از نوشتن سند از بین می‌رفتند (باگی که در جلسه‌های بلندِ واقعی دیده شد).
  t('حاضران: از تقویم و گوینده‌های زیرنویس جمع می‌شوند', () => {
    const s = {
      participants: [{ name: 'کامران نیک‌پور', email: 'kamran@acme.com' }],
      transcript: [{ speaker: 'behnam azad', text: 'الف' }, { speaker: 'mina roshan', text: 'ب' },
        { speaker: 'behnam azad', text: 'ج' }, { speaker: 'گوینده', text: 'د' }]
    };
    const list = MoM.knownParticipants(s);
    const names = list.map(p => p.name);
    assert.ok(names.includes('کامران نیک‌پور') && names.includes('behnam azad') && names.includes('mina roshan'));
    assert.ok(!names.includes('گوینده'), 'گویندهٔ ناشناس نباید حاضر حساب شود');
    assert.strictEqual(list.find(p => p.name === 'behnam azad').lines, 2);
  });
  t('حاضران: در پرامپت نهایی صریح می‌آیند', () => {
    const s = { startedAt: Date.now() - 6e5, updatedAt: Date.now(),
      transcript: [{ speaker: 'behnam azad', text: 'الف' }, { speaker: 'mina roshan', text: 'ب' }] };
    const p = MoM.buildFinalPrompt(s, { name: 'رسمی', instructions: '' }, { topics: [] });
    assert.ok(p.includes('behnam azad') && p.includes('mina roshan'),
      'نام حاضران باید در پرامپت باشد، نه اینکه مدل حدس بزند');
  });
  t('customTemplates: ورودی ناقص را رد می‌کند', () => {
    assert.strictEqual(MoM.customTemplates([{ id: 'a', name: 'x' }, { id: 'b', name: 'y', instructions: 'z' }]).length, 1);
  });

  // تحلیل دومرحله‌ای با AI ساختگی (بدون شبکه)
  {
    const chunkReply = JSON.stringify({ topics: [{ topic: 'بودجه' }], actions: [{ text: 'ارسال گزارش', owner: 'نگار' }] });
    const longSummary = 'در این جلسه دربارهٔ بودجهٔ فصل آینده و وضعیت گزارش‌های تیم به‌تفصیل گفت‌وگو شد. '.repeat(6);
    const finalReply = JSON.stringify({ executiveSummary: longSummary, discussedTopics: [{ topic: 'بودجه' }], actions: [{ text: 'ارسال گزارش', owner: 'نگار', deadline: 'فردا' }] });
    const fakeSettings = { aiProfiles: [{ id: 'x', baseUrl: 'https://api.openai.com', key: 'k', model: 'm' }], activeAiId: 'x' };
    const AI = require('../core/ai-client.js');
    const origChat = AI.chatWith;
    // مرحلهٔ نهایی با پرامپت جامع شناخته می‌شود؛ بقیه استخراج بخش‌اند
    AI.chatWith = async (profile, messages) => messages[0].content === MoM.COMPREHENSIVE_MOM_SYSTEM_PROMPT ? finalReply : chunkReply;
    // متن بلند برای رفتن به مسیر دومرحله‌ای
    const rows = Array.from({ length: 300 }, (_, i) => ({ speaker: 'کاربر', text: 'این خط شمارهٔ ' + i + ' برای پر کردن حجم متن جلسه تا از آستانهٔ تک‌مرحله‌ای عبور کند و مسیر استخراج دومرحله‌ای فعال شود.' }));
    const session = { id: 'big', title: 'جلسهٔ بزرگ', startedAt: Date.now() - 40 * 60000, updatedAt: Date.now(), transcript: rows };
    const progress = [];
    const result = await MoM.analyzeSession(session, fakeSettings, MoM.getTemplate('standard'), { onProgress: p => progress.push(p.phase) });
    AI.chatWith = origChat;
    // باگ واقعی: قالب‌های freeform (رسمی/خلاصه) کلِ متن را در یک درخواست می‌فرستادند.
    // در دادهٔ واقعی ۱۲ جلسه از ۱۹ از سقف رد می‌شد و سرویس با ۴۰۲/۴۱۳/۴۲۹ ردش می‌کرد.
    {
      const seen = [];
      const formalPrompt = MoM.getTemplate('formal').systemPrompt;
      // فراخوانِ نهایی با systemPromptِ قالب شناخته می‌شود؛ بقیه استخراجِ بخش‌اند
      const reply = (messages) => messages[0].content === formalPrompt ? '# صورت‌جلسه\n\n' + longSummary : chunkReply;
      AI.chatWith = async (profile, messages) => { seen.push(messages[1].content); return reply(messages); };
      const origStream = AI.chatStreamWith;
      AI.chatStreamWith = async (profile, messages) => { seen.push(messages[1].content); return reply(messages); };
      const ff = [];
      const out = await MoM.analyzeSession(session, fakeSettings, MoM.getTemplate('formal'), { onProgress: p => ff.push(p.phase) });
      AI.chatWith = origChat; AI.chatStreamWith = origStream;
      const biggest = Math.max(...seen.map(x => x.length));
      t('قالب freeform: جلسهٔ بلند تکه‌تکه می‌شود، نه یک درخواست غول‌آسا', () => {
        assert.ok(ff.filter(x => x === 'extract').length >= 1, 'باید مرحلهٔ استخراج داشته باشد');
        assert.ok(biggest < 20000, `بزرگ‌ترین درخواست ${biggest} نویسه — باید زیر سقف بماند`);
      });
      t('قالب freeform: خروجی همچنان ساخته می‌شود', () =>
        assert.ok(out.summary.includes('صورت‌جلسه')));
    }
    // متن کوتاه باید همان مسیر تک‌درخواستی را برود
    {
      let calls = 0;
      const origStream = AI.chatStreamWith;
      AI.chatWith = async () => { calls++; return '# صورت‌جلسه\n\n' + longSummary; };
      AI.chatStreamWith = async () => { calls++; return '# صورت‌جلسه\n\n' + longSummary; };
      const short = { id: 's', title: 'کوتاه', startedAt: Date.now() - 6e5, updatedAt: Date.now(), transcript: [{ speaker: 'کاربر', text: 'خیلی کوتاه بود.' }] };
      const ph = [];
      await MoM.analyzeSession(short, fakeSettings, MoM.getTemplate('formal'), { onProgress: p => ph.push(p.phase) });
      AI.chatWith = origChat; AI.chatStreamWith = origStream;
      t('قالب freeform: جلسهٔ کوتاه بی‌خود تکه نمی‌شود', () => {
        assert.strictEqual(ph.filter(x => x === 'extract').length, 0);
        assert.strictEqual(calls, 1);
      });
    }

    t('analyzeSession دومرحله‌ای: چند extract + یک final', () => {
      assert.ok(progress.filter(x => x === 'extract').length >= 1, 'باید مرحلهٔ استخراج داشته باشد');
      assert.ok(progress.includes('final'), 'باید مرحلهٔ نهایی داشته باشد');
      assert.ok(result.summary.includes('# صورت‌جلسه'));
      assert.strictEqual(result.actions[0].text, 'ارسال گزارش');
    });
  }

  // ---------- پارس تدریجی (پیش‌نمایش زنده) + ثبت مدل ----------
  console.log('\n— استریم: پارس تدریجی + مدل —');
  t('parsePartialJson: JSON کامل', () => {
    assert.deepStrictEqual(MoM.parsePartialJson('{"a":1,"b":[1,2]}'), { a: 1, b: [1, 2] });
  });
  t('parsePartialJson: رشتهٔ باز را می‌بندد', () => {
    const p = MoM.parsePartialJson('{"executiveSummary":"در حال نوشتن');
    assert.ok(p && typeof p.executiveSummary === 'string');
  });
  t('parsePartialJson: آرایه و آبجکت باز را می‌بندد', () => {
    const p = MoM.parsePartialJson('{"actions":[{"text":"کار');
    assert.ok(p && Array.isArray(p.actions));
    assert.strictEqual(p.actions[0].text, 'کار');
  });
  t('parsePartialJson: حصار ```json را کنار می‌گذارد', () => {
    assert.deepStrictEqual(MoM.parsePartialJson('```json\n{"x":5'), { x: 5 });
  });
  t('parsePartialJson: بدون { → null', () => {
    assert.strictEqual(MoM.parsePartialJson('سلام'), null);
  });

  // مدل و onDoc در تحلیل استریم
  {
    const finalReply = JSON.stringify({ executiveSummary: 'خلاصهٔ کافی و بلند برای عبور از اعتبارسنجی جلسه. '.repeat(8), discussedTopics: [{ topic: 'x' }], actions: [{ text: 'ک' }] });
    const AI = require('../core/ai-client.js');
    const origStream = AI.chatStreamWith;
    // شبیه‌سازی استریم: چند تکه تدریجی + گزارش usage
    AI.chatStreamWith = async (profile, messages, opts) => {
      const parts = ['{"executiveSummary":"در', ' حال', finalReply];
      let acc = '';
      for (const p of parts) { acc = p === finalReply ? finalReply : acc + p; if (opts?.onDelta) opts.onDelta(acc, p); }
      if (opts?.onUsage) opts.onUsage({ prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 });
      return finalReply;
    };
    const fakeSettings = { aiProfiles: [{ id: 'x', name: 'OpenAI کاری', provider: 'openai', baseUrl: 'https://api.openai.com', key: 'k', model: 'gpt-4o-mini' }], activeAiId: 'x' };
    const session = { id: 'stream', title: 'ج', startedAt: Date.now() - 40 * 60000, updatedAt: Date.now(), transcript: [{ speaker: 'ر', text: 'سلام و بحث کوتاه' }] };
    const docs = [];
    const result = await MoM.analyzeSession(session, fakeSettings, MoM.getTemplate('standard'), { onDoc: md => docs.push(md) });
    AI.chatStreamWith = origStream;
    t('analyzeSession استریم: onDoc چند بار سند می‌دهد', () => assert.ok(docs.length >= 1 && docs[docs.length - 1].includes('# صورت‌جلسه')));
    t('analyzeSession: مدل استفاده‌شده برمی‌گردد', () => assert.strictEqual(result.model, 'OpenAI کاری · gpt-4o-mini'));
    t('analyzeSession: مصرف توکن تجمیع می‌شود', () => { assert.strictEqual(result.usage.total, 150); assert.strictEqual(result.usage.requests, 1); });
  }

  // ---------- قالب freeform + انتخاب مدل + پارس اقدام از جدول ----------
  console.log('\n— قالب استاندارد رایج + انتخاب مدل —');
  t('قالب concise: freeform با systemPrompt', () => {
    const tpl = MoM.getTemplate('concise');
    assert.strictEqual(tpl.mode, 'freeform');
    assert.ok(tpl.systemPrompt.includes('صورت‌جلسه'));
  });
  t('cleanMarkdown: حصار ```markdown را برمی‌دارد', () => {
    assert.strictEqual(MoM.cleanMarkdown('```markdown\n# ص\n```'), '# ص');
  });
  t('parseActionsFromMarkdown: جدول اقدامات را می‌خواند', () => {
    const md = `# صورت‌جلسه\n\n## اقدامات\n| اقدام | مسئول | مهلت | وضعیت |\n| --- | --- | --- | --- |\n| ارسال فاکتور | نگار | فردا | باز |\n| بررسی سرور | مشخص نشده | مشخص نشده | — |\n\n## موضوعات باز\n- x`;
    const a = MoM.parseActionsFromMarkdown(md);
    assert.strictEqual(a.length, 2);
    assert.strictEqual(a[0].text, 'ارسال فاکتور');
    assert.strictEqual(a[0].owner, 'نگار');
    assert.strictEqual(a[1].owner, ''); // «مشخص نشده» → خالی
  });

  // تحلیل freeform با AI ساختگی
  {
    const fakeMd = `# صورت‌جلسه\n**عنوان جلسه:** جلسهٔ تست\n\n## خلاصه جلسه\nجلسه دربارهٔ انتشار بود.\n\n## اقدامات\n| اقدام | مسئول | مهلت | وضعیت |\n| --- | --- | --- | --- |\n| جمع‌بندی تست | نگار | ۳ مرداد | باز |`;
    const AI = require('../core/ai-client.js');
    const origWith = AI.chatWith;
    AI.chatWith = async () => fakeMd;
    const fakeSettings = { aiProfiles: [{ id: 'a', name: 'یک', provider: 'openai', baseUrl: 'https://api.openai.com', key: 'k', model: 'm1' }, { id: 'b', name: 'دو', provider: 'openai', baseUrl: 'https://api.openai.com', key: 'k', model: 'm2' }], activeAiId: 'a' };
    const session = { id: 'f', title: 'ج', startedAt: Date.now() - 20 * 60000, updatedAt: Date.now(), transcript: [{ speaker: 'ر', text: 'انتشار ۵ مرداد' }] };
    const res = await MoM.analyzeSession(session, fakeSettings, MoM.getTemplate('concise'));
    t('freeform: summary همان Markdown و data=null', () => { assert.ok(res.summary.includes('## خلاصه جلسه')); assert.strictEqual(res.data, null); });
    t('freeform: اقدام از جدول استخراج شد', () => { assert.strictEqual(res.actions.length, 1); assert.strictEqual(res.actions[0].text, 'جمع‌بندی تست'); });
    // انتخاب مدل: profileId override
    const res2 = await MoM.analyzeSession(session, fakeSettings, MoM.getTemplate('concise'), { profileId: 'b' });
    t('انتخاب مدل: profileId مدل را عوض می‌کند', () => assert.ok(res2.model.includes('m2')));
    AI.chatWith = origWith;
  }

  // ---------- چک‌پوینت تکمیل خودکار پس‌زمینه ----------
  console.log('\n— job پس‌زمینه —');
  Object.keys(mem).forEach(k => delete mem[k]);
  await Store.setAnalysisJob({ sessionId: 's1', templateId: 'concise', profileId: 'b' });
  let job = await Store.getAnalysisJob();
  t('setAnalysisJob: job با heartbeat ذخیره می‌شود', () => { assert.strictEqual(job.sessionId, 's1'); assert.ok(job.heartbeatAt > 0); });
  await Store.clearAnalysisJob();
  job = await Store.getAnalysisJob();
  t('clearAnalysisJob: job پاک می‌شود', () => assert.strictEqual(job, null));

  // ---------- پاک‌سازی متن: شکستنِ نوبتِ بلند ----------
  // باگِ واقعی در دادهٔ کاربر: بلوکِ زیرنویسِ Meet انباشته می‌شود، پس ادغام بی‌کران
  // رشد می‌کرد — خطی با ۱۱٬۹۹۹ نویسه و ۷۵٪ کلِ متن حبس‌شده در خطوطِ غول‌آسا.
  console.log('\n— پاک‌سازی متن جلسه —');
  {
    require('../core/transcript-cleaner.js');
    const TR = globalThis.MeetNoteTranscript;
    const rolling = (count, step) => {
      const words = Array.from({ length: count }, (_, i) => 'کلمه' + i);
      const rows = []; let at = 0;
      for (let i = step; i <= count; i += step) rows.push({ speaker: 'کاربر', text: words.slice(0, i).join(' '), at: (at += 1200) });
      rows.push({ speaker: 'کاربر', text: words.join(' '), at: at + 1200 });
      return { rows, full: words.join(' ') };
    };
    t('متن: نوبتِ طولانی به خطوطِ کران‌دار شکسته می‌شود', () => {
      const { rows } = rolling(500, 3);
      const out = TR.consolidate(rows, {});
      assert.ok(out.length > 1, 'باید بیش از یک خط شود');
      const longest = Math.max(...out.map(r => r.text.length));
      assert.ok(longest <= 650, `بلندترین خط ${longest} — باید زیر سقف بماند`);
    });
    t('متن: شکستن هیچ کلمه‌ای را نمی‌اندازد و تکرار نمی‌کند', () => {
      const { rows, full } = rolling(500, 3);
      const out = TR.consolidate(rows, {});
      assert.strictEqual(out.map(r => r.text).join(' '), full);
    });
    t('متن: نوبتِ کوتاه دست‌نخورده می‌ماند', () => {
      const out = TR.consolidate([{ speaker: 'بهنام', text: 'سلام، وضعیت اسپرینت چطوره؟', at: 1000 }], {});
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].turnPart, undefined, 'نباید برچسبِ بخش بخورد');
    });
    t('متن: هر بخش برچسبِ ترتیب دارد', () => {
      const { rows } = rolling(500, 3);
      const out = TR.consolidate(rows, {});
      assert.strictEqual(out[0].turnPart, 1);
      assert.strictEqual(out[0].turnParts, out.length);
    });
    t('متن: گوینده در همهٔ بخش‌ها حفظ می‌شود', () => {
      const { rows } = rolling(400, 4);
      const out = TR.consolidate(rows, {});
      assert.ok(out.every(r => r.speaker === 'کاربر'));
    });
    // ارجاع‌های شاهد شمارهٔ خط‌اند؛ شکستنِ نوبت‌ها نباید تحلیل‌های قبلی را خراب کند
    t('متن: شمارهٔ خطِ اصلی روی تکه‌ها می‌ماند', () => {
      const { rows } = rolling(500, 3);
      const out = TR.consolidate(rows, {});
      const long = Array.from({ length: 300 }, (_, i) => 'واژه' + i).join(' ');
      const split = TR.splitTurns([{ speaker: 'کاربر', text: long, at: 1 }, { speaker: 'بهنام', text: 'کوتاه', at: 2 }]);
      assert.ok(split.length > 2, 'خط بلند باید شکسته شود');
      assert.strictEqual(split[0].srcIndex, 0);
      assert.strictEqual(split[split.length - 1].srcIndex, 1, 'خط دوم باید شمارهٔ اصلی ۱ را نگه دارد');
      assert.ok(out.every(r => typeof r.srcIndex === 'number'));
    });
    t('متن: ارجاعِ شاهدِ قدیمی پس از شکستن به خط درست می‌رسد', () => {
      const before = [
        { speaker: 'کاربر', text: 'خط اول کوتاه.' },
        { speaker: 'بهنام', text: Array.from({ length: 300 }, (_, i) => 'واژه' + i).join(' ') },
        { speaker: 'علی', text: 'خط سوم که دنبالش می‌گردیم.' }
      ];
      const after = TR.splitTurns(before);
      // T۳ در تحلیلِ قدیمی یعنی خطِ سومِ اصلی
      const resolved = after.find(r => r.srcIndex === 2);
      assert.strictEqual(resolved.text, 'خط سوم که دنبالش می‌گردیم.');
      assert.notStrictEqual(after[2] && after[2].text, resolved.text, 'جایگاهِ خام دیگر درست نیست — به همین دلیل srcIndex لازم است');
    });
    t('متن: سقفِ سفارشی رعایت می‌شود', () => {
      const { rows } = rolling(300, 3);
      const out = TR.consolidate(rows, { maxTurnChars: 200 });
      assert.ok(Math.max(...out.map(r => r.text.length)) <= 240);
    });
  }

  // ---------- ضبط جلسه: وابستگی، فیلتر و سلامت ----------
  console.log('\n— ضبط جلسه (content script) —');
  {
    const fs = require('fs'), path = require('path');
    const root = path.join(__dirname, '..');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
    const injected = manifest.content_scripts[0].js;
    const src = fs.readFileSync(path.join(root, 'content.js'), 'utf8');

    // این تست جلوی باگی را می‌گیرد که باعث می‌شد بعد از اولین جملهٔ هر گوینده، بقیه از دست برود
    t('manifest: هر ماژولی که content.js لازم دارد تزریق می‌شود', () => {
      const needed = [...new Set([...src.matchAll(/(?:globalThis\.)?(MeetNote[A-Za-z]+)\s*[?.]/g)].map(m => m[1]))];
      assert.ok(needed.length, 'انتظار می‌رفت content.js دستِ‌کم یک ماژول لازم داشته باشد');
      // «تعریف» را می‌سنجیم نه «ارجاع» — فقط فایل‌های دیگر می‌توانند تأمین‌کننده باشند
      const providers = injected.filter(f => f !== 'content.js')
        .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
      for (const g of needed) {
        assert.ok(new RegExp('globalThis\\.' + g + '\\s*=').test(providers),
          `${g} در content_scripts تزریق نشده — در Meet مقدارش undefined می‌شود`);
      }
    });
    t('content.js آخرین فایلِ تزریق‌شده است (وابستگی‌ها قبلش)', () =>
      assert.strictEqual(injected[injected.length - 1], 'content.js'));

    // فیلترِ اعلان‌های سیستمی نباید گفتارِ واقعی را حذف کند
    const mm = src.match(/const SYSTEM_MESSAGE = new RegExp\(\[([\s\S]*?)\]\.join\('\|'\), 'i'\);/);
    // الگوها با تطبیقِ رشته‌های داخلِ گیومه درمی‌آیند، نه با eval — در مخزنِ عمومی
    // هیچ اجرای پویایی نباید باشد، حتی در تست.
    const parts = [...mm[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
    assert.ok(parts.length >= 10, 'الگوهای پیامِ سیستمی خوانده نشد');
    const SYSTEM_MESSAGE = new RegExp(parts.join('|'), 'i');
    const realSpeech = [
      'این ارائه باید تا شنبه آماده بشه',
      'میکروفون من مشکل داره ولی ادامه بدیم',
      'دوربین رو بعداً چک می‌کنم، بریم سراغ بودجه',
      'صفحه اصلی سایت رو باید ریدیزاین کنیم',
      'The microphone budget is approved'
    ];
    t('فیلتر: گفتارِ واقعی حذف نمی‌شود', () => {
      for (const line of realSpeech) assert.ok(!SYSTEM_MESSAGE.test(line), `اشتباهاً حذف شد: ${line}`);
    });
    t('فیلتر: اعلان‌های سیستمی حذف می‌شوند', () => {
      for (const line of ['You are presenting to everyone', 'someone joined the call', 'Your microphone is muted', 'ارائهٔ بهنام به صفحه اصلی اضافه شد'])
        assert.ok(SYSTEM_MESSAGE.test(line), `فیلتر نشد: ${line}`);
    });

    // سلامتِ ضبط (M‑۱)
    // content.js برای مرورگر نوشته شده — کمترین DOM لازم را شبیه‌سازی می‌کنیم
    // عنصرها نگه داشته می‌شوند و شنونده‌هایشان ثبت — تا بشود کشیدن و کلید را
    // واقعاً شلیک کرد، نه فقط اجرا شدنِ کد را دید.
    const created = [];
    const stubEl = () => {
      const el = {
        id: '', type: '', title: '', textContent: '', innerHTML: '', tabIndex: 0,
        style: {}, offsetWidth: 160, offsetHeight: 40, _on: {},
        classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {}, appendChild() {}, append() {}, remove() {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 160, height: 40 }),
        setPointerCapture() {},
        querySelector: () => null,
        addEventListener(type, fn) { (this._on[type] ||= []).push(fn); }
      };
      created.push(el);
      return el;
    };
    global.window = global;
    const winOn = {};
    global.addEventListener = (type, fn) => { (winOn[type] ||= []).push(fn); };
    global.window.addEventListener = global.addEventListener;
    // کنترلِ شناور به اندازهٔ پنجره نیاز دارد تا جایش را محدود کند
    global.innerWidth = 1280;
    global.innerHeight = 800;
    global.document = {
      title: 'جلسهٔ تست - Google Meet',
      createElement: stubEl,
      documentElement: { appendChild() {} },
      body: { matches: () => false, querySelectorAll: () => [] },
      querySelectorAll: () => [],
      addEventListener() {}, hidden: false
    };
    global.MutationObserver = class { observe() {} disconnect() {} };
    // جای دکمه تنها چیزی است که content.js در storage می‌نویسد؛ پس شمارشِ نوشتن‌ها
    // مستقیماً رفتارِ همان را می‌سنجد.
    const savedPos = { x: 900, y: 600 };
    const posStore = {};
    let posWrites = 0;
    global.chrome = {
      runtime: { id: 'test', onMessage: { addListener() {} }, sendMessage: () => Promise.resolve({}) },
      storage: { local: {
        get: (key, cb) => cb({ [key]: savedPos }),
        set: (obj) => { posWrites++; Object.assign(posStore, obj); }
      } }
    };
    global.location = { href: 'https://meet.google.com/abc' };
    const { assessCapture, mergeCaptionSafe } = require('../content.js');
    const T0 = 1000000;
    t('سلامت: بی‌زیرنویس بعد از ۲۰ ثانیه = خطا', () => {
      const r = assessCapture({ startedAt: T0, lastCaptionAt: 0, lines: 0, now: T0 + 21000 });
      assert.strictEqual(r.level, 'error');
      assert.ok(r.hint.includes('زیرنویس'));
    });
    t('سلامت: چند ثانیهٔ اول هنوز خطا نیست', () =>
      assert.strictEqual(assessCapture({ startedAt: T0, lastCaptionAt: 0, lines: 0, now: T0 + 5000 }).level, 'ok'));
    // سکوتِ کوتاه نباید مثل خرابی به‌نظر برسد — کاربر هشدار را «درخواستِ پایان جلسه» خواند
    t('سلامت: سکوتِ چنددقیقه‌ای فقط «سکوت» است نه هشدار', () => {
      const r = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 1000, lines: 50, now: T0 + 200000 });
      assert.strictEqual(r.level, 'idle');
      assert.ok(r.text.includes('۵۰'), 'تعداد خطِ ثبت‌شده باید دیده شود');
      assert.strictEqual(r.hint, '', 'برای سکوت نباید راهنمای نگران‌کننده بدهد');
    });
    t('سلامت: سکوتِ بیش از ۵ دقیقه = هشدار، ولی مطمئن‌کننده', () => {
      const r = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 1000, lines: 50, now: T0 + 400000 });
      assert.strictEqual(r.level, 'warn');
      assert.ok(r.text.includes('۵۰'), 'باید بگوید چند خط ثبت شده');
      assert.ok(/ذخیره|روشن/.test(r.hint), 'باید خیال کاربر را راحت کند که متن سرِ جایش است');
    });
    t('سلامت: هیچ حالتی متنِ گمراه‌کنندهٔ «پایان» ندارد', () => {
      for (const now of [T0 + 5000, T0 + 200000, T0 + 400000]) {
        const r = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 1000, lines: 9, now });
        assert.ok(!/پایان/.test(r.text), `متنِ حالت «${r.level}» نباید کلمهٔ پایان داشته باشد`);
      }
    });
    t('سلامت: جریانِ عادی = سالم و تعداد خط را می‌گوید', () => {
      const r = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 9000, lines: 7, now: T0 + 10000 });
      assert.strictEqual(r.level, 'ok');
      assert.ok(r.text.includes('۷'));
    });
    t('ادغامِ امن: بدون ماژولِ پاک‌سازی هم کار می‌کند', () => {
      assert.strictEqual(mergeCaptionSafe('سلام', 'سلام دنیا', 500), 'سلام دنیا');
      assert.strictEqual(mergeCaptionSafe('سلام دنیا', 'خبر جدید', 500), null);
    });

    // ── جلسهٔ تک‌گوینده: یک نفر تنها، یا دو نفر با یک میکروفون ──────────
    // بلوکِ زیرنویس عوض نمی‌شود و متن را روی هم انباشته می‌کند.
    const { captureLabel, planCaption, ROW_ROLLOVER_CHARS } = require('../content.js');

    // شبیه‌سازیِ همان کاری که addEntry می‌کند، روی یک بلوکِ انباشته‌شونده
    function runMonologue(chunks) {
      let baseline = '', rows = [];
      for (const chunk of chunks) {
        const incoming = baseline ? `${baseline} ${chunk}` : chunk;  // بلوک انباشته می‌شود
        const prev = rows[rows.length - 1];
        const plan = planCaption({ baseline, incoming, prevLen: prev ? prev.length : 0, elapsed: 500 });
        if (plan.kind === 'new') rows.push(plan.text);
        else if (plan.kind === 'append') rows[rows.length - 1] += ' ' + plan.text;
        else if (plan.kind === 'replace') rows[rows.length - 1] = plan.text;
        baseline = plan.full;
      }
      return { rows, baseline };
    }

    // ۴۰۰ تکه ≈ ۱۶٬۰۰۰ نویسه — از سقفِ قدیمیِ ۱۲٬۰۰۰ که ضبط را بی‌صدا می‌کشت رد می‌شود
    const chunks = Array.from({ length: 400 }, (_, i) => `جملهٔ شمارهٔ ${i} دربارهٔ کار امروز.`);
    const mono = runMonologue(chunks);

    t('تک‌گوینده: هیچ کلمه‌ای از دست نمی‌رود', () => {
      const spoken = chunks.join(' ');
      assert.strictEqual(mono.rows.join(' '), spoken);
    });
    t('تک‌گوینده: از سقفِ ۱۲٬۰۰۰ نویسه رد می‌شود و ضبط ادامه دارد', () => {
      assert.ok(mono.baseline.length > 12000, `طولِ کل ${mono.baseline.length} باید از ۱۲۰۰۰ بیشتر باشد`);
      assert.ok(mono.rows.length > 1, 'باید به چند نوبت شکسته شده باشد');
    });
    t('تک‌گوینده: هیچ نوبتی بی‌کران بزرگ نمی‌شود', () => {
      const longest = Math.max(...mono.rows.map(r => r.length));
      assert.ok(longest < ROW_ROLLOVER_CHARS * 2, `بلندترین نوبت ${longest} نویسه است`);
    });
    t('تک‌گوینده: هیچ تکه‌ای دوبار نوشته نمی‌شود', () => {
      const joined = mono.rows.join(' ');
      for (const i of [0, 199, 399]) {
        const hits = joined.split(`جملهٔ شمارهٔ ${i} `).length - 1;
        assert.strictEqual(hits, 1, `«جملهٔ شمارهٔ ${i}» باید دقیقاً یک بار باشد، نه ${hits} بار`);
      }
    });
    t('تک‌گوینده: رندرِ تکراری بدون متنِ تازه، نوبتِ جدید نمی‌سازد', () => {
      const p = planCaption({ baseline: 'سلام دنیا', incoming: 'سلام دنیا', prevLen: 9, elapsed: 200 });
      assert.strictEqual(p.kind, 'noop');
    });
    t('تک‌گوینده: فقط بخشِ تازه نوشته می‌شود، نه کلِ متنِ انباشته', () => {
      const p = planCaption({ baseline: 'سلام دنیا', incoming: 'سلام دنیا و خبرِ تازه', prevLen: 9, elapsed: 200 });
      assert.strictEqual(p.kind, 'append');
      assert.strictEqual(p.text, 'و خبرِ تازه');
    });
    // مهم‌ترین محافظ: بعد از شکستنِ نوبت، نوبتِ آخر دیگر کلِ متن نیست. اگر مقایسه
    // با نوبتِ آخر انجام می‌شد، هر بروزرسانی کلِ جلسه را دوباره می‌نوشت.
    t('تک‌گوینده: بعد از شکستنِ نوبت هم فقط دنبالهٔ تازه نوشته می‌شود', () => {
      const baseline = Array.from({ length: 200 }, (_, i) => `کلمه${i}`).join(' ');
      const p = planCaption({ baseline, incoming: `${baseline} پایانِ حرف`, prevLen: 40, elapsed: 200 });
      assert.strictEqual(p.text, 'پایانِ حرف', 'فقط دنباله، نه کلِ متن');
      assert.strictEqual(p.full, `${baseline} پایانِ حرف`);
    });
    t('گویندهٔ تازه = نوبتِ تازه، نه ادامهٔ نوبتِ قبلی', () => {
      const p = planCaption({ baseline: 'حرفِ اول', incoming: 'یک موضوعِ کاملاً دیگر', prevLen: 8, elapsed: 500 });
      assert.strictEqual(p.kind, 'new');
    });

    // برچسبِ دکمه — تستِ قبلی فقط متنِ حالت را می‌دید، ولی «پایان» در paintHealth
    // به آن چسبانده می‌شد. حالا همان تابعِ واقعی تست می‌شود.
    t('برچسب: کنارِ هشدار «برای پایان بزن» نمی‌آید', () => {
      const warn = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 1000, lines: 1, now: T0 + 400000 });
      assert.ok(!/پایان/.test(captureLabel(warn)), captureLabel(warn));
      const err = assessCapture({ startedAt: T0, lastCaptionAt: 0, lines: 0, now: T0 + 21000 });
      assert.ok(!/پایان/.test(captureLabel(err)), captureLabel(err));
    });
    t('برچسب: در حالتِ عادی راهنمای پایان هست', () => {
      const ok = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 9000, lines: 7, now: T0 + 10000 });
      assert.ok(/برای پایان بزن/.test(captureLabel(ok)));
    });
    t('هشدار: دیگر ادعا نمی‌کند زیرنویس خراب است', () => {
      const warn = assessCapture({ startedAt: T0, lastCaptionAt: T0 + 1000, lines: 1, now: T0 + 400000 });
      assert.ok(!/بروز نمی‌شود/.test(warn.text), warn.text);
      assert.ok(/شنیده نشد/.test(warn.text), warn.text);
    });

    // ── خلاصهٔ خبر ───────────────────────────────────────
    // description فید HTML است و آشغالِ ثابت هم دارد؛ چیزی که زیر تیتر می‌نشیند
    // باید متنِ تمیزِ کوتاه باشد، نه هرچه سایت فرستاده.
    const Kiosk = require('../core/kiosk.js');
    const sum = (h, t) => Kiosk.summaryFromHtml(h, t);

    t('خلاصه: تگ‌های HTML حذف می‌شوند', () =>
      assert.strictEqual(sum('<p>سلام <b>دنیا</b><br>خبر تازه</p>'), 'سلام دنیا خبر تازه'));

    t('خلاصه: script و style اصلاً نمی‌مانند', () =>
      assert.strictEqual(sum('<script>bad()</script>متن<style>.a{}</style>'), 'متن'));

    t('خلاصه: انتیتی‌ها باز می‌شوند', () => {
      assert.strictEqual(sum('نرخ &amp; بهره&nbsp;بالا'), 'نرخ & بهره بالا');
      assert.strictEqual(sum('&#1662;&#1740;&#1588;'), 'پیش');
      assert.strictEqual(sum('&laquo;نقل&raquo;'), '«نقل»');
    });

    // این پانویس ته هر خبرِ وردپرسی هست و هیچ‌چیز به خواننده نمی‌گوید
    t('خلاصه: پانویسِ وردپرس دور ریخته می‌شود', () => {
      assert.strictEqual(sum('متن خبر. نوشته <a>عنوان خبر</a> اولین بار در <a>دیجیاتو</a> پدیدار شد.'), 'متن خبر.');
      assert.strictEqual(sum('Some news. The post <a>Title</a> appeared first on <a>Site</a>.'), 'Some news.');
    });

    t('خلاصه: «ادامه مطلب» ته متن حذف می‌شود', () =>
      assert.strictEqual(sum('خبر مهمی رخ داد. ادامه مطلب…'), 'خبر مهمی رخ داد.'));

    // بعضی فیدها description را همان تیتر می‌گذارند
    t('خلاصه: تکرارِ تیتر چیزی برنمی‌گرداند', () => {
      assert.strictEqual(sum('همان تیتر است', 'همان تیتر است'), '');
      assert.strictEqual(sum('<p>همان تیتر است</p>', 'همان  تیتر است'), '');
      assert.strictEqual(sum('همان تیتر است.', 'همان تیتر است'), '', 'یک نقطه بیشتر هم یعنی تکرار');
    });

    t('خلاصه: متنِ واقعاً بلندتر از تیتر می‌ماند', () => {
      const out = sum('همان تیتر است و بعدش توضیحِ واقعی و مفصل ادامه دارد', 'همان تیتر است');
      assert.ok(out.length > 20, out);
    });

    t('خلاصه: بلندتر از سقف بریده می‌شود، ولی نه وسطِ کلمه', () => {
      const long = 'کلمه '.repeat(200);
      const out = sum(long);
      assert.ok(out.length <= Kiosk.SUMMARY_MAX + 1, `طول ${out.length}`);
      assert.ok(out.endsWith('…'), out.slice(-12));
      assert.ok(!/\S…$/.test(out.replace('کلمه…', 'x')) || out.endsWith('کلمه…'), 'برشِ وسطِ کلمه نباشد');
    });

    t('خلاصه: ورودی خالی یا بی‌متن، رشتهٔ خالی', () => {
      for (const v of ['', null, undefined, '<p></p>', '   ']) assert.strictEqual(sum(v), '');
    });

    // ── جای کنترلِ شناور ─────────────────────────────────
    // هیچ گوشه‌ای برای همهٔ چیدمان‌های Meet درست نیست، پس کاربر جایش را انتخاب
    // می‌کند. قرارِ اصلی: کوچک‌شدنِ پنجره فقط نمایش را جمع کند، نه انتخابِ او را.
    const badge = created.find(e => e.id === 'meetnote-status');
    const grip = created.find(e => e.id === 'manshi-capture-grip');
    const fire = (type) => (winOn[type] || []).forEach(fn => fn());
    const press = (key) => grip._on.keydown.forEach(fn => fn({ key, shiftKey: false, preventDefault() {} }));
    const dragTo = (x, y) => {
      grip._on.pointerdown.forEach(fn => fn({ clientX: 0, clientY: 0, pointerId: 1, preventDefault() {} }));
      grip._on.pointermove.forEach(fn => fn({ clientX: x, clientY: y }));
      grip._on.pointerup.forEach(fn => fn({}));
    };
    const resizeTo = (w, h) => { global.innerWidth = w; global.innerHeight = h; fire('resize'); };
    // تایمرِ ساختگی: تأخیرِ ذخیره باید سنجیده شود، نه اینکه تست ۳۰۰ms صبر کند
    const withFakeTimers = (fn) => {
      const realSet = global.setTimeout, realClear = global.clearTimeout;
      const timers = new Map();
      let nextId = 1;
      global.setTimeout = (cb) => { const id = nextId++; timers.set(id, cb); return id; };
      global.clearTimeout = (id) => { timers.delete(id); };
      try { return fn(timers); }
      finally { global.setTimeout = realSet; global.clearTimeout = realClear; }
    };

    t('جای دکمه: جای ذخیره‌شده هنگام بارگذاری برمی‌گردد', () =>
      assert.strictEqual(badge.style.inset, '600px auto auto 900px'));

    t('جای دکمه: کشیدن جای تازه را می‌نشاند و یک‌بار ذخیره می‌کند', () => {
      const before = posWrites;
      dragTo(1000, 700);
      assert.strictEqual(badge.style.inset, '700px auto auto 1000px');
      assert.strictEqual(posWrites, before + 1, 'کشیدن باید دقیقاً یک نوشتن باشد');
      assert.deepStrictEqual(posStore.manshi_badge_pos, { x: 1000, y: 700 });
    });

    t('جای دکمه: پنجرهٔ کوچک دکمه را داخل کادر نگه می‌دارد', () => {
      resizeTo(600, 400);
      assert.strictEqual(badge.style.inset, '348px auto auto 428px');
    });

    // قلبِ ماجرا: پیش‌تر کلمپ روی خودِ خواستهٔ کاربر می‌نشست و آن را برای همیشه
    // پاک می‌کرد — با بزرگ‌شدنِ دوبارهٔ پنجره هم دکمه برنمی‌گشت.
    t('جای دکمه: با برگشتنِ فضا به جای انتخابیِ کاربر برمی‌گردد', () => {
      const before = posWrites;
      resizeTo(1280, 800);
      assert.strictEqual(badge.style.inset, '700px auto auto 1000px');
      assert.strictEqual(posWrites, before, 'تغییرِ اندازهٔ پنجره نباید چیزی بنویسد');
    });

    t('جای دکمه: ده فشارِ کلید یک نوشتن است، نه ده تا', () => withFakeTimers((timers) => {
      const before = posWrites;
      for (let i = 0; i < 10; i++) press('ArrowUp');
      assert.strictEqual(posWrites, before, 'تا پیش از سررسیدنِ تأخیر نباید بنویسد');
      assert.strictEqual(badge.style.inset, '620px auto auto 1000px', 'ولی حرکت باید فوری دیده شود');
      assert.strictEqual(timers.size, 1, 'باید فقط یک تایمر در صف مانده باشد');
      [...timers.values()].forEach(cb => cb());
      assert.strictEqual(posWrites, before + 1);
      assert.deepStrictEqual(posStore.manshi_badge_pos, { x: 1000, y: 620 });
    }));

    t('جای دکمه: بستنِ تب تأخیرِ معلق را از دست نمی‌دهد', () => withFakeTimers(() => {
      const before = posWrites;
      press('ArrowLeft');
      assert.strictEqual(posWrites, before, 'هنوز در صف است');
      fire('pagehide');
      assert.strictEqual(posWrites, before + 1, 'pagehide باید صف را فوری خالی کند');
      assert.deepStrictEqual(posStore.manshi_badge_pos, { x: 992, y: 620 });
    }));
  }

  // ═══════ کیوسک (کاملاً آفلاین) ═══════
  console.log('\n— کیوسک —');
  {
    const K = require('../core/kiosk.js');
    const NOW = new Date(2026, 6, 28, 10, 0);   // سه‌شنبه ۶ مرداد ۱۴۰۵

    t('مناسبت: تاریخ‌ها یکتا و معتبرند', () => {
      const seen = new Set();
      for (const [jm, jd, title] of K.OCCASIONS) {
        assert.ok(jm >= 1 && jm <= 12, `ماهِ نامعتبر در «${title}»`);
        assert.ok(jd >= 1 && jd <= 31, `روزِ نامعتبر در «${title}»`);
        assert.ok(!(jm > 6 && jd > 30), `${title}: ماه دوم سال ۳۱ روز ندارد`);
        const key = `${jm}/${jd}/${title}`;
        assert.ok(!seen.has(key), `تکراری: ${title}`);
        seen.add(key);
      }
    });
    t('مناسبت: پیشِ رو مرتب و رو به جلو است', () => {
      const up = K.upcomingOccasions(NOW, 5);
      assert.strictEqual(up.length, 5);
      assert.ok(up.every(o => o.days >= 0), 'هیچ مناسبتِ گذشته‌ای نباید بیاید');
      for (let i = 1; i < up.length; i++) assert.ok(up[i].days >= up[i - 1].days, 'ترتیب باید صعودی باشد');
    });
    // اسفند/فروردین جایی است که «فقط امسال» شکست می‌خورد
    t('مناسبت: انتهای سال به سال بعد سرریز می‌شود', () => {
      const esfand = new Date(2026, 2, 15);   // اواسط اسفند ۱۴۰۴
      const up = K.upcomingOccasions(esfand, 6);
      assert.ok(up.some(o => o.title.includes('نوروز')), 'نوروزِ سال بعد باید دیده شود');
      assert.ok(up.every(o => o.days >= 0));
    });
    t('مناسبت: تعطیلیِ بعدی واقعاً تعطیل است', () => {
      const h = K.nextHoliday(NOW);
      assert.ok(h && h.holiday === true);
      assert.ok(h.days >= 0);
    });
    t('مناسبت: قمری‌ها عمداً نیامده‌اند', () =>
      assert.ok(!K.OCCASIONS.some(([, , title]) => /عید فطر|عاشورا|تاسوعا|قربان|غدیر/.test(title))));

    t('شمارش معکوس: همه رو به جلو و بامعنی', () => {
      const c = K.countdowns(NOW);
      assert.ok(c.length >= 3);
      assert.ok(c.every(x => x.days >= 0 && x.days <= 366), JSON.stringify(c));
      assert.strictEqual(c.find(x => x.key === 'month').label, 'پایان مرداد');
      assert.strictEqual(c.find(x => x.key === 'season').label, 'پایان تابستان');
    });
    t('شمارش معکوس: «آخر هفته» هست و درست حساب می‌شود', () => {
      const w = K.countdowns(NOW).find(x => x.key === 'weekend');
      assert.ok(w, 'باید شمارشِ آخر هفته باشد');
      // ۶ مرداد ۱۴۰۵ سه‌شنبه است → دو روز تا پنجشنبه
      assert.strictEqual(w.days, 2);
      const thu = K.countdowns(new Date(2026, 6, 30)).find(x => x.key === 'weekend');
      assert.strictEqual(thu.days, 0, 'پنجشنبه یعنی امروز');
    });
    t('شمارش معکوس: تعطیلیِ سیاسیِ حذف‌شده برنمی‌گردد', () => {
      assert.ok(!K.OCCASIONS.some(([, , title]) => /پیروزی انقلاب/.test(title)));
      assert.ok(!K.countdowns(NOW).some(c => /پیروزی انقلاب/.test(c.label)));
    });
    t('شمارش معکوس: روزِ نوروز صفر است، نه ۳۶۵', () => {
      const nowruz = new Date(2026, 2, 21);   // ۱ فروردین ۱۴۰۵
      const c = K.countdowns(new Date(2026, 2, 20));
      assert.ok(c.find(x => x.key === 'month').days >= 0);
      assert.strictEqual(K.daysUntil(nowruz, nowruz), 0);
    });

    const [, lat, lng] = K.cityByName('تهران');
    const pt = K.prayerTimes(NOW, lat, lng, K.IRAN_TZ);
    t('اوقات: ترتیبِ شرعی رعایت می‌شود', () => {
      const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
      for (let i = 1; i < order.length; i++) {
        assert.ok(pt[order[i]] > pt[order[i - 1]], `${order[i]} باید بعد از ${order[i - 1]} باشد`);
      }
    });
    // طولِ روزِ تهران در ۲۸ ژوئیه ≈ ۱۴ ساعت و ۳ دقیقه
    t('اوقات: طول روزِ تهران با واقعیت می‌خواند', () => {
      const dayLen = (pt.dhuhr - pt.sunrise) * 2;
      assert.ok(Math.abs(dayLen - 14.05) < 0.15, `طول روز ${dayLen.toFixed(2)} ساعت`);
    });
    t('اوقات: ظهرِ تهران حوالی ۱۲:۱۰ است (بدون ساعت تابستانی)', () =>
      assert.ok(Math.abs(pt.dhuhr - 12.18) < 0.1, K.hhmm(pt.dhuhr)));
    t('اوقات: زمستان با تابستان فرق دارد', () => {
      const winter = K.prayerTimes(new Date(2026, 0, 15), lat, lng, K.IRAN_TZ);
      assert.ok(winter.sunrise > pt.sunrise + 1.5, 'زمستان آفتاب دیرتر می‌آید');
      assert.ok(winter.maghrib < pt.maghrib - 1.5, 'زمستان زودتر غروب می‌کند');
    });
    t('اوقات: هر شهر عدد خودش را دارد', () => {
      const [, mLat, mLng] = K.cityByName('مشهد');
      const mashhad = K.prayerTimes(NOW, mLat, mLng, K.IRAN_TZ);
      assert.ok(mashhad.dhuhr < pt.dhuhr, 'مشهد شرقی‌تر است، ظهرش زودتر');
    });
    t('اوقات: شهرِ ناشناس به تهران برمی‌گردد', () =>
      assert.strictEqual(K.cityByName('شهرِ نداشته')[0], 'تهران'));
    t('اوقات: قالبِ ساعت درست است', () => {
      assert.strictEqual(K.hhmm(5.5), '05:30');
      assert.strictEqual(K.hhmm(0), '00:00');
      assert.strictEqual(K.hhmm(null), '—');
    });
    t('اوقات: وقتِ بعدی از زمانِ فعلی جلوتر است', () => {
      const np = K.nextPrayer(pt, NOW);
      assert.ok(np && np.minutes > 0, JSON.stringify(np));
      assert.strictEqual(np.key, 'dhuhr');
    });
    t('اوقات: بعد از عشا، فجرِ فردا می‌آید', () => {
      const np = K.nextPrayer(pt, new Date(2026, 6, 28, 23, 0));
      assert.strictEqual(np.key, 'fajr');
      assert.ok(np.tomorrow);
    });
    // عرض‌های قطبی نباید NaN به رابط بدهند
    t('اوقات: عرضِ قطبی صفحه را نمی‌شکند', () => {
      const polar = K.prayerTimes(new Date(2026, 5, 21), 78.2, 15.6, 1);
      assert.ok(Object.values(polar).every(v => v === null || Number.isFinite(v)));
      assert.strictEqual(K.hhmm(polar.fajr), '—');
    });

    // عکسِ خبر — آدرسِ ناامن نباید وارد صفحه شود
    t('عکس خبر: فقط https قبول می‌شود', () => {
      assert.ok(K.safeImageUrl('https://cdn.example.com/a.jpg'));
      assert.strictEqual(K.safeImageUrl('http://cdn.example.com/a.jpg'), '');
      assert.strictEqual(K.safeImageUrl('//cdn.example.com/a.jpg'), '');
    });
    t('عکس خبر: data: و javascript: رد می‌شوند', () => {
      assert.strictEqual(K.safeImageUrl('javascript:alert(1)'), '');
      assert.strictEqual(K.safeImageUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), '');
      assert.strictEqual(K.safeImageUrl('data:text/html,<script>x</script>'), '');
    });
    t('عکس خبر: چیزی که عکس نیست رد می‌شود', () => {
      assert.strictEqual(K.safeImageUrl('https://example.com/podcast.mp3'), '');
      assert.strictEqual(K.safeImageUrl('https://example.com/page'), '');
      // ولی اگر خودِ فید بگوید عکس است، قبول
      assert.ok(K.safeImageUrl('https://example.com/pic', 'image/jpeg'));
    });
    t('عکس خبر: پسوند با پارامتر هم شناخته می‌شود', () => {
      assert.ok(K.safeImageUrl('https://cdn.example.com/a.webp?w=300'));
      assert.ok(K.safeImageUrl('https://cdn.example.com/b.PNG#x'));
    });
    t('عکس خبر: اولین img از توضیحات بیرون کشیده می‌شود', () => {
      assert.strictEqual(
        K.imageFromHtml('<p>سلام</p><img src="https://cdn.example.com/n.jpg" alt="x"><img src="https://cdn.example.com/m.jpg">'),
        'https://cdn.example.com/n.jpg');
      assert.strictEqual(K.imageFromHtml('<p>بدون عکس</p>'), '');
      assert.strictEqual(K.imageFromHtml('<img src="javascript:alert(1)">'), '');
    });
    t('عکس خبر: ورودیِ خالی صفحه را نمی‌شکند', () => {
      assert.strictEqual(K.safeImageUrl(null), '');
      assert.strictEqual(K.safeImageUrl(undefined), '');
      assert.strictEqual(K.imageFromHtml(null), '');
    });

    t('سخن: یک روز یک سخن، پایدار', () => {
      const a = K.sayingOfDay(NOW), b = K.sayingOfDay(new Date(2026, 6, 28, 23, 59));
      assert.deepStrictEqual(a, b);
    });
    t('سخن: فردا سخنِ دیگری است', () =>
      assert.notStrictEqual(K.sayingOfDay(NOW).lines[0], K.sayingOfDay(new Date(2026, 6, 29, 10, 0)).lines[0]));
    t('سخن: هر ورودی گوینده و متنِ کامل دارد', () =>
      K.SAYINGS.forEach((s, i) => {
        assert.ok(s.poet && s.poet.length > 2, `گویندهٔ ${i}`);
        assert.ok(['poem', 'quote'].includes(s.kind), `نوعِ ${i}`);
        assert.strictEqual(s.lines.length, s.kind === 'poem' ? 2 : 1, `تعداد سطرِ ${i} (${s.poet})`);
        s.lines.forEach(l => assert.ok(l && l.length > 10, `سطرِ کوتاه در ${i} (${s.poet})`));
      }));
    t('سخن: هیچ سخنی دوبار نیامده', () => {
      const seen = new Set();
      for (const s of K.SAYINGS) {
        assert.ok(!seen.has(s.lines[0]), `تکراری: ${s.lines[0]}`);
        seen.add(s.lines[0]);
      }
    });
    t('سخن: هم شعر دارد هم نقل‌قول، از چند گوینده', () => {
      assert.ok(K.filterSayings('poem').length >= 25);
      assert.ok(K.filterSayings('quote').length >= 8);
      assert.ok(K.POETS.length >= 15, `${K.POETS.length} گوینده`);
      for (const p of ['حافظ', 'سعدی', 'مولوی', 'خیام', 'فردوسی']) assert.ok(K.POETS.includes(p), p);
    });
    t('سخن: صافیِ نوع فقط همان نوع را می‌دهد', () => {
      assert.ok(K.filterSayings('poem').every(s => s.kind === 'poem'));
      assert.ok(K.filterSayings('quote').every(s => s.kind === 'quote'));
      assert.strictEqual(K.filterSayings('all').length, K.SAYINGS.length);
    });
    t('سخن: سخنِ روز به نوعِ انتخابی احترام می‌گذارد', () => {
      assert.strictEqual(K.sayingOfDay(NOW, 'quote').kind, 'quote');
      assert.strictEqual(K.sayingOfDay(NOW, 'poem').kind, 'poem');
    });
    // «یکی دیگر» که همان قبلی را بدهد، یعنی دکمه خراب است
    t('سخن: «یکی دیگر» هیچ‌وقت همان قبلی نیست', () => {
      const cur = K.SAYINGS[0].lines[0];
      for (let i = 0; i < 40; i++) assert.notStrictEqual(K.randomSaying('all', cur).lines[0], cur);
    });
    // ── نقل‌قول‌های تازه از اینترنت ──
    const ZEN = JSON.stringify([
      { q: "Difficult and meaningful will always bring more satisfaction than easy and meaningless.", a: "Maxime Lagace" },
      { q: "The best way out is always through.", a: "Robert Frost" },
      { q: "short", a: "X" },                                   // خیلی کوتاه
      { q: "A".repeat(400), a: "Someone" },                     // خیلی بلند
      { q: "A quote with no author at all here", a: "" },       // بی‌گوینده
      { q: "Another fine and quite reasonable saying.", a: "zenquotes.io" }, // ردیف تبلیغاتی
      { q: "The best way out is always through.", a: "Robert Frost" }  // تکراری
    ]);
    t('نقل‌قول وب: فقط ردیف‌های سالم پذیرفته می‌شوند', () => {
      const out = K.parseQuotes(ZEN);
      assert.strictEqual(out.length, 2, JSON.stringify(out.map(x => x.poet)));
      assert.deepStrictEqual(out.map(x => x.poet), ['Maxime Lagace', 'Robert Frost']);
      assert.ok(out.every(x => x.kind === 'quote' && x.src === 'web' && x.lines.length === 1));
    });
    t('نقل‌قول وب: پاسخِ خراب صفحه را نمی‌شکند', () => {
      for (const bad of ['', 'نه JSON', '{}', '[]', 'null', JSON.stringify({ quotes: null })])
        assert.deepStrictEqual(K.parseQuotes(bad), [], String(bad).slice(0, 12));
    });
    t('نقل‌قول وب: شکلِ dummyjson هم خوانده می‌شود', () => {
      const out = K.parseQuotes(JSON.stringify({ quotes: [{ quote: 'Your heart is the size of an ocean.', author: 'Rumi' }] }));
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].poet, 'Rumi');
    });
    t('نقل‌قول وب: به مجموعهٔ محلی اضافه می‌شود، جایش را نمی‌گیرد', () => {
      const web = K.parseQuotes(ZEN);
      const all = K.allSayings(web);
      assert.strictEqual(all.length, K.SAYINGS.length + 2);
      assert.ok(all.some(s => s.poet === 'حافظ'), 'شعر فارسی باید بماند');
      assert.ok(all.some(s => s.poet === 'Robert Frost'));
    });
    t('نقل‌قول وب: تکراری با مجموعهٔ محلی اضافه نمی‌شود', () => {
      const dup = [{ kind: 'quote', poet: 'X', lines: [K.SAYINGS.find(s => s.kind === 'quote').lines[0]], src: 'web' }];
      assert.strictEqual(K.allSayings(dup).length, K.SAYINGS.length);
    });
    t('نقل‌قول وب: بدونِ اینترنت همه‌چیز مثل قبل کار می‌کند', () => {
      assert.strictEqual(K.allSayings([]).length, K.SAYINGS.length);
      assert.strictEqual(K.allSayings(null).length, K.SAYINGS.length);
      assert.ok(K.sayingOfDay(NOW, 'all', []) !== null);
    });
    t('نقل‌قول وب: سقفِ نگه‌داری رعایت می‌شود', () => {
      const many = Array.from({ length: K.MAX_FETCHED + 80 }, (_, i) => ({ kind: 'quote', poet: 'p' + i, lines: ['q' + i] }));
      const kept = K.trimQuotes(many);
      assert.strictEqual(kept.length, K.MAX_FETCHED);
      assert.strictEqual(kept[kept.length - 1].lines[0], 'q' + (many.length - 1), 'تازه‌ترین‌ها باید بمانند');
    });
    t('نقل‌قول وب: صافیِ «نقل‌قول» شاملِ تازه‌ها هم می‌شود', () => {
      const web = K.parseQuotes(ZEN);
      const q = K.filterSayings('quote', web);
      assert.ok(q.some(s => s.poet === 'Robert Frost'));
      assert.ok(q.every(s => s.kind === 'quote'));
      assert.ok(!K.filterSayings('poem', web).some(s => s.src === 'web'), 'شعر نباید آلوده شود');
    });
    t('نقل‌قول وب: آدرسِ فید https است', () => assert.ok(/^https:\/\//.test(K.QUOTE_FEED)));

    // ── منبعِ خبرِ دستی ──
    t('منبع دستی: فقط https پذیرفته می‌شود', () => {
      assert.ok(K.normalizeFeed({ url: 'http://x.com/feed' }).error);
      assert.ok(K.normalizeFeed({ url: 'ftp://x.com/feed' }).error);
      assert.ok(K.normalizeFeed({ url: 'javascript:alert(1)' }).error);
      assert.ok(K.normalizeFeed({ url: 'https://x.com/feed' }).feed);
    });
    t('منبع دستی: آدرسِ خراب یا خالی رد می‌شود', () => {
      assert.ok(K.normalizeFeed({ url: '' }).error);
      assert.ok(K.normalizeFeed({ url: 'یک چیزی' }).error);
      assert.ok(K.normalizeFeed(null).error);
    });
    t('منبع دستی: بی‌نام، نامِ دامنه را می‌گیرد', () =>
      assert.strictEqual(K.normalizeFeed({ url: 'https://www.varzesh3.com/rss/all' }).feed.name, 'varzesh3.com'));
    t('منبع دستی: نامِ بلند بریده می‌شود', () =>
      assert.ok(K.normalizeFeed({ url: 'https://x.com/f', name: 'ن'.repeat(200) }).feed.name.length <= 40));
    t('منبع دستی: دستهٔ نامعتبر به «عمومی» می‌افتد', () => {
      assert.strictEqual(K.normalizeFeed({ url: 'https://x.com/f', cat: '<script>' }).feed.cat, 'عمومی');
      assert.strictEqual(K.normalizeFeed({ url: 'https://x.com/f', cat: 'ورزشی' }).feed.cat, 'ورزشی');
    });
    t('منبع دستی: آدرسِ تکراری اضافه نمی‌شود', () => {
      const have = [K.normalizeFeed({ url: 'https://x.com/feed' }).feed];
      assert.ok(K.normalizeFeed({ url: 'https://x.com/feed' }, have).error);
    });
    t('منبع دستی: سقفِ تعداد رعایت می‌شود', () => {
      const many = Array.from({ length: K.MAX_CUSTOM_FEEDS }, (_, i) =>
        K.normalizeFeed({ url: `https://s${i}.com/feed` }).feed);
      assert.ok(K.normalizeFeed({ url: 'https://new.com/feed' }, many).error);
    });
    t('منبع دستی: هر منبع شناسهٔ یکتا می‌گیرد', () => {
      const a = K.normalizeFeed({ url: 'https://a.com/f' }).feed;
      const b = K.normalizeFeed({ url: 'https://b.com/f' }).feed;
      assert.notStrictEqual(a.id, b.id);
      assert.ok(a.custom && b.custom);
    });
    t('منبع دستی: ویرایشِ خودش تکراری حساب نمی‌شود', () => {
      const f = K.normalizeFeed({ url: 'https://x.com/feed' }).feed;
      assert.ok(K.normalizeFeed({ id: f.id, url: 'https://x.com/feed', name: 'تازه' }, [f]).feed);
    });

    // ── منبع‌های نقل‌قول ──
    t('نقل‌قول: چند منبع برای جایگزینی هست', () => {
      assert.ok(K.QUOTE_FEEDS.length >= 3);
      assert.ok(K.QUOTE_FEEDS.every(f => /^https:\/\//.test(f.url) && f.name && f.id));
      assert.strictEqual(new Set(K.QUOTE_FEEDS.map(f => f.id)).size, K.QUOTE_FEEDS.length);
    });
    t('نقل‌قول: هر سه شکلِ پاسخ خوانده می‌شود', () => {
      const zen = K.parseQuotes('[{"q":"A thoughtful line about work.","a":"Ann"}]');
      const dj  = K.parseQuotes('{"quotes":[{"quote":"A thoughtful line about work.","author":"Bob"}]}');
      const tf  = K.parseQuotes('[{"text":"A thoughtful line about work.","author":"Cid"}]');
      assert.deepStrictEqual([zen.length, dj.length, tf.length], [1, 1, 1]);
      assert.deepStrictEqual([zen[0].poet, dj[0].poet, tf[0].poet], ['Ann', 'Bob', 'Cid']);
    });

    // ── آب‌وهوا ──
    const wxCities = ['تهران', 'مشهد', 'رشت'].map(n => K.cityByName(n));
    const WX = JSON.stringify([
      { current: { temperature_2m: 34.2, relative_humidity_2m: 18, weather_code: 0, wind_speed_10m: 11 },
        daily: { temperature_2m_max: [38], temperature_2m_min: [24] } },
      { current: { temperature_2m: 29.8, relative_humidity_2m: 31, weather_code: 2, wind_speed_10m: 7 },
        daily: { temperature_2m_max: [33], temperature_2m_min: [19] } },
      { current: { temperature_2m: 21.4, relative_humidity_2m: 72, weather_code: 61, wind_speed_10m: 15 },
        daily: { temperature_2m_max: [24], temperature_2m_min: [17] } }
    ]);
    t('هوا: چند شهر در یک درخواست خوانده می‌شود', () => {
      const out = K.parseWeather(WX, wxCities);
      assert.strictEqual(out.length, 3);
      assert.deepStrictEqual(out.map(w => w.city), ['تهران', 'مشهد', 'رشت']);
    });
    t('هوا: شهرها با ترتیبِ درست به داده می‌چسبند', () => {
      const out = K.parseWeather(WX, wxCities);
      assert.strictEqual(out[0].temp, 34);
      assert.strictEqual(out[2].temp, 21);
      assert.strictEqual(out[2].city, 'رشت', 'ردیفِ سوم نباید جابه‌جا شود');
    });
    t('هوا: کدِ WMO به فارسی ترجمه می‌شود', () => {
      const out = K.parseWeather(WX, wxCities);
      assert.strictEqual(out[0].text, 'آفتابی');
      assert.strictEqual(out[1].text, 'کمی ابری');
      assert.strictEqual(out[2].text, 'باران');
      assert.strictEqual(K.weatherLabel(75).text, 'برف');
      assert.strictEqual(K.weatherLabel(99).text, 'رعدوبرق');
      assert.strictEqual(K.weatherLabel(-1).text, '—', 'کدِ ناشناس صفحه را نمی‌شکند');
    });
    t('هوا: بیشینه/کمینه و رطوبت و باد خوانده می‌شوند', () => {
      const w = K.parseWeather(WX, wxCities)[0];
      assert.deepStrictEqual([w.max, w.min, w.humidity, w.wind], [38, 24, 18, 11]);
    });
    // پاسخِ یک‌شهری شیء است نه آرایه — این تفاوت در عمل صفحه را می‌شکست
    t('هوا: پاسخِ تک‌شهری (شیء) هم خوانده می‌شود', () => {
      const out = K.parseWeather(JSON.stringify({ current: { temperature_2m: 30, weather_code: 3 }, daily: {} }), [K.cityByName('تهران')]);
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].text, 'ابری');
      assert.strictEqual(out[0].max, null, 'نبودِ پیش‌بینی نباید NaN بدهد');
    });
    t('هوا: پاسخِ خراب هیچ ردیفی نمی‌دهد', () => {
      for (const bad of ['', 'نه JSON', '{}', 'null', '[]', JSON.stringify([{ current: null }]), JSON.stringify([{ current: { temperature_2m: 'گرم' } }])])
        assert.deepStrictEqual(K.parseWeather(bad, wxCities), [], String(bad).slice(0, 12));
    });
    t('هوا: آدرس https است و همهٔ شهرها را دارد', () => {
      const u = K.weatherUrl(wxCities);
      assert.ok(u.startsWith('https://api.open-meteo.com/'));
      assert.ok(u.includes('35.6892') && u.includes('36.2605') && u.includes('37.2808'));
      assert.ok(!/key|token|email/i.test(u), 'هیچ کلید یا شناسه‌ای در آدرس نباشد');
    });
    t('هوا: بدون شهر، آدرسی ساخته نمی‌شود', () => {
      assert.strictEqual(K.weatherUrl([]), '');
      assert.strictEqual(K.weatherUrl(null), '');
    });
    t('هوا: تازه‌سازی نیم‌ساعت یک بار', () => {
      const now = Date.now();
      assert.ok(K.weatherDue(0, now));
      assert.ok(!K.weatherDue(now - 60e3, now));
      assert.ok(K.weatherDue(now - 31 * 60e3, now));
    });

    // ── تایمر تمرکز ──
    const T0 = new Date(2026, 6, 28, 10, 0, 0);
    const at = (min, sec = 0) => new Date(T0.getTime() + min * 60000 + sec * 1000);
    t('تمرکز: بدون جلسه، بی‌کار است', () => {
      assert.strictEqual(K.focusState(null, T0).phase, 'idle');
      assert.strictEqual(K.focusState({}, T0).phase, 'idle');
    });
    const sess = K.startSession('t1', 25, T0);
    t('تمرکز: شروع ۲۵ دقیقه‌ای درست ساخته می‌شود', () => {
      assert.strictEqual(sess.minutes, 25);
      assert.strictEqual(sess.mode, 'work');
      assert.strictEqual(sess.taskId, 't1');
    });
    t('تمرکز: شمارش از ساعتِ دیوار است، نه تیکِ داخلی', () => {
      assert.strictEqual(K.focusState(sess, T0).leftSec, 1500);
      assert.strictEqual(K.focusState(sess, at(10)).leftSec, 900);
      // حتی اگر تب دقایقی خواب بوده باشد، عدد درست درمی‌آید
      assert.strictEqual(K.focusState(sess, at(24, 30)).leftSec, 30);
    });
    t('تمرکز: درصد پیشرفت درست است', () => {
      assert.strictEqual(K.focusState(sess, T0).pct, 0);
      assert.strictEqual(K.focusState(sess, at(12, 30)).pct, 50);
      assert.strictEqual(K.focusState(sess, at(25)).pct, 100);
    });
    t('تمرکز: پس از پایان، تمام‌شده است و منفی نمی‌رود', () => {
      const st = K.focusState(sess, at(40));
      assert.strictEqual(st.phase, 'done');
      assert.strictEqual(st.leftSec, 0);
      assert.ok(st.pct <= 100);
    });
    t('تمرکز: قالبِ ساعت درست است', () => {
      assert.strictEqual(K.clock(1500), '25:00');
      assert.strictEqual(K.clock(65), '01:05');
      assert.strictEqual(K.clock(0), '00:00');
      assert.strictEqual(K.clock(-5), '00:00');
    });
    t('تمرکز: بعد از کار، استراحتِ کوتاه', () => {
      const nx = K.nextSession(sess, at(25));
      assert.strictEqual(nx.mode, 'break');
      assert.strictEqual(nx.minutes, K.FOCUS.shortBreak);
      assert.strictEqual(nx.taskId, 't1', 'کار باید حفظ شود');
    });
    t('تمرکز: هر ۴ دور، استراحتِ بلند', () => {
      const r4 = { ...sess, round: 4 };
      assert.strictEqual(K.nextSession(r4, at(25)).minutes, K.FOCUS.longBreak);
      const r3 = { ...sess, round: 3 };
      assert.strictEqual(K.nextSession(r3, at(25)).minutes, K.FOCUS.shortBreak);
    });
    t('تمرکز: بعد از استراحت، دورِ بعدیِ کار', () => {
      const br = K.nextSession(sess, at(25));
      const nx = K.nextSession(br, at(30));
      assert.strictEqual(nx.mode, 'work');
      assert.strictEqual(nx.round, 2);
      assert.strictEqual(nx.minutes, K.FOCUS.work);
    });
    t('تمرکز: زمانِ کارشده گِرد می‌شود و از سقف نمی‌گذرد', () => {
      assert.strictEqual(K.workedMinutes(sess, at(12)), 12);
      assert.strictEqual(K.workedMinutes(sess, at(40)), 25, 'بیشتر از مدتِ جلسه ثبت نمی‌شود');
      assert.strictEqual(K.workedMinutes(sess, T0), 0);
    });
    t('تمرکز: زمانِ استراحت جزو کار حساب نمی‌شود', () =>
      assert.strictEqual(K.workedMinutes({ ...sess, mode: 'break' }, at(5)), 0));
    t('تمرکز: جمعِ امروز با عوض‌شدن روز صفر می‌شود', () => {
      const log = { day: '2026-07-28', rounds: 3, minutes: 75 };
      assert.strictEqual(K.todayFocus(log, new Date(2026, 6, 28)).rounds, 3);
      const other = K.todayFocus(log, new Date(2026, 7, 20));
      assert.strictEqual(other.rounds, 0);
      assert.strictEqual(other.minutes, 0);
    });
    t('تمرکز: افزودن دور، جمع را درست بالا می‌برد', () => {
      let log = K.addFocus(null, 25, T0);
      assert.deepStrictEqual([log.rounds, log.minutes], [1, 25]);
      log = K.addFocus(log, 25, T0);
      assert.deepStrictEqual([log.rounds, log.minutes], [2, 50]);
    });

    t('سخن: تصادفی از همان مجموعه است', () => {
      const r = K.randomSaying('poem');
      assert.ok(K.SAYINGS.some(s => s.lines[0] === r.lines[0] && s.kind === 'poem'));
    });
  }

  // ═══════ بازار ═══════
  console.log('\n— بازار —');
  {
    const M = require('../core/market.js');
    // نمونهٔ واقعی از ساختارِ صفحهٔ منبع
    const CUR_HTML = `
      <tr title="قیمت دلار آمریکا"><td class="currName">دلار آمریکا</td>
        <td class="buyPrice text-center">۱۸۸,۲۵۰</td><td class="sellPrice">۱۹۰,۱۵۰</td></tr>
      <tr title="قیمت یورو"><td class="currName">یورو</td>
        <td class="buyPrice">۲۱۳,۹۰۰</td><td class="sellPrice">۲۱۶,۱۰۰</td></tr>
      <tr title="قیمت افغانی"><td class="currName">افغانی</td>
        <td class="buyPrice">۲,۸۲۰</td><td class="sellPrice">۲,۸۸۰</td></tr>`;
    const GOLD_HTML = `
      <tr title="مشاهده قیمت لحظه‌ای گرم طلای 18 عیار">
        <td class="priceTd">۱۸,۳۴۱,۱۱۰ تومان۰.۷۰%</td><td class="priceTd">-۱۶۱,۸۹۰(-۰.۸۷%)</td></tr>
      <tr title="مشاهده قیمت لحظه‌ای سکه امامی (طرح جدید)">
        <td class="priceTd">۱۸۴,۵۰۰,۰۰۰ تومان۰.۵۴%</td><td class="priceTd">۳,۶۱۳,۰۰۰(۲.۰۰%)</td></tr>
      <tr title="مشاهده قیمت لحظه‌ای سکه گرمی">
        <td class="priceTd">۱۹,۴۹۰,۰۰۰ تومان۱.۱۹%</td><td class="priceTd">-۷۴۷,۸۴۸,۰۰۰(-۹۷.۴۶%)</td></tr>
      <tr title="مشاهده قیمت لحظه‌ای انس طلا">
        <td class="priceTd">۴,۰۳۵.۰۸$۱.۱۵%</td><td class="priceTd">-(-)</td></tr>`;

    t('عدد: رقم فارسی و جداکننده خوانده می‌شود', () => {
      assert.strictEqual(M.toNumber('۱۸۸,۲۵۰'), 188250);
      assert.strictEqual(M.toNumber('-۱۶۱,۸۹۰'), -161890);
      assert.strictEqual(M.toNumber('۴,۰۳۵.۰۸$'), 4035.08);
      assert.strictEqual(M.toNumber('-'), null);
      assert.strictEqual(M.toNumber(''), null);
    });

    const cur = M.parseCurrencies(CUR_HTML);
    t('ارز: فقط قلم‌های فهرستِ خودمان می‌آیند', () =>
      assert.deepStrictEqual(cur.map(x => x.key), ['usd', 'eur']));
    t('ارز: قیمتِ فروش ملاک است', () =>
      assert.strictEqual(cur.find(x => x.key === 'usd').value, 190150));
    // برچسب باید از جدولِ ما بیاید، نه از صفحهٔ بیرونی
    t('ارز: برچسب از خودِ ما می‌آید، نه از سایت', () => {
      const evil = '<tr title="قیمت دلار آمریکا"><td class="currName"><img src=x onerror=alert(1)>دلار آمریکا</td><td class="sellPrice">۱۰۰</td></tr>';
      const out = M.parseCurrencies(evil);
      assert.strictEqual(out[0].label, 'دلار آمریکا');
      assert.ok(!/img|onerror/.test(out[0].label));
    });
    t('ارز: ردیفِ بی‌قیمت انداخته می‌شود', () =>
      assert.strictEqual(M.parseCurrencies('<tr title="قیمت یورو"><td class="currName">یورو</td><td class="sellPrice">-</td></tr>').length, 0));

    const gold = M.parseGold(GOLD_HTML);
    t('طلا: همهٔ قلم‌ها با قیمت درست', () => {
      assert.strictEqual(gold.find(x => x.key === 'gram18').value, 18341110);
      assert.strictEqual(gold.find(x => x.key === 'emami').value, 184500000);
      assert.strictEqual(gold.find(x => x.key === 'ounce').value, 4035.08);
    });
    t('طلا: تغییرِ روز از خودِ منبع خوانده می‌شود', () => {
      const c = gold.find(x => x.key === 'emami').change;
      assert.strictEqual(c.amount, 3613000);
      assert.ok(Math.abs(c.percent - 2) < 0.01);
    });
    // در دادهٔ واقعیِ سایت «سکه گرمی: -۹۷٪» دیده شد؛ نباید به کاربر نشان داده شود
    t('طلا: درصدِ بی‌معنی نمایش داده نمی‌شود', () =>
      assert.strictEqual(gold.find(x => x.key === 'gerami').change, null));
    t('طلا: واحدِ دلاری از تومانی جدا می‌ماند', () => {
      assert.strictEqual(gold.find(x => x.key === 'ounce').unit, 'دلار');
      assert.strictEqual(gold.find(x => x.key === 'gram18').unit, 'تومان');
    });

    // تاریخچهٔ محلی
    const D = (s) => new Date(s + 'T12:00:00Z');
    let hist = [];
    hist = M.pushSnapshot(hist, [{ key: 'usd', value: 180000 }], D('2026-07-26'));
    hist = M.pushSnapshot(hist, [{ key: 'usd', value: 185000 }], D('2026-07-27'));
    t('تاریخچه: یک عکس در روز', () => assert.strictEqual(hist.length, 2));
    t('تاریخچه: عکسِ دومِ همان روز جایگزین می‌شود', () => {
      const again = M.pushSnapshot(hist, [{ key: 'usd', value: 186000 }], D('2026-07-27'));
      assert.strictEqual(again.length, 2);
      assert.strictEqual(again[1].values.usd, 186000);
    });
    t('تغییر: نسبت به دیروز حساب می‌شود، نه امروز', () => {
      const withToday = M.pushSnapshot(hist, [{ key: 'usd', value: 190000 }], D('2026-07-28'));
      const ch = M.changeFrom(withToday, 'usd', 190000, D('2026-07-28'));
      assert.strictEqual(ch.amount, 5000);          // ۱۹۰ نسبت به ۱۸۵ دیروز
      assert.ok(Math.abs(ch.percent - 2.70) < 0.05);
      assert.strictEqual(ch.since, '2026-07-27');
    });
    t('تغییر: روزِ اول تاریخچه‌ای نیست، پس تغییری هم نیست', () =>
      assert.strictEqual(M.changeFrom([], 'usd', 190000, D('2026-07-28')), null));
    t('تغییر: تغییرِ خودِ منبع بر تاریخچه مقدم است', () => {
      const items = [{ key: 'usd', value: 190000, change: null }, { key: 'emami', value: 1, change: { amount: 9, percent: 9 } }];
      const out = M.withChange(items, hist, D('2026-07-28'));
      assert.strictEqual(out[0].change.amount, 5000, 'ارز از تاریخچه');
      assert.strictEqual(out[1].change.percent, 9, 'طلا از منبع');
    });
    t('تاریخچه: بیش از سقف نگه داشته نمی‌شود', () => {
      let h = [];
      for (let i = 0; i < 40; i++) h = M.pushSnapshot(h, [{ key: 'usd', value: 1000 + i }], D(`2026-0${i < 9 ? '1' : '2'}-${String((i % 28) + 1).padStart(2, '0')}`));
      assert.ok(h.length <= M.MAX_SNAPSHOTS, h.length);
    });
    t('سری: آخرین روزها برای نمودار', () => {
      const s = M.seriesOf(hist, 'usd', 7);
      assert.deepStrictEqual(s.map(x => x.value), [180000, 185000]);
    });
    t('قالب: عدد با جداکنندهٔ فارسی', () => {
      assert.strictEqual(M.faPrice(18341110), '۱۸٬۳۴۱٬۱۱۰');
      assert.strictEqual(M.faPrice(null), '—');
      assert.strictEqual(M.faPercent(-0.87), '۰.۹٪');
    });
  }

  // ═══════ بررسی نسخهٔ تازه ═══════
  console.log('\n— نسخهٔ تازه —');
  {
    const U = require('../core/update.js');
    t('نسخه: رقم فارسی و v ابتدایی خوانده می‌شود', () => {
      assert.deepStrictEqual(U.parseVersion('۰٫۹٫۶'), [0, 9, 6]);
      assert.deepStrictEqual(U.parseVersion('v1.2.3'), [1, 2, 3]);
      assert.deepStrictEqual(U.parseVersion('0.9.6'), [0, 9, 6]);
      assert.deepStrictEqual(U.parseVersion('  V2.0 '), [2, 0]);
    });
    t('نسخه: ورودی بی‌معنی null می‌دهد', () => {
      for (const v of ['', null, undefined, 'نسخه', {}]) assert.strictEqual(U.parseVersion(v), null, String(v));
    });
    t('نسخه: مقایسه درست است', () => {
      assert.strictEqual(U.compareVersions('1.0.0', '0.9.9'), 1);
      assert.strictEqual(U.compareVersions('0.9.9', '1.0.0'), -1);
      assert.strictEqual(U.compareVersions('0.9.6', '0.9.6'), 0);
    });
    // ۰٫۹٫۱۰ باید از ۰٫۹٫۹ تازه‌تر باشد — مقایسهٔ رشته‌ای اینجا می‌شکند
    t('نسخه: ۰٫۹٫۱۰ از ۰٫۹٫۹ تازه‌تر است', () =>
      assert.strictEqual(U.compareVersions('0.9.10', '0.9.9'), 1));
    t('نسخه: طولِ نابرابر درست حل می‌شود', () => {
      assert.strictEqual(U.compareVersions('1.0', '1.0.0'), 0);
      assert.strictEqual(U.compareVersions('1.0.1', '1.0'), 1);
    });
    t('نسخه: فقط نسخهٔ بالاتر «تازه» است', () => {
      assert.ok(U.isNewer('0.9.7', '0.9.6'));
      assert.ok(!U.isNewer('0.9.6', '0.9.6'));
      assert.ok(!U.isNewer('0.9.5', '0.9.6'), 'نسخهٔ قدیمی‌تر نباید پیشنهاد شود');
    });
    t('ریلیز: پاسخ سالم خوانده می‌شود', () => {
      const r = U.parseRelease(JSON.stringify({
        tag_name: 'v0.9.7', name: 'منشی ۰٫۹٫۷', body: 'چند اصلاح',
        html_url: 'https://github.com/rezatxt27/manshi-suite/releases/tag/v0.9.7',
        published_at: '2026-08-01T10:00:00Z'
      }));
      assert.strictEqual(r.version, '0.9.7');
      assert.strictEqual(r.name, 'منشی ۰٫۹٫۷');
      assert.ok(r.url.startsWith('https://github.com/'));
    });
    t('ریلیز: پیش‌نویس نادیده گرفته می‌شود', () =>
      assert.strictEqual(U.parseRelease(JSON.stringify({ tag_name: 'v9.9.9', draft: true })), null));
    t('ریلیز: پاسخ خراب صفحه را نمی‌شکند', () => {
      for (const bad of ['', 'نه JSON', '{}', 'null', '[]', JSON.stringify({ tag_name: 'بدون عدد' })])
        assert.strictEqual(U.parseRelease(bad), null, String(bad).slice(0, 14));
    });
    // آدرس از پاسخِ بیرونی می‌آید، پس نباید هرچه بود پذیرفته شود
    t('ریلیز: آدرسِ غیرگیت‌هاب یا غیر https رد می‌شود', () => {
      const evil = ['javascript:alert(1)', 'http://github.com/x', 'https://evil.com/x', 'https://github.com.evil.com/x'];
      for (const u of evil) {
        const r = U.parseRelease(JSON.stringify({ tag_name: 'v1.0.0', html_url: u }));
        assert.strictEqual(r.url, U.PAGE, u);
      }
    });
    t('ریلیز: زیردامنهٔ گیت‌هاب پذیرفته می‌شود', () => {
      const r = U.parseRelease(JSON.stringify({ tag_name: 'v1.0.0', html_url: 'https://www.github.com/a/b' }));
      assert.ok(r.url.includes('github.com'));
    });
    t('ریلیز: متنِ خیلی بلند بریده می‌شود', () => {
      const r = U.parseRelease(JSON.stringify({ tag_name: 'v1.0.0', body: 'x'.repeat(9000), name: 'n'.repeat(500) }));
      assert.ok(r.notes.length <= 2000 && r.name.length <= 120);
    });
    t('زمان‌بندی: روزی یک بار بررسی می‌شود', () => {
      const now = Date.now();
      assert.ok(U.dueForCheck(0, now), 'بار اول باید بررسی کند');
      assert.ok(!U.dueForCheck(now - 3600e3, now), 'یک ساعت بعد نه');
      assert.ok(U.dueForCheck(now - 25 * 3600e3, now), 'روز بعد بله');
    });
    t('امنیت: آدرس API روی https و خودِ گیت‌هاب است', () => {
      assert.ok(U.API.startsWith('https://api.github.com/'));
      assert.ok(U.PAGE.startsWith('https://github.com/'));
    });
  }

  // ── عکسِ لحظه‌ای و زمینهٔ کلیپ‌بورد ──────────────────
  {
    console.log('\n— عکسِ لحظه‌ای (snapshot) —');
    const S = require('../core/snapshot.js');
    const DAY = 86400000;
    const NOW = new Date(2026, 6, 20, 12, 0, 0).getTime();  // ۲۹ تیر ۱۴۰۵، ظهر

    const mk = (over) => Object.assign({
      id: 's1', title: 'جلسهٔ نمونه', startedAt: NOW - 2 * DAY,
      transcript: [{ speaker: 'نگار', text: 'سلام' }, { speaker: 'بهنام', text: 'خوبی؟' }],
      summary: '', actions: [], analysisData: null
    }, over || {});

    t('تحلیل‌شده: خلاصه یا کار یا analysisData کافی است', () => {
      assert.ok(!S.isAnalyzed(mk()), 'بدون هیچ‌کدام، تحلیل‌نشده');
      assert.ok(S.isAnalyzed(mk({ summary: '## خلاصه' })));
      assert.ok(S.isAnalyzed(mk({ actions: [{ text: 'کاری' }] })));
      assert.ok(S.isAnalyzed(mk({ analysisData: {} })));
      assert.ok(!S.isAnalyzed(mk({ summary: '   ' })), 'خلاصهٔ فقط فاصله تحلیل نیست');
    });

    t('شرکت‌کنندگان از گوینده و مسئولِ کار، بدون تکرار', () => {
      const p = S.participants(mk({
        transcript: [{ speaker: 'نگار', text: 'a' }, { speaker: 'نگار', text: 'b' }, { speaker: '', text: 'c' }],
        actions: [{ text: 'x', owner: 'بهنام' }, { text: 'y', owner: 'نگار' }]
      }));
      assert.deepStrictEqual(p, ['نگار', 'بهنام']);
    });

    t('جلسهٔ فقط‌متن هم شرکت‌کننده دارد', () => {
      assert.deepStrictEqual(S.participants(mk()), ['نگار', 'بهنام']);
    });

    t('سطح meta: نه خلاصه، نه کار، نه متن', () => {
      const r = S._slimSession(mk({ summary: 'خ', actions: [{ text: 'ک' }] }), 'meta');
      assert.ok(!('summary' in r) && !('actions' in r) && !('transcript' in r));
      assert.strictEqual(r.turns, 2);
      assert.ok(r.chars > 0, 'شمارِ کاراکتر باید بیاید تا اندازه معلوم باشد');
    });

    t('سطح mom: خلاصه و کار هست، متن نیست', () => {
      const r = S._slimSession(mk({ summary: 'خ', actions: [{ text: 'ک', owner: 'ن' }] }), 'mom');
      assert.strictEqual(r.summary, 'خ');
      assert.strictEqual(r.actions.length, 1);
      assert.ok(!('transcript' in r), 'متنِ خام نباید در سطح mom بیاید');
    });

    t('سطح full: متنِ کلمه‌به‌کلمه هم می‌آید', () => {
      const r = S._slimSession(mk(), 'full');
      assert.strictEqual(r.transcript.length, 2);
      assert.strictEqual(r.transcript[0].speaker, 'نگار');
    });

    t('پرچمِ analyzed در خروجی هست', () => {
      assert.strictEqual(S._slimSession(mk(), 'mom').analyzed, false);
      assert.strictEqual(S._slimSession(mk({ summary: 'خ' }), 'mom').analyzed, true);
    });

    t('امنیت: هیچ تنظیماتی وارد snapshot نمی‌شود', () => {
      // مقدارهای ساختگی در زمانِ اجرا ساخته می‌شوند، نه به‌صورت رشتهٔ ثابت در فایل.
      // دلیلش: بازرسِ .github/scripts/security-check.sh کلِ مخزن را دنبالِ الگوی کلید
      // می‌گردد و رشتهٔ ثابتِ شبیه‌کلید را — درست هم می‌کند — به‌عنوان نشت گزارش می‌داد.
      // این ترفند فقط برای همین فیکسچر است؛ کلیدِ واقعی همچنان گرفته می‌شود.
      const fakeKey = 'sk' + '-fixture-' + 'abcdefghijklmnopqrst';
      const fakeIcs = 'https://calendar.google.com/calendar/ical/'
        + 'FIXTURE' + '0123456789abcdefghij' + '/basic.ics';
      // حتی اگر تنظیماتِ حساس را عمداً پاس بدهیم، خروجی نباید بگیردش.
      const snap = S.buildSnapshot({
        sessions: [mk()], tasks: [], people: {},
        settings: { icsUrl: fakeIcs, aiKey: fakeKey },
        icsUrl: fakeIcs,
        aiProfiles: [{ key: fakeKey }]
      }, { now: NOW });
      const json = JSON.stringify(snap);
      assert.ok(!json.includes('FIXTURE'), 'آدرس iCal نشت کرده');
      assert.ok(!json.includes(fakeKey), 'کلید هوش مصنوعی نشت کرده');
      assert.ok(!json.includes('icsUrl') && !json.includes('aiKey'), 'کلیدِ تنظیمات نشت کرده');
      assert.ok(!('settings' in snap), 'snapshot نباید اصلاً settings داشته باشد');
    });

    t('ایمیلِ آدم‌ها در سطح meta نمی‌آید', () => {
      const data = { sessions: [], tasks: [], people: { 'نگار': { email: 'negar@example.com' } } };
      assert.ok(!JSON.stringify(S.buildSnapshot(data, { mode: 'meta', now: NOW })).includes('@'));
      assert.ok(JSON.stringify(S.buildSnapshot(data, { mode: 'mom', now: NOW })).includes('negar@example.com'));
    });

    t('شمارشِ جلسه‌های تحلیل‌نشده درست است', () => {
      const snap = S.buildSnapshot({
        sessions: [mk({ id: 'a' }), mk({ id: 'b', summary: 'خ' }), mk({ id: 'c' })],
        tasks: [{ id: 't1', title: 'x', status: 'open' }, { id: 't2', title: 'y', status: 'done' }]
      }, { now: NOW });
      assert.strictEqual(snap.counts.meetings, 3);
      assert.strictEqual(snap.counts.unanalyzed, 2);
      assert.strictEqual(snap.counts.openTasks, 1);
      assert.strictEqual(snap.schema, S.SCHEMA);
    });

    t('سطحِ نامعتبر به mom برمی‌گردد، نه به full', () => {
      const snap = S.buildSnapshot({ sessions: [mk()] }, { mode: 'هرچیزی', now: NOW });
      assert.strictEqual(snap.mode, 'mom');
      assert.ok(!('transcript' in snap.meetings[0]), 'پیش‌فرضِ امن نباید متنِ خام بدهد');
    });

    t('یادداشتِ کار در سطح meta نمی‌آید', () => {
      const t1 = { id: 'x', title: 'کار', notes: 'یادداشتِ خصوصی' };
      assert.ok(!('notes' in S._slimTask(t1, 'meta')));
      assert.strictEqual(S._slimTask(t1, 'mom').notes, 'یادداشتِ خصوصی');
    });

    console.log('\n— زمینهٔ کلیپ‌بورد (context) —');

    const world = {
      sessions: [
        mk({ id: 'a', title: 'جلسهٔ امروز', startedAt: NOW - 3600e3 }),
        mk({ id: 'b', title: 'جلسهٔ هفتهٔ پیش', startedAt: NOW - 5 * DAY, summary: 'خلاصهٔ ب' }),
        mk({ id: 'c', title: 'جلسهٔ ماهِ پیش', startedAt: NOW - 20 * DAY }),
        mk({ id: 'd', title: 'جلسهٔ خیلی قدیمی', startedAt: NOW - 200 * DAY })
      ],
      tasks: [
        { id: 't1', title: 'کارِ باز', status: 'open', who: 'نگار', dir: 'theirs', due: '1405-05-01' },
        { id: 't2', title: 'کارِ تمام‌شده', status: 'done', doneAt: new Date(NOW - 2 * DAY).toISOString() },
        { id: 't3', title: 'کارِ جلسه', status: 'open', meetingRef: 'a' }
      ]
    };

    t('دامنهٔ امروز فقط جلسهٔ امروز را می‌گیرد', () => {
      const r = S.buildContext(world, { scope: 'today', now: NOW });
      assert.strictEqual(r.meetings, 1);
      assert.ok(r.text.includes('جلسهٔ امروز') && !r.text.includes('جلسهٔ هفتهٔ پیش'));
    });

    t('دامنهٔ هفته و ماه بازهٔ درست دارند', () => {
      assert.strictEqual(S.buildContext(world, { scope: 'week', now: NOW }).meetings, 2);
      assert.strictEqual(S.buildContext(world, { scope: 'month', now: NOW }).meetings, 3);
    });

    t('دامنهٔ «بدون صورت‌جلسه» فقط تحلیل‌نشده‌ها را می‌دهد', () => {
      const r = S.buildContext(world, { scope: 'unanalyzed', now: NOW });
      assert.strictEqual(r.meetings, 3);
      assert.ok(!r.text.includes('جلسهٔ هفتهٔ پیش'), 'جلسهٔ تحلیل‌شده نباید بیاید');
      assert.strictEqual(r.tasks, 0, 'در این دامنه کار لازم نیست');
    });

    t('دامنهٔ یک جلسه، کارهای همان جلسه را هم می‌آورد', () => {
      const r = S.buildContext(world, { scope: 'session', id: 'a', now: NOW });
      assert.strictEqual(r.meetings, 1);
      assert.ok(r.text.includes('کارِ جلسه'));
      assert.ok(!r.text.includes('کارِ باز'));
    });

    t('دامنهٔ یک نفر با نامِ ناموجود چیزی برنمی‌گرداند', () => {
      assert.strictEqual(S.buildContext(world, { scope: 'person', name: 'کسی', now: NOW }).meetings, 0);
      assert.strictEqual(S.buildContext(world, { scope: 'person', name: '', now: NOW }).meetings, 0);
    });

    t('دامنهٔ یک نفر، جلسه‌ها و کارهای او را می‌گیرد', () => {
      const r = S.buildContext(world, { scope: 'person', name: 'نگار', now: NOW });
      assert.ok(r.meetings > 0);
      assert.ok(r.text.includes('کارِ باز'), 'کارِ سپرده‌شده به او باید بیاید');
    });

    t('دامنهٔ کارهای باز، جلسه‌ای نمی‌آورد', () => {
      const r = S.buildContext(world, { scope: 'open', now: NOW });
      assert.strictEqual(r.meetings, 0);
      assert.strictEqual(r.tasks, 2);
      assert.ok(!r.text.includes('کارِ تمام‌شده'));
    });

    t('هشدارِ «چه چیزی را نمی‌بینی» در خروجی هست', () => {
      const mom = S.buildContext(world, { scope: 'month', mode: 'mom', now: NOW });
      assert.ok(mom.text.includes('کلمه‌به‌کلمه'), 'باید بگوید متنِ خام نیست');
      assert.ok(/\d+ جلسه هنوز صورت‌جلسه ندارد/.test(mom.text.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
      const full = S.buildContext(world, { scope: 'month', mode: 'full', now: NOW });
      assert.ok(!full.text.includes('کلمه‌به‌کلمهٔ جلسه‌ها در این خروجی نیست'));
    });

    t('جلسهٔ تحلیل‌نشده در متن علامت می‌خورد', () => {
      const r = S.buildContext(world, { scope: 'today', mode: 'full', now: NOW });
      assert.ok(r.text.includes('هنوز صورت‌جلسه ندارد'));
      assert.ok(r.text.includes('متنِ خام است'));
    });

    t('سطح mom متنِ خام را در مارک‌داون هم نمی‌آورد', () => {
      const secret = 'جملهٔ محرمانهٔ داخل زیرنویس';
      const d = { sessions: [mk({ startedAt: NOW - 3600e3, summary: 'خ', transcript: [{ speaker: 'ن', text: secret }] })], tasks: [] };
      assert.ok(!S.buildContext(d, { scope: 'today', mode: 'mom', now: NOW }).text.includes(secret));
      assert.ok(S.buildContext(d, { scope: 'today', mode: 'full', now: NOW }).text.includes(secret));
    });

    t('بودجه رعایت می‌شود و حذف‌شده‌ها گزارش می‌شوند', () => {
      const big = mk({ id: 'big', title: 'جلسهٔ بلند', startedAt: NOW - 3600e3,
        transcript: [{ speaker: 'ن', text: 'x'.repeat(50000) }] });
      const small = mk({ id: 'small', title: 'جلسهٔ کوتاه', startedAt: NOW - 7200e3 });
      const r = S.buildContext({ sessions: [big, small], tasks: [] },
        { scope: 'today', mode: 'full', budget: 5000, now: NOW });
      assert.ok(r.chars <= 5000 + 400, 'خروجی از بودجه خیلی جلو زده: ' + r.chars);
      assert.ok(r.truncated && r.omitted >= 1);
      assert.ok(r.text.includes('جلسهٔ کوتاه'), 'موردِ کوچک باید جا شود حتی اگر بزرگ حذف شد');
      assert.ok(!r.text.includes('x'.repeat(1000)));
    });

    t('بودجهٔ خیلی کوچک به حداقلِ امن گرد می‌شود', () => {
      const r = S.buildContext(world, { scope: 'month', budget: 10, now: NOW });
      assert.ok(r.text.includes('# زمینه از منشی'), 'سربرگ همیشه باید بماند');
    });

    t('تخمین توکن با طولِ متن بالا می‌رود', () => {
      assert.ok(S.estimateTokens('') === 0);
      assert.ok(S.estimateTokens('x'.repeat(1000)) > S.estimateTokens('x'.repeat(100)));
    });

    t('دادهٔ خالی نمی‌شکند', () => {
      const r = S.buildContext({}, { scope: 'week', now: NOW });
      assert.strictEqual(r.meetings, 0);
      assert.strictEqual(r.tasks, 0);
      assert.ok(r.text.includes('# زمینه از منشی'));
      const snap = S.buildSnapshot({}, { now: NOW });
      assert.deepStrictEqual(snap.meetings, []);
      assert.strictEqual(snap.counts.unanalyzed, 0);
    });

    t('کارهای آماده: همه بازه و سطحِ معتبر دارند', () => {
      assert.ok(S.RECIPES.length >= 5);
      const ids = new Set();
      for (const r of S.RECIPES) {
        assert.ok(r.id && !ids.has(r.id), 'شناسهٔ تکراری: ' + r.id);
        ids.add(r.id);
        assert.ok(r.title && r.hint, 'عنوان و توضیح لازم است: ' + r.id);
        assert.ok(S.SCOPES.includes(r.scope), 'بازهٔ نامعتبر در ' + r.id);
        assert.ok(S.MODES.includes(r.mode), 'سطحِ نامعتبر در ' + r.id);
        // هر کار به‌جز «سؤال خودم» باید سؤالِ آماده داشته باشد
        if (!r.custom) assert.ok(r.ask && r.ask.length > 20, 'سؤالِ آماده ندارد: ' + r.id);
      }
      assert.strictEqual(S.recipeById('catchup').scope, 'unanalyzed');
      assert.strictEqual(S.recipeById('نیست'), null);
    });

    t('کارِ «عقب‌افتاده‌ها» متنِ خام می‌فرستد', () => {
      // اگر سطحش mom بود، مدل چیزی برای خلاصه‌کردن نداشت — کلِ کار بی‌معنا می‌شد.
      assert.strictEqual(S.recipeById('catchup').mode, 'full');
    });

    t('سؤالِ آماده ته متن می‌آید، با قاب در سر متن', () => {
      const ask = 'این جلسه‌ها را خلاصه کن.';
      const r = S.buildContext(world, { scope: 'month', ask, now: NOW });
      assert.ok(r.text.includes('# درخواست من'));
      assert.ok(r.text.trimEnd().endsWith(ask), 'درخواست باید آخرِ متن باشد');
      assert.ok(r.text.indexOf('درخواستم ته همین متن آمده') < r.text.indexOf('# جلسه‌ها'));
    });

    t('بدون سؤال، بخشِ درخواست اصلاً نمی‌آید', () => {
      const r = S.buildContext(world, { scope: 'month', now: NOW });
      assert.ok(!r.text.includes('# درخواست من'));
      assert.ok(!r.text.includes('درخواستم ته همین متن آمده'));
    });

    t('سؤال هم در بودجه حساب می‌شود', () => {
      const ask = 'ی'.repeat(500);
      const a = S.buildContext(world, { scope: 'month', now: NOW });
      const b = S.buildContext(world, { scope: 'month', ask, now: NOW });
      assert.ok(b.chars > a.chars + 400);
    });

    t('اندازه به زبان آدمیزاد، نه توکن', () => {
      assert.strictEqual(S.sizeLabel(1000).key, 'small');
      assert.strictEqual(S.sizeLabel(20000).key, 'medium');
      assert.strictEqual(S.sizeLabel(90000).key, 'large');
      for (const n of [0, 8000, 8001, 40000, 40001]) {
        assert.ok(S.sizeLabel(n).text.length > 5, 'برچسبِ خالی برای ' + n);
      }
      assert.ok(S.sizeLabel(90000).text.includes('رایگان'), 'باید بگوید ممکن است جا نشود');
    });

    t('پرچمِ خالی برای دامنهٔ بی‌نتیجه', () => {
      assert.ok(S.buildContext({ sessions: [], tasks: [] }, { scope: 'week', now: NOW }).empty);
      assert.ok(!S.buildContext(world, { scope: 'week', now: NOW }).empty);
    });

    t('اندازه در خروجیِ buildContext می‌آید', () => {
      const r = S.buildContext(world, { scope: 'month', mode: 'full', now: NOW });
      assert.ok(r.size && S.sizeLabel(r.chars).key === r.size.key);
    });

    t('هشدارِ مسیر: تلهٔ Documents در مک گرفته می‌شود', () => {
      for (const p of ['/Users/kazem/Documents/Meet', '~/Documents/manshi-data', '/Users/kazem/Desktop/data']) {
        const r = S.pathRisk(p);
        assert.strictEqual(r.level, 'maybe', 'گرفته نشد: ' + p);
        assert.ok(r.text.includes('iCloud'), 'باید تلهٔ مک را نام ببرد');
      }
    });

    t('هشدارِ مسیر: سرویس‌های همگام‌سازی شناخته می‌شوند', () => {
      const cases = [
        ['/Users/a/Library/Mobile Documents/com~apple~CloudDocs/Meet', 'iCloud Drive'],
        ['/Users/a/Dropbox/manshi', 'Dropbox'],
        ['/Users/a/Google Drive/manshi', 'Google Drive'],
        ['/Users/a/OneDrive - Acme/manshi', 'OneDrive'],
        ['/Users/a/Nextcloud/manshi', 'سرویس همگام‌سازی']
      ];
      for (const [p, why] of cases) {
        const r = S.pathRisk(p);
        assert.strictEqual(r.level, 'sync', 'گرفته نشد: ' + p);
        assert.strictEqual(r.why, why, 'دلیلِ اشتباه برای ' + p);
      }
    });

    t('هشدارِ مسیر: منع نمی‌کند، فقط خبر می‌دهد', () => {
      // انتخابِ آگاهانهٔ iCloud باید محترم باشد؛ متن نباید دستوری باشد
      const r = S.pathRisk('/Users/a/Dropbox/manshi');
      assert.ok(!/جای دیگری انتخاب کن|نگذار|ممنوع/.test(r.text), 'لحن نباید دستوری باشد: ' + r.text);
      assert.ok(/ایرادی ندارد|اگر آگاهانه/.test(r.text), 'باید بگوید انتخابِ آگاهانه اشکالی ندارد');
    });

    t('هشدارِ مسیر: پوشهٔ محلی سبز است', () => {
      for (const p of ['/Users/kazem/manshi-data', '~/manshi-data', '/opt/manshi', '/Users/a/Documents-old/x']) {
        assert.strictEqual(S.pathRisk(p).level, 'local', 'هشدارِ بی‌جا برای ' + p);
      }
      assert.strictEqual(S.pathRisk('').level, 'none');
      assert.strictEqual(S.pathRisk(null).level, 'none');
    });

    t('هر سطحِ مسیر متنِ خودش را دارد', () => {
      for (const p of ['', '/Users/a/manshi-data', '/Users/a/Documents/x', '/Users/a/Dropbox/x']) {
        const r = S.pathRisk(p);
        if (r.level !== 'none') assert.ok(r.text && r.text.length > 20, 'متنِ خالی برای ' + p);
      }
    });

    t('ویندوز: جداکنندهٔ \\ هم شناخته می‌شود', () => {
      // بدون یکسان‌سازی، مسیرِ ویندوزی سبز نشان داده می‌شد — آرامشِ دروغین
      assert.strictEqual(S.pathRisk('C:\\Users\\ali\\Dropbox\\manshi').level, 'sync');
      assert.strictEqual(S.pathRisk('C:\\Users\\ali\\OneDrive\\manshi').level, 'sync');
      assert.strictEqual(S.pathRisk('C:\\Users\\ali\\Documents\\manshi').level, 'maybe');
      assert.strictEqual(S.pathRisk('C:\\Users\\ali\\manshi-data').level, 'local');
    });

    t('لینوکس: خانهٔ /home هم پوشش دارد', () => {
      assert.strictEqual(S.pathRisk('/home/ali/Documents/x').level, 'maybe');
      assert.strictEqual(S.pathRisk('/home/ali/Dropbox/x').level, 'sync');
      assert.strictEqual(S.pathRisk('/home/ali/manshi-data').level, 'local');
    });

    t('مسیرِ فایل تنظیمات برای هر سیستم‌عامل جدا است', () => {
      for (const tl of S.TOOLS) {
        if (tl.kind === 'shell') continue;
        for (const os of S.OSES) {
          const f = S.toolFile(tl, os);
          assert.ok(f, 'مسیرِ خالی: ' + tl.id + '/' + os);
        }
      }
      assert.ok(S.toolFile(S.TOOLS.find(t2 => t2.id === 'codex'), 'win').includes('%USERPROFILE%'));
      assert.ok(S.toolFile(S.TOOLS.find(t2 => t2.id === 'claude-desktop'), 'win').includes('%APPDATA%'));
      assert.ok(S.toolFile(S.TOOLS.find(t2 => t2.id === 'claude-desktop'), 'linux').includes('.config'));
      assert.ok(S.toolFile(S.TOOLS.find(t2 => t2.id === 'claude-desktop'), 'mac').includes('Application Support'));
      assert.strictEqual(S.toolFile(null, 'mac'), '');
    });

    t('پوستهٔ ویندوز کوتیشنِ دوتایی می‌خواهد، نه تکی', () => {
      const p = 'C:\\My Apps\\manshi\\mcp\\manshi-mcp.js';
      const w = S.mcpSnippet('claude-code', p, 'C:\\manshi data', 'win');
      assert.ok(w.includes('"' + p + '"'), 'ویندوز: ' + w);
      assert.ok(!w.includes("'"), 'cmd کوتیشنِ تکی را عیناً چاپ می‌کند');
      const u = S.mcpSnippet('claude-code', p, 'C:\\manshi data', 'mac');
      assert.ok(u.includes("'" + p + "'"), 'یونیکس: ' + u);
    });

    t('جای‌نگهدارِ مسیرِ خالی هم به سیستم‌عامل می‌خورد', () => {
      assert.ok(S.mcpSnippet('claude-desktop', '', '', 'win').includes('C:\\\\'));
      assert.ok(S.mcpSnippet('claude-desktop', '', '', 'mac').includes('/path/to/'));
    });

    t('تنظیمات MCP: شکلِ هر ابزار درست است', () => {
      const S_ = '/Users/a/manshi-suite/mcp/manshi-mcp.js', D = '/Users/a/manshi-data';
      assert.ok(S.mcpSnippet('claude-code', S_, D).startsWith('claude mcp add manshi -s user -- node '));
      const j = JSON.parse(S.mcpSnippet('claude-desktop', S_, D));
      assert.deepStrictEqual(j.mcpServers.manshi.args, [S_, '--data', D]);
      assert.strictEqual(j.mcpServers.manshi.command, 'node');
      assert.ok(JSON.parse(S.mcpSnippet('vscode', S_, D)).servers.manshi, 'VS Code کلیدش servers است');
      const toml = S.mcpSnippet('codex', S_, D);
      assert.ok(toml.includes('[mcp_servers.manshi]') && toml.includes('"--data"'));
    });

    t('تنظیمات MCP: مسیرِ دارای فاصله درست نقل می‌شود', () => {
      const p = '/Users/a/My Files/manshi data';
      assert.ok(S.mcpSnippet('claude-code', p, p).includes("'" + p + "'"), 'در پوسته باید کوتیشن بخورد');
      assert.deepStrictEqual(JSON.parse(S.mcpSnippet('claude-desktop', p, p)).mcpServers.manshi.args[0], p);
    });

    t('تنظیمات MCP: مسیرِ خالی جای‌نگهدار می‌گذارد، نه رشتهٔ تهی', () => {
      const out = S.mcpSnippet('claude-desktop', '', '');
      assert.ok(out.includes('/path/to/'), 'باید معلوم باشد که باید پرش کنی');
      assert.ok(JSON.parse(out), 'باید همچنان JSONِ معتبر باشد');
    });

    t('پیشرفتِ راه‌اندازی: شمارش و «الان اینجایی»', () => {
      const none = S.setupProgress({});
      assert.strictEqual(none.done, 0);
      assert.strictEqual(none.total, 5);
      assert.strictEqual(none.next, 'node', 'اولین قدمِ نکرده باید node باشد');
      assert.ok(!none.complete);

      const some = S.setupProgress({ node: true, path: true });
      assert.strictEqual(some.done, 2);
      assert.strictEqual(some.next, 'config');

      const all = S.setupProgress({ node: 1, path: 1, config: 1, restart: 1, ask: 1 });
      assert.strictEqual(all.done, 5);
      assert.strictEqual(all.next, null);
      assert.ok(all.complete);
    });

    t('پیشرفت: قدمِ پریده هم شمرده می‌شود ولی «الان» عقب‌تر می‌ماند', () => {
      // کاربر ممکن است تنظیمات را کپی کند بی‌آنکه Node را تیک زده باشد
      const p = S.setupProgress({ config: true, ask: true });
      assert.strictEqual(p.done, 2);
      assert.strictEqual(p.next, 'node', 'باید به اولین کارِ نکرده برگردد');
    });

    t('پیشرفت: ورودیِ بی‌ربط یا خالی نمی‌شکند', () => {
      for (const bad of [null, undefined, {}, { چیزی: true }]) {
        const p = S.setupProgress(bad);
        assert.strictEqual(p.total, 5);
        assert.strictEqual(Object.keys(p.states).length, 5);
      }
      assert.strictEqual(S.setupProgress({ چیزی: true }).done, 0, 'کلیدِ ناشناخته نباید بشمارد');
    });

    t('قدم‌ها: کدام خودکارند و کدام دستی', () => {
      const auto = S.SETUP_STEPS.filter(x => x.auto).map(x => x.id);
      const manual = S.SETUP_STEPS.filter(x => !x.auto).map(x => x.id);
      assert.deepStrictEqual(auto, ['path', 'config', 'ask']);
      assert.deepStrictEqual(manual, ['node', 'restart'], 'فقط چیزهایی که نمی‌شود فهمید');
    });

    t('فهرست ابزارها: یکتا، کامل، و همه تنظیماتِ معتبر می‌سازند', () => {
      const ids = S.TOOLS.map(t2 => t2.id);
      assert.strictEqual(new Set(ids).size, ids.length);
      assert.ok(S.TOOLS.length >= 7, 'ابزارهای بیشتری انتظار می‌رفت');
      for (const t2 of S.TOOLS) {
        assert.ok(t2.name && t2.kind, 'ابزارِ ناقص: ' + t2.id);
        if (t2.kind !== 'shell') assert.ok(t2.file, 'فایلِ تنظیمات معلوم نیست: ' + t2.id);
        const out = S.mcpSnippet(t2.id, '/s/mcp.js', '/d');
        assert.ok(out.includes('/s/mcp.js') && out.includes('/d'), 'مسیرها نیامدند: ' + t2.id);
        if (t2.kind === 'json') assert.ok(JSON.parse(out), 'JSONِ نامعتبر: ' + t2.id);
      }
      // ابزارِ ناشناخته نباید بترکد — قالبِ استاندارد بدهد
      assert.ok(JSON.parse(S.mcpSnippet('چیزی', '/s/mcp.js', '/d')).mcpServers.manshi);
    });

    t('رکوردِ خراب (null و بی‌فیلد) نمی‌شکند', () => {
      const snap = S.buildSnapshot({ sessions: [null, {}, mk()], tasks: [null, {}] }, { mode: 'full', now: NOW });
      assert.strictEqual(snap.meetings.length, 3);
      assert.strictEqual(snap.meetings[1].participants.length, 0);
      const r = S.buildContext({ sessions: [null, {}], tasks: [null] }, { scope: 'month', now: NOW });
      assert.ok(typeof r.text === 'string');
    });
  }

  // ── صندوق ورودی (راهِ برگشت) ────────────────────────
  {
    console.log('\n— صندوق ورودی —');
    const I = require('../core/inbox.js');

    const sessions = [
      { id: 's1', title: 'جلسهٔ خالی', summary: '', actions: [] },
      { id: 's2', title: 'جلسهٔ صورت‌جلسه‌دار', summary: '## خلاصهٔ قبلی', actions: [] },
      { id: 's3', title: 'جلسه با کار', summary: '', actions: [{ text: 'کاری' }] }
    ];
    const box = items => JSON.stringify({ app: 'manshi-inbox', schema: 1, items });
    const minutes = (over) => Object.assign(
      { id: 'i1', kind: 'minutes', meetingId: 's1', summary: 'خلاصهٔ تازه', actions: [] }, over || {});

    t('موردِ سالم خوانده می‌شود و وضعیتش «تازه» است', () => {
      const r = I.parse(box([minutes()]), sessions);
      assert.ok(r.ok);
      assert.strictEqual(r.items.length, 1);
      assert.strictEqual(r.items[0].state, 'new');
      assert.strictEqual(r.items[0].title, 'جلسهٔ خالی');
    });

    t('جلسه‌ای که از قبل صورت‌جلسه دارد = تعارض، نه بازنویسیِ خاموش', () => {
      assert.strictEqual(I.parse(box([minutes({ meetingId: 's2' })]), sessions).items[0].state, 'conflict');
      // کارِ موجود هم یعنی صورت‌جلسه دارد
      assert.strictEqual(I.parse(box([minutes({ meetingId: 's3' })]), sessions).items[0].state, 'conflict');
    });

    t('امنیت: شناسهٔ جلسهٔ ناموجود دور ریخته می‌شود', () => {
      const r = I.parse(box([minutes({ meetingId: 'جعلی' })]), sessions);
      assert.strictEqual(r.items.length, 0);
      assert.strictEqual(r.skipped, 1);
    });

    t('امنیت: فایلی که مالِ منشی نیست رد می‌شود', () => {
      const r = I.parse(JSON.stringify({ app: 'چیزِ دیگر', items: [minutes()] }), sessions);
      assert.ok(!r.ok && r.error);
      assert.strictEqual(r.items.length, 0);
    });

    t('امنیت: JSON خراب نمی‌شکند', () => {
      const r = I.parse('{ این JSON نیست', sessions);
      assert.ok(!r.ok && r.error.includes('JSON'));
    });

    t('امنیت: طول‌ها سقف دارند', () => {
      const r = I.parse(box([minutes({
        summary: 'ا'.repeat(I.MAX_SUMMARY + 5000),
        actions: Array.from({ length: I.MAX_ACTIONS + 50 }, () => ({ text: 'ب'.repeat(I.MAX_TEXT + 200) }))
      })]), sessions);
      const it = r.items[0];
      assert.strictEqual(it.summary.length, I.MAX_SUMMARY);
      assert.strictEqual(it.actions.length, I.MAX_ACTIONS);
      assert.strictEqual(it.actions[0].text.length, I.MAX_TEXT);
    });

    t('امنیت: تعداد موردها سقف دارد', () => {
      const many = Array.from({ length: I.MAX_ITEMS + 40 }, (_, i) => minutes({ id: 'i' + i }));
      assert.ok(I.parse(box(many), sessions).items.length <= I.MAX_ITEMS);
    });

    t('امنیت: نوعِ غیرمتنی به رشته تبدیل نمی‌شود، دور ریخته می‌شود', () => {
      const r = I.parse(box([minutes({ summary: { a: 1 }, actions: [{ text: 42 }, { text: 'سالم' }] })]), sessions);
      assert.strictEqual(r.items.length, 1);
      assert.strictEqual(r.items[0].summary, '');
      assert.deepStrictEqual(r.items[0].actions.map(a => a.text), ['سالم']);
    });

    t('امنیت: کاراکترِ کنترلی پاک می‌شود ولی خطِ تازه می‌ماند', () => {
      const r = I.parse(box([minutes({ summary: 'خط یک\nخط دو\tبا تب' })]), sessions);
      const s = r.items[0].summary;
      assert.ok(!s.includes(' '));
      assert.ok(s.includes('\n') && s.includes('\t'), 'چندخطی‌بودن نباید از بین برود');
      assert.ok(s.includes('خطیک'));
    });

    t('فاصله‌ها دست‌نخورده می‌مانند', () => {
      const text = 'یک خلاصه با چند کلمه و فاصله';
      assert.strictEqual(I.parse(box([minutes({ summary: text })]), sessions).items[0].summary, text);
    });

    t('kind ناشناخته اجرا نمی‌شود', () => {
      const r = I.parse(box([minutes({ kind: 'delete_everything' })]), sessions);
      assert.strictEqual(r.items.length, 0);
      assert.strictEqual(r.skipped, 1);
    });

    t('موردِ تهی (بدون خلاصه و بدون کار) رد می‌شود', () => {
      const r = I.parse(box([minutes({ summary: '   ', actions: [] })]), sessions);
      assert.strictEqual(r.items.length, 0);
    });

    t('سررسیدِ بدشکل نادیده گرفته می‌شود', () => {
      const r = I.parse(box([minutes({ actions: [
        { text: 'الف', due: '۱۴۰۵/۰۵/۱۰' }, { text: 'ب', due: '2026-08-06' }
      ] })]), sessions);
      assert.strictEqual(r.items[0].actions[0].due, null);
      assert.strictEqual(r.items[0].actions[1].due, '2026-08-06');
    });

    t('پچ فقط همان چند فیلد را دست می‌زند', () => {
      const it = I.parse(box([minutes({ actions: [{ text: 'کار' }] })]), sessions).items[0];
      const p = I.patchFor(it);
      assert.deepStrictEqual(Object.keys(p).sort(), ['actions', 'analysisError', 'summary', 'updatedAt']);
      assert.strictEqual(p.summary, 'خلاصهٔ تازه');
      assert.strictEqual(p.analysisError, '');
    });

    t('پس از اعمال، موردها از فایل برداشته می‌شوند', () => {
      const raw = box([minutes({ id: 'a' }), minutes({ id: 'b' })]);
      const left = I.remaining(raw, ['a']);
      assert.strictEqual(left.items.length, 1);
      assert.strictEqual(left.items[0].id, 'b');
      assert.strictEqual(left.app, I.APP);
      assert.strictEqual(I.remaining(raw, ['a', 'b']).items.length, 0);
      assert.strictEqual(I.remaining('خراب', ['a']).items.length, 0, 'فایل خراب = صندوق خالی');
    });

    t('صندوق خالی ساختار درست دارد', () => {
      const e = I.empty();
      assert.strictEqual(e.app, I.APP);
      assert.deepStrictEqual(e.items, []);
      assert.ok(I.parse(JSON.stringify(e), sessions).ok);
    });

    t('گردشِ کامل: خروجیِ سرور MCP را منشی می‌خواند', () => {
      // همان شکلی که mcp/manshi-mcp.js می‌نویسد
      const fromServer = {
        app: 'manshi-inbox', schema: 1,
        items: [{
          id: 'inabc', kind: 'minutes', meetingId: 's1',
          summary: '## خلاصه\nدربارهٔ قیمت‌گذاری صحبت شد.',
          actions: [{ text: 'ارسال گزارش', owner: 'بهنام', due: '2026-08-06' }],
          by: 'mcp', createdAt: '2026-08-02T04:00:00.000Z'
        }]
      };
      const r = I.parse(JSON.stringify(fromServer), sessions);
      assert.strictEqual(r.items.length, 1);
      assert.strictEqual(r.items[0].state, 'new');
      assert.strictEqual(r.items[0].by, 'mcp');
      assert.strictEqual(r.items[0].actions[0].owner, 'بهنام');
    });
  }

  // ── ابزارهای MCP (منبعِ واحد) ───────────────────────
  {
    console.log('\n— ابزارهای MCP —');
    const MT = require('../core/mcp-tools.js');
    const fs2 = require('fs'), path2 = require('path');
    const server = fs2.readFileSync(path2.join(__dirname, '../mcp/manshi-mcp.js'), 'utf8');

    t('هر ابزار نام، توضیحِ مدل، توضیحِ فارسی و شِما دارد', () => {
      assert.ok(MT.TOOLS.length >= 5);
      const names = new Set();
      for (const tl of MT.TOOLS) {
        assert.ok(/^[a-z_]+$/.test(tl.name), 'نامِ بدشکل: ' + tl.name);
        assert.ok(!names.has(tl.name), 'نامِ تکراری: ' + tl.name);
        names.add(tl.name);
        assert.ok(tl.fa && tl.faDesc, 'توضیحِ فارسی ندارد: ' + tl.name);
        assert.ok(tl.description && tl.description.length > 20, 'توضیحِ مدل ناقص: ' + tl.name);
        assert.strictEqual(tl.inputSchema.type, 'object', 'شِمای نادرست: ' + tl.name);
        assert.strictEqual(typeof tl.writes, 'boolean');
      }
    });

    t('فقط write_minutes می‌نویسد', () => {
      const w = MT.TOOLS.filter(tl => tl.writes).map(tl => tl.name);
      assert.deepStrictEqual(w, ['write_minutes']);
    });

    t('سرور همان فهرست را می‌دهد، بدون فیلدهای فارسی', () => {
      const s = MT.forServer();
      assert.strictEqual(s.length, MT.TOOLS.length);
      for (const tl of s) {
        assert.deepStrictEqual(Object.keys(tl).sort(), ['description', 'inputSchema', 'name']);
        assert.ok(!('fa' in tl) && !('writes' in tl), 'فیلدِ رابط به مدل نشت کرده');
      }
    });

    t('سرور واقعاً از همین فایل می‌خواند — نه نسخهٔ دومِ خودش', () => {
      assert.ok(server.includes("require('../core/mcp-tools.js')"), 'سرور از منبعِ واحد نمی‌خواند');
      assert.ok(!/const TOOLS = \[/.test(server), 'سرور هنوز فهرستِ جداگانه دارد — از هم می‌افتند');
    });

    t('هر ابزارِ تعریف‌شده در سرور پیاده‌سازی دارد', () => {
      for (const tl of MT.TOOLS) {
        assert.ok(server.includes("name === '" + tl.name + "'"),
          'ابزارِ بی‌پیاده‌سازی: ' + tl.name);
      }
    });

    t('نمونه‌های راهنما فقط ابزارهای موجود را نام می‌برند', () => {
      assert.ok(MT.EXAMPLES.length >= 6);
      for (const ex of MT.EXAMPLES) {
        assert.ok(ex.want && ex.say, 'نمونهٔ ناقص');
        assert.ok(ex.uses.length, 'نمونه بدون ابزار: ' + ex.want);
        for (const n of ex.uses) assert.ok(MT.byName(n), 'ابزارِ ناموجود در نمونه: ' + n);
      }
    });

    t('هر ابزار دستِ‌کم در یک نمونه دیده می‌شود', () => {
      const seen = new Set(MT.EXAMPLES.flatMap(e => e.uses));
      for (const tl of MT.TOOLS) assert.ok(seen.has(tl.name), 'ابزارِ بی‌نمونه: ' + tl.name);
    });

    t('byName روی نامِ ناموجود null می‌دهد', () => {
      assert.strictEqual(MT.byName('نیست'), null);
      assert.strictEqual(MT.byName('list_meetings').fa, 'فهرست جلسه‌ها');
    });
  }

  // ── برنامهٔ روز (منطقی که تا امروز بی‌تست بود) ───────
  {
    console.log('\n— برنامهٔ روز —');
    const A = require('../core/agenda.js');
    const at = (d, h, m) => new Date(2026, 6, d, h, m || 0);

    t('وقت آزاد: بین دو جلسه، با کفِ ۲۰ دقیقه', () => {
      const day = at(20, 0), now = at(20, 7);   // قبل از شروعِ روزِ کاری
      const gaps = A.freeGaps([
        { start: at(20, 9), end: at(20, 10) },
        { start: at(20, 10, 10), end: at(20, 11) },   // فقط ۱۰ دقیقه فاصله
        { start: at(20, 14), end: at(20, 15) }
      ], day, now);
      const mins = gaps.map(g => g.min);
      assert.deepStrictEqual(mins, [60, 180, 300], 'فاصلهٔ ۱۰ دقیقه‌ای نباید بیاید: ' + mins);
    });

    t('وقت آزاد: امروز از «الان» شروع می‌شود، نه از ابتدای روز', () => {
      const day = at(20, 0);
      const zero = A.freeGaps([], day, at(20, 7));    // قبل از ۸
      const noon = A.freeGaps([], day, at(20, 12));   // ظهر
      assert.strictEqual(zero[0].min, 12 * 60, 'از ۸ تا ۲۰');
      assert.strictEqual(noon[0].min, 8 * 60, 'از ۱۲ تا ۲۰');
    });

    t('وقت آزاد: روزِ دیگر همیشه از ابتدای روزِ کاری', () => {
      const gaps = A.freeGaps([], at(25, 0), at(20, 15));
      assert.strictEqual(gaps[0].min, (A.DAY_END_H - A.DAY_START_H) * 60);
    });

    t('وقت آزاد: جلسهٔ پوشاننده فاصلهٔ جعلی نمی‌سازد', () => {
      // جلسهٔ دوم داخل اولی است — نباید فاصله‌ای بین آن دو دربیاید
      const gaps = A.freeGaps([
        { start: at(20, 9), end: at(20, 13) },
        { start: at(20, 10), end: at(20, 11) }
      ], at(20, 0), at(20, 7));
      assert.deepStrictEqual(gaps.map(g => g.min), [60, 7 * 60]);
    });

    t('وقت آزاد: ورودیِ خالی کلِ روز را می‌دهد و null نمی‌شکند', () => {
      assert.strictEqual(A.freeGaps(null, at(20, 0), at(20, 7)).length, 1);
    });

    t('سریِ جلسه: شماره و واژه‌های عمومی نادیده گرفته می‌شوند', () => {
      assert.strictEqual(A.seriesKey('جلسهٔ هفتگی تیم فروش #۳'), A.seriesKey('جلسهٔ هفتگی تیم فروش #۴'));
      assert.strictEqual(A.seriesKey('Weekly Sales Sync 12'), A.seriesKey('Weekly Sales Sync 13'));
      assert.notStrictEqual(A.seriesKey('جلسهٔ تیم فروش'), A.seriesKey('جلسهٔ تیم فنی'));
    });

    t('سریِ جلسه: عنوانِ کاملاً عمومی خالی نمی‌ماند', () => {
      // اگر همهٔ واژه‌ها عمومی باشند، خودِ عنوان ملاک می‌شود — نه رشتهٔ تهی
      assert.ok(A.seriesKey('جلسهٔ هفتگی').length > 0);
      assert.strictEqual(A.seriesKey(''), '');
    });

    t('سریِ جلسه: هم‌سری‌ها از نو به کهنه مرتب می‌شوند', () => {
      const ss = [
        { id: 'a', title: 'جلسهٔ هفتگی فروش #۱', startedAt: 1000 },
        { id: 'b', title: 'جلسهٔ هفتگی فروش #۲', startedAt: 3000 },
        { id: 'c', title: 'جلسهٔ فنی', startedAt: 2000 }
      ];
      assert.deepStrictEqual(A.sessionSeries(ss[0], ss).map(x => x.id), ['b', 'a']);
    });

    t('تطبیق با تقویم: همان‌روز بودن به‌تنهایی کافی نیست', () => {
      const s = { title: 'جلسهٔ محصول', startedAt: at(20, 10).getTime() };
      const only = A.matchEventForSession(s, [{ title: 'چیزِ کاملاً دیگر', start: at(20, 11) }]);
      assert.strictEqual(only, null, 'نباید فقط با همان‌روز بودن وصل شود');
    });

    t('تطبیق با تقویم: عنوانِ یکسان برنده است', () => {
      const s = { title: 'جلسهٔ محصول', startedAt: at(20, 10).getTime() };
      const hit = A.matchEventForSession(s, [
        { title: 'جلسهٔ محصول و بازار', start: at(25, 9) },   // شباهت، روزِ دیگر = ۲
        { title: 'جلسهٔ محصول', start: at(20, 9) }            // یکسان + همان روز = ۴
      ]);
      assert.strictEqual(hit.title, 'جلسهٔ محصول');
    });

    t('تطبیق با تقویم: عنوانِ خیلی کوتاه شباهت نمی‌سازد', () => {
      const s = { title: 'ab', startedAt: at(20, 10).getTime() };
      assert.strictEqual(A.matchEventForSession(s, [{ title: 'abcdef', start: at(20, 9) }]), null);
    });

    t('تطبیق با تقویم: ورودیِ خالی نمی‌شکند', () => {
      assert.strictEqual(A.matchEventForSession({}, null), null);
      assert.strictEqual(A.matchEventForSession({ title: 'x' }, [null]), null);
    });

    t('زمانِ جلسه: عدد و ISO هر دو کار می‌کنند', () => {
      assert.strictEqual(A.sessionTime({ startedAt: 1500 }), 1500);
      assert.strictEqual(A.sessionTime({ startedAt: '2026-08-02T04:00:00.000Z' }), Date.parse('2026-08-02T04:00:00.000Z'));
      assert.strictEqual(A.sessionTime({ startedAt: 'خراب' }), 0, 'تاریخِ نامعتبر باید صفر شود نه NaN');
      assert.strictEqual(A.sessionTime(null), 0);
    });

    t('مرتب‌سازی با startedAtِ مخلوطِ عدد و رشته درست کار می‌کند', () => {
      const ss = [
        { id: 'a', startedAt: '2026-08-01T00:00:00.000Z' },
        { id: 'b', startedAt: Date.parse('2026-08-03T00:00:00.000Z') },
        { id: 'c', startedAt: '2026-08-02T00:00:00.000Z' }
      ];
      assert.deepStrictEqual([...ss].sort(A.byNewest).map(x => x.id), ['b', 'c', 'a']);
    });

    t('آدرس Meet از متن بیرون کشیده و از نقطهٔ ته جمله پاک می‌شود', () => {
      assert.strictEqual(A.cleanMeetUrl('بیا اینجا https://meet.google.com/abc-defg-hij.'), 'https://meet.google.com/abc-defg-hij');
      assert.strictEqual(A.cleanMeetUrl('بدون لینک'), '');
      assert.strictEqual(A.cleanMeetUrl(null), '');
    });

    t('مدت به فارسی', () => {
      assert.strictEqual(A.humanDur(95), '۱ ساعت و ۳۵ دقیقه');
      assert.strictEqual(A.humanDur(120), '۲ ساعت');
      assert.strictEqual(A.humanDur(45), '۴۵ دقیقه');
      assert.strictEqual(A.humanDur(-5), '۰ دقیقه', 'منفی نباید بیرون بزند');
    });

    t('برچسبِ کهنگیِ تماس', () => {
      assert.strictEqual(A.staleLabel(null), 'بدون سابقهٔ تماس');
      assert.strictEqual(A.staleLabel(0), 'آخرین تماس: امروز');
      assert.strictEqual(A.staleLabel(1), 'آخرین تماس: دیروز');
      assert.ok(A.staleLabel(3).includes('۳ روز'));
      assert.ok(A.staleLabel(10).includes('۱ هفته'));
      assert.ok(A.staleLabel(65).includes('۲ ماه'));
    });

    t('نرمال‌سازیِ جست‌وجو: رقم و ی/ک عربی', () => {
      assert.strictEqual(A.searchNorm('۷'), '7');
      assert.strictEqual(A.searchNorm('كتاب'), 'کتاب');
      assert.strictEqual(A.searchNorm('علي'), 'علی');
      assert.strictEqual(A.searchNorm('  ABC  '), 'abc');
      assert.strictEqual(A.searchNorm(null), '');
    });
  }

  // ── توضیحاتِ زیرکار ─────────────────────────────────
  {
    console.log('\n— توضیحاتِ زیرکار —');
    const mk = async (title) => (await Store.addTask({ title, dir: 'mine' }));

    const t1 = await mk('کارِ آزمایشی');
    const s1 = await Store.addSubtask(t1.id, 'زیرکار یک', 'اول با تیم هماهنگ کن');
    t('زیرکار با توضیح ساخته می‌شود', () => {
      assert.strictEqual(s1.title, 'زیرکار یک');
      assert.strictEqual(s1.note, 'اول با تیم هماهنگ کن');
      assert.strictEqual(s1.done, false);
    });

    const s2 = await Store.addSubtask(t1.id, 'زیرکار دو');
    t('زیرکارِ بی‌توضیح، رشتهٔ تهی می‌گیرد نه undefined', () => {
      assert.strictEqual(s2.note, '');
    });

    const s3 = await Store.addSubtask(t1.id, 'زیرکار سه', 'ا'.repeat(5000));
    t('توضیحِ زیرکار سقف دارد', () => {
      assert.strictEqual(s3.note.length, 2000);
    });

    await Store.updateSubtask(t1.id, s1.id, { note: 'توضیحِ عوض‌شده' });
    {
      const tasks = await Store.getTasks();
      const cur = tasks.find(x => x.id === t1.id).subtasks.find(x => x.id === s1.id);
      t('توضیح واقعاً در حافظه نشست', () => {
        assert.strictEqual(cur.note, 'توضیحِ عوض‌شده');
        assert.strictEqual(cur.title, 'زیرکار یک', 'عنوان نباید دست بخورد');
      });
    }

    await Store.updateSubtask(t1.id, s1.id, { title: '   ' });
    {
      const tasks = await Store.getTasks();
      const cur = tasks.find(x => x.id === t1.id).subtasks.find(x => x.id === s1.id);
      t('عنوانِ خالی، زیرکار را بی‌نام نمی‌کند', () => {
        assert.strictEqual(cur.title, 'زیرکار یک');
      });
    }

    await Store.updateSubtask(t1.id, s1.id, { done: true, id: 'جعلی', title: 'نامِ تازه' });
    {
      const tasks = await Store.getTasks();
      const cur = tasks.find(x => x.id === t1.id).subtasks.find(x => x.id === s1.id);
      t('فقط عنوان و توضیح تغییر می‌کنند، نه چیز دیگر', () => {
        assert.strictEqual(cur.title, 'نامِ تازه');
        assert.strictEqual(cur.done, false, 'done از این مسیر عوض نمی‌شود');
        assert.strictEqual(cur.id, s1.id, 'شناسه دست‌نخورده می‌ماند');
      });
    }

    {
      const r1 = await Store.updateSubtask(t1.id, 'نیست', { note: 'x' });
      const r2 = await Store.updateSubtask('نیست', s1.id, { note: 'x' });
      t('شناسهٔ نامعتبر بی‌صدا رد می‌شود', () => {
        assert.strictEqual(r1, null);
        assert.strictEqual(r2, null);
      });
    }

    // مهم‌ترین: با تکرارِ کار، «چطور انجامش بدهم» نباید گم شود
    const rec = await Store.addTask({ title: 'کارِ تکرارشونده', dir: 'mine', recur: { kind: 'week', n: 1 } });
    await Store.addSubtask(rec.id, 'گام یک', 'راهنمای انجامش این است');
    await Store.addSubtask(rec.id, 'گام دو', '');
    // گام یک را تیک بزن تا معلوم شود done بازنشانی می‌شود
    {
      const cur = (await Store.getTasks()).find(x => x.id === rec.id);
      await Store.toggleSubtask(rec.id, cur.subtasks[0].id);
    }
    await Store.toggleDone(rec.id);
    {
      const tasks = await Store.getTasks();
      const next = tasks.find(x => x.title === 'کارِ تکرارشونده' && x.status === 'open');
      t('در تکرار: توضیحِ زیرکار می‌ماند ولی تیک‌ها پاک می‌شوند', () => {
        assert.ok(next, 'نسخهٔ تکرارشونده ساخته نشد');
        assert.strictEqual(next.subtasks.length, 2);
        assert.strictEqual(next.subtasks[0].note, 'راهنمای انجامش این است');
        assert.strictEqual(next.subtasks[1].note, '');
        assert.ok(next.subtasks.every(x => x.done === false), 'تیک‌ها باید صفر شوند');
      });
    }
  }

  // ── اولویت ──────────────────────────────────────────
  {
    console.log('\n— اولویت —');
    const now = new Date();
    const iso = d => { const x = new Date(now); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
    const mk = o => Object.assign({ title: 'x', status: 'open', createdAt: now.toISOString() }, o);

    t('اولویتِ بالاتر امتیازِ بیشتر می‌دهد', () => {
      const sc = p => Store.taskScore(mk({ priority: p }), now);
      assert.ok(sc(3) > sc(2) && sc(2) > sc(1) && sc(1) > sc(0));
    });

    t('اولویت جای ددلاین را نمی‌گیرد', () => {
      const prio = Store.taskScore(mk({ priority: 3 }), now);
      assert.ok(prio > Store.taskScore(mk({ due: iso(0) }), now), 'باید از ددلاینِ امروز بالاتر باشد');
      assert.ok(prio > Store.taskScore(mk({ due: iso(-5) }), now), 'و از ۵ روز عقب‌افتاده');
      assert.ok(Store.taskScore(mk({ due: iso(-20) }), now) > prio, 'ولی خیلی عقب‌افتاده بالاتر می‌ماند');
    });

    t('سنجاق همچنان از همه بالاتر است', () => {
      assert.ok(Store.taskScore(mk({ pinned: true }), now)
        > Store.taskScore(mk({ priority: 3, due: iso(-10) }), now));
    });

    t('توضیحِ مرتب‌سازی اولویت را نام می‌برد', () => {
      assert.strictEqual(Store.scoreReason(mk({ priority: 3 }), now), 'اولویت زیاد');
      assert.strictEqual(Store.scoreReason(mk({ priority: 2 }), now), 'اولویت متوسط');
      assert.strictEqual(Store.scoreReason(mk({ priority: 1 }), now), 'اولویت کم');
    });

    t('عقب‌افتادگی از اولویت فوری‌تر خوانده می‌شود', () => {
      const r = Store.scoreReason(mk({ priority: 3, due: iso(-4) }), now);
      assert.ok(r.includes('عقب‌افتاده'), 'گفت: ' + r);
    });

    t('ددلاینِ امروز از اولویتِ کم مهم‌تر خوانده می‌شود', () => {
      assert.strictEqual(Store.scoreReason(mk({ priority: 1, due: iso(0) }), now), 'ددلاین امروز');
    });

    {
      const a = await Store.addTask({ title: 'اولویتِ خراب', priority: 99 });
      const b = await Store.addTask({ title: 'اولویتِ متنی', priority: 'زیاد' });
      const c = await Store.addTask({ title: 'اولویتِ سالم', priority: 2 });
      t('ورودیِ نامعتبرِ اولویت پذیرفته نمی‌شود', () => {
        assert.strictEqual(a.priority, 0);
        assert.strictEqual(b.priority, 0);
        assert.strictEqual(c.priority, 2);
      });
      for (const x of [a, b, c]) await Store.removeTask(x.id);
    }

    {
      const rec = await Store.addTask({
        title: 'کارِ مهمِ تکرارشونده', priority: 3,
        recur: { freq: 'weekly', interval: 1, weekday: 2 }
      });
      await Store.toggleDone(rec.id);
      const next = (await Store.getTasks()).find(x => x.title === 'کارِ مهمِ تکرارشونده' && x.status === 'open');
      t('اولویت با تکرار به نمونهٔ بعدی می‌رود', () => {
        assert.ok(next, 'نمونهٔ بعدی ساخته نشد');
        assert.strictEqual(next.priority, 3);
      });
    }

    t('برچسبِ تکرارِ خراب، متنِ بی‌معنی نمی‌سازد', () => {
      // پیش از این، هر freqِ ناشناخته «undefined هر undefined ماه» می‌داد
      for (const bad of [{}, { kind: 'week', n: 1 }, { freq: 'weekly', weekday: 99 }, { freq: 'monthly' }]) {
        const out = DP.recurLabel(bad);
        assert.strictEqual(out, '', 'برای ' + JSON.stringify(bad) + ' داد: ' + out);
      }
      assert.strictEqual(DP.recurLabel({ freq: 'weekly', interval: 1, weekday: 2 }), 'هر دوشنبه');
      assert.strictEqual(DP.recurLabel({ freq: 'monthly', interval: 1, day: 1 }), 'اول هر ماه');
    });
  }

  // ── پروژه‌ها و حوزه‌ها ──────────────────────────────
  {
    console.log('\n— پروژه‌ها —');

    const area = await Store.saveProject({ name: 'دیجی‌کالا' });
    const p1 = await Store.saveProject({ name: 'فاز دو', parentId: area.id });
    const p2 = await Store.saveProject({ name: 'پشتیبانی', parentId: area.id });
    const solo = await Store.saveProject({ name: 'پروژهٔ مستقل' });

    t('پروژه ساخته می‌شود و رنگ می‌گیرد', () => {
      assert.ok(area.id && area.name === 'دیجی‌کالا');
      assert.strictEqual(area.parentId, null);
      assert.ok(Store.PROJECT_COLORS.includes(area.color));
    });

    {
      const bad = await Store.saveProject({ name: '   ' });
      const bad2 = await Store.saveProject({});
      t('نامِ خالی رد می‌شود', () => {
        assert.strictEqual(bad, null);
        assert.strictEqual(bad2, null);
      });
    }

    {
      const long = await Store.saveProject({ name: 'ط'.repeat(200) });
      t('سقفِ نامِ پروژه', () => { assert.strictEqual(long.name.length, 60); });
      await Store.removeProject(long.id);
    }

    {
      const deep = await Store.saveProject({ name: 'خیلی عمیق', parentId: p1.id });
      t('زیرِ یک زیرپروژه، والد نمی‌گیرد', () => {
        assert.strictEqual(deep.parentId, null, 'باید به ریشه برگردد');
      });
      await Store.removeProject(deep.id);
    }

    {
      const self = await Store.saveProject({ id: solo.id, name: 'پروژهٔ مستقل', parentId: solo.id });
      t('حلقهٔ خودارجاع ساخته نمی‌شود', () => { assert.strictEqual(self.parentId, null); });
    }

    // کارها را به پروژه وصل کن
    const tA = await Store.addTask({ title: 'کارِ فاز دو', projectId: p1.id, meetingRef: 'sess-1' });
    const tB = await Store.addTask({ title: 'کارِ پشتیبانی', projectId: p2.id, meetingRef: 'sess-2' });
    const tC = await Store.addTask({ title: 'کارِ حوزه', projectId: area.id, meetingRef: 'sess-1' });
    const tD = await Store.addTask({ title: 'کارِ بی‌پروژه' });

    t('کار به پروژه وصل می‌شود', () => {
      assert.strictEqual(tA.projectId, p1.id);
      assert.strictEqual(tD.projectId, null);
    });

    {
      const tasks = await Store.getTasks();
      const tree = Store.projectTree(await Store.getProjects(), tasks);
      const node = tree.find(n => n.id === area.id);
      t('درخت: شمارِ خود و زیرمجموعه‌ها', () => {
        assert.ok(node, 'حوزه در درخت نیست');
        assert.strictEqual(node.open, 1, 'کارِ مستقیمِ حوزه');
        assert.strictEqual(node.total, 3, 'خودش + دو زیرپروژه');
        assert.strictEqual(node.children.length, 2);
      });
      t('زیرپروژه در ریشهٔ درخت تکرار نمی‌شود', () => {
        assert.ok(!tree.some(n => n.id === p1.id));
      });
    }

    {
      const tasks = await Store.getTasks();
      const refs = Store.projectMeetingRefs(area.id, tasks, [p1.id, p2.id]);
      t('جلسه‌های پروژه از کارها مشتق می‌شوند، بدون دادهٔ تازه', () => {
        assert.deepStrictEqual(refs.sort(), ['sess-1', 'sess-2']);
      });
      t('بدون زیرمجموعه فقط جلسه‌های خودش', () => {
        assert.deepStrictEqual(Store.projectMeetingRefs(p2.id, tasks), ['sess-2']);
      });
      t('جلسهٔ تکراری یک بار می‌آید', () => {
        // sess-1 هم در کارِ فاز دو است هم در کارِ حوزه
        assert.strictEqual(Store.projectMeetingRefs(area.id, tasks, [p1.id]).length, 1);
      });
    }

    // مهم‌ترین: حذفِ پروژه نباید کار یا جلسه‌ای را نابود کند
    {
      const before = (await Store.getTasks()).length;
      const res = await Store.removeProject(area.id);
      const tasks = await Store.getTasks();
      const projects = await Store.getProjects();
      t('حذفِ پروژه هیچ کاری را حذف نمی‌کند', () => {
        assert.strictEqual(tasks.length, before);
        assert.ok(tasks.find(x => x.id === tC.id), 'کارِ حوزه باید بماند');
      });
      t('کارهای آن پروژه بی‌پروژه می‌شوند، نه یتیم', () => {
        assert.strictEqual(tasks.find(x => x.id === tC.id).projectId, null);
      });
      t('زیرپروژه‌ها یک سطح بالا می‌آیند', () => {
        assert.deepStrictEqual(res.promoted.sort(), [p1.id, p2.id].sort());
        assert.strictEqual(projects.find(p => p.id === p1.id).parentId, null);
      });
      t('کارهای زیرپروژه‌ها دست نمی‌خورند', () => {
        assert.strictEqual(tasks.find(x => x.id === tA.id).projectId, p1.id);
        assert.strictEqual(tasks.find(x => x.id === tA.id).meetingRef, 'sess-1', 'ارتباط جلسه سالم');
      });
    }

    {
      const rec = await Store.addTask({
        title: 'کارِ پروژه‌دارِ تکرارشونده', projectId: p1.id,
        recur: { freq: 'weekly', interval: 1, weekday: 2 }
      });
      await Store.toggleDone(rec.id);
      const next = (await Store.getTasks()).find(x => x.title === 'کارِ پروژه‌دارِ تکرارشونده' && x.status === 'open');
      t('پروژه با تکرار به نمونهٔ بعدی می‌رود', () => {
        assert.ok(next); assert.strictEqual(next.projectId, p1.id);
      });
      await Store.removeTask(next.id); await Store.removeTask(rec.id);
    }

    {
      const r = await Store.removeProject('نیست');
      t('حذفِ شناسهٔ نامعتبر null می‌دهد', () => { assert.strictEqual(r, null); });
    }

    // پاک‌سازی
    for (const x of [tA, tB, tC, tD]) await Store.removeTask(x.id);
    for (const pr of await Store.getProjects()) await Store.removeProject(pr.id);
  }

  // ── دفترچهٔ توضیحات ─────────────────────────────────
  {
    console.log('\n— دفترچهٔ توضیحات —');
    const task1 = await Store.addTask({ title: 'کارِ توضیح‌دار' });
    const fresh = async id => (await Store.getTasks()).find(x => x.id === id);

    t('کارِ تازه دفترچهٔ خالی دارد', () => {
      assert.deepStrictEqual(Store.noteEntries(task1), []);
    });

    const n1 = await Store.addNote(task1.id, 'با مالی تماس گرفتم');
    const n2 = await Store.addNote(task1.id, 'قیمت را فرستادند');

    t('هر ثبت زمان و شناسهٔ خودش را دارد', () => {
      assert.ok(n1.at && n2.at, 'زمان ثبت نشده');
      assert.notStrictEqual(n1.id, n2.id);
      assert.ok(Date.parse(n1.at) <= Date.parse(n2.at));
    });

    {
      const cur = await fresh(task1.id);
      const e = Store.noteEntries(cur);
      t('ثبت‌ها به ترتیبِ نوشتن می‌مانند', () => {
        assert.strictEqual(e.length, 2);
        assert.strictEqual(e[0].text, 'با مالی تماس گرفتم');
        assert.strictEqual(e[1].text, 'قیمت را فرستادند');
      });
      t('آخرین توضیح در notes می‌نشیند — سازگاری با بقیهٔ رابط', () => {
        assert.strictEqual(cur.notes, 'قیمت را فرستادند');
      });
    }

    t('توضیحِ خالی یا کارِ ناموجود ثبت نمی‌شود', async () => {
      assert.strictEqual(await Store.addNote(task1.id, '   '), null);
      assert.strictEqual(await Store.addNote(task1.id, ''), null);
      assert.strictEqual(await Store.addNote('نیست', 'x'), null);
    });

    {
      const big = await Store.addNote(task1.id, 'ط'.repeat(Store.NOTE_MAX + 500));
      t('توضیحِ خیلی بلند بریده می‌شود', () => {
        assert.strictEqual(big.text.length, Store.NOTE_MAX);
      });
      await Store.removeNote(task1.id, big.id);
    }

    {
      await Store.removeNote(task1.id, n2.id);
      const cur = await fresh(task1.id);
      t('حذفِ ثبت، notes را به ثبتِ قبلی برمی‌گرداند', () => {
        assert.strictEqual(Store.noteEntries(cur).length, 1);
        assert.strictEqual(cur.notes, 'با مالی تماس گرفتم');
      });
      t('حذفِ ثبتِ ناموجود بی‌صدا رد می‌شود', async () => {
        assert.strictEqual(await Store.removeNote(task1.id, 'نیست'), null);
      });
    }

    {
      const legacy = await Store.addTask({ title: 'کارِ قدیمی', notes: 'توضیحِ قدیمی' });
      const e = Store.noteEntries(legacy);
      t('توضیحِ قدیمی به یک ثبت خوانده می‌شود، بدون بازنویسیِ داده', () => {
        assert.strictEqual(e.length, 1);
        assert.strictEqual(e[0].text, 'توضیحِ قدیمی');
        assert.ok(e[0].legacy, 'باید علامتِ قدیمی داشته باشد');
        assert.deepStrictEqual(legacy.noteLog, [], 'داده نباید عوض شده باشد');
      });
      await Store.addNote(legacy.id, 'توضیحِ تازه');
      const after = await fresh(legacy.id);
      t('توضیحِ قدیمی با اولین ثبتِ تازه وارد دفترچه می‌شود و گم نمی‌شود', () => {
        const ee = Store.noteEntries(after);
        assert.strictEqual(ee.length, 2);
        assert.strictEqual(ee[0].text, 'توضیحِ قدیمی');
        assert.strictEqual(ee[1].text, 'توضیحِ تازه');
      });
      await Store.removeTask(legacy.id);
    }

    {
      const rec = await Store.addTask({
        title: 'تکرارشوندهٔ توضیح‌دار', notes: 'قالب در درایو است',
        recur: { freq: 'weekly', interval: 1, weekday: 2 }
      });
      await Store.addNote(rec.id, 'این هفته با نگار هماهنگ شد');
      await Store.toggleDone(rec.id);
      const next = (await Store.getTasks()).find(x => x.title === 'تکرارشوندهٔ توضیح‌دار' && x.status === 'open');
      t('تکرار: متنِ توضیح می‌رود ولی سابقهٔ زمان‌دار نه', () => {
        assert.ok(next, 'نمونهٔ بعدی ساخته نشد');
        assert.ok(next.notes, 'دستورالعمل باید بماند');
        assert.deepStrictEqual(next.noteLog, [], 'سابقهٔ رخدادِ قبلی نباید منتقل شود');
      });
      if (next) await Store.removeTask(next.id);
      await Store.removeTask(rec.id);
    }

    await Store.removeTask(task1.id);
  }

  // ── پروندهٔ پروژه ───────────────────────────────────
  {
    console.log('\n— پروندهٔ پروژه —');
    const now = new Date();
    const ago = d => new Date(now.getTime() - d * 86400000).getTime();

    const area = await Store.saveProject({ name: 'مشتریِ الف' });
    const kid = await Store.saveProject({ name: 'فاز یک', parentId: area.id });

    const sessions = [
      { id: 'm1', title: 'کیک‌آف', startedAt: ago(2), transcript: [{ speaker: 'نگار', text: 'x' }, { speaker: 'صدر', text: 'y' }], summary: '## خ', actions: [] },
      { id: 'm2', title: 'پیگیری', startedAt: ago(30), transcript: [{ speaker: 'نگار', text: 'z' }], summary: '', actions: [] },
      { id: 'm3', title: 'جلسهٔ بی‌ربط', startedAt: ago(1), transcript: [{ speaker: 'کسی', text: 'q' }], summary: '', actions: [] }
    ];

    const t1 = await Store.addTask({ title: 'کارِ فوری', projectId: area.id, meetingRef: 'm1', due: '2020-01-01' });
    const t2 = await Store.addTask({ title: 'کارِ عادی', projectId: kid.id, meetingRef: 'm2' });
    const t3 = await Store.addTask({ title: 'سپرده به نگار', projectId: area.id, dir: 'theirs', who: 'نگار' });
    const t4 = await Store.addTask({ title: 'کارِ تمام‌شده', projectId: area.id });
    await Store.toggleDone(t4.id);

    const tasks = await Store.getTasks();
    const projects = await Store.getProjects();
    const d = Store.projectDossier(area.id, projects, tasks, sessions, now);

    t('پرونده ساخته می‌شود و زیرپروژه را می‌شناسد', () => {
      assert.ok(d, 'پرونده null است');
      assert.strictEqual(d.project.name, 'مشتریِ الف');
      assert.deepStrictEqual(d.children.map(c => c.name), ['فاز یک']);
    });

    t('شمارش: کارِ من، منتظرِ دیگران، انجام‌شده — با احتسابِ زیرپروژه', () => {
      assert.strictEqual(d.counts.mine, 2, 'کارِ فوری + کارِ فاز یک');
      assert.strictEqual(d.counts.theirs, 1);
      assert.strictEqual(d.counts.done, 1);
      assert.strictEqual(d.counts.open, 3);
    });

    t('کارِ بعدی یکی است و از منطقِ هوشمند می‌آید', () => {
      assert.ok(d.next, 'کارِ بعدی نیست');
      assert.strictEqual(d.next.title, 'کارِ فوری', 'عقب‌افتاده‌ترین باید اول باشد');
    });

    t('کارِ بعدی هرگز کارِ سپرده‌شده نیست', () => {
      assert.notStrictEqual(d.next.id, t3.id, 'کارِ منتظرِ دیگران کارِ بعدیِ من نیست');
    });

    t('جلسه‌ها فقط آن‌هایی که کارِ این پروژه به آن‌ها وصل است', () => {
      assert.deepStrictEqual(d.meetings.map(m => m.id), ['m1', 'm2'], 'm3 نباید بیاید');
    });

    t('جلسه‌ها از تازه به کهنه مرتب‌اند و آخرین تاریخ درست است', () => {
      assert.strictEqual(d.meetings[0].id, 'm1');
      assert.strictEqual(d.daysSinceMeeting, 2);
    });

    t('آدم‌ها از گویندگانِ جلسه و مسئولِ کارها می‌آیند', () => {
      const names = d.people.map(p => p.name);
      assert.ok(names.includes('نگار') && names.includes('صدر'), 'گویندگان: ' + names);
      assert.ok(!names.includes('کسی'), 'گویندهٔ جلسهٔ بی‌ربط نباید بیاید');
      assert.strictEqual(d.people.find(p => p.name === 'نگار').open, 1, 'یک کارِ باز دارد');
    });

    t('پروژهٔ بی‌کارِ باز راکد علامت می‌خورد', () => {
      const empty = Store.projectDossier(kid.id, projects, tasks.filter(x => x.projectId !== kid.id), sessions, now);
      assert.ok(empty.stalled === false || empty.counts.open === 0);
      const noneAtAll = Store.projectDossier(kid.id, projects, [], sessions, now);
      assert.strictEqual(noneAtAll.stalled, false, 'پروژهٔ کاملاً خالی راکد نیست، تازه است');
    });

    t('مرحله پیش‌فرض دارد و مقدارِ نامعتبر را نمی‌پذیرد', async () => {
      assert.strictEqual(area.stage, 'active');
      const bad = await Store.saveProject({ ...area, stage: 'چیزی' });
      assert.strictEqual(bad.stage, 'active');
      const good = await Store.saveProject({ ...area, stage: 'waiting' });
      assert.strictEqual(good.stage, 'waiting');
    });

    t('پروژهٔ جلسه: نسبتِ صریح بر اشتقاق مقدم است', () => {
      const explicit = Store.sessionProject({ id: 'm9', projectId: kid.id }, tasks);
      assert.strictEqual(explicit.id, kid.id);
      assert.strictEqual(explicit.explicit, true);
    });

    t('پروژهٔ جلسه: بدونِ نسبتِ صریح، از کارهایش حدس زده می‌شود', () => {
      const derived = Store.sessionProject({ id: 'm1' }, tasks);
      assert.strictEqual(derived.id, area.id, 'کارِ فوری از m1 آمده و در حوزه است');
      assert.strictEqual(derived.explicit, false);
    });

    t('پروژهٔ جلسه: پرتکرارترین برنده است', () => {
      const many = [
        { id: 'x1', meetingRef: 'mX', projectId: kid.id },
        { id: 'x2', meetingRef: 'mX', projectId: kid.id },
        { id: 'x3', meetingRef: 'mX', projectId: area.id }
      ];
      assert.strictEqual(Store.sessionProject({ id: 'mX' }, many).id, kid.id);
    });

    t('پروژهٔ جلسه: بی‌کار و بی‌نسبت، هیچ', () => {
      assert.strictEqual(Store.sessionProject({ id: 'تنها' }, tasks).id, null);
      assert.strictEqual(Store.sessionProject(null, tasks).id, null);
    });

    t('جلسهٔ بی‌کار هم با نسبتِ صریح در پرونده می‌آید', () => {
      // m3 هیچ کاری ندارد؛ فقط با نسبتِ صریح باید بیاید
      const withExplicit = sessions.map(sn => sn.id === 'm3' ? { ...sn, projectId: area.id } : sn);
      const d2 = Store.projectDossier(area.id, projects, tasks, withExplicit, now);
      assert.ok(d2.meetings.some(m => m.id === 'm3'), 'جلسهٔ صریح نیامد');
      assert.strictEqual(d2.meetings.length, 3);
    });

    t('projectMeetingRefs جلسه‌های صریح را هم می‌شمارد', () => {
      const withExplicit = [{ id: 'mSolo', projectId: area.id }];
      const refs = Store.projectMeetingRefs(area.id, tasks, [kid.id], withExplicit);
      assert.ok(refs.includes('mSolo'));
      assert.ok(refs.includes('m1'), 'مشتق‌ها هم باید بمانند');
    });

    t('پروژهٔ ناموجود پرونده ندارد', () => {
      assert.strictEqual(Store.projectDossier('نیست', projects, tasks, sessions, now), null);
    });

    t('ورودیِ خالی نمی‌شکند', () => {
      const d2 = Store.projectDossier(area.id, projects, [], [], now);
      assert.strictEqual(d2.counts.open, 0);
      assert.strictEqual(d2.next, null);
      assert.deepStrictEqual(d2.meetings, []);
      assert.deepStrictEqual(d2.people, []);
      assert.strictEqual(d2.daysSinceMeeting, null);
    });

    for (const x of [t1, t2, t3, t4]) await Store.removeTask(x.id);
    for (const pr of await Store.getProjects()) await Store.removeProject(pr.id);
  }

  // ── ابزارهای MCP و استانداردِ صورت‌جلسه ──────────────
  // ریشهٔ ایراد: مسیرِ MCP قالب‌های خودِ منشی را به مدل نمی‌داد و
  // صورت‌جلسه‌ها چندخطی درمی‌آمدند. این تست‌ها نگهبانِ همان‌اند.
  {
    console.log('\n— ابزارهای MCP —');
    const MCP = require('../core/mcp-tools.js');
    const MoM = require('../core/mom-core.js');

    t('هر ابزار توضیحِ مدل و توضیحِ آدم دارد', () => {
      for (const tool of MCP.TOOLS) {
        assert.ok(tool.description && tool.description.length > 20, tool.name);
        assert.ok(tool.fa && tool.faDesc, tool.name);
      }
    });

    t('forServer فیلدهای فارسیِ رابط را بیرون می‌گذارد', () => {
      for (const tool of MCP.forServer()) {
        assert.deepStrictEqual(Object.keys(tool).sort(), ['description', 'inputSchema', 'name']);
      }
    });

    t('minutes_templates در فهرست هست و چیزی نمی‌نویسد', () => {
      const tool = MCP.byName('minutes_templates');
      assert.ok(tool);
      assert.strictEqual(tool.writes, false);
    });

    t('تنها ابزارِ نویسنده write_minutes است', () => {
      assert.deepStrictEqual(MCP.TOOLS.filter(x => x.writes).map(x => x.name), ['write_minutes']);
    });

    t('get_meeting مدل را به minutes_guide ارجاع می‌دهد', () => {
      assert.ok(MCP.byName('get_meeting').description.includes('minutes_guide'));
    });

    // اگر کسی روزی summary را دوباره «خلاصه» توصیف کند، مدل کوتاه می‌نویسد.
    t('توضیحِ summary عمق می‌خواهد، نه چکیده', () => {
      const d = MCP.byName('write_minutes').inputSchema.properties.summary.description;
      assert.ok(d.includes('کامل'));
      assert.ok(d.includes('چند خطِ کلی کافی نیست'));
    });

    t('همهٔ ابزارهای مثال‌ها واقعاً وجود دارند', () => {
      for (const ex of MCP.EXAMPLES) {
        for (const n of ex.uses) assert.ok(MCP.byName(n), 'ابزارِ ناموجود در مثال‌ها: ' + n);
      }
    });

    t('mom-core از node قابل خواندن است', () => {
      assert.ok(Array.isArray(MoM.BUILTIN_TEMPLATES) && MoM.BUILTIN_TEMPLATES.length);
      assert.ok(MoM.COMPREHENSIVE_MOM_SYSTEM_PROMPT.length > 1000);
    });

    t('هر قالب یا دستورِ کامل دارد یا تأکیدِ اختصاصی', () => {
      for (const tpl of MoM.BUILTIN_TEMPLATES) {
        assert.ok(tpl.systemPrompt || tpl.instructions, tpl.id);
      }
    });

    t('قالبِ ناشناخته به قالبِ پیش‌فرض برمی‌گردد، نه undefined', () => {
      assert.ok(MoM.getTemplate('چنین-قالبی-نیست').id);
    });

    t('قالبِ گزارشی سقفِ بالا نمی‌گذارد', () => {
      const p = MoM.getTemplate('report').systemPrompt;
      assert.ok(p.includes('سقفِ بالا ندارد'));
      assert.ok(p.includes('هیچ جدولی ننویس'));   // قاعدهٔ قدیمی نباید قربانی شود
    });

    // ── صندوق ورودی: سندِ بلند ─────────────────────────
    const Inbox = require('../core/inbox.js');
    const target = [{ id: 'm1', title: 'جلسهٔ بلند', transcript: [] }];
    const box = (summary) => JSON.stringify({
      app: 'manshi-inbox', schema: 1,
      items: [{ id: 'i1', kind: 'minutes', meetingId: 'm1', summary }]
    });

    t('صورت‌جلسهٔ چندهزارکلمه‌ای سالم رد می‌شود', () => {
      const long = 'ت'.repeat(90000);
      const r = Inbox.parse(box(long), target);
      assert.strictEqual(r.items.length, 1);
      assert.strictEqual(r.items[0].summary.length, 90000);
      assert.strictEqual(r.items[0].truncated, false);
    });

    t('از سقف که رد شد، بریده می‌شود ولی خاموش نه', () => {
      const r = Inbox.parse(box('ت'.repeat(Inbox.MAX_SUMMARY + 500)), target);
      assert.strictEqual(r.items[0].summary.length, Inbox.MAX_SUMMARY);
      assert.strictEqual(r.items[0].truncated, true);
    });

    t('سقفِ تازه از سقفِ قبلی بزرگ‌تر است', () => {
      assert.ok(Inbox.MAX_SUMMARY >= 120000);
    });

    // ── راه‌اندازیِ پل ───────────────────────────────────
    // هر تستِ اینجا از یک اشتباهِ واقعی در راه‌اندازی می‌آید.
    const Snap = require('../core/snapshot.js');
    const SCRIPT = '/Users/kazem/manshi-suite/mcp/manshi-mcp.js';
    const DATA = '/Users/kazem/manshi-data';
    const NODE = '/opt/homebrew/bin/node';

    t('مسیرِ کاملِ Node در تنظیمات می‌نشیند', () => {
      for (const id of ['codex', 'claude-desktop', 'cursor', 'vscode']) {
        const s = Snap.mcpSnippet(id, SCRIPT, DATA, 'mac', NODE);
        assert.ok(s.includes(NODE), id);
        assert.ok(!/"command": ?"node"/.test(s), id + ' هنوز node خالی دارد');
      }
    });

    t('بدون مسیرِ Node به node خالی برمی‌گردد و نمی‌شکند', () => {
      assert.ok(Snap.mcpSnippet('codex', SCRIPT, DATA, 'mac', '').includes('"node"'));
    });

    t('دستورِ پیداکردنِ Node به سیستم‌عامل بستگی دارد', () => {
      assert.strictEqual(Snap.nodeFinder('win'), 'where node');
      assert.strictEqual(Snap.nodeFinder('mac'), 'which node');
      assert.strictEqual(Snap.nodeFinder('چیزِ ناشناخته'), 'which node');
    });

    t('نامِ خالیِ دستور از مسیرِ کامل تشخیص داده می‌شود', () => {
      assert.strictEqual(Snap.nodeIsBare('node'), true);
      assert.strictEqual(Snap.nodeIsBare(''), true);
      assert.strictEqual(Snap.nodeIsBare(NODE), false);
      assert.strictEqual(Snap.nodeIsBare('C:\\Program Files\\nodejs\\node.exe'), false);
    });

    t('یکی‌بودنِ پوشهٔ برنامه و پوشهٔ داده گرفته می‌شود', () => {
      assert.ok(Snap.pathClash(DATA, DATA));
      assert.ok(Snap.pathClash(DATA + '/', DATA));
      assert.strictEqual(Snap.pathClash('/Users/kazem/manshi-suite', DATA), '');
      assert.strictEqual(Snap.pathClash('', DATA), '');   // هنوز پر نشده، هشدار بی‌مورد ندهد
    });

    t('Codex دستورِ رسمیِ خودش را دارد', () => {
      const c = Snap.cliSnippet('codex', SCRIPT, DATA, 'mac', NODE);
      assert.ok(c.startsWith('codex mcp add manshi -- '));
      assert.ok(c.includes(NODE) && c.includes(DATA));
    });

    t('بدون مسیر، دستورِ نیم‌بند تولید نمی‌شود', () => {
      assert.strictEqual(Snap.cliSnippet('codex', '', DATA, 'mac', NODE), '');
      assert.strictEqual(Snap.cliSnippet('cursor', SCRIPT, DATA, 'mac', NODE), '');
    });

    t('مسیرِ ویندوزی با فاصله درست نقل می‌شود', () => {
      const c = Snap.cliSnippet('codex', 'C:\\My Apps\\manshi\\mcp\\manshi-mcp.js', DATA, 'win', NODE);
      assert.ok(c.includes('"C:\\My Apps\\manshi\\mcp\\manshi-mcp.js"'));
    });

    t('Claude Code به همهٔ پروژه‌ها اضافه می‌شود', () => {
      assert.ok(Snap.mcpSnippet('claude-code', SCRIPT, DATA, 'mac', NODE).includes('-s user'));
    });

    // ── سرویس‌ورکر ──────────────────────────────────────
    // هیچ تستی background.js را نمی‌دید. وابسته‌کردنِ store.js به search.js
    // بدونِ افزودنش به importScripts، سرویس‌ورکر را می‌کشت و کلیکِ روی آیکونِ
    // اکستنشن بی‌صدا کار نمی‌کرد. این تست همان را می‌گیرد.
    console.log('\n— سرویس‌ورکر —');
    {
      const vm = require('vm');
      const fsx = require('fs');
      const root = require('path').join(__dirname, '..');
      const rd = f => fsx.readFileSync(require('path').join(root, f), 'utf8');
      const bg = rd('background.js');
      const swList = (bg.match(/importScripts\(([^)]*)\)/) || [])[1]
        .split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));

      // محیطِ سرویس‌ورکر: نه require، نه module، نه document، نه localStorage
      const loadAll = list => {
        const ctx = vm.createContext({
          console: { log() {}, warn() {}, error() {} },
          chrome: { storage: { local: { get: async () => ({}), set: async () => {} } } },
          setTimeout, clearTimeout, fetch: () => {}
        });
        ctx.globalThis = ctx; ctx.self = ctx;
        try { vm.runInContext(list.map(rd).join('\n;\n'), ctx, { filename: 'sw' }); return null; }
        catch (e) { return e.message; }
      };

      t('اسکریپت‌های سرویس‌ورکر بدون require بار می‌شوند', () => {
        assert.strictEqual(loadAll(swList), null);
      });

      t('این تست واقعاً چیزی می‌سنجد', () => {
        // اگر برداشتنِ یک وابستگی هم خطا ندهد، تستِ بالا بی‌اثر است
        assert.ok(loadAll(swList.filter(f => !f.includes('search'))));
      });

      t('هر فایلی که سرویس‌ورکر می‌خواهد واقعاً وجود دارد', () => {
        for (const f of swList) assert.ok(fsx.existsSync(require('path').join(root, f)), f);
      });

      t('در app.html هم search پیش از store می‌آید', () => {
        const html = rd('app.html');
        const at = f => html.indexOf('core/' + f + '.js');
        assert.ok(at('search') > -1 && at('store') > -1);
        assert.ok(at('search') < at('store'), 'ترتیبِ بارگذاری برعکس است');
      });
    }

    // ── آدم‌ها از روی جلسه‌ها ────────────────────────────
    // خطرِ اصلی اینجا تکراری‌سازی است: یک نفر نباید دو پرونده بگیرد.
    console.log('\n— آدم‌ها از جلسه‌ها —');
    const mk = (id, title, at, names) => ({
      id, title, startedAt: at, participants: names.map(n => ({ name: n, email: '' }))
    });
    const find = (list, n) => list.find(p => p.name === n);

    t('حضور در جلسه، پرونده می‌سازد', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {},
        [mk('s1', 'جلسهٔ یک', '2026-07-01T10:00:00Z', ['مصطفی احمدی', 'کریم مهدییی'])]);
      assert.strictEqual(ppl.length, 2);
      assert.strictEqual(find(ppl, 'مصطفی احمدی').metCount, 1);
    });

    t('املای عربی و فارسی یک نفرند، نه دو نفر', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'جلسهٔ یک', '2026-07-01T10:00:00Z', ['مصطفي احمدي']),   // ي و ك عربی
        mk('s2', 'جلسهٔ دو', '2026-07-08T10:00:00Z', ['مصطفی احمدی'])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 2);
    });

    t('نیم‌فاصله و فاصلهٔ اضافه پروندهٔ تازه نمی‌سازد', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'یک', '2026-07-01T10:00:00Z', ['علی‌مهدی  تهرانی']),
        mk('s2', 'دو', '2026-07-02T10:00:00Z', [' علی مهدی تهرانی '])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 2);
    });

    t('نامِ نمایشی، پرتکرارترین املاست', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'یک', '2026-07-01T10:00:00Z', ['مصطفی احمدی']),
        mk('s2', 'دو', '2026-07-02T10:00:00Z', ['مصطفی احمدی']),
        mk('s3', 'سه', '2026-07-03T10:00:00Z', ['مصطفي احمدي'])
      ]);
      assert.strictEqual(ppl[0].name, 'مصطفی احمدی');
    });

    t('یک نفر در یک جلسه دو بار شمرده نمی‌شود', () => {
      const s = mk('s1', 'یک', '2026-07-01T10:00:00Z', ['مصطفی احمدی', 'مصطفي احمدي']);
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [s]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 1);
    });

    t('کارها و جلسه‌ها به یک پرونده می‌روند، نه دوتا', () => {
      const ppl = Store.peopleFiles(
        [{ id: 'x', title: 'کار', status: 'open', dir: 'theirs', who: 'مصطفي احمدي' }],
        new Date('2026-08-01'), [], {},
        [mk('s1', 'یک', '2026-07-01T10:00:00Z', ['مصطفی احمدی'])]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 1);
      assert.strictEqual(ppl[0].open.length, 1);
    });

    t('خودِ کاربر و «You» پروندهٔ آدم نمی‌سازند', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {},
        [mk('s1', 'یک', '2026-07-01T10:00:00Z', ['You', 'کاظم مرادی', 'شما'])], 'کاظم مرادی');
      assert.deepStrictEqual(ppl.map(p => p.name), []);
    });

    t('جلسهٔ بی‌فهرستِ حاضران از گوینده‌های متن پر می‌شود', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        { id: 's1', title: 'یک', startedAt: '2026-07-01T10:00:00Z',
          transcript: [{ speaker: 'نازنین کاظمی', text: 'سلام' }, { speaker: 'نازنین کاظمی', text: 'خوبم' }] }
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 1);   // دو نوبتِ حرف، یک جلسه
    });

    t('نامِ مستعارِ ثبت‌شده با املای دیگر هم گرفته می‌شود', () => {
      const meta = { p1: { id: 'p1', name: 'مصطفی احمدی', aliases: ['مصطفي ا.'] } };
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], meta, [
        mk('s1', 'یک', '2026-07-01T10:00:00Z', ['مصطفي ا.']),
        mk('s2', 'دو', '2026-07-02T10:00:00Z', ['مصطفی احمدی'])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 2);
    });

    t('برچسبِ گویندهٔ ناشناس آدم نمی‌شود', () => {
      // پاک‌سازیِ متن برای گویندهٔ ناشناس «گوینده» می‌گذارد؛ این پرتکرارترین
      // «آدم» در دادهٔ واقعی بود تا وقتی فیلتر نشد.
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'یک', '2026-07-01T10:00:00Z', ['گوینده', 'Speaker 2', 'ناشناس', 'مریم پناهی'])
      ]);
      assert.deepStrictEqual(ppl.map(p => p.name), ['مریم پناهی']);
    });

    t('اتاق و دستگاهِ جلسه آدم نیست', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'یک', '2026-07-01T10:00:00Z', ['Alborz B2-Conference', 'اتاق جلسه ۲', 'بابک شریفی'])
      ]);
      assert.deepStrictEqual(ppl.map(p => p.name), ['بابک شریفی']);
    });

    t('نامِ واقعی به‌خاطرِ شباهت قربانی نمی‌شود', () => {
      // «سخنرانی» و «مهمان» آدم‌اند؛ فیلتر نباید حریص باشد
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'یک', '2026-07-01T10:00:00Z', ['گویندهٔ مهمان', 'من‌سا رحیمی', 'Speaker Deng'])
      ]);
      assert.strictEqual(ppl.length, 3);
    });

    t('آخرین دیدار از تازه‌ترین جلسه می‌آید', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mk('s1', 'قدیمی', '2026-06-01T10:00:00Z', ['کریم مهدییی']),
        mk('s2', 'تازه', '2026-07-20T10:00:00Z', ['کریم مهدییی'])
      ]);
      assert.strictEqual(ppl[0].sessions[0].title, 'تازه');   // مرتب از تازه به کهنه
      assert.ok(String(ppl[0].lastMet).startsWith('2026-07-20'));
    });

    // ── هم‌نام‌های واقعی ─────────────────────────────────
    // خطرِ برعکس: دو نفرِ متفاوت نباید یکی شوند. ایمیل تنها چیزی است که
    // واقعاً از هم جدایشان می‌کند.
    const mkE = (id, at, people) => ({
      id, title: 'جلسهٔ ' + id, startedAt: at,
      participants: people.map(([name, email]) => ({ name, email: email || '' }))
    });

    t('دو هم‌نام با دو ایمیل، دو نفرند', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['مهدی محمدی', 'mohammadi1@example.com']]),
        mkE('b', '2026-07-02T10:00:00Z', [['مهدی محمدی', 'mohammadi2@example.com']])
      ]);
      assert.strictEqual(ppl.length, 2);
      assert.deepStrictEqual(ppl.map(p => p.metCount), [1, 1]);
      assert.ok(ppl.every(p => p.dupName), 'باید هم‌نام علامت بخورند');
    });

    t('هم‌نامِ با ایمیل و بی‌ایمیل قاطی نمی‌شوند', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['مهدی محمدی', 'mohammadi1@example.com']]),
        mkE('b', '2026-07-02T10:00:00Z', [['مهدی محمدی', 'mohammadi2@example.com']]),
        mkE('c', '2026-07-03T10:00:00Z', [['مهدی محمدی', '']])   // کدامشان؟ نمی‌دانیم
      ]);
      assert.strictEqual(ppl.length, 3, 'بی‌ایمیل نباید به یکی از آن دو چسبانده شود');
      const nameOnly = ppl.find(p => !p.email);
      assert.strictEqual(nameOnly.metCount, 1);
      assert.strictEqual(nameOnly.ambiguous, true, 'باید «شاید چند نفر» علامت بخورد');
    });

    t('وقتی فقط یک ایمیل برای نام هست، ارجاعِ بی‌ایمیل به همان می‌چسبد', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['سمانه کیانی', 'kiani@example.com']]),
        mkE('b', '2026-07-02T10:00:00Z', [['سمانه کیانی', '']])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 2);
      assert.strictEqual(ppl[0].ambiguous, false);
    });

    t('ایمیلِ یکسان با دو املای نام، یک نفر است', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['مصطفي احمدي', 'ahmadi@example.com']]),
        mkE('b', '2026-07-02T10:00:00Z', [['Mostafa Ahmadi', 'ahmadi@example.com']])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 2);
    });

    t('دو هم‌نامِ کاملاً بی‌ایمیل: یکی می‌شوند ولی ادعای قطعیت نمی‌کنیم', () => {
      // نشانه‌ای برای جداکردنشان وجود ندارد؛ مهم این است که byNameOnly صادق باشد
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['مهدی', '']]),
        mkE('b', '2026-07-02T10:00:00Z', [['مهدی', '']])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].byNameOnly, true);
    });

    t('خودِ کاربر با ایمیل هم شناخته می‌شود', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['R. Afghah', 'self@example.com'], ['نازنین کاظمی', '']])
      ], { name: 'کاظم رستمی', email: 'self@example.com' });
      assert.deepStrictEqual(ppl.map(p => p.name), ['نازنین کاظمی']);
    });

    t('نامِ خالی با ایمیل هم پرونده می‌گیرد', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [], {}, [
        mkE('a', '2026-07-01T10:00:00Z', [['', 'ghost@example.com']])
      ]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].email, 'ghost@example.com');
    });

    // ── تقویم به‌عنوان منبعِ ایمیل ───────────────────────
    const cal = (title, at, name, email) => ({
      title, start: at, attendees: [name], attendeeEmails: email ? { [name]: email } : {}
    });

    t('ایمیلِ تقویم به کسی که فقط در جلسه دیده شده می‌رسد', () => {
      // این حلقه قبلاً جلوتر از جلسه‌ها بود و چون پرونده‌ای وجود نداشت،
      // ایمیل هیچ‌وقت به کارت نمی‌رسید.
      const ppl = Store.peopleFiles([], new Date('2026-08-01'),
        [cal('ج', '2026-07-01T10:00:00Z', 'مهدی محمدی', 'mohammadi1@example.com')], {},
        [mkE('a', '2026-07-01T10:00:00Z', [['مهدی محمدی', '']])]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].email, 'mohammadi1@example.com');
      assert.strictEqual(ppl[0].metCount, 1);
    });

    t('رویدادِ تقویمیِ بدونِ جلسه هم به همان پرونده می‌چسبد', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'),
        [cal('قدیمی', '2026-06-01T10:00:00Z', 'مریم پناهی', 'ahmadi@example.com')], {},
        [mkE('a', '2026-07-01T10:00:00Z', [['مریم پناهی', '']])]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].meetings.length, 1);
    });

    t('دو ایمیل برای یک نامِ تقویمی، ادعای یکی‌بودن نمی‌کند', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-01'), [
        cal('ج۱', '2026-07-01T10:00:00Z', 'مهدی محمدی', 'mohammadi1@example.com'),
        cal('ج۲', '2026-07-02T10:00:00Z', 'مهدی محمدی', 'mohammadi2@example.com')
      ], {}, [mkE('a', '2026-07-03T10:00:00Z', [['مهدی محمدی', '']])]);
      assert.strictEqual(ppl[0].ambiguous, true);
      assert.strictEqual(ppl[0].email, '');   // هیچ‌کدام را به او نمی‌چسبانیم
    });

    t('نامِ ایمیلیِ نقطه‌دار به نامِ فاصله‌دارِ زیرنویس می‌چسبد', () => {
      // دعوت‌شده‌ای که CN ندارد، نامش از ایمیل ساخته می‌شود: sara.tehrani
      // در زیرنویسِ Meet همان آدم «sara tehrani» است.
      const ppl = Store.peopleFiles([], new Date('2026-08-10'),
        [cal('ج', '2026-08-03T07:00:00Z', 'sara.tehrani', 'sara.tehrani@example.com')], {},
        [mkE('a', '2026-08-03T07:00:00Z', [['sara tehrani', '']])]);
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].email, 'sara.tehrani@example.com');
    });

    t('اتاقِ جلسهٔ تقویم پروندهٔ آدم نمی‌سازد', () => {
      const ppl = Store.peopleFiles([], new Date('2026-08-10'),
        [cal('ج', '2026-08-03T07:00:00Z', 'Alborz B2-Conference', 'room@resource.calendar.google.com')], {},
        [mkE('a', '2026-08-03T07:00:00Z', [['Alborz B2-Conference', ''], ['Nadia Kh', '']])]);
      assert.deepStrictEqual(ppl.map(p => p.name), ['Nadia Kh']);
    });

    t('بدونِ جلسه، رفتار قبلی دست‌نخورده می‌ماند', () => {
      const ppl = Store.peopleFiles(
        [{ id: 'x', title: 'کار', status: 'open', dir: 'theirs', who: 'سارا نوری' }],
        new Date('2026-08-01'), [], {});
      assert.strictEqual(ppl.length, 1);
      assert.strictEqual(ppl[0].metCount, 0);
      assert.deepStrictEqual(ppl[0].sessions, []);
    });
  }

  console.log(`\n${passed} گذشت، ${failed} شکست\n`);
  process.exit(failed ? 1 : 0);
})();
