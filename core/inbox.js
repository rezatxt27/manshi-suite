// منشی — صندوق ورودی: راهِ برگشتِ داده از ابزارهای بیرونی.
//
// سرور MCP نمی‌تواند در chrome.storage.local بنویسد، ولی می‌تواند در همان پوشه‌ای
// که snapshot.json آنجاست یک inbox.json بگذارد. منشی آن را می‌خواند، نشان می‌دهد،
// و فقط با تأییدِ کاربر اعمال می‌کند.
//
// ── قاعدهٔ بنیادی ────────────────────────────────────
// این فایل **ورودیِ نامعتمد** است. هر برنامه‌ای روی دستگاه می‌تواند در آن پوشه
// بنویسد؛ پس هرچه از اینجا می‌آید مثل فایلِ واردشده از بیرون پاک‌سازی می‌شود:
// نوع، طول، و وجودِ جلسهٔ مقصد همه بررسی می‌شوند و هیچ‌چیز خودکار اعمال نمی‌شود.
const Inbox = (() => {
  const SCHEMA = 1;
  const APP = 'manshi-inbox';

  // سقف‌ها: هم جلوی فایلِ بدخواه را می‌گیرند هم جلوی خروجیِ خراب مدل
  const MAX_ITEMS = 200;
  // جلسهٔ سه‌ساعته صورت‌جلسهٔ چندهزارکلمه‌ای دارد و ۲۰ هزار نویسه از وسط
  // قیچی‌اش می‌کرد. سقف می‌ماند — این فایل نامعتمد است — ولی جایی که
  // به سندِ واقعی نخورد. ۱۲۰ هزار نویسه ≈ حدود بیست‌هزار کلمهٔ فارسی.
  const MAX_SUMMARY = 120000;
  const MAX_ACTIONS = 100;
  const MAX_TEXT = 500;
  const MAX_NAME = 100;

  // کاراکترهای کنترلیِ نامرئی حذف می‌شوند. با کدِ گریز نوشته شده‌اند و نه بایتِ
  // خام، وگرنه گیت فایل را باینری می‌بیند و دیگر diff نشان نمی‌دهد.
  // \t و \n و \r عمداً می‌مانند، چون صورت‌جلسه چندخطی است.
  const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
  function str(v, cap) {
    if (typeof v !== 'string') return '';
    return v.replace(CTRL, '').slice(0, cap);
  }

  function cleanAction(a) {
    if (!a || typeof a !== 'object') return null;
    const text = str(a.text, MAX_TEXT).trim();
    if (!text) return null;
    return {
      text,
      owner: str(a.owner, MAX_NAME).trim(),
      due: typeof a.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.due) ? a.due : null,
      deadline: str(a.deadline, MAX_NAME).trim()
    };
  }

  const hasMinutes = s => !!(s && (String(s.summary || '').trim()
    || (Array.isArray(s.actions) && s.actions.length)));

  // parse(raw, sessions) → { ok, items, skipped, error }
  //   items[i].state:  'new'      جلسه خالی است، بی‌خطر
  //                    'conflict' جلسه از قبل صورت‌جلسه دارد ← بازنویسیِ خاموش ممنوع
  //   موردهایی که جلسه‌شان پیدا نشود اصلاً وارد فهرست نمی‌شوند (شمرده می‌شوند).
  function parse(raw, sessions) {
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (e) { return { ok: false, items: [], skipped: 0, error: 'فایل صندوق ورودی خوانده نشد (JSON خراب است)' }; }

    if (!obj || typeof obj !== 'object') return { ok: false, items: [], skipped: 0, error: 'ساختار فایل درست نیست' };
    if (obj.app !== APP) return { ok: false, items: [], skipped: 0, error: 'این فایل صندوق ورودیِ منشی نیست' };
    if (!Array.isArray(obj.items)) return { ok: false, items: [], skipped: 0, error: 'فهرست موردها پیدا نشد' };

    const byId = new Map();
    for (const s of sessions || []) if (s && s.id) byId.set(s.id, s);

    const items = [];
    let skipped = 0;

    for (const rawItem of obj.items.slice(0, MAX_ITEMS)) {
      if (!rawItem || typeof rawItem !== 'object') { skipped++; continue; }
      if (rawItem.kind !== 'minutes') { skipped++; continue; }

      const meetingId = str(rawItem.meetingId, 120);
      const target = byId.get(meetingId);
      if (!target) { skipped++; continue; }   // جلسه‌ای که وجود ندارد = دور ریخته می‌شود

      // بریدنِ خاموش بدترین حالت است: کاربر سندی را تأیید می‌کند که آخرش
      // نیست و هیچ نشانه‌ای هم ندارد. پس اگر بریدیم، می‌گوییم.
      const rawSummary = typeof rawItem.summary === 'string' ? rawItem.summary : '';
      const truncated = rawSummary.length > MAX_SUMMARY;
      const summary = str(rawItem.summary, MAX_SUMMARY).trim();
      const actions = Array.isArray(rawItem.actions)
        ? rawItem.actions.slice(0, MAX_ACTIONS).map(cleanAction).filter(Boolean)
        : [];
      if (!summary && !actions.length) { skipped++; continue; }   // مورد تهی

      items.push({
        id: str(rawItem.id, 120) || ('in' + items.length),
        meetingId,
        title: str(target.title, 300) || 'جلسهٔ بی‌عنوان',
        startedAt: target.startedAt || null,
        summary,
        actions,
        by: str(rawItem.by, 60),
        createdAt: str(rawItem.createdAt, 40),
        truncated,
        state: hasMinutes(target) ? 'conflict' : 'new'
      });
    }

    return { ok: true, items, skipped, error: '' };
  }

  // آنچه واقعاً روی جلسه می‌نشیند — نه یک کاراکتر بیشتر.
  // analysisError پاک می‌شود چون صورت‌جلسهٔ تازه، شکستِ قبلی را بی‌اثر می‌کند.
  function patchFor(item) {
    return {
      summary: item.summary,
      actions: item.actions,
      analysisError: '',
      updatedAt: Date.now()
    };
  }

  // پس از اعمال، همان موردها از فایل برداشته می‌شوند تا دوباره پیشنهاد نشوند.
  function remaining(raw, appliedIds) {
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { obj = null; }
    const done = new Set(appliedIds || []);
    const items = (obj && Array.isArray(obj.items) ? obj.items : [])
      .filter(x => x && !done.has(x.id));
    return { app: APP, schema: SCHEMA, items };
  }

  const empty = () => ({ app: APP, schema: SCHEMA, items: [] });

  return {
    APP, SCHEMA, MAX_ITEMS, MAX_SUMMARY, MAX_ACTIONS, MAX_TEXT,
    parse, patchFor, remaining, empty,
    _cleanAction: cleanAction, _hasMinutes: hasMinutes
  };
})();

if (typeof module !== 'undefined') module.exports = Inbox;
