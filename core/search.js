// منشی — جست‌وجو و پرسش‌وپاسخ روی همهٔ جلسه‌ها
// دو حالت: (۱) جست‌وجوی کلیدواژه‌ای بدون هوش مصنوعی، (۲) پرسش با هوش مصنوعی که
// پاسخ را فقط از روی همین قطعاتِ بازیابی‌شده می‌سازد و به هرکدام ارجاع می‌دهد.
// هستهٔ بازیابی عمداً خالص و بدون DOM است تا قابل‌تست باشد؛ کیفیتِ پاسخ مستقیماً
// به کیفیتِ همین بازیابی وابسته است.
const MeetSearch = (() => {
  const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';

  // یکسان‌سازی: رقم فارسی/عربی → لاتین، ي/ك عربی → ی/ک، حذف نیم‌فاصله و اعراب
  function norm(value) {
    return String(value || '')
      .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
      .replace(/[ىيﻯﻰﻱﻲ]/g, 'ی')
      .replace(/[كﻙﻚ]/g, 'ک')
      .replace(/[‌‏‎]/g, ' ')
      .replace(/[ً-ْ]/g, '')
      .toLowerCase();
  }

  // واژه‌های پرتکرارِ بی‌معنا که اگر امتیاز بگیرند، نتیجه را خراب می‌کنند
  const STOP = new Set(('و در به از که را با این آن یک برای تا هم می نمی است بود شد شود' +
    ' کن کنم کنی کند کنید باید خیلی چه چی چرا کی کجا آیا یا ولی اما پس اگر بله نه' +
    ' من تو او ما شما آنها ایشان خود خودم خودت هر همه هیچ دیگر وقتی چون مثل روی' +
    ' بر بی هست هستم هستی هستند دارد دارم داری داریم دارند داشت داشته کرد کرده' +
    ' the a an of to in on for and or is was be it that this we you they).').split(/\s+/));

  // فهرستِ صریحِ حروف: علائمِ فارسی (؟ ، ؛ ٪ ـ …) داخل همان بلوکِ یونیکدِ حروف‌اند،
  // پس با «هرچه حرف نیست» نمی‌شود جداشان کرد و «شد؟» یک واژه می‌ماند.
  const LETTER = '[a-z0-9\\u0621-\\u063A\\u0641-\\u064A\\u0670-\\u0673\\u067E\\u0686\\u0698\\u06A9\\u06AF\\u06CC\\u06D5]';
  const NOT_LETTER = new RegExp(`(?!${LETTER})[\\s\\S]`, 'g');

  function tokenize(value) {
    return norm(value).replace(NOT_LETTER, ' ').split(/\s+/)
      .filter(t => t.length >= 2 && !STOP.has(t));
  }

  const fmtDate = (ms) => {
    try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(ms); }
    catch (_) { return ''; }
  };
  const sessionTime = (s) => {
    const v = s && s.startedAt;
    if (typeof v === 'number') return v;
    const t = v ? new Date(v).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };

  // هر جلسه به قطعه‌های قابل‌ارجاع شکسته می‌شود: خطوط گفت‌وگو (با شمارهٔ T) و
  // بخش‌های صورت‌جلسه. هر قطعه می‌داند از کجا آمده تا ارجاع قابل‌کلیک باشد.
  function passagesOf(session, { maxChars = 700 } = {}) {
    const out = [];
    const rows = Array.isArray(session.transcript) ? session.transcript : [];
    let buf = [], bufLen = 0, startRef = 1;
    const flush = () => {
      if (!buf.length) return;
      out.push({
        sessionId: session.id,
        title: session.title || 'جلسهٔ بدون عنوان',
        at: sessionTime(session),
        kind: 'transcript',
        ref: startRef,
        text: buf.join('\n')
      });
      buf = []; bufLen = 0;
    };
    rows.forEach((r, i) => {
      const line = `${(r && r.speaker) || 'گوینده'}: ${(r && r.text) || ''}`.trim();
      if (!line) return;
      if (!buf.length) startRef = i + 1;
      if (bufLen + line.length > maxChars) flush();
      if (!buf.length) startRef = i + 1;
      buf.push(line); bufLen += line.length + 1;
    });
    flush();

    // صورت‌جلسه هم قابل‌جست‌وجوست — اغلب جمع‌بندیِ دقیق‌تری از خودِ گفت‌وگو دارد
    const summary = String(session.summary || '').trim();
    if (summary) {
      for (const part of summary.split(/\n(?=#{1,3}\s)/)) {
        const text = part.trim();
        if (text.length < 20) continue;
        out.push({
          sessionId: session.id, title: session.title || 'جلسهٔ بدون عنوان',
          at: sessionTime(session), kind: 'mom', ref: 0,
          text: text.slice(0, 1400)
        });
      }
    }
    return out;
  }

  // امتیازدهی: پوششِ واژه‌های پرسش مهم‌تر از تکرار است — قطعه‌ای که ۳ واژهٔ متفاوتِ
  // پرسش را دارد بهتر از قطعه‌ای است که یک واژه را ۱۰ بار تکرار کرده.
  function scorePassage(passage, tokens, titleTokens) {
    if (!tokens.length) return 0;
    const body = norm(passage.text);
    const title = norm(passage.title);
    let covered = 0, hits = 0, inTitle = 0;
    for (const tok of tokens) {
      let n = 0, from = 0;
      while (true) {
        const at = body.indexOf(tok, from);
        if (at === -1) break;
        n++; from = at + tok.length;
        if (n >= 8) break;
      }
      if (n) { covered++; hits += Math.min(n, 4); }
      if (title.includes(tok)) inTitle++;
    }
    if (!covered && !inTitle) return 0;
    const coverage = covered / tokens.length;
    return coverage * 100 + hits * 2 + inTitle * 12 + (passage.kind === 'mom' ? 4 : 0);
  }

  // بازیابی: بهترین قطعه‌ها از همهٔ جلسه‌ها، با سقفِ نویسه تا درخواست از سرویس نترکد
  function retrieve(sessions, query, { limit = 12, maxChars = 12000, perSession = 3 } = {}) {
    const tokens = [...new Set(tokenize(query))];
    if (!tokens.length) return { tokens, sources: [] };
    const scored = [];
    for (const s of (sessions || [])) {
      for (const p of passagesOf(s)) {
        const score = scorePassage(p, tokens, null);
        if (score > 0) scored.push({ ...p, score });
      }
    }
    scored.sort((a, b) => b.score - a.score || b.at - a.at);

    const perCount = new Map();
    const picked = [];
    let total = 0;
    for (const p of scored) {
      const used = perCount.get(p.sessionId) || 0;
      if (used >= perSession) continue;
      if (total + p.text.length > maxChars) continue;
      perCount.set(p.sessionId, used + 1);
      picked.push(p); total += p.text.length;
      if (picked.length >= limit) break;
    }
    return { tokens, sources: picked.map((p, i) => ({ ...p, n: i + 1, date: fmtDate(p.at) })) };
  }

  // نتایجِ حالتِ بدون هوش مصنوعی: گروه‌بندی‌شده بر اساس جلسه، با تکهٔ متنِ منطبق
  function keywordResults(sessions, query, { limit = 40 } = {}) {
    const tokens = [...new Set(tokenize(query))];
    if (!tokens.length) return { tokens, groups: [] };
    const bySession = new Map();
    for (const s of (sessions || [])) {
      const rows = Array.isArray(s.transcript) ? s.transcript : [];
      const hits = [];
      rows.forEach((r, i) => {
        const text = String((r && r.text) || '');
        const hay = norm(text);
        const matched = tokens.filter(t => hay.includes(t));
        if (!matched.length) return;
        hits.push({ ref: i + 1, speaker: (r && r.speaker) || 'گوینده', text, matched: matched.length });
      });
      const titleHit = tokens.some(t => norm(s.title).includes(t));
      if (!hits.length && !titleHit) continue;
      hits.sort((a, b) => b.matched - a.matched || a.ref - b.ref);
      bySession.set(s.id, {
        sessionId: s.id, title: s.title || 'جلسهٔ بدون عنوان',
        at: sessionTime(s), date: fmtDate(sessionTime(s)),
        titleHit, total: hits.length, hits: hits.slice(0, 4)
      });
    }
    const groups = [...bySession.values()]
      .sort((a, b) => (b.total + (b.titleHit ? 2 : 0)) - (a.total + (a.titleHit ? 2 : 0)) || b.at - a.at)
      .slice(0, limit);
    return { tokens, groups };
  }

  const QA_SYSTEM = `تو دستیارِ آرشیوِ جلسه‌های کاربر هستی. به سؤال او فقط و فقط بر اساس «منابع» زیر پاسخ بده.

## قواعد
- هیچ چیزی خارج از منابع ننویس. حدس نزن، از دانش عمومی‌ات استفاده نکن.
- اگر منابع پاسخ را ندارند، صریح بنویس «در جلسه‌های ثبت‌شده چیزی دربارهٔ این پیدا نشد» و بگو چه چیزی لازم بود.
- اگر منابع ناقص‌اند یا فقط بخشی از پاسخ را دارند، همان بخش را بده و بگو چه چیزی معلوم نیست.
- هر ادعا را با شمارهٔ منبع مستند کن، به شکل [۱] یا [۲][۳] بلافاصله بعد از جمله.
- اگر منابع با هم تناقض دارند، هر دو را بیاور و تناقض را نشان بده — یکی را انتخاب نکن.
- اگر موضوع در چند جلسه دنبال شده، ترتیب زمانی و سیرِ تغییر را توضیح بده (چه چیزی کِی تصمیم شد و بعد چه شد).
- لحن حرفه‌ای، مستقیم و بدون مقدمه‌چینی. عددها و تاریخ‌ها فارسی.

## ساختار پاسخ
یک پاسخِ مستقیم در ابتدا (۱ تا ۳ جمله، با ارجاع).
اگر لازم بود، بعدش جزئیات یا سیر زمانی به‌صورت بند یا فهرست کوتاه — باز هم با ارجاع.
اگر چیزی معلوم نیست، در انتها یک خط «آنچه معلوم نشد: …».
جدول نساز.`;

  function buildQaPrompt(query, sources) {
    const blocks = sources.map(s =>
      `[${s.n}] جلسه: ${s.title} — ${s.date}\n${s.text}`
    ).join('\n\n---\n\n');
    return {
      system: QA_SYSTEM,
      user: `سؤال کاربر: ${query}\n\n## منابع (${sources.length} قطعه از آرشیو جلسه‌ها)\n\n${blocks}`
    };
  }

  // شماره‌های ارجاع در پاسخ، برای ساختنِ چیپ‌های قابل‌کلیک
  function citedNumbers(answer) {
    const out = new Set();
    const text = norm(answer);
    for (const m of text.matchAll(/\[(\d+)\]/g)) {
      const n = +m[1];
      if (n >= 1) out.add(n);
    }
    return [...out].sort((a, b) => a - b);
  }

  return { norm, tokenize, passagesOf, scorePassage, retrieve, keywordResults, buildQaPrompt, citedNumbers, QA_SYSTEM };
})();

if (typeof module !== 'undefined') module.exports = MeetSearch;
