// وردست — دریافت و تجزیهٔ تقویم iCal (آدرس مخفی گوگل‌کلندر)
// پشتیبانی حداقلی از RRULE (روزانه/هفتگی) برای جلسات تکرارشونده؛ کافی برای پنجرهٔ ۱۴ روزه.
const ICS = (() => {
  function unfold(text) {
    return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  }

  function parseDT(value, params) {
    // VALUE=DATE → رویداد تمام‌روز
    if ((params.VALUE === 'DATE') || /^\d{8}$/.test(value)) {
      const y = +value.slice(0, 4), m = +value.slice(4, 6), d = +value.slice(6, 8);
      return { date: new Date(y, m - 1, d), allDay: true };
    }
    const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
    if (!m) return null;
    const [, y, mo, d, h, mi, s, z] = m;
    // زمان‌های TZID محلی فرض می‌شوند (برای کاربری که در همان منطقهٔ زمانی تقویم است)
    const date = z === 'Z'
      ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
      : new Date(+y, +mo - 1, +d, +h, +mi, +s);
    return { date, allDay: false };
  }

  function parseLine(line) {
    const idx = line.indexOf(':');
    if (idx === -1) return null;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [name, ...paramParts] = left.split(';');
    const params = {};
    for (const p of paramParts) {
      const [k, v] = p.split('=');
      params[k] = v;
    }
    return { name: name.toUpperCase(), params, value };
  }

  function parseRRule(value) {
    const rule = {};
    for (const part of value.split(';')) {
      const [k, v] = part.split('=');
      rule[k] = v;
    }
    return rule;
  }

  const ICAL_DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  // بازگشاییِ escape استاندارد ICS: \n → خط جدید، \, \; \\ → کاراکتر خودشان
  function unescapeIcs(value) {
    return String(value || '').replace(/\\([nN,;\\])/g, (_, c) => (c === 'n' || c === 'N') ? '\n' : c);
  }

  const MEET_RE = /https:\/\/(?:meet\.google\.com|[\w.-]*zoom\.us|teams\.microsoft\.com)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+=%]*/;
  function findMeetLink(ev) {
    // X-GOOGLE-CONFERENCE تمیزترین منبع است؛ اول آن، بعد location، بعد description
    for (const source of [ev._conference, ev._location, ev._description]) {
      if (!source) continue;
      const m = source.match(MEET_RE);
      if (m) return m[0].replace(/[.,)]+$/, ''); // فقط کاراکترهای مجاز URL؛ در برابر RTL/فارسی/بک‌اسلش متوقف
    }
    return null;
  }

  // خروجی: رویدادهای داخل بازه [from, to) مرتب‌شده بر اساس شروع
  function parse(text, from, to) {
    const lines = unfold(text).split('\n');
    const events = [];
    let cur = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (line === 'BEGIN:VEVENT') { cur = { exdates: new Set(), attendees: [], attendeeEmails: {} }; continue; }
      if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
      if (!cur) continue;
      const p = parseLine(line);
      if (!p) continue;
      switch (p.name) {
        case 'UID': cur.uid = p.value.trim(); break;
        // نمونهٔ تغییریافته یا لغوشدهٔ یک سریِ تکرارشونده؛ باید جای نمونهٔ تولیدی RRULE را بگیرد
        case 'RECURRENCE-ID': { const dt = parseDT(p.value, p.params); if (dt) cur.recurrenceId = dt.date; break; }
        case 'DTSTART': cur.start = parseDT(p.value, p.params); break;
        case 'DTEND': cur.end = parseDT(p.value, p.params); break;
        case 'SUMMARY': cur.title = unescapeIcs(p.value).replace(/\n/g, ' ').trim(); break;
        case 'LOCATION': cur._location = unescapeIcs(p.value); break;
        case 'DESCRIPTION': cur._description = unescapeIcs(p.value).slice(0, 2000); break;
        case 'X-GOOGLE-CONFERENCE': cur._conference = p.value; break;
        case 'RRULE': cur.rrule = parseRRule(p.value); break;
        case 'STATUS': cur.status = p.value; break;
        case 'ATTENDEE': {
          const email = (p.value.replace(/^mailto:/i, '').trim().match(/[^\s@]+@[^\s@]+/) || [''])[0];
          const name = p.params.CN
            ? p.params.CN.replace(/^"|"$/g, '').trim()
            : (email.split('@')[0] || '').trim();
          if (name && cur.attendees.length < 30 && !cur.attendees.includes(name)) {
            cur.attendees.push(name);
            if (email) cur.attendeeEmails[name] = email;
          }
          break;
        }
        case 'EXDATE': {
          const dt = parseDT(p.value, p.params);
          if (dt) cur.exdates.add(dt.date.toDateString());
          break;
        }
      }
    }

    // گوگل نمونهٔ تغییریافته یا لغوشدهٔ یک سری را به‌صورت VEVENT جداگانه با همان UID و یک
    // RECURRENCE-ID می‌فرستد. اگر این‌ها را نشناسیم، هم نمونهٔ RRULE و هم نمونهٔ جداگانه ثبت
    // می‌شوند → جلسه دوبار دیده می‌شود؛ و نمونهٔ لغوشده هم همچنان نمایش داده می‌شود.
    const overridden = new Map();
    for (const ev of events) {
      if (!ev.uid || !ev.recurrenceId) continue;
      if (!overridden.has(ev.uid)) overridden.set(ev.uid, new Set());
      overridden.get(ev.uid).add(ev.recurrenceId.toDateString());
    }

    const out = [];
    const seen = new Set();
    for (const ev of events) {
      if (!ev.start || !ev.title || ev.status === 'CANCELLED') continue;
      const durMs = ev.end ? ev.end.date - ev.start.date : 3600000;
      const push = startDate => {
        if (startDate >= to || startDate < from) return;
        if (ev.exdates.has(startDate.toDateString())) return;
        // آخرین سد در برابر تکرار: یک عنوان در یک زمانِ مشخص فقط یک بار
        const key = startDate.toISOString() + '|' + ev.title;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          start: startDate.toISOString(),
          end: new Date(startDate.getTime() + durMs).toISOString(),
          title: ev.title,
          allDay: !!ev.start.allDay,
          meet: findMeetLink(ev),
          attendees: ev.attendees || [],
          attendeeEmails: ev.attendeeEmails || {}
        });
      };

      if (!ev.rrule) { push(ev.start.date); continue; }

      const freq = ev.rrule.FREQ;
      if (freq !== 'WEEKLY' && freq !== 'DAILY') { push(ev.start.date); continue; }
      const interval = Math.max(1, +(ev.rrule.INTERVAL || 1));
      let until = to;
      if (ev.rrule.UNTIL) {
        const u = parseDT(ev.rrule.UNTIL, {});
        if (u) until = new Date(Math.min(until, u.date.getTime() + 86400000));
      }
      const byday = freq === 'WEEKLY' && ev.rrule.BYDAY
        ? ev.rrule.BYDAY.split(',').map(d => ICAL_DAYS[d]).filter(d => d !== undefined)
        : [ev.start.date.getDay()];

      // COUNT از DTSTART شمرده می‌شود — بدون آن، سریِ تمام‌شده تا ابد نمونه می‌سازد
      // و جلسه‌ای که دیگر وجود ندارد در تقویم می‌ماند.
      const count = ev.rrule.COUNT ? Math.max(1, +ev.rrule.COUNT) : Infinity;
      const skipDates = overridden.get(ev.uid);

      // از شروع رویداد تا سقف بازه، روزبه‌روز جلو می‌رویم (بازهٔ کوتاه است؛ هزینهٔ ناچیز)
      const cursor = new Date(ev.start.date);
      const baseWeek = weekNumber(ev.start.date);
      let guard = 0, made = 0;
      while (cursor < until && guard++ < 1000 && made < count) {
        const match = freq === 'DAILY'
          ? Math.round((dayStart(cursor) - dayStart(ev.start.date)) / 86400000) % interval === 0
          : byday.includes(cursor.getDay()) && (weekNumber(cursor) - baseWeek) % interval === 0;
        if (match && cursor >= ev.start.date) {
          made++;
          // این تاریخ نمونهٔ جداگانه دارد (جابه‌جا یا لغو شده) → نسخهٔ RRULE نباید ساخته شود
          if (!skipDates || !skipDates.has(cursor.toDateString())) push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    out.sort((a, b) => a.start.localeCompare(b.start));
    return out;
  }

  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function weekNumber(d) {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    start.setDate(start.getDate() - start.getDay());
    return Math.floor(start.getTime() / (7 * 86400000));
  }

  // دریافت و کش؛ پنجرهٔ ۱۴ روزه از دیروز
  async function refresh(icsUrl) {
    const from = new Date(); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
    const to = new Date(); to.setDate(to.getDate() + 14);
    const res = await fetch(icsUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('پاسخ تقویم: ' + res.status);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('پاسخ دریافتی iCal نیست — آدرس را بررسی کنید');
    return parse(text, from, to);
  }

  return { parse, refresh };
})();

if (typeof module !== 'undefined') module.exports = ICS;
