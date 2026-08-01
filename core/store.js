// وردست — لایهٔ داده روی chrome.storage.local
// در حالت پیش‌نمایش (خارج از اکستنشن) از localStorage استفاده می‌کند تا UI قابل توسعه و تست باشد.
const Store = (() => {
  const J = typeof Jalali !== 'undefined' ? Jalali : require('./jalali.js');
  const DP = typeof DateParser !== 'undefined' ? DateParser : require('./date-parser.js');
  const isExt = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
  const newId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const SECRET_KEYS = ['icsUrl', 'aiKey'];

  const storage = isExt ? {
    get: keys => chrome.storage.local.get(keys),
    set: obj => chrome.storage.local.set(obj)
  } : {
    get: async keys => {
      const out = {};
      for (const k of Array.isArray(keys) ? keys : [keys]) {
        const raw = localStorage.getItem(k);
        if (raw !== null) out[k] = JSON.parse(raw);
      }
      return out;
    },
    set: async obj => {
      for (const [k, v] of Object.entries(obj)) localStorage.setItem(k, JSON.stringify(v));
    }
  };

  const DEFAULT_SETTINGS = {
    icsUrl: '',            // آدرس مخفی iCal — مثل رمز عبور با آن رفتار می‌شود؛ هرگز در لاگ/خروجی نمی‌آید
    aiProfiles: [],        // [{ id, name, provider, baseUrl, key, model }] — چند اتصال هوش مصنوعی
    activeAiId: '',        // شناسهٔ پروفایل فعال
    aiBaseUrl: '', aiKey: '', aiModel: '', // میراث تک‌اتصالی؛ برای مهاجرت خودکار
    monshiId: '',          // شناسهٔ اکستنشن منشی برای پل امن
    momTemplates: [],      // قالب‌های سفارشی صورت‌جلسه [{id,name,description,instructions}]
    dayEndHour: 17,
    theme: 'auto',         // auto | dark | light
    userName: '',
    userEmail: '',         // برای وصل‌کردن «You»ی زیرنویس به خودِ کاربر
    clockZones: [],        // شهرهایی که ساعتشان در سربرگ دیده می‌شود
    newsOn: false,         // فید اخبار — پیش‌فرض خاموش (وعدهٔ «همه‌چیز محلی»)
    newsSources: ['zoomit', 'digiato'],
    kioskCards: ['calendar', 'beyt'],  // کارت‌های روشنِ صفحهٔ کیوسک
    prayerCity: 'تهران',               // مبنای محاسبهٔ اوقات شرعی (آفلاین)
    weatherOn: false,                  // آب‌وهوا — درخواست بیرونی، پس پیش‌فرض خاموش
    weatherCities: ['تهران'],          // شهرهایی که آب‌وهوایشان دیده می‌شود
    quotesOn: false,                   // گرفتن نقل‌قول تازه از اینترنت — پیش‌فرض خاموش
    quotesCache: [],                   // نقل‌قول‌های گرفته‌شده، محلی ذخیره می‌مانند
    quotesFetchedAt: 0,
    focusSession: null,                // تایمر تمرکزِ در جریان
    focusLog: null,                    // { day, rounds, minutes } — جمعِ امروز
    customFeeds: [],                   // منبع‌های خبرِ دستیِ کاربر
    updateCheckOn: true,               // تنها درخواستی که پیش‌فرض روشن است — قابل خاموش‌کردن
    updateCheckedAt: 0,                // آخرین باری که نسخه بررسی شد
    updateSeen: '',                    // نسخه‌ای که کاربر بنرش را بسته
    lastRelease: null,                 // آخرین ریلیزِ دیده‌شده
    looseDismissed: {}     // سرِنخ‌های «از جلسه‌ها چه ماند» که کاربر نادیده گرفته: { کلید: زمان }
  };

  // ── نادیده‌گرفتنِ سرِنخ‌ها ────────────────────────────
  // هر مورد کلیدِ خودش را دارد، نه کلِ ردیف؛ پس موردِ تازه دوباره دیده می‌شود.
  // بعد از ۳۰ روز کلید پاک می‌شود تا فهرست بی‌نهایت بزرگ نشود.
  const LOOSE_TTL = 30 * 86400000;
  function hash32(str) {
    const s = String(str);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // looseKey('a', sessionId, text) → 'a:1q2w3e'
  function looseKey(kind, ...parts) { return kind + ':' + hash32(parts.join('\u0000')); }

  function pruneLoose(map, now) {
    for (const k of Object.keys(map)) if (!(now - map[k] < LOOSE_TTL)) delete map[k];
    return map;
  }
  async function dismissLoose(keys) {
    const s = await getSettings();
    const map = pruneLoose({ ...(s.looseDismissed || {}) }, Date.now());
    for (const k of keys || []) if (k) map[k] = Date.now();
    return (await saveSettings({ looseDismissed: map })).looseDismissed;
  }
  async function undismissLoose(keys) {
    const s = await getSettings();
    const map = { ...(s.looseDismissed || {}) };
    for (const k of keys || []) delete map[k];
    return (await saveSettings({ looseDismissed: map })).looseDismissed;
  }

  function newProfileId() { return 'ai' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // افزودن/ویرایش/حذف پروفایل هوش مصنوعی
  async function saveAiProfile(profile) {
    const s = await getSettings();
    const profiles = [...(s.aiProfiles || [])];
    const clean = {
      id: profile.id || newProfileId(),
      name: (profile.name || '').trim() || 'اتصال بی‌نام',
      provider: profile.provider || 'custom',
      baseUrl: (profile.baseUrl || '').trim(),
      key: (profile.key || '').trim(),
      model: (profile.model || '').trim(),
      extractModel: (profile.extractModel || '').trim()
    };
    const idx = profiles.findIndex(p => p.id === clean.id);
    if (idx === -1) profiles.push(clean); else profiles[idx] = clean;
    const patch = { aiProfiles: profiles };
    if (!s.activeAiId || !profiles.some(p => p.id === s.activeAiId)) patch.activeAiId = clean.id;
    await saveSettings(patch);
    return clean;
  }
  async function removeAiProfile(id) {
    const s = await getSettings();
    const profiles = (s.aiProfiles || []).filter(p => p.id !== id);
    const patch = { aiProfiles: profiles };
    if (s.activeAiId === id) patch.activeAiId = profiles[0]?.id || '';
    await saveSettings(patch);
  }
  async function setActiveAi(id) { await saveSettings({ activeAiId: id }); }

  async function getSettings() {
    const { vd_settings } = await storage.get('vd_settings');
    return { ...DEFAULT_SETTINGS, ...(vd_settings || {}) };
  }
  async function saveSettings(patch) {
    const cur = await getSettings();
    const next = { ...cur, ...patch };
    await storage.set({ vd_settings: next });
    return next;
  }

  // ---------- کارها ----------
  // { id, title, who, dir:'mine'|'theirs', due:'YYYY-MM-DD'|null, status:'open'|'done',
  //   createdAt, doneAt, source:'manual'|'omnibox'|'monshi', meetingRef, recur }
  async function getTasks() {
    const { vd_tasks } = await storage.get('vd_tasks');
    return vd_tasks || [];
  }
  async function saveTasks(tasks) { await storage.set({ vd_tasks: tasks }); }

  function makeTask(data) {
    return {
      id: newId(),
      title: (data.title || '').trim(),
      who: data.who || null,
      whoId: data.whoId || null,   // شناسهٔ پروندهٔ فرد (تفکیکِ هم‌نام‌ها با ایمیل)
      dir: data.dir === 'theirs' ? 'theirs' : 'mine',
      due: data.due || null,
      status: 'open',
      createdAt: new Date().toISOString(),
      doneAt: null,
      source: data.source || 'manual',
      meetingRef: data.meetingRef || null,
      recur: data.recur || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      pinned: !!data.pinned,
      subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
      slot: data.slot || null,  // { start:ISO, end:ISO } — بازهٔ زمان‌بندی‌شده روی خط‌زمانی
      stage: data.stage || 'todo',  // todo | doing | done — ستونِ کانبان
      notes: data.notes || '',      // توضیحات کار (هر وقت قابل‌ویرایش)
      estimate: data.estimate || null,   // دقیقه — برای جاکردن در وقت آزاد
      updatedAt: new Date().toISOString(), // آخرین تکانِ کار — مبنای «پوسیدگی»
      lastNudgeAt: data.lastNudgeAt || null, // آخرین تلنگر (فقط کارهای سپرده‌شده)
      nudgeCount: data.nudgeCount || 0
    };
  }

  // «آخرین حرکت» — کارهای قدیمیِ ذخیره‌شده updatedAt ندارند، پس به createdAt برمی‌گردیم
  const lastMoved = t => t.updatedAt || t.createdAt || null;

  const subId = () => 's' + Math.random().toString(36).slice(2, 8);

  // ---------- زیرکارها ----------
  async function addSubtask(taskId, title) {
    title = (title || '').trim();
    if (!title) return null;
    const tasks = await getTasks();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return null;
    if (!Array.isArray(t.subtasks)) t.subtasks = [];
    const sub = { id: subId(), title, done: false };
    t.subtasks.push(sub);
    await saveTasks(tasks);
    return sub;
  }
  async function toggleSubtask(taskId, subId) {
    const tasks = await getTasks();
    const t = tasks.find(x => x.id === taskId);
    const s = t && (t.subtasks || []).find(x => x.id === subId);
    if (!s) return null;
    s.done = !s.done;
    await saveTasks(tasks);
    return s;
  }
  async function removeSubtask(taskId, subId) {
    const tasks = await getTasks();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    t.subtasks = (t.subtasks || []).filter(x => x.id !== subId);
    await saveTasks(tasks);
  }

  // ---------- پروندهٔ آدم‌ها (هویت‌دار) ----------
  // شناسهٔ پایدارِ هر نفر: اگر ایمیل دارد بر پایهٔ ایمیل، وگرنه بر پایهٔ نام.
  // این باعث می‌شود دو نفرِ هم‌نام (مثلاً دو «نگار») با ایمیل متفاوت، دو پروندهٔ جدا بمانند.
  function personId(name, email) {
    const e = (email || '').trim().toLowerCase();
    if (e) return 'e:' + e;
    return 'n:' + (name || '').trim();
  }

  async function getPeopleMeta() {
    const { vd_people } = await storage.get('vd_people');
    const raw = vd_people || {};
    // مهاجرت از نسخهٔ قدیمی که کلیدش «نام» بود → کلیدِ شناسه‌دار
    let changed = false;
    const out = {};
    for (const [key, val] of Object.entries(raw)) {
      if (key.startsWith('e:') || key.startsWith('n:')) { out[key] = { ...val, id: key, name: val.name || key.slice(2) }; continue; }
      const id = personId(key, val && val.email);
      out[id] = { ...(val || {}), id, name: val?.name || key };
      changed = true;
    }
    if (changed) await storage.set({ vd_people: out });
    return out;
  }

  // ذخیره/ادغامِ یک نفر. ورودی: {name, email?, ...} یا شناسهٔ موجود در patch.id
  // خروجی: شناسهٔ نهایی. اگر ایمیل به نفرِ بی‌ایمیلِ هم‌نام اضافه شود، پرونده به شناسهٔ ایمیلی منتقل می‌شود.
  async function savePerson(patch) {
    const name = (patch.name || '').trim();
    const email = (patch.email || '').trim();
    if (!name && !email) return null;
    const all = await getPeopleMeta();
    let id = patch.id && all[patch.id] ? patch.id : personId(name, email);
    const oldNameId = 'n:' + name;
    // ارتقا: پروندهٔ بی‌ایمیلِ هم‌نام را به پروندهٔ ایمیل‌دار منتقل کن (بدون از دست رفتن یادداشت)
    if (email && all[oldNameId] && oldNameId !== id) {
      all[id] = { ...all[oldNameId], ...(all[id] || {}) };
      delete all[oldNameId];
    }
    const cur = { ...(all[id] || {}), id, name: name || all[id]?.name || '' };
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'id') continue;
      if (v) cur[k] = v; else if (k !== 'name') delete cur[k];
    }
    all[id] = cur;
    await storage.set({ vd_people: all });
    return id;
  }

  async function savePersonNote(id, note) {
    const all = await getPeopleMeta();
    if (!all[id]) return;
    if (note && note.trim()) all[id].note = note; else delete all[id].note;
    await storage.set({ vd_people: all });
  }

  // ادغامِ دو پرونده (نام‌های هم‌معنا یا تکراری) — منبع در مقصد حل می‌شود
  async function mergePeople(fromId, intoId) {
    if (!fromId || !intoId || fromId === intoId) return null;
    const all = await getPeopleMeta();
    const from = all[fromId], into = all[intoId];
    if (!from || !into) return null;
    all[intoId] = { ...from, ...into, id: intoId, name: into.name || from.name };
    if (from.note && into.note && from.note !== into.note) all[intoId].note = `${into.note}\n${from.note}`;
    else if (from.note && !into.note) all[intoId].note = from.note;
    const aliases = new Set([...(into.aliases || []), ...(from.aliases || []), from.name].filter(Boolean));
    aliases.delete(all[intoId].name);
    if (aliases.size) all[intoId].aliases = [...aliases];
    delete all[fromId];
    await storage.set({ vd_people: all });
    // کارهایی که به پروندهٔ حذف‌شده وصل بودند، به مقصد منتقل شوند
    const tasks = await getTasks();
    let touched = false;
    for (const t of tasks) if (t.whoId === fromId) { t.whoId = intoId; t.who = all[intoId].name; touched = true; }
    if (touched) await saveTasks(tasks);
    return intoId;
  }

  // نگاشتِ نامِ مسئول (از زیرنویس یا خروجی هوش مصنوعی) به پروندهٔ فرد.
  // قاعدهٔ مهم: اگر دو نفرِ هم‌نام باشند و ایمیلی برای تفکیک نباشد، عمداً whoId نمی‌دهیم
  // تا کار به فردِ اشتباه نچسبد — نامش را نگه می‌داریم ولی پرونده را حدس نمی‌زنیم.
  // ── ادغام شرکت‌کننده‌ها ────────────────────────────────
  // تقویم آدرس ایمیل می‌دهد و زیرنویس نامِ نمایشی؛ یک نفر دو بار در فهرست می‌آمد.
  // این‌ها را به هم می‌چسبانیم، ولی محتاطانه: کسی که وسط جلسه اضافه شده و در تقویم
  // نبوده فقط نام دارد و باید بماند؛ ایمیلی که نامی برایش پیدا نشد هم باید بماند.
  const looksLikeEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const flatten = v => String(v || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');

  // هم‌خوانیِ ایمیل با نام. سخت‌گیرانه: هر بخشِ معنادارِ ایمیل باید با بخشی از نام
  // بخواند. فقط تطبیقِ نامِ کوچک کافی نیست — «sara.ahmadi» نباید به «Sara Karimi»
  // بچسبد؛ چسباندنِ اشتباهِ دو نفر بدتر از دوبار آمدنِ یک نفر است.
  function emailMatchesName(email, name) {
    const localRaw = String(email || '').split('@')[0].toLowerCase();
    const tokens = String(name || '').toLowerCase().split(/\s+/).map(flatten).filter(t => t.length >= 3);
    if (!localRaw || !tokens.length) return false;
    const flat = tokens.join('');
    const hits = (seg) => seg === flat || (seg.length >= 5 && flat.startsWith(seg)) ||
      tokens.some(t => seg === t || (t.length >= 4 && seg.startsWith(t)) || (seg.length >= 4 && t.startsWith(seg)));
    // بخش‌های کوتاه (سرواژه‌هایی مثل «shv» یا «m») نشانهٔ تناقض نیستند؛ نادیده گرفته می‌شوند
    const segs = localRaw.split(/[^a-z0-9؀-ۿ]+/)
      .map(x => flatten(x).replace(/\d+$/, '')).filter(x => x.length >= 4);
    if (!segs.length) return false;
    return segs.every(hits);
  }

  function mergeParticipants(list, { userName = '', userEmail = '' } = {}) {
    const entries = [];
    for (const raw of (list || [])) {
      let name = String((raw && (raw.name ?? raw)) || '').trim();
      let email = String((raw && raw.email) || '').trim();
      if (!email && looksLikeEmail(name)) { email = name; name = ''; }
      // Meet خودِ کاربر را «You» می‌نویسد
      if (/^(you|شما)$/i.test(name)) { name = userName || name; if (!email && userEmail) email = userEmail; }
      if (!name && !email) continue;
      entries.push({ name, email });
    }

    const out = [];
    const byEmail = new Map();
    const push = (e) => {
      const key = e.email.toLowerCase();
      if (key && byEmail.has(key)) {
        const cur = byEmail.get(key);
        if (!cur.name && e.name) cur.name = e.name;
        return;
      }
      out.push(e);
      if (key) byEmail.set(key, e);
    };
    for (const e of entries.filter(x => x.name)) push(e);   // اول نام‌دارها
    for (const e of entries.filter(x => !x.name)) {
      const key = e.email.toLowerCase();
      if (key && byEmail.has(key)) continue;
      const host = out.find(x => x.name && !x.email && emailMatchesName(e.email, x.name));
      if (host) { host.email = e.email; byEmail.set(key, host); continue; }
      push(e);
    }
    return out.map(e => ({ name: e.name || e.email, email: e.email }));
  }

  function resolvePersonRef(name, participants = [], meta = {}) {
    const norm = s => String(s || '').replace(/[‌\s]+/g, ' ').trim().toLowerCase();
    const n = norm(name);
    if (!n) return null;
    const p = (participants || []).find(x => x && norm(x.name) === n);
    if (p && p.email) return { who: p.name, whoId: personId(p.name, p.email), ambiguous: false };
    const matches = Object.values(meta || {}).filter(x => x && norm(x.name) === n);
    if (matches.length === 1) return { who: matches[0].name, whoId: matches[0].id, ambiguous: false };
    if (matches.length > 1) return { who: String(name).trim(), whoId: null, ambiguous: true };
    if (p) return { who: p.name, whoId: personId(p.name, ''), ambiguous: false };
    return { who: String(name).trim(), whoId: null, ambiguous: false };
  }

  async function removePerson(id) {
    const all = await getPeopleMeta();
    if (!all[id]) return;
    delete all[id];
    await storage.set({ vd_people: all });
  }

  // میراث: امضای قدیمی savePersonMeta(name, patch) هنوز کار می‌کند
  async function savePersonMeta(name, patch) {
    return savePerson({ name: (name || '').trim(), ...(patch || {}) });
  }

  // ترتیب دستی: آرایهٔ کارها را مطابق ترتیب idهای داده‌شده می‌چیند (بقیه در انتها با ترتیب فعلی)
  async function reorderTasks(orderedIds) {
    const tasks = await getTasks();
    const pos = new Map(orderedIds.map((id, i) => [id, i]));
    tasks.sort((a, b) => {
      const pa = pos.has(a.id) ? pos.get(a.id) : Infinity;
      const pb = pos.has(b.id) ? pos.get(b.id) : Infinity;
      return pa - pb;
    });
    await saveTasks(tasks);
  }

  async function addTask(data) {
    const task = makeTask(data);
    if (!task.title) return null;
    const tasks = await getTasks();
    tasks.push(task);
    await saveTasks(tasks);
    return task;
  }

  async function updateTask(id, patch) {
    const tasks = await getTasks();
    const t = tasks.find(x => x.id === id);
    if (!t) return null;
    Object.assign(t, patch);
    // هر دست‌زدنی «حرکت» حساب می‌شود — مبنای مرورِ کارهای پوسیده
    if (!('updatedAt' in patch)) t.updatedAt = new Date().toISOString();
    await saveTasks(tasks);
    return t;
  }

  // «هنوز لازمه» — کار را تازه می‌کند بدون اینکه چیزی عوض شود
  async function touchTask(id) { return updateTask(id, {}); }

  // تلنگر به کسی که کار به او سپرده شده
  async function nudgeTask(id) {
    const tasks = await getTasks();
    const t = tasks.find(x => x.id === id);
    if (!t) return null;
    t.lastNudgeAt = new Date().toISOString();
    t.nudgeCount = (t.nudgeCount || 0) + 1;
    t.updatedAt = t.lastNudgeAt;
    await saveTasks(tasks);
    return t;
  }

  // خروجی: { task, spawned } — spawned رخداد بعدیِ کار تکرارشونده است (در صورت وجود)
  async function toggleDone(id) {
    const tasks = await getTasks();
    const t = tasks.find(x => x.id === id);
    if (!t) return null;
    const wasOpen = t.status === 'open';
    t.status = wasOpen ? 'done' : 'open';
    t.doneAt = t.status === 'done' ? new Date().toISOString() : null;
    t.stage = t.status === 'done' ? 'done' : 'todo'; // همگام با برد کانبان
    let spawned = null;
    if (wasOpen && t.recur) {
      const from = t.due ? J.fromISO(t.due) : new Date();
      const nextDue = DP.nextOccurrence(t.recur, from);
      // نمونهٔ بعدی باید همان کار باشد، نه یک عنوانِ خالی: برچسب، چک‌لیست،
      // توضیحات، سنجاق و تخمینِ زمان همه با آن می‌روند. زیرکارها باز می‌شوند
      // چون رخدادِ تازه است، و شناسهٔ تازه می‌گیرند تا با نمونهٔ قبلی قاطی نشوند.
      spawned = {
        ...makeTask({
          title: t.title, who: t.who, whoId: t.whoId, dir: t.dir, source: t.source,
          meetingRef: t.meetingRef, recur: t.recur, tags: [...(t.tags || [])],
          pinned: !!t.pinned, notes: t.notes || '', estimate: t.estimate || null
        }),
        due: J.iso(nextDue),
        subtasks: (t.subtasks || []).map(s => ({ id: subId(), title: s.title, done: false }))
      };
      t.recur = null; // رخداد کامل‌شده دیگر تکرار نمی‌شود؛ تکرار به نمونهٔ تازه منتقل شد
      tasks.push(spawned);
    }
    await saveTasks(tasks);
    return { task: t, spawned };
  }

  async function removeTask(id) {
    const tasks = await getTasks();
    const idx = tasks.findIndex(x => x.id === id);
    if (idx === -1) return null;
    const [removed] = tasks.splice(idx, 1);
    await saveTasks(tasks);
    return removed;
  }

  async function restoreTask(task) {
    const tasks = await getTasks();
    tasks.push(task);
    await saveTasks(tasks);
  }

  // ---------- انتخاب‌گرها ----------
  function daysDiff(isoDate, now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((J.fromISO(isoDate) - today) / 86400000);
  }

  // «تمرکز امروز»: امتیازدهی قطعی — عقب‌افتاده‌ترین و نزدیک‌ترین ددلاین‌ها اول
  function focusTasks(tasks, now = new Date(), count = 3) {
    const open = tasks.filter(t => t.status === 'open' && t.dir === 'mine');
    const score = t => {
      if (!t.due) return 1000 + (Date.now() - Date.parse(t.createdAt)) / 8.64e7 * -0.01;
      return daysDiff(t.due, now);
    };
    return open.sort((a, b) => score(a) - score(b)).slice(0, count).map(t => {
      let reason = 'بدون ددلاین';
      if (t.due) {
        const d = daysDiff(t.due, now);
        if (d < 0) reason = `${J.faDigits(-d)} روز عقب‌افتاده`;
        else if (d === 0) reason = 'ددلاین امروز';
        else if (d === 1) reason = 'ددلاین فردا';
        else reason = `ددلاین ${J.relLabel(t.due, now)}`;
      }
      return { ...t, reason };
    });
  }

  // تعریفِ واحدِ «بارِ امروز» — هر جای برنامه که عددی دربارهٔ امروز نشان می‌دهد باید از اینجا بیاید،
  // وگرنه یک صفحه چند عددِ متناقض نشان می‌دهد (سربرگ ۲، نوار ۳، حلقه ۴…).
  function todayLoad(tasks, now = new Date()) {
    const g = grouped(tasks || [], now);
    const done = (tasks || []).filter(t => t.dir === 'mine' && t.doneAt &&
      new Date(t.doneAt).toDateString() === now.toDateString()).length;
    const open = g.overdue.length + g.today.length;
    return { open, done, total: open + done, overdue: g.overdue.length, dueToday: g.today.length };
  }

  // ── امتیازِ فوریت (مرتب‌سازی هوشمند) ─────────────────
  // «هوشمند» قبلاً فقط سطل‌بندیِ تاریخ بود؛ داخل هر سطل کارِ سه‌هفته‌معطل و کارِ
  // دیروز یک‌شکل بودند. اینجا امتیاز صریح و قابل‌توضیح است تا بشود به کاربر گفت چرا.
  const DAY = 86400000;
  function taskScore(t, now = new Date()) {
    let score = 0;
    if (t.pinned) score += 1000;
    if (t.due) {
      const d = daysDiff(t.due, now);
      if (d < 0) score += 200 + Math.min(-d, 30) * 10;   // هرچه عقب‌افتاده‌تر، بالاتر
      else if (d === 0) score += 150;
      else if (d === 1) score += 80;
      else if (d <= 7) score += 40 - d * 4;
      else score += 10;
    }
    // کارِ بی‌تاریخ که ماه‌ها مانده باید کم‌کم بالا بیاید، نه اینکه ته فهرست بپوسد
    const moved = lastMoved(t);
    if (moved) score += Math.min((now - Date.parse(moved)) / DAY, 60) * (t.due ? 0.2 : 0.8);
    // امروز برایش وقت گذاشته‌ای، پس امروز مهم است
    if (t.slot && new Date(t.slot.start).toDateString() === now.toDateString()) score += 60;
    // کاری که شروع شده ولی نیمه‌کاره مانده — تمام‌کردنش ارزان‌تر از شروعِ تازه است
    const subs = t.subtasks || [];
    if (subs.length && subs.some(s => s.done) && !subs.every(s => s.done)) score += 25;
    return score;
  }

  // چرا این کار بالاست — برای اینکه مرتب‌سازیِ هوشمند جعبهٔ سیاه نباشد
  function scoreReason(t, now = new Date()) {
    if (t.pinned) return 'سنجاق‌شده';
    if (t.due) {
      const d = daysDiff(t.due, now);
      if (d < 0) return `${J.faDigits(-d)} روز عقب‌افتاده`;
      if (d === 0) return 'ددلاین امروز';
      if (d === 1) return 'ددلاین فردا';
    }
    if (t.slot && new Date(t.slot.start).toDateString() === now.toDateString()) return 'برایش وقت گذاشته‌ای';
    const subs = t.subtasks || [];
    if (subs.length && subs.some(s => s.done) && !subs.every(s => s.done)) return 'نیمه‌کاره';
    const moved = lastMoved(t);
    const age = moved ? Math.floor((now - Date.parse(moved)) / DAY) : 0;
    if (age >= 14) return `${J.faDigits(age)} روز بی‌حرکت`;
    return '';
  }

  // ── پیگیری: سن و تلنگر ──────────────────────────────
  // فاصلهٔ پیشنهادیِ تلنگر؛ بعد از آن «وقتش است» و بعدتر «بی‌خبر»
  const NUDGE_DUE_DAYS = 3, NUDGE_STALE_DAYS = 7;
  function followupState(t, now = new Date()) {
    const born = Date.parse(t.createdAt || 0) || now.getTime();
    const waitingDays = Math.max(0, Math.floor((now - born) / DAY));
    const lastTouch = Date.parse(t.lastNudgeAt || t.createdAt || 0) || now.getTime();
    const sinceNudge = Math.max(0, Math.floor((now - lastTouch) / DAY));
    const overdue = t.due ? -daysDiff(t.due, now) : 0;
    let level = 'fresh', label = `${J.faDigits(waitingDays)} روز منتظر`;
    if (overdue > 0) {
      level = 'late';
      label = `${J.faDigits(overdue)} روز از موعد گذشته`;
    } else if (sinceNudge >= NUDGE_STALE_DAYS) {
      level = 'stale';
      label = `${J.faDigits(sinceNudge)} روز بی‌خبر`;
    } else if (sinceNudge >= NUDGE_DUE_DAYS) {
      level = 'due';
      label = t.nudgeCount ? `${J.faDigits(sinceNudge)} روز از آخرین تلنگر` : `${J.faDigits(sinceNudge)} روز بی‌جواب`;
    } else if (waitingDays === 0) label = 'تازه سپرده شد';
    return { waitingDays, sinceNudge, overdue, level, label, nudgeCount: t.nudgeCount || 0 };
  }
  const followups = (tasks, now = new Date()) =>
    (tasks || []).filter(t => t.status === 'open' && t.dir === 'theirs')
      .map(t => ({ ...t, fu: followupState(t, now) }))
      .sort((a, b) => (b.fu.overdue - a.fu.overdue) || (b.fu.sinceNudge - a.fu.sinceNudge));

  // ── کارهای پوسیده (مرور هفتگی) ──────────────────────
  const STALE_IDLE_DAYS = 21;    // بی‌تاریخ و بی‌حرکت
  const STALE_OVERDUE_DAYS = 14; // ددلاینش خیلی وقت است گذشته
  const STALE_QUIET_DAYS = 14;   // تازه بررسی‌اش کرده‌ای — تا این مدت دوباره نپرس
  function staleTasks(tasks, now = new Date(), opts = {}) {
    const idle = opts.idleDays || STALE_IDLE_DAYS;
    const late = opts.overdueDays || STALE_OVERDUE_DAYS;
    const quiet = opts.quietDays || STALE_QUIET_DAYS;
    return (tasks || []).filter(t => {
      if (t.status !== 'open' || t.dir === 'theirs') return false;
      const moved = lastMoved(t);
      const idleDays = moved ? Math.floor((now - Date.parse(moved)) / DAY) : 0;
      // «هنوز لازمه» باید برای هر کاری معنی بدهد، حتی کارِ از موعد گذشته —
      // وگرنه کاربر دکمه را می‌زند و هیچ اتفاقی نمی‌افتد.
      if (idleDays < quiet) return false;
      if (t.due) return -daysDiff(t.due, now) >= late;
      return idleDays >= idle;
    }).map(t => {
      const moved = lastMoved(t);
      return {
        ...t,
        idleDays: moved ? Math.floor((now - Date.parse(moved)) / DAY) : 0,
        overdueDays: t.due ? Math.max(0, -daysDiff(t.due, now)) : 0
      };
    }).sort((a, b) => (b.overdueDays - a.overdueDays) || (b.idleDays - a.idleDays));
  }

  // ── چه کارهایی در این وقتِ آزاد جا می‌شود ────────────
  // حریصانه: فوری‌ترین‌ها اول، تا وقتی جا هست. فقط کارهایی که تخمین دارند.
  function fitsInSlot(tasks, minutes, now = new Date()) {
    const cap = Math.max(0, minutes || 0);
    const cands = (tasks || [])
      .filter(t => t.status === 'open' && t.dir === 'mine' && t.estimate > 0 && t.estimate <= cap)
      .sort((a, b) => taskScore(b, now) - taskScore(a, now));
    const picked = [];
    let used = 0;
    for (const t of cands) {
      if (used + t.estimate > cap) continue;
      picked.push(t); used += t.estimate;
    }
    return { picked, totalMin: used, leftMin: cap - used };
  }

  function grouped(tasks, now = new Date()) {
    const g = { overdue: [], today: [], future: [], someday: [], theirs: [], done: [] };
    for (const t of tasks) {
      if (t.status === 'done') { g.done.push(t); continue; }
      if (t.dir === 'theirs') { g.theirs.push(t); continue; }
      if (!t.due) { g.someday.push(t); continue; }
      const d = daysDiff(t.due, now);
      if (d < 0) g.overdue.push(t);
      else if (d === 0) g.today.push(t);
      else g.future.push(t);
    }
    const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999');
    g.overdue.sort(byDue); g.today.sort(byDue); g.future.sort(byDue); g.theirs.sort(byDue);
    g.done.sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    return g;
  }

  // آمار هفتهٔ جلالی (شنبه تا جمعه)؛ offset=0 این هفته، ‎-1 هفتهٔ قبل
  function weekStats(tasks, events, now = new Date(), offset = 0) {
    const start = J.startOfWeek(now);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const inWeek = iso => { const d = Date.parse(iso); return d >= start && d < end; };

    const created = tasks.filter(t => inWeek(t.createdAt));
    const done = tasks.filter(t => t.doneAt && inWeek(t.doneAt));
    const overdue = tasks.filter(t => t.status === 'open' && t.due && J.fromISO(t.due) < new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const waiting = tasks.filter(t => t.status === 'open' && t.dir === 'theirs');
    const donePerDay = [0, 0, 0, 0, 0, 0, 0];
    for (const t of done) donePerDay[J.weekdayIndex(new Date(t.doneAt))]++;

    const evs = (events || []).filter(e => { const d = new Date(e.start); return d >= start && d < end; });
    const meetingMinutes = evs.reduce((s, e) =>
      s + (e.allDay ? 0 : Math.max(0, (new Date(e.end) - new Date(e.start)) / 60000)), 0);

    return {
      start, end,
      created: created.length,
      done: done.length,
      doneTitles: done.map(t => t.title),
      overdue: overdue.length,
      overdueTitles: overdue.map(t => t.title),
      waiting: waiting.length,
      waitingTitles: waiting.map(t => `${t.title}${t.who ? ` (${t.who})` : ''}`),
      donePerDay,
      meetings: evs.length,
      meetingHours: Math.round(meetingMinutes / 6) / 10,
      rate: created.length ? Math.round(done.length / Math.max(created.length, done.length) * 100) : (done.length ? 100 : 0)
    };
  }

  // ---------- جلسه‌ها (ماژول منشی) ----------
  // { id, title, startedAt, updatedAt, transcript:[{speaker,text,at}], summary, actions, analysisData, analysisError, source }
  // شکستنِ نوبت‌های بلند هنگام خواندن. ضبط دست‌نخورده می‌ماند (ریسکِ از دست رفتن متن صفر)
  // ولی نمایش، ارجاعِ شواهد و تحلیلِ هوش مصنوعی روی متنِ تکه‌تکه‌شده انجام می‌شود —
  // و جلسه‌های قبلاً ضبط‌شده هم بدون تغییرِ داده اصلاح می‌شوند.
  const TR = typeof MeetNoteTranscript !== 'undefined' ? MeetNoteTranscript
    : (typeof require !== 'undefined' ? require('./transcript-cleaner.js') : null);

  async function getSessions() {
    const { sessions } = await storage.get('sessions');
    if (!sessions) return [];
    if (!TR || !TR.splitTurns) return sessions;
    return sessions.map(s => {
      const tr = s && s.transcript;
      if (!Array.isArray(tr) || !tr.some(r => (r && r.text || '').length > 600)) return s;
      return { ...s, transcript: TR.splitTurns(tr) };
    });
  }
  async function saveSessions(sessions) { await storage.set({ sessions }); }
  async function upsertSession(session) {
    const sessions = await getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx === -1) sessions.unshift(session); else sessions[idx] = { ...sessions[idx], ...session };
    await saveSessions(sessions);
    return session;
  }
  async function updateSession(id, patch) {
    const sessions = await getSessions();
    const s = sessions.find(x => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    await saveSessions(sessions);
    return s;
  }
  async function removeSession(id) {
    const sessions = await getSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const [removed] = sessions.splice(idx, 1);
    await saveSessions(sessions);
    return removed;
  }

  function sanitizeImportedSession(raw) {
    if (!raw || typeof raw.id !== 'string' || !Array.isArray(raw.transcript)) return null;
    return {
      id: raw.id,
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.slice(0, 300) : 'جلسهٔ واردشده',
      startedAt: Number(raw.startedAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Number(raw.startedAt) || Date.now(),
      transcript: raw.transcript
        .filter(r => r && typeof r.text === 'string')
        .map(r => ({ speaker: typeof r.speaker === 'string' ? r.speaker : 'گوینده', text: r.text, at: r.at }))
        .slice(0, 20000),
      summary: typeof raw.summary === 'string' ? raw.summary : '',
      actions: Array.isArray(raw.actions) ? raw.actions : [],
      analysisData: raw.analysisData && typeof raw.analysisData === 'object' ? raw.analysisData : null,
      source: 'monshi-import'
    };
  }

  // وارد کردن پشتیبان اکستنشن منشی («app: meetnote») — جلسه‌ها با dedupe بر اساس id
  async function importMonshiBackup(obj) {
    if (!obj || obj.app !== 'meetnote' || !Array.isArray(obj.sessions)) {
      throw new Error('این فایل، پشتیبان منشی نیست (ساختار meetnote ندارد)');
    }
    const sessions = await getSessions();
    const ids = new Set(sessions.map(s => s.id));
    const incoming = [];
    let added = 0, skipped = 0;
    for (const raw of obj.sessions) {
      const s = sanitizeImportedSession(raw);
      if (!s || ids.has(s.id)) { skipped++; continue; }
      ids.add(s.id); incoming.push(s); added++;
    }
    const merged = [...incoming, ...sessions].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    await saveSessions(merged);
    return { added, skipped };
  }

  // ---------- کارِ تحلیلِ در جریان (برای تکمیل خودکار پس‌زمینه) ----------
  async function setAnalysisJob(job) {
    await storage.set({ vd_analysisJob: { ...job, heartbeatAt: Date.now() } });
  }
  async function getAnalysisJob() {
    const { vd_analysisJob } = await storage.get('vd_analysisJob');
    return vd_analysisJob || null;
  }
  async function clearAnalysisJob() { await storage.set({ vd_analysisJob: null }); }

  // ---------- پروندهٔ آدم‌ها ----------
  // هویتِ فرد با «ایمیل» تفکیک می‌شود: دو نفر با نامِ یکسان ولی ایمیلِ متفاوت = دو پرونده.
  function peopleFiles(tasks, now = new Date(), events = [], meta = {}) {
    // نام‌های مستعار (پس از ادغام): نامِ قدیمی → نامِ اصلی
    const aliasMap = new Map();
    for (const m of Object.values(meta || {})) {
      if (!m) continue;
      for (const a of m.aliases || []) if (a && m.name) aliasMap.set(a.trim(), m.name);
      if (m.aliasOf && m.name) aliasMap.set(m.name, String(m.aliasOf).trim()); // میراث
    }
    const aliasOf = n => aliasMap.get((n || '').trim()) || (n || '').trim();
    // نام → مجموعهٔ ایمیل‌ها (از تقویم + متا) برای تشخیص یکتایی
    const nameEmails = new Map();
    const addEmail = (name, email) => {
      if (!name || !email) return;
      const k = aliasOf(name.trim()); if (!k) return;
      if (!nameEmails.has(k)) nameEmails.set(k, new Set());
      nameEmails.get(k).add(email.toLowerCase());
    };
    for (const ev of events) for (const a of ev.attendees || []) addEmail(a, (ev.attendeeEmails || {})[a]);
    for (const m of Object.values(meta || {})) if (m && m.email) addEmail(m.name, m.email);
    // کلیدِ پایدارِ یک ارجاع: ایمیل اگر معلوم باشد؛ وگرنه اگر نام دقیقاً یک ایمیل دارد همان؛ وگرنه نام
    const keyOf = (name, email) => {
      name = aliasOf((name || '').trim());
      if (email) return 'e:' + email.toLowerCase();
      const set = nameEmails.get(name);
      if (set && set.size === 1) return 'e:' + [...set][0];
      return 'n:' + name;
    };
    const map = new Map();
    const ensure = (key, name) => {
      if (!map.has(key)) map.set(key, {
        key, id: key, name, email: '', group: '', note: '', metaLastMet: null,
        open: [], done: 0, waiting: 0, meetings: [], lastMet: null, nextMeet: null, lastActivity: null
      });
      const p = map.get(key); if (name && !p.name) p.name = name; return p;
    };
    // افرادِ ثبت‌شده در پرونده (کلید = شناسهٔ پایدار)
    for (const [id, m] of Object.entries(meta || {})) {
      if (!m || m.aliasOf) continue;
      const name = aliasOf((m.name || '').trim()); if (!name) continue;
      const p = ensure(m.email ? 'e:' + m.email.toLowerCase() : id, name);
      p.id = id;
      if (m.email) p.email = m.email;
      if (m.group) p.group = m.group;
      if (m.note != null) p.note = m.note;
      if (m.lastMet && (!p.metaLastMet || m.lastMet > p.metaLastMet)) p.metaLastMet = m.lastMet;
    }
    // کارهای دارای «who» (اگر whoId داشته باشند دقیقاً به همان پرونده می‌چسبند)
    for (const t of tasks) {
      if (!t.who && !t.whoId) continue;
      const linked = t.whoId && meta[t.whoId];
      const name = aliasOf(((linked && linked.name) || t.who || '').trim()); if (!name) continue;
      const p = ensure(linked && linked.email ? 'e:' + linked.email.toLowerCase() : (t.whoId || keyOf(name, null)), name);
      if (t.status === 'done') p.done++;
      else { p.open.push(t); if (t.dir === 'theirs') p.waiting++; }
      const act = t.doneAt || t.createdAt;
      if (act && (!p.lastActivity || act > p.lastActivity)) p.lastActivity = act;
    }
    // جلسه‌های تقویم — فقط برای کسانی که پرونده دارند
    for (const ev of events) for (const a of ev.attendees || []) {
      const name = aliasOf((a || '').trim()); if (!name) continue;
      const email = (ev.attendeeEmails || {})[a];
      const key = keyOf(name, email);
      if (!map.has(key)) continue;
      const p = map.get(key);
      if (email && !p.email) p.email = email;
      p.meetings.push(ev);
      const st = new Date(ev.start);
      if (st <= now && (!p.lastMet || st > new Date(p.lastMet))) p.lastMet = ev.start;
      if (st > now && (!p.nextMeet || st < new Date(p.nextMeet))) p.nextMeet = ev.start;
    }
    const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999');
    const out = [...map.values()].map(p => {
      p.open.sort(byDue);
      const overdue = p.open.filter(t => t.due && daysDiff(t.due, now) < 0).length;
      const oldest = p.open.reduce((min, t) => t.due && daysDiff(t.due, now) < min ? daysDiff(t.due, now) : min, 0);
      const contacts = [p.lastMet, p.lastActivity, p.metaLastMet].filter(Boolean).sort();
      const lastContact = contacts.length ? contacts[contacts.length - 1] : null;
      const staleDays = lastContact ? Math.floor((now - new Date(lastContact)) / 86400000) : null;
      return {
        ...p, overdue, oldestOverdue: oldest < 0 ? -oldest : 0,
        total: p.open.length + p.done, lastContact, staleDays
      };
    });
    // نام‌های تکراری را علامت بزن تا رابط کاربری با ایمیل تفکیک‌شان کند
    const nameCount = new Map();
    for (const p of out) nameCount.set(p.name, (nameCount.get(p.name) || 0) + 1);
    for (const p of out) p.dupName = (nameCount.get(p.name) || 0) > 1;
    out.sort((a, b) => b.open.length - a.open.length || b.total - a.total);
    return out;
  }

  // ---------- پشتیبان‌گیری ----------
  async function exportData({ includeSecrets = false } = {}) {
    const [tasks, settings, evCache] = await Promise.all([getTasks(), getSettings(), getEvents()]);
    const safe = { ...settings };
    if (!includeSecrets) {
      for (const k of SECRET_KEYS) safe[k] = '';
      // کلیدهای پروفایل‌های AI هم اطلاعات حساس‌اند
      safe.aiProfiles = (safe.aiProfiles || []).map(p => ({ ...p, key: '' }));
    }
    return {
      app: 'manshi', schema: 2, exportedAt: new Date().toISOString(),
      includesSecrets: !!includeSecrets,
      tasks, settings: safe, events: evCache.events || []
    };
  }

  function sanitizeImportedTask(raw) {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;
    return {
      id: typeof raw.id === 'string' ? raw.id : newId(),
      title: raw.title.slice(0, 500),
      who: typeof raw.who === 'string' ? raw.who.slice(0, 120) : null,
      dir: raw.dir === 'theirs' ? 'theirs' : 'mine',
      due: /^\d{4}-\d{2}-\d{2}$/.test(raw.due || '') ? raw.due : null,
      status: raw.status === 'done' ? 'done' : 'open',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      doneAt: typeof raw.doneAt === 'string' ? raw.doneAt : null,
      source: ['manual', 'omnibox', 'monshi'].includes(raw.source) ? raw.source : 'manual',
      meetingRef: typeof raw.meetingRef === 'string' ? raw.meetingRef.slice(0, 200) : null,
      recur: raw.recur && typeof raw.recur === 'object' ? raw.recur : null
    };
  }

  // ادغام (بدون حذف کارهای موجود)؛ کلیدهای حساسِ خالی، مقدار فعلی را پاک نمی‌کنند
  async function importData(obj, { replace = false } = {}) {
    if (!obj || (obj.app !== 'manshi' && obj.app !== 'vardast') || !Array.isArray(obj.tasks)) {
      throw new Error('فایل پشتیبان معتبر نیست');
    }
    const incoming = obj.tasks.map(sanitizeImportedTask).filter(Boolean);
    let added = 0, kept = 0;
    if (replace) {
      await saveTasks(incoming);
      added = incoming.length;
    } else {
      const tasks = await getTasks();
      const ids = new Set(tasks.map(t => t.id));
      for (const t of incoming) { if (ids.has(t.id)) { kept++; continue; } tasks.push(t); ids.add(t.id); added++; }
      await saveTasks(tasks);
    }
    if (obj.settings && typeof obj.settings === 'object') {
      const cur = await getSettings();
      const patch = { ...obj.settings };
      for (const k of SECRET_KEYS) if (!patch[k]) delete patch[k]; // مقدار حساسِ فعلی حفظ می‌شود
      // پروفایل‌های AI: کلیدِ خالیِ واردشده، کلید فعلیِ همان پروفایل را پاک نکند
      if (Array.isArray(patch.aiProfiles)) {
        const curById = new Map((cur.aiProfiles || []).map(p => [p.id, p]));
        patch.aiProfiles = patch.aiProfiles.map(p => (!p.key && curById.get(p.id)) ? { ...p, key: curById.get(p.id).key } : p);
      }
      delete patch.theme; // پوستهٔ دستگاه فعلی دست‌نخورده بماند
      await saveSettings(patch);
    }
    return { added, kept, total: incoming.length };
  }

  // ---------- رویدادهای تقویم (کش) ----------
  async function getEvents() {
    const { vd_events } = await storage.get('vd_events');
    return vd_events || { fetchedAt: null, events: [] };
  }
  async function saveEvents(events) {
    await storage.set({ vd_events: { fetchedAt: new Date().toISOString(), events } });
  }

  // ---------- یادداشت روز ----------
  // نگهداری یادداشت به‌ازای هر روز؛ فقط ۱۴ روز آخر را نگه می‌داریم تا انباشته نشود.
  // تاریخچهٔ قیمت — محلی و کوچک؛ مبنای «تغییر نسبت به دیروز» و نمودار هفتگی
  async function getMarketHistory() {
    const { vd_market } = await storage.get('vd_market');
    return Array.isArray(vd_market) ? vd_market : [];
  }
  async function saveMarketHistory(list) { await storage.set({ vd_market: list || [] }); }

  async function getScratch(dayKey) {
    const { vd_scratch } = await storage.get('vd_scratch');
    return (vd_scratch || {})[dayKey] || '';
  }
  async function saveScratch(dayKey, text) {
    const { vd_scratch } = await storage.get('vd_scratch');
    const all = vd_scratch || {};
    if (text && text.trim()) all[dayKey] = text;
    else delete all[dayKey];
    const keys = Object.keys(all).sort();
    while (keys.length > 14) delete all[keys.shift()];
    await storage.set({ vd_scratch: all });
  }

  // دادهٔ نمونه فقط برای حالت پیش‌نمایش خارج از اکستنشن
  async function seedPreview() {
    if (isExt) return;
    if ((await getTasks()).length) return;
    const today = new Date();
    const iso = d => J.iso(d);
    const shift = n => { const x = new Date(today); x.setDate(x.getDate() + n); return x; };
    const mk = (title, due, dir, who, status, doneShift, recur, tags, pinned) => ({
      id: newId(), title, who: who || null,
      dir: dir || 'mine', due: due || null, status: status || 'open',
      createdAt: shift(-3).toISOString(),
      doneAt: status === 'done' ? shift(doneShift ?? 0).toISOString() : null,
      source: 'manual', meetingRef: null, recur: recur || null,
      tags: tags || [], pinned: !!pinned, subtasks: [], slot: null
    });
    const sub = (title, done) => ({ id: 's' + Math.random().toString(36).slice(2, 8), title, done: !!done });
    const at = (h, m) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).toISOString();
    const tasks0 = [
      mk('فاکتور شهریور را برای رستمی بفرست', iso(shift(0)), 'mine', null, 'open', 0, null, ['مالی']),
      mk('پیش‌نویس قرارداد گالری را بازبینی کن', iso(shift(-2)), 'mine', null, 'open', 0, null, ['گالری'], true),
      mk('گزارش فروش تیر را جمع‌بندی کن', iso(shift(1)), 'mine', null, 'open', 0, null, ['گزارش']),
      mk('گزارش هفتگی را آماده کن', iso(shift(1)), 'mine', null, 'open', 0, { freq: 'weekly', interval: 1, weekday: 0 }),
      mk('رسید پرداخت سرور', iso(shift(-1)), 'theirs', 'نگار'),
      mk('تأیید طرح بنر از طراح', iso(shift(2)), 'theirs', 'آقای صدر'),
      mk('ارسال نمونه‌کار به نگار', iso(shift(3)), 'theirs', 'نگار'),
      mk('دعوت‌نامهٔ جلسهٔ هفتگی را بفرست', null, 'mine', null, 'done', 0),
      mk('پاسخ ایمیل تأمین‌کننده', iso(shift(-1)), 'mine', null, 'done', -1),
      mk('اسلایدهای دموی محصول', null)
    ];
    // نمونه: زیرکارها روی «گزارش فروش» و یک کارِ زمان‌بندی‌شده برای امروز
    tasks0[2].subtasks = [sub('جمع‌آوری داده‌ها', true), sub('نمودارها', false), sub('نتیجه‌گیری', false)];
    tasks0[0].slot = { start: at(16, 30), end: at(17, 30) };
    tasks0[2].stage = 'doing'; // نمونه برای ستون «در حال انجام» در برد کانبان
    tasks0[8].notes = 'با تأمین‌کننده تماس گرفتم؛ قیمت جدید را فرستاد، منتظر تأیید مالی هستیم.'; // توضیح روی یک کار انجام‌شده
    await saveTasks(tasks0);
    const EMAILS = { 'نگار': 'negar@example.com', 'آقای صدر': 'sadr@example.com', 'ترانه': 'taraneh@example.com', 'رستمی': 'rostami@example.com' };
    const ev = (h, m, dur, title, meet, attendees) => {
      const emails = {};
      for (const a of attendees || []) if (EMAILS[a]) emails[a] = EMAILS[a];
      return {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).toISOString(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m + dur).toISOString(),
        title, allDay: false, meet: meet ? 'https://meet.google.com/abc-defg-hij' : null,
        attendees: attendees || [], attendeeEmails: emails
      };
    };
    await saveEvents([
      ev(8, 0, 14 * 60, 'هکتون 😎🚀', false, []),
      ev(9, 0, 30, 'استندآپ روزانه', true, ['نگار', 'آقای صدر']),
      ev(10, 0, 45, 'جلسهٔ هفتگی تیم فروش', true, ['نگار', 'آقای صدر']),
      ev(11, 30, 30, 'یک‌به‌یک با ترانه', true, ['ترانه']),
      ev(14, 30, 60, 'دموی محصول برای مشتری', true, ['رستمی']),
      ev(16, 0, 45, 'هماهنگی محصول', true, ['نگار']),
      ev(17, 30, 30, 'هماهنگی با طراح', false, ['آقای صدر'])
    ]);
    // نمونه جلسه‌ها: یکی خام (برای تست دکمهٔ «ساخت صورت‌جلسه») و یکی با سند آماده
    const started = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0).getTime();
    await saveSessions([
      {
        id: 's' + Math.random().toString(36).slice(2), title: 'جلسهٔ برنامه‌ریزی انتشار محصول',
        startedAt: started, updatedAt: started + 32 * 60000, source: 'meet',
        transcript: [
          { speaker: 'نگار', text: 'سلام، بریم سراغ برنامهٔ انتشار نسخهٔ جدید. پیشنهاد من اینه تاریخ رو بذاریم پنجم مرداد.' },
          { speaker: 'نگار', text: 'از سمت من مشکلی نیست ولی تست‌های نهایی باید تا سوم تموم بشه.' },
          { speaker: 'نگار', text: 'خوبه. بهنام تو مسئول جمع‌بندی تست‌ها باشه تا سوم مرداد.' },
          { speaker: 'صدر', text: 'من نگران بار سروره؛ اگه ترافیک زیاد شد باید پلن ارتقا داشته باشیم.' },
          { speaker: 'نگار', text: 'درسته، این یه ریسکه. صدر یه برآورد ظرفیت آماده کنه.' }
        ],
        summary: '', analysisData: null, analysisError: '',
        actions: [
          { text: 'جمع‌بندی تست‌ها تا سوم مرداد', owner: 'نگار', deadline: 'سوم مرداد', due: null },
          { text: 'برآورد ظرفیت سرور آماده شود', owner: 'صدر', deadline: '', due: null }
        ]
      },
      // نمونهٔ سریِ تکرارشونده (M‑۴): سه نشستِ هم‌عنوان با فاصلهٔ هفتگی
      {
        id: 's' + Math.random().toString(36).slice(2), title: 'جلسهٔ هفتگی تیم فروش #۳',
        startedAt: started - 1 * 86400000, updatedAt: started - 1 * 86400000 + 18e5, source: 'meet',
        transcript: [
          { speaker: 'نگار', text: 'وضعیت قیف فروش این هفته چطوره؟' },
          { speaker: 'نگار', text: 'دو تا قرارداد نهایی شد، یکی مونده برای هفتهٔ بعد.' },
          { speaker: 'نگار', text: 'بهنام لطفاً گزارش قیف رو تا پنجشنبه بفرست.' }
        ],
        summary: '', analysisData: null, analysisError: '',
        actions: [
          { text: 'گزارش قیف فروش تا پنجشنبه', owner: 'نگار', deadline: 'پنجشنبه', due: null },
          { text: 'پیگیری قرارداد سوم', owner: 'نگار', deadline: '', due: null }
        ]
      },
      {
        id: 's' + Math.random().toString(36).slice(2), title: 'جلسهٔ هفتگی تیم فروش #۲',
        startedAt: started - 8 * 86400000, updatedAt: started - 8 * 86400000 + 18e5, source: 'meet',
        transcript: [
          { speaker: 'نگار', text: 'هفتهٔ قبل چه شد؟' },
          { speaker: 'نگار', text: 'لیست مشتری‌های جدید آماده شد.' }
        ],
        summary: '## خلاصه\n\nبررسی قیف فروش و تقسیم مشتری‌های جدید.',
        analysisData: null, analysisError: '',
        actions: [{ text: 'آماده‌سازی لیست مشتری‌های جدید', owner: 'نگار', deadline: '', due: null }]
      }
    ]);
    // نمونه: پروندهٔ آدم‌ها با ایمیل — «ترانه» فقط در جلسه بوده و کاری بهش سپرده نشده
    await storage.set({ vd_people: {
      'نگار': { email: 'negar@example.com' },
      'آقای صدر': { email: 'sadr@example.com' },
      'ترانه': { email: 'taraneh@example.com', lastMet: shift(0).toISOString() }
    } });
  }

  return {
    isExt, storage,
    getSettings, saveSettings,
    looseKey, dismissLoose, undismissLoose,
    saveAiProfile, removeAiProfile, setActiveAi,
    getTasks, addTask, updateTask, toggleDone, removeTask, restoreTask, reorderTasks,
    touchTask, nudgeTask, taskScore, scoreReason, followupState, followups, staleTasks, fitsInSlot,
    addSubtask, toggleSubtask, removeSubtask,
    getPeopleMeta, savePersonNote, savePersonMeta, savePerson, mergePeople, removePerson, personId, resolvePersonRef, mergeParticipants, emailMatchesName,
    getSessions, upsertSession, updateSession, removeSession, importMonshiBackup,
    setAnalysisJob, getAnalysisJob, clearAnalysisJob,
    focusTasks, grouped, todayLoad, weekStats, daysDiff, peopleFiles,
    exportData, importData,
    getEvents, saveEvents, getScratch, saveScratch, seedPreview,
    getMarketHistory, saveMarketHistory
  };
})();

if (typeof module !== 'undefined') module.exports = Store;
