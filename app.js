// وردست — منطق داشبورد
// قاعدهٔ امنیتی: هر متن کاربر/مدل فقط با textContent وارد DOM می‌شود؛ innerHTML فقط برای SVGهای ثابت.
(() => {
  const $ = s => document.querySelector(s);
  const J = Jalali;
  let currentWeek = 0;
  let followupTaskId = null;
  let cachedTasks = [], cachedEvents = [];

  const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"/><path d="M10.5 11.5v5M13.5 11.5v5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9.5v4"/><path d="M12 17.2h.01"/><path d="M10.3 4.2 2.6 17.8A2 2 0 0 0 4.3 21h15.4a2 2 0 0 0 1.7-3.2L13.7 4.2a2 2 0 0 0-3.4 0z"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h4l1.5 2.5h5L16 13h4"/><path d="M6.2 5h11.6a2 2 0 0 1 1.9 1.4L21 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4l1.3-6.6A2 2 0 0 1 6.2 5z"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="6" width="12.4" height="12" rx="2.6"/><path d="M15.2 11l4.4-2.6a.7.7 0 0 1 1.1.6v6a.7.7 0 0 1-1.1.6l-4.4-2.6z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5A4.5 4.5 0 0 1 8.5 5H19"/><path d="M16 2.5 19.5 5 16 7.5"/><path d="M20 14.5A4.5 4.5 0 0 1 15.5 19H5"/><path d="M8 16.5 4.5 19 8 21.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.85z"/></svg>',
    join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M19 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 20H21"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L8.5 17.5l-4 1 1-4z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="16" rx="2.6"/><path d="M3.2 10h17.6"/><path d="M8 3v4M16 3v4"/><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16.5V22"/><path d="M8.6 3h6.8v7.2l2.1 3.4a1 1 0 0 1-.85 1.5H7.35a1 1 0 0 1-.85-1.5l2.1-3.4z"/></svg>',
    drag: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9.5" cy="6" r="1.35"/><circle cx="14.5" cy="6" r="1.35"/><circle cx="9.5" cy="12" r="1.35"/><circle cx="14.5" cy="12" r="1.35"/><circle cx="9.5" cy="18" r="1.35"/><circle cx="14.5" cy="18" r="1.35"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/></svg>',
    branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4v11.5A2.5 2.5 0 0 0 7.5 18H10"/><path d="M13 6h7M13 12h7M13 18h7"/><circle cx="5" cy="4" r="1.4" fill="currentColor" stroke="none"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13M5.5 12h13"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15M4.5 11h15M4.5 15.5h9.5M4.5 20h5.5"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5.2" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.8" cy="12" r="1.7"/></svg>',
    hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10M7 21h10"/><path d="M8 3v3.2a4 4 0 0 0 1.5 3.1L12 12l-2.5 2.7A4 4 0 0 0 8 17.8V21"/><path d="M16 3v3.2a4 4 0 0 1-1.5 3.1L12 12l2.5 2.7a4 4 0 0 1 1.5 3.1V21"/></svg>',
    // «تلنگر» — عمداً شبیه تیکِ «انجام شد» نیست تا با آن اشتباه گرفته نشود
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 16.6V11a5.8 5.8 0 0 1 11.6 0v5.6l1.4 2.1H4.8z"/><path d="M10 21.2a2.3 2.3 0 0 0 4 0"/></svg>'
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  // startedAt گاهی عدد است و گاهی رشتهٔ ISO (پشتیبانِ منشی) — تفریقِ رشته‌ها NaN می‌دهد
  // و مرتب‌سازی بی‌صدا از کار می‌افتد؛ همیشه از این تابع رد شود.
  const sessionTime = s => {
    const v = s && s.startedAt;
    if (typeof v === 'number') return v;
    const t = v ? new Date(v).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };
  const byNewest = (a, b) => sessionTime(b) - sessionTime(a);

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
  function svgBtn(cls, icon, label) {
    const b = el('button', cls);
    b.innerHTML = icon;
    if (label) { b.title = label; b.setAttribute('aria-label', label); }
    return b;
  }

  // ---------- توست ----------
  function toast(msg, undoFn) {
    const t = el('div', 'toast');
    t.append(el('span', null, msg));
    if (undoFn) {
      const u = el('button', null, 'واگرد');
      u.addEventListener('click', () => { undoFn(); t.remove(); });
      t.append(u);
    }
    $('#toastWrap').append(t);
    setTimeout(() => t.remove(), 4500);
  }

  // ---------- پوسته ----------
  async function applyTheme() {
    const s = await Store.getSettings();
    let mode = s.theme;
    if (mode === 'auto') mode = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = mode;
  }
  $('#themeToggle').addEventListener('click', async () => {
    const cur = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    await Store.saveSettings({ theme: cur });
    document.documentElement.dataset.theme = cur;
  });

  // ---------- ناوبری (ریل کناری) ----------
  const navItems = document.querySelectorAll('.rail-item[data-view]');
  function goto(view) {
    navItems.forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v =>
      v.classList.toggle('is-active', v.id === 'view-' + view));
    if (view === 'tasks') renderTasksView();
    if (view === 'week') renderWeek();
    if (view === 'meetings') renderMeetingsModule();
    if (view === 'people') renderPeople();
    if (view === 'report') renderReport();
    if (view === 'kiosk') renderKiosk();
    if (view === 'settings') loadSettingsForm();
  }
  navItems.forEach(btn => btn.addEventListener('click', () => goto(btn.dataset.view)));
  // پیوندهای «رفتن به بخش» (نوار یک‌نگاه، لینکِ همهٔ کارها و…)
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) { e.preventDefault(); goto(g.dataset.goto); }
    // بستنِ منوی «⋯» با کلیک بیرون
    document.querySelectorAll('.todo-more[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.todo-more[open]');
    if (open) { open.open = false; open.querySelector('summary')?.focus(); }
  });
  // برچسبِ دسترس‌پذیر + تولتیپ برای ریل (لازم برای حالتِ آیکونیِ باریک).
  // شمارهٔ میان‌بر هم در تولتیپ می‌آید — این میان‌برها وجود داشتند ولی هیچ‌جا
  // اعلام نمی‌شدند، پس عملاً برای کاربر وجود نداشتند.
  const SHORTCUT_ORDER = ['today', 'week', 'meetings', 'tasks', 'people', 'report'];
  document.querySelectorAll('.rail-item[data-view]').forEach(b => {
    const s = b.querySelector('span:not(.rail-badge)');
    if (!s) return;
    const name = s.textContent;
    const idx = SHORTCUT_ORDER.indexOf(b.dataset.view);
    b.title = idx > -1 ? `${name} — کلید ${J.faDigits(idx + 1)}` : name;
    b.setAttribute('aria-label', name);
  });

  // آکاردئونِ تنظیمات با <details> بومی است (بدون JS)

  // ---------- هیرو ----------
  function renderHero(tasks, todayEvents) {
    const now = new Date();
    const h = now.getHours();
    const name = heroName ? ` ${heroName}` : '';
    $('#greeting').textContent =
      h < 5 ? `شب بخیر${name}` : h < 12 ? `صبح بخیر${name}` : h < 17 ? `ظهر بخیر${name}` : `عصر بخیر${name}`;
    $('#jdate').textContent = J.format(now);
    $('#gdate').textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // خلاصهٔ هوشمندِ روز (اکتشافی — بدون نیاز به AI، همیشه کار می‌کند)
    const g = Store.grouped(tasks, now);
    const round1 = x => J.faDigits(Math.round(x * 10) / 10);
    const meetings = (todayEvents || []).filter(e => !isBackgroundEvent(e));
    const hours = meetings.reduce((s, e) => s + (new Date(e.end) - new Date(e.start)) / 3.6e6, 0);
    const gaps = freeGaps(dayItems(todayEvents || [], tasks, now), now, now);
    const freeH = gaps.reduce((s, x) => s + x.min, 0) / 60;
    const bits = [];
    if (hours >= 5) bits.push(`روز سنگینیه — ${round1(hours)} ساعت جلسه`);
    else if (hours >= 2) bits.push(`${round1(hours)} ساعت جلسه داری`);
    if (hours >= 3 && freeH < 2) bits.push(`فقط ${round1(freeH)} ساعت آزاد`);
    if (g.overdue.length) bits.push(`${J.faDigits(g.overdue.length)} کار عقب‌افتاده — اول اون‌ها`);
    else if (g.today.length) bits.push(`${J.faDigits(g.today.length)} کار برای امروز`);
    if (g.theirs.length && bits.length < 2) bits.push(`${J.faDigits(g.theirs.length)} پیگیری معطل`);
    $('#heroSummary').textContent = bits.length
      ? bits.slice(0, 2).join(' · ')
      : 'امروز سبکه — فرصت خوبیه برای کارهای بدون ددلاین 🙂';

    // بزرگ‌ترین بازهٔ آزادِ باقی‌ماندهٔ امروز — تنها عددی که مستقیم می‌گوید
    // «همین حالا چه کاری می‌شود کرد». زیر ۳۰ دقیقه ارزش نمایش ندارد.
    const focus = $('#heroFocus');
    if (focus) {
      const best = gaps.reduce((a, b) => (b.min > (a ? a.min : 0) ? b : a), null);
      if (best && best.min >= 30) {
        focus.hidden = false;
        focus.replaceChildren();
        focus.append(el('span', 'hero-focus-label', 'بزرگ‌ترین وقت آزاد'));
        focus.append(el('span', 'hero-focus-time', `${hhmm(best.start)}–${hhmm(best.end)}`));
        focus.append(el('span', 'hero-focus-dur', humanDur(best.min)));
        focus.title = 'برای کارِ عمیق روی همین بازه حساب کن';
        // اگر کارهایت تخمینِ زمان دارند، بگو کدام‌ها واقعاً در همین بازه جا می‌شوند
        const fit = Store.fitsInSlot(tasks, best.min, now);
        if (fit.picked.length) {
          const b = el('button', 'hero-fit');
          b.append(el('span', 'hero-fit-n', J.faDigits(fit.picked.length)));
          b.append(el('span', null, `کار (${humanDur(fit.totalMin)}) جا می‌شود`));
          b.title = fit.picked.map(x => `• ${x.title} — ${humanDur(x.estimate)}`).join('\n');
          b.addEventListener('click', () => goto('tasks'));
          focus.append(b);
        }
      } else focus.hidden = true;
    }

    const open = tasks.filter(t => t.status === 'open').length;
    const badge = $('#openCount');
    badge.hidden = !open;
    badge.textContent = J.faDigits(open);
  }

  // ---------- کارهای امروز (فهرست کامل) ----------
  let todoFilter = 'active';   // active | all | done
  let todoSort = 'smart';      // smart | due | created | alpha | manual
  let todoGroupBy = 'date';    // date | tag | meeting
  let todoSearch = '';
  let todoTag = null;          // برچسب فعال برای فیلتر
  let todoToolsOpen = false;   // نوار جستجو/مرتب‌سازی تاشو
  let bulkMode = false;        // انتخابِ چندتایی در «کارها»
  let todoRowBulk = false;     // فقط لیستِ کارها چک‌باکسِ انتخاب نشان می‌دهد (نه تمرکز)
  let todoRowIdle = false;     // نشانِ «بی‌حرکت» فقط در فهرستِ کارها، نه در تمرکز امروز
  const bulkSel = new Set();
  let dragId = null;           // idِ کار در حال کشیدن
  const expandedSubs = new Set(); // کارهایی که پنل زیرکارشان باز است

  const matchSearch = (t, q) => !q ||
    (t.title + ' ' + (t.who || '') + ' ' + (t.tags || []).join(' ')).toLowerCase().includes(q);

  function sortTasks(list, mode, now) {
    const a = [...list];
    if (mode === 'alpha') a.sort((x, y) => x.title.localeCompare(y.title, 'fa'));
    else if (mode === 'created') a.sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''));
    else if (mode === 'due') a.sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999'));
    else if (mode === 'smart') a.sort((x, y) => Store.taskScore(y, now) - Store.taskScore(x, now));
    // manual → ترتیب آرایه (Store) حفظ می‌شود
    return a;
  }

  function bucketByDate(list, now) {
    const b = { overdue: [], today: [], someday: [], future: [] };
    for (const t of list) {
      if (!t.due) { b.someday.push(t); continue; }
      const d = Store.daysDiff(t.due, now);
      if (d < 0) b.overdue.push(t); else if (d === 0) b.today.push(t); else b.future.push(t);
    }
    return b;
  }

  // ---------- مدیریت کاملِ کارها (بخش «کارها») ----------
  function renderTodo(tasks) {
    const wrap = $('#todoList');
    if (!wrap) return;
    wrap.replaceChildren();
    const now = new Date();
    todoRowBulk = bulkMode;
    todoRowIdle = true;
    renderBulkBar(tasks);

    $('#todoFilters').hidden = false;
    // دکمهٔ «مرور» فقط وقتی می‌آید که چیزی برای مرور هست — وگرنه یک فیلترِ همیشه‌خالی
    const rotten = Store.staleTasks(tasks, now);
    const sf = $('#staleFilter');
    if (sf) {
      sf.hidden = !rotten.length;
      $('#staleCount').textContent = rotten.length ? J.faDigits(rotten.length) : '';
      sf.title = `${J.faDigits(rotten.length)} کار مدت‌هاست تکان نخورده`;
      // اگر آخرین کارِ پوسیده هم رسیدگی شد، در همین فیلتر گیر نکن
      if (!rotten.length && todoFilter === 'stale') todoFilter = 'active';
      $('#todoFilters').querySelectorAll('.todo-filter').forEach(b =>
        b.classList.toggle('is-active', b.dataset.filter === todoFilter));
    }
    const toolsOn = todoToolsOpen || !!todoSearch || todoSort !== 'smart' || todoGroupBy !== 'date';
    $('#todoToolbar').hidden = !toolsOn;
    $('#todoToolsBtn').classList.toggle('is-active', toolsOn);
    $('#todoToolsBtn').setAttribute('aria-expanded', String(toolsOn));
    renderTodoTags(tasks);

    const passes = t => matchSearch(t, todoSearch) && (!todoTag || (t.tags || []).includes(todoTag));

    if (todoFilter === 'done') {
      const done = tasks.filter(t => t.status === 'done' && passes(t))
        .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 50);
      if (!done.length) return todoEmpty(wrap);
      wrap.append(todoSection('انجام‌شده', done, 'done', now, false));
      return;
    }
    if (todoFilter === 'theirs') {
      const theirs = Store.followups(tasks, now).filter(passes);
      if (!theirs.length) return todoEmpty(wrap);
      const needNudge = theirs.filter(t => t.fu.level !== 'fresh');
      if (needNudge.length) wrap.append(todoSection('وقتِ پیگیری', needNudge, 'overdue', now, false));
      const rest = theirs.filter(t => t.fu.level === 'fresh');
      if (rest.length) wrap.append(todoSection(needNudge.length ? 'در انتظار' : 'سپرده به دیگران', rest, 'someday', now, false));
      return;
    }

    // مرورِ کارهای پوسیده — فهرست جدا با کنشِ «هنوز لازمه»
    if (todoFilter === 'stale') {
      const rotten = Store.staleTasks(tasks, now).filter(passes);
      if (!rotten.length) return todoEmpty(wrap);
      const note = el('div', 'review-note');
      note.append(el('strong', null, 'این‌ها مدت‌هاست تکان نخورده‌اند'));
      note.append(el('span', null, 'برای هرکدام تصمیم بگیر: هنوز لازم است، تاریخ تازه بگیرد، یا برود.'));
      wrap.append(note);
      wrap.append(todoSection(null, rotten, null, now, false));
      return;
    }

    // گروه‌بندی بر اساس فرد: هم کارهای خودم و هم سپرده‌شده‌ها را می‌آورد
    if (todoGroupBy === 'person') {
      const all = tasks.filter(t => t.status === 'open' && passes(t));
      if (!all.length) return todoEmpty(wrap);
      renderGroupedByPerson(wrap, all, now);
      return;
    }

    let open = tasks.filter(t => t.dir === 'mine' && t.status === 'open' && passes(t));
    if (todoFilter === 'active') open = open.filter(t => !t.due || Store.daysDiff(t.due, now) <= 0);
    if (!open.length) return todoEmpty(wrap);

    // گروه‌بندی بر اساس برچسب یا جلسه (به‌جای تاریخ)
    if (todoGroupBy === 'tag') { renderGroupedByTag(wrap, open, now); return; }
    if (todoGroupBy === 'meeting') { renderGroupedByMeeting(wrap, open, now); return; }

    const pinned = open.filter(t => t.pinned);
    const rest = open.filter(t => !t.pinned);

    if (todoSort === 'smart') {
      if (pinned.length) wrap.append(todoSection('مهم', sortTasks(pinned, 'smart', now), 'pinned', now, false));
      const b = bucketByDate(rest, now);
      const order = [
        ['عقب‌افتاده', b.overdue, 'overdue'],
        ['امروز', b.today, 'today'],
        ['بدون تاریخ', b.someday, 'someday'],
        ['آینده', b.future, 'future']
      ];
      // داخل هر سطل با امتیازِ فوریت مرتب می‌شود، نه فقط با ددلاین —
      // پس کارِ نیمه‌کاره و کارِ ماه‌ها مانده هم بالا می‌آید.
      for (const [title, list, kind] of order) {
        if (list.length) wrap.append(todoSection(title, sortTasks(list, 'smart', now), kind, now, false));
      }
    } else {
      const drag = todoSort === 'manual';
      const list = [...sortTasks(pinned, todoSort, now), ...sortTasks(rest, todoSort, now)];
      wrap.append(todoSection(null, list, null, now, drag));
    }
  }

  function todoEmpty(wrap) {
    const e = el('div', 'empty');
    e.innerHTML = ICONS.inbox;
    const msg = todoFilter === 'done' ? 'هنوز کاری بسته نشده'
      : todoFilter === 'theirs' ? 'چیزی به کسی نسپرده‌ای'
        : (todoSearch || todoTag) ? 'کاری با این فیلتر پیدا نشد'
          : 'کاری در صف نیست — از «امروز» یکی اضافه کن';
    e.append(el('div', null, msg));
    wrap.append(e);
  }

  function todoSection(title, list, kind, now, drag) {
    const sec = el('div', 'todo-group');
    if (title) {
      const h = el('div', 'todo-group-head');
      const tt = el('span', 'todo-group-title tg-' + kind, title);
      if (kind === 'pinned') { const s = el('span', 'todo-star'); s.innerHTML = ICONS.star; tt.prepend(s); }
      h.append(tt);
      h.append(el('span', 'todo-group-count', J.faDigits(list.length)));
      sec.append(h);
    }
    for (const t of list) sec.append(todoRow(t, now, drag));
    return sec;
  }

  // گروه‌بندی بر اساس برچسب
  function renderGroupedByTag(wrap, open, now) {
    const byTag = new Map();
    const untagged = [];
    for (const t of open) {
      if (!(t.tags || []).length) { untagged.push(t); continue; }
      for (const tag of t.tags) { if (!byTag.has(tag)) byTag.set(tag, []); byTag.get(tag).push(t); }
    }
    const tags = [...byTag.keys()].sort((a, b) => byTag.get(b).length - byTag.get(a).length);
    for (const tag of tags) wrap.append(todoSection('#' + tag, sortTasks(byTag.get(tag), 'due', now), 'tag', now, false));
    if (untagged.length) wrap.append(todoSection('بدون برچسب', sortTasks(untagged, 'due', now), 'someday', now, false));
  }

  // گروه‌بندی بر اساس جلسهٔ منبع
  function renderGroupedByMeeting(wrap, open, now) {
    const byMtg = new Map();
    const none = [];
    for (const t of open) {
      if (!t.meetingRef) { none.push(t); continue; }
      const idx = t.meetingRef.indexOf(' · ');
      const title = idx > -1 ? t.meetingRef.slice(idx + 3) : 'جلسه';
      if (!byMtg.has(title)) byMtg.set(title, []); byMtg.get(title).push(t);
    }
    for (const [title, list] of byMtg) wrap.append(todoSection('از جلسهٔ ' + title.replace(/^جلسه[ٔ‌]?\s+/, ''), sortTasks(list, 'due', now), 'meeting', now, false));
    if (none.length) wrap.append(todoSection('بدون جلسه', sortTasks(none, 'due', now), 'someday', now, false));
  }

  // گروه‌بندی بر اساس فرد — هم‌نام‌ها با شناسه/ایمیل از هم جدا می‌مانند
  let peopleMetaCache = {};
  function renderGroupedByPerson(wrap, open, now) {
    const byPerson = new Map();  // key → { label, hint, list }
    const none = [];
    for (const t of open) {
      if (!t.who && !t.whoId) { none.push(t); continue; }
      const meta = t.whoId ? peopleMetaCache[t.whoId] : null;
      const key = t.whoId || 'n:' + t.who.trim();
      const label = (meta && meta.name) || t.who || 'بدون نام';
      const hint = meta && meta.email ? meta.email : '';
      if (!byPerson.has(key)) byPerson.set(key, { label, hint, list: [] });
      byPerson.get(key).list.push(t);
    }
    // اگر دو گروه هم‌نام باشند، ایمیل را کنارشان نشان بده تا اشتباه نشوند
    const nameCount = new Map();
    for (const g of byPerson.values()) nameCount.set(g.label, (nameCount.get(g.label) || 0) + 1);
    const groups = [...byPerson.values()].sort((a, b) => b.list.length - a.list.length);
    for (const g of groups) {
      const dup = (nameCount.get(g.label) || 0) > 1;
      const title = dup ? `${g.label} · ${g.hint || 'بدون ایمیل'}` : g.label;
      wrap.append(todoSection(title, sortTasks(g.list, 'due', now), 'person', now, false));
    }
    if (none.length) wrap.append(todoSection('بدون فرد', sortTasks(none, 'due', now), 'someday', now, false));
  }

  // آمارِ سربرگِ «کارها»
  function renderTasksStats(tasks) {
    const el2 = $('#tasksStats'); if (!el2) return;
    const now = new Date();
    const mineOpen = tasks.filter(t => t.dir === 'mine' && t.status === 'open');
    const overdue = mineOpen.filter(t => t.due && Store.daysDiff(t.due, now) < 0).length;
    const today = mineOpen.filter(t => t.due && Store.daysDiff(t.due, now) === 0).length;
    const doneToday = tasks.filter(t => t.doneAt && new Date(t.doneAt).toDateString() === now.toDateString()).length;
    const theirs = tasks.filter(t => t.dir === 'theirs' && t.status === 'open').length;
    const bits = [`${J.faDigits(mineOpen.length)} باز`];
    if (overdue) bits.push(`${J.faDigits(overdue)} عقب‌افتاده`);
    if (today) bits.push(`${J.faDigits(today)} سررسید امروز`);
    if (theirs) bits.push(`${J.faDigits(theirs)} سپرده‌شده`);
    if (doneToday) bits.push(`${J.faDigits(doneToday)} انجام‌شدهٔ امروز`);
    el2.textContent = bits.join(' · ');
  }

  // ---------- تمرکز امروز (خانه) ----------
  function renderFocusToday(tasks) {
    const wrap = $('#focusList');
    if (!wrap) return;
    todoRowBulk = false;   // انتخابِ چندتایی فقط در «کارها»
    wrap.replaceChildren();
    const now = new Date();
    const g = Store.grouped(tasks, now);

    // حلقهٔ پیشرفت روز — از همان تعریفِ واحدِ «بارِ امروز»
    const load = Store.todayLoad(tasks, now);
    const prog = $('#focusProgress');
    if (load.total > 0) {
      prog.hidden = false;
      const pct = Math.round(load.done / load.total * 100);
      $('#focusRing').style.setProperty('--pct', pct);
      $('#focusRingTxt').textContent = J.faDigits(pct);
      $('#focusProgressLabel').textContent = `${J.faDigits(load.done)} از ${J.faDigits(load.total)} انجام شد`;
    } else prog.hidden = true;

    // «تمرکز امروز» جای شلوغی نیست — نشانِ بی‌حرکتی فقط در فهرستِ کارها می‌آید
    todoRowIdle = false;
    todoRowBulk = false;
    // مجموعهٔ تمرکز: سنجاق‌شده‌ها + عقب‌افتاده/امروز، سقف ۶
    const open = tasks.filter(t => t.dir === 'mine' && t.status === 'open');
    const pinned = open.filter(t => t.pinned);
    const urgent = open.filter(t => !t.pinned && t.due && Store.daysDiff(t.due, now) <= 0)
      .sort((a, b) => Store.taskScore(b, now) - Store.taskScore(a, now));
    let list = [...pinned, ...urgent];
    if (!list.length) list = Store.focusTasks(tasks, now, 4);
    list = list.slice(0, 6);

    if (!list.length) {
      const e = el('div', 'empty');
      e.innerHTML = ICONS.inbox;
      e.append(el('div', null, 'کاری در صف نیست — یکی اضافه کن یا نفسی تازه کن'));
      wrap.append(e);
      return;
    }
    for (const t of list) wrap.append(todoRow(t, now, false));
  }

  // ---------- نوار «یک‌نگاه» ----------
  const KPI_SVG = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3.2" y="5" width="17.6" height="16" rx="2.6"/><path d="M3.2 10h17.6"/><path d="M8 3v4M16 3v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>',
    wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3v3.4c0 1.2.5 2.3 1.4 3.1L12 12l-3.1 2.5A4.2 4.2 0 0 0 7.5 17.6V21"/><path d="M16.5 3v3.4a4.2 4.2 0 0 1-1.4 3.1L12 12l3.1 2.5c.9.8 1.4 1.9 1.4 3.1V21"/></svg>',
    fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 16.5l5-5 3.5 3.5 7-7"/><path d="M14.5 8h5v5"/></svg>'
  };
  function renderKPI(tasks, events) {
    const box = $('#kpiStrip');
    if (!box) return;
    const now = new Date();
    const g = Store.grouped(tasks, now);
    const todays = (events || []).filter(e => new Date(e.start).toDateString() === now.toDateString());
    const meetings = todays.filter(e => !isBackgroundEvent(e));
    const hours = meetings.reduce((s, e) => s + (new Date(e.end) - new Date(e.start)) / 3.6e6, 0);
    const load = Store.todayLoad(tasks, now);
    const dueToday = load.open;
    const pct = load.total ? Math.round(load.done / load.total * 100) : 0;
    const hLabel = hours ? `${J.faDigits(Math.round(hours * 10) / 10)} ساعت` : '—';
    const tiles = [
      [KPI_SVG.cal, J.faDigits(meetings.length), 'جلسهٔ امروز', 'week', 'blue'],
      [KPI_SVG.clock, hLabel, 'در جلسه', null, 'blue'],
      [KPI_SVG.check, J.faDigits(dueToday), 'کار باقی‌مانده', 'tasks', 'accent'],
      [KPI_SVG.wait, J.faDigits(g.theirs.length), 'پیگیری معطل', 'people', 'amber'],
      [KPI_SVG.fire, J.faDigits(pct) + '٪', 'پیشرفت امروز', null, 'accent']
    ];
    box.hidden = false;
    box.replaceChildren();
    for (const [svg, num, lbl, go, tone] of tiles) {
      const t = el(go ? 'button' : 'div', 'kpi kpi-' + tone + (go ? ' kpi-link' : ''));
      if (go) { t.addEventListener('click', () => goto(go)); t.title = 'رفتن به ' + lbl; }
      const ic = el('span', 'kpi-ic'); ic.innerHTML = svg;
      const body = el('div', 'kpi-body');
      body.append(el('div', 'kpi-num', num), el('div', 'kpi-lbl', lbl));
      t.append(ic, body);
      box.append(t);
    }
  }

  // میان‌برهای سریع (H۶)
  function renderQuickActions() {
    const box = $('#quickActions'); if (!box) return;
    box.replaceChildren();
    // فقط کارهایی که در ریل کناری نیستند — «هفته» و «گزارش» تکرارِ ناوبری بودند و حذف شدند
    const acts = [
      ['صورت‌جلسهٔ جدید', KPI_SVG.cal, () => goto('meetings')],
      ['افزودن فرد', KPI_SVG.wait, () => { goto('people'); setTimeout(() => $('#addPersonBtn') && $('#addPersonBtn').click(), 120); }]
    ];
    for (const [label, svg, fn] of acts) {
      const b = el('button', 'qa-btn');
      const ic = el('span', 'qa-ic'); ic.innerHTML = svg;
      b.append(ic, el('span', 'qa-label', label));
      b.addEventListener('click', fn);
      box.append(b);
    }
  }

  // ساعتِ تیم + آب‌وهوا (H۷)
  let clockTimer = null, weatherTxt = '';
  let weatherOn = false;   // تا کاربر روشنش نکند، به open-meteo وصل نمی‌شویم
  // ساعتِ شهرهای دیگر فقط برای کسی که با آن‌ها کار می‌کند ارزش دارد؛ پیش‌فرض
  // فقط ساعتِ خودِ کاربر است و بقیه در تنظیمات انتخاب می‌شوند.
  const CLOCK_CHOICES = [
    ['مسقط', 'Asia/Muscat'], ['دبی', 'Asia/Dubai'], ['استانبول', 'Europe/Istanbul'],
    ['لندن', 'Europe/London'], ['برلین', 'Europe/Berlin'], ['نیویورک', 'America/New_York'],
    ['سانفرانسیسکو', 'America/Los_Angeles'], ['سنگاپور', 'Asia/Singapore'],
    ['توکیو', 'Asia/Tokyo'], ['بمبئی', 'Asia/Kolkata'], ['سیدنی', 'Australia/Sydney']
  ];
  let clockZones = [];   // فقط شهرهای انتخاب‌شده (بدونِ ساعتِ خودِ کاربر)

  function drawClocks() {
    const box = $('#teamClock'); if (!box) return;
    box.hidden = false; box.replaceChildren();
    const zones = [['شما', null], ...clockZones];
    for (const [label, tz] of zones) {
      const opt = { hour: '2-digit', minute: '2-digit', hour12: false };
      if (tz) opt.timeZone = tz;
      const c = el('div', 'clock');
      c.append(el('span', 'clock-time', new Date().toLocaleTimeString('fa-IR', opt)));
      c.append(el('span', 'clock-label', label));
      box.append(c);
    }
    if (weatherTxt) {
      const w = el('div', 'clock clock-weather');
      w.append(el('span', 'clock-time', weatherTxt), el('span', 'clock-label', 'تهران'));
      box.append(w);
    }
  }
  function startClocks() {
    drawClocks();
    clearInterval(clockTimer); clockTimer = setInterval(drawClocks, 30000);
    if (!weatherTxt && weatherOn) loadWeather();
  }
  // ── اخبار فناوری ─────────────────────────────────────
  // تنها بخشی از منشی که به سایتِ بیرونی وصل می‌شود، پس پیش‌فرض خاموش است.
  // فقط عنوانِ خبرها از فید عمومی خوانده می‌شود — هیچ دادهٔ کاربر ارسال نمی‌شود.
  const NEWS_FEEDS = {
    zoomit:    { name: 'زومیت',        cat: 'فناوری',  url: 'https://www.zoomit.ir/feed/' },
    digiato:   { name: 'دیجیاتو',      cat: 'فناوری',  url: 'https://digiato.com/feed' },
    itiran:    { name: 'آی‌تی ایران',   cat: 'فناوری',  url: 'https://www.itiran.com/feed/' },
    varzesh3:  { name: 'ورزش سه',      cat: 'ورزشی',   url: 'https://www.varzesh3.com/rss/all' },
    tarafdari: { name: 'طرفداری',      cat: 'ورزشی',   url: 'https://www.tarafdari.com/rss.xml' },
    donya:     { name: 'دنیای اقتصاد',  cat: 'اقتصاد',  url: 'https://donya-e-eqtesad.com/fa/rss/allnews' },
    eghtesad:  { name: 'اقتصادنیوز',   cat: 'اقتصاد',  url: 'https://www.eghtesadnews.com/feeds' },
    khabar:    { name: 'خبرآنلاین',    cat: 'عمومی',   url: 'https://www.khabaronline.ir/rss' },
    isna:      { name: 'ایسنا',        cat: 'عمومی',   url: 'https://www.isna.ir/rss' }
  };
  const NEWS_CATS = ['فناوری', 'ورزشی', 'اقتصاد', 'عمومی'];
  const NEWS_REFRESH_MS = 10 * 60 * 1000;   // فاصلهٔ گرفتن فید تازه از سایت
  let newsItems = [], newsIdx = 0, newsTimer = null, newsLoadedAt = 0;

  // عکسِ خبر را از هر جایی که فید گذاشته باشد بیرون می‌کشد:
  // enclosure، media:content، media:thumbnail، <image>، یا اولین <img> داخل توضیحات.
  // نام‌فضاها (media:) در حالت XML با localName خوانده می‌شوند، نه با querySelector.
  function imageOfItem(node, descHtml) {
    for (const n of [...node.getElementsByTagName('*')]) {
      const ln = (n.localName || '').toLowerCase();
      if (!['enclosure', 'content', 'thumbnail', 'image'].includes(ln)) continue;
      const url = n.getAttribute('url') || n.getAttribute('href') || (ln === 'image' ? n.textContent : '');
      const type = n.getAttribute('type') || n.getAttribute('medium') || '';
      const ok = Kiosk.safeImageUrl(url, type);
      if (ok) return ok;
    }
    return Kiosk.imageFromHtml(descHtml);
  }

  // تجزیهٔ RSS با DOMParser و درجِ متن با textContent — عنوانِ آلوده هم بی‌خطر است
  function parseFeed(xml, source) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    return [...doc.querySelectorAll('item, entry')].slice(0, 12).map(n => {
      const get = sel => n.querySelector(sel)?.textContent?.trim() || '';
      const link = get('link') || n.querySelector('link')?.getAttribute('href') || '';
      const when = get('pubDate') || get('published') || get('updated');
      const t = when ? new Date(when).getTime() : 0;
      const desc = get('description') || get('encoded') || get('summary');
      return {
        title: get('title'), link, at: Number.isNaN(t) ? 0 : t,
        source: source.name, cat: source.cat, image: imageOfItem(n, desc)
      };
    }).filter(x => x.title && /^https:\/\//.test(x.link));
  }

  // وضعیتِ هر منبع جدا نگه داشته می‌شود: پیامِ «خبری خوانده نشد» به‌تنهایی
  // نمی‌گوید مشکل دسترسی است، شبکه است، یا خودِ سایت جواب نمی‌دهد.
  let newsStatus = [];

  async function fetchFeed(key) {
    const f = allFeeds()[key];
    if (!f) return { key, name: key, items: [], error: 'منبع پیدا نشد' };
    const origin = new URL(f.url).origin + '/*';
    if (Store.isExt && chrome.permissions) {
      try {
        const has = await chrome.permissions.contains({ origins: [origin] });
        if (!has) return { key, name: f.name, items: [], error: 'دسترسی به این سایت داده نشده' };
      } catch (_) { /* ادامه بده */ }
    }
    let r;
    try {
      r = await fetch(f.url, { cache: 'no-store', redirect: 'follow' });
    } catch (e) {
      return { key, name: f.name, items: [], error: Store.isExt ? 'سایت پاسخ نداد (شبکه یا فیلترینگ)' : 'در پیش‌نمایش مرورگر ممکن نیست (CORS)' };
    }
    if (!r.ok) return { key, name: f.name, items: [], error: `سایت خطای ${J.faDigits(r.status)} داد` };
    let text = '';
    try { text = await r.text(); } catch (_) { return { key, name: f.name, items: [], error: 'پاسخ خوانده نشد' }; }
    const items = parseFeed(text, f);
    if (!items.length) {
      const looksHtml = /^\s*<!doctype html|<html/i.test(text);
      return { key, name: f.name, items: [], error: looksHtml ? 'به‌جای فید، صفحهٔ وب برگشت' : 'فید خوانده شد ولی خبری داخلش نبود' };
    }
    return { key, name: f.name, items, error: '' };
  }

  // منبع‌های آمادهٔ خودمان + هرچه کاربر دستی اضافه کرده
  let customFeeds = [];
  const allFeeds = () => {
    const out = { ...NEWS_FEEDS };
    for (const f of customFeeds) out[f.id] = { name: f.name, cat: f.cat, url: f.url, custom: true };
    return out;
  };

  async function loadNews(sources) {
    const feeds = allFeeds();
    const picked = (sources || []).filter(k => feeds[k]);
    newsStatus = [];
    if (!picked.length) { newsItems = []; return; }
    const results = await Promise.all(picked.map(fetchFeed));
    newsStatus = results.map(r => ({ name: r.name, count: r.items.length, error: r.error }));
    newsItems = results.flatMap(r => r.items).sort((a, b) => b.at - a.at).slice(0, 60);
    newsLoadedAt = Date.now();
  }

  function paintNews() {
    const box = $('#newsCard');
    if (!box) return;
    box.replaceChildren();
    const head = el('div', 'news-head');
    head.append(el('span', 'news-title', 'اخبار فناوری'));
    if (!newsItems.length) {
      box.append(head);
      const why = el('div', 'news-empty');
      if (newsStatus.length) {
        for (const st of newsStatus) {
          const row = el('div', 'news-status');
          row.append(el('span', 'news-status-name', st.name));
          row.append(el('span', null, st.error || `${J.faDigits(st.count)} خبر`));
          why.append(row);
        }
      } else why.append(document.createTextNode('خبری خوانده نشد.'));
      box.append(why);
      return;
    }
    const it = newsItems[newsIdx % newsItems.length];
    head.append(el('span', 'news-source', it.source));
    const nav = el('div', 'news-nav');
    const mk = (txt, label, delta) => {
      const b = el('button', 'news-arrow', txt);
      b.title = label; b.setAttribute('aria-label', label);
      b.addEventListener('click', () => {
        newsIdx = (newsIdx + delta + newsItems.length) % newsItems.length;
        paintNews();
      });
      return b;
    };
    nav.append(mk('‹', 'خبر قبلی', -1));
    nav.append(el('span', 'news-pos', `${J.faDigits(newsIdx % newsItems.length + 1)}/${J.faDigits(newsItems.length)}`));
    nav.append(mk('›', 'خبر بعدی', 1));
    head.append(nav);
    box.append(head);

    const a = el('a', 'news-link', it.title);
    a.href = it.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
    box.append(a);
    if (it.at) box.append(el('div', 'news-time', J.relLabel(J.iso(new Date(it.at)))));
  }

  async function renderNews(settings) {
    const box = $('#newsCard');
    if (!box) return;
    clearInterval(newsTimer); newsTimer = null;
    if (!settings.newsOn) { box.hidden = true; box.replaceChildren(); newsItems = []; return; }
    box.hidden = false;
    // فید هر ۱۰ دقیقه تازه می‌شود؛ تیتر هر ۲۰ ثانیه عوض می‌شود
    if (!newsItems.length || Date.now() - newsLoadedAt > NEWS_REFRESH_MS) await loadNews(settings.newsSources);
    newsIdx = 0; paintNews();
    newsTimer = setInterval(() => {
      if (!newsItems.length) return;
      newsIdx = (newsIdx + 1) % newsItems.length;
      paintNews();
    }, 20000);
  }

  // ── فرمِ سربرگ: شهرهای ساعت + کارت اخبار ──
  let heroPrefs = { zones: [], newsOn: false, sources: [], quotesOn: false, weatherOn: false, updateCheckOn: true };

  function paintHeroPrefs(s) {
    heroPrefs = {
      zones: [...(s.clockZones || [])],
      newsOn: !!s.newsOn,
      sources: [...(s.newsSources || [])],
      quotesOn: !!s.quotesOn,
      weatherOn: !!s.weatherOn,
      updateCheckOn: s.updateCheckOn !== false
    };
    const uc = $('#setUpdateCheck');
    if (uc) { uc.checked = heroPrefs.updateCheckOn; uc.onchange = () => { heroPrefs.updateCheckOn = uc.checked; }; }
    const wc = $('#setWeatherOn');
    if (wc) { wc.checked = heroPrefs.weatherOn; wc.onchange = () => { heroPrefs.weatherOn = wc.checked; }; }
    customFeeds = [...(s.customFeeds || [])];
    renderCustomFeeds();
    const qc = $('#setQuotesOn');
    if (qc) { qc.checked = heroPrefs.quotesOn; qc.onchange = () => { heroPrefs.quotesOn = qc.checked; }; }
    const zp = $('#zonePicker');
    if (zp) {
      zp.replaceChildren();
      for (const [label, tz] of CLOCK_CHOICES) {
        const b = el('button', 'zone-chip' + (heroPrefs.zones.includes(tz) ? ' is-on' : ''), label);
        b.type = 'button';
        b.setAttribute('aria-pressed', heroPrefs.zones.includes(tz) ? 'true' : 'false');
        b.addEventListener('click', () => {
          const i = heroPrefs.zones.indexOf(tz);
          if (i > -1) heroPrefs.zones.splice(i, 1); else heroPrefs.zones.push(tz);
          b.classList.toggle('is-on');
          b.setAttribute('aria-pressed', b.classList.contains('is-on') ? 'true' : 'false');
        });
        zp.append(b);
      }
    }
    const chk = $('#setNewsOn');
    if (chk) {
      chk.checked = heroPrefs.newsOn;
      $('#newsSourceField').hidden = !heroPrefs.newsOn;
      chk.onchange = () => {
        heroPrefs.newsOn = chk.checked;
        $('#newsSourceField').hidden = !chk.checked;
      };
    }
    const np = $('#newsPicker');
    if (np) {
      np.replaceChildren();
      // دسته‌بندی‌شده — فهرستِ تخت با ۹ منبع خوانده نمی‌شد
      for (const cat of NEWS_CATS) {
        const inCat = Object.entries(allFeeds()).filter(([, f]) => f.cat === cat);
        if (!inCat.length) continue;
        const row = el('div', 'news-cat-row');
        row.append(el('span', 'news-cat-label', cat));
        for (const [key, f] of inCat) {
          const b = el('button', 'zone-chip' + (heroPrefs.sources.includes(key) ? ' is-on' : ''), f.name);
          b.type = 'button';
          b.addEventListener('click', () => {
            const i = heroPrefs.sources.indexOf(key);
            if (i > -1) heroPrefs.sources.splice(i, 1); else heroPrefs.sources.push(key);
            b.classList.toggle('is-on');
          });
          row.append(b);
        }
        np.append(row);
      }
    }
  }

  // ── منبع‌های خبرِ دستی ──────────────────────────────
  function renderCustomFeeds() {
    const box = $('#customFeedList');
    if (!box) return;
    box.replaceChildren();
    const cat = $('#cfCat');
    if (cat && !cat.options.length) {
      for (const c of Kiosk.FEED_CATS) {
        const o = document.createElement('option'); o.value = c; o.textContent = c;
        if (c === 'عمومی') o.selected = true;
        cat.append(o);
      }
    }
    if (!customFeeds.length) { box.append(el('div', 'feed-empty', 'هنوز منبعی اضافه نکرده‌ای')); return; }
    for (const f of customFeeds) {
      const row = el('div', 'feed-item');
      const on = heroPrefs.sources.includes(f.id);
      const tog = el('button', 'zone-chip' + (on ? ' is-on' : ''), f.name);
      tog.type = 'button';
      tog.title = f.url;
      tog.addEventListener('click', () => {
        const i = heroPrefs.sources.indexOf(f.id);
        if (i > -1) heroPrefs.sources.splice(i, 1); else heroPrefs.sources.push(f.id);
        tog.classList.toggle('is-on');
      });
      const meta = el('span', 'feed-url');
      meta.textContent = `${f.cat} · ${new URL(f.url).hostname.replace(/^www\./, '')}`;
      const del = svgBtn('feed-del', ICONS.trash, `حذف ${f.name}`);
      del.addEventListener('click', async () => {
        customFeeds = customFeeds.filter(x => x.id !== f.id);
        heroPrefs.sources = heroPrefs.sources.filter(x => x !== f.id);
        await Store.saveSettings({ customFeeds, newsSources: heroPrefs.sources });
        newsItems = []; newsLoadedAt = 0;
        renderCustomFeeds();
        toast('منبع حذف شد');
      });
      row.append(tog, meta, del);
      box.append(row);
    }
  }

  $('#cfAdd')?.addEventListener('click', async () => {
    const st = $('#cfStatus');
    const say = (m) => { if (st) { st.textContent = m; setTimeout(() => { st.textContent = ''; }, 4000); } };
    const { feed, error } = Kiosk.normalizeFeed(
      { name: $('#cfName').value, url: $('#cfUrl').value, cat: $('#cfCat').value }, customFeeds);
    if (error) { say(error); return; }

    // اول اجازهٔ همان دامنه، بعد یک آزمایشِ واقعی — منبعی که کار نمی‌کند اضافه نشود
    const origin = new URL(feed.url).origin + '/*';
    if (Store.isExt && chrome.permissions) {
      try {
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) { say('بدون دسترسی به این سایت، فیدش خوانده نمی‌شود'); return; }
      } catch (_) { say('دسترسی گرفته نشد'); return; }
    }
    say('در حال آزمایش…');
    customFeeds = [...customFeeds, feed];      // موقتی، تا fetchFeed پیدایش کند
    const res = await fetchFeed(feed.id);
    if (!res.items.length) {
      customFeeds = customFeeds.filter(x => x.id !== feed.id);
      say(res.error || 'از این آدرس خبری خوانده نشد');
      return;
    }
    heroPrefs.sources = [...new Set([...heroPrefs.sources, feed.id])];
    await Store.saveSettings({ customFeeds, newsSources: heroPrefs.sources });
    newsItems = []; newsLoadedAt = 0;
    $('#cfName').value = ''; $('#cfUrl').value = '';
    renderCustomFeeds();
    const withImg = res.items.filter(x => x.image).length;
    say(`«${feed.name}» اضافه شد — ${J.faDigits(res.items.length)} خبر${withImg ? `، ${J.faDigits(withImg)} با عکس` : '، بدون عکس'}`);
  });

  $('#cfUrl')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#cfAdd').click(); } });

  $('#grantNews')?.addEventListener('click', async () => {
    const box = $('#newsDiag'); box.hidden = false; box.replaceChildren();
    if (!Store.isExt || !chrome.permissions) {
      box.append(el('div', 'news-status', 'در پیش‌نمایش مرورگر دسترسی معنا ندارد — باید داخل اکستنشن باشی.'));
      return;
    }
    // منابعِ خبر + سایتِ قیمت، چون هر دو در کیوسک استفاده می‌شوند
    const origins = [...new Set([
      ...(heroPrefs.sources.length ? heroPrefs.sources : Object.keys(allFeeds()))
        .filter(k => allFeeds()[k]).map(k => new URL(allFeeds()[k].url).origin + "/*"),
      ...MARKET_PAGES.map(p => new URL(p.url).origin + '/*'),
      // گیت‌هاب هم، تا خبرِ نسخهٔ تازه بتواند برسد
      new URL(Updater.API).origin + '/*'
    ])];
    try {
      const granted = await chrome.permissions.request({ origins });
      box.append(el('div', 'news-status', granted ? 'دسترسی داده شد ✓ — حالا «بررسی اتصال» را بزن' : 'دسترسی داده نشد'));
    } catch (e) {
      box.append(el('div', 'news-status', 'خطا: ' + (e.message || 'نامشخص')));
    }
  });

  $('#testNews')?.addEventListener('click', async () => {
    const box = $('#newsDiag'); box.hidden = false; box.replaceChildren();
    box.append(el('div', 'news-status', 'در حال بررسی…'));
    const picked = heroPrefs.sources.filter(k => allFeeds()[k]);
    if (!picked.length) { box.replaceChildren(el('div', 'news-status', 'هیچ منبعی انتخاب نشده')); return; }
    const [results, mkt] = await Promise.all([
      Promise.all(picked.map(fetchFeed)),
      Promise.all(MARKET_PAGES.map(fetchMarketPage))
    ]);
    box.replaceChildren();
    for (const r of results) {
      const row = el('div', 'news-status' + (r.error ? ' is-bad' : ' is-ok'));
      row.append(el('span', 'news-status-name', r.name));
      row.append(el('span', null, r.error || `✓ ${J.faDigits(r.items.length)} خبر خوانده شد`));
      box.append(row);
    }
    for (const r of mkt) {
      const row = el('div', 'news-status' + (r.error ? ' is-bad' : ' is-ok'));
      row.append(el('span', 'news-status-name', r.key === 'gold' ? 'طلا و سکه' : 'ارز'));
      row.append(el('span', null, r.error || `✓ ${J.faDigits(r.items.length)} قلم خوانده شد`));
      box.append(row);
    }
    const ok = results.some(r => !r.error);
    if (ok) { newsItems = []; newsLoadedAt = 0; renderAll(); }
  });

  $('#saveHero')?.addEventListener('click', async () => {
    const st = $('#heroStatus');
    const say = (msg) => { if (st) { st.textContent = msg; setTimeout(() => { st.textContent = ''; }, 3500); } };
    // خواندنِ فید نیاز به دسترسی به همان دامنه دارد و این دسترسی اختیاری است؛
    // فقط وقتی کاربر اخبار را روشن می‌کند از او خواسته می‌شود.
    if (heroPrefs.newsOn && Store.isExt && chrome.permissions) {
      const feeds = allFeeds();
      const origins = [...new Set(heroPrefs.sources
        .filter(k => feeds[k])
        .map(k => new URL(feeds[k].url).origin + '/*'))];
      if (origins.length) {
        try {
          const granted = await chrome.permissions.request({ origins });
          if (!granted) { say('بدون دسترسی به سایت‌ها، اخبار خوانده نمی‌شود'); heroPrefs.newsOn = false; $('#setNewsOn').checked = false; }
        } catch (_) { say('دسترسی گرفته نشد'); heroPrefs.newsOn = false; $('#setNewsOn').checked = false; }
      }
    }
    if (heroPrefs.quotesOn && Store.isExt && chrome.permissions) {
      // اجازهٔ همهٔ منبع‌ها یک‌جا گرفته می‌شود تا اگر یکی از کار افتاد،
      // جایگزینش بدونِ پرسیدنِ دوباره کار کند
      const o = [...new Set(Kiosk.QUOTE_FEEDS.map(f => new URL(f.url).origin + '/*'))];
      try {
        const granted = await chrome.permissions.request({ origins: o });
        if (!granted) { say('بدون دسترسی، سخن تازه گرفته نمی‌شود'); heroPrefs.quotesOn = false; $('#setQuotesOn').checked = false; }
      } catch (_) { heroPrefs.quotesOn = false; $('#setQuotesOn').checked = false; }
    }
    await Store.saveSettings({
      clockZones: heroPrefs.zones,
      newsOn: heroPrefs.newsOn,
      newsSources: heroPrefs.sources,
      quotesOn: heroPrefs.quotesOn,
      customFeeds
    });
    newsItems = []; newsLoadedAt = 0;   // فید تازه با منابع جدید
    if (st && !st.textContent) say('ذخیره شد ✓');
    await renderAll();
    startClocks();
  });

  async function loadWeather() {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.7&longitude=51.4&current=temperature_2m', { cache: 'no-store' });
      const j = await r.json();
      const t = j && j.current && Math.round(j.current.temperature_2m);
      if (typeof t === 'number' && !isNaN(t)) { weatherTxt = J.faDigits(t) + '°'; drawClocks(); }
    } catch (_) { /* بی‌سروصدا */ }
  }

  // برچسب‌های موجود روی کارهای بازِ من → ردیف فیلتر
  function renderTodoTags(tasks) {
    const box = $('#todoTags');
    box.replaceChildren();
    const counts = new Map();
    for (const t of tasks) {
      if (t.dir !== 'mine' || t.status !== 'open') continue;
      for (const tag of t.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    if (!counts.size) { box.hidden = true; return; }
    box.hidden = false;
    const all = el('button', 'todo-tag' + (todoTag ? '' : ' is-active'), 'همه');
    all.addEventListener('click', () => { todoTag = null; renderTodoAsync(); });
    box.append(all);
    for (const [tag, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      const b = el('button', 'todo-tag' + (todoTag === tag ? ' is-active' : ''));
      b.append(el('span', 'todo-tag-hash', '#'), document.createTextNode(tag));
      b.append(el('span', 'todo-tag-count', J.faDigits(n)));
      b.addEventListener('click', () => { todoTag = todoTag === tag ? null : tag; renderTodoAsync(); });
      box.append(b);
    }
  }

  async function renderTodoAsync() { renderTodo(await Store.getTasks()); }

  function todoRow(t, now, drag) {
    const done = t.status === 'done';
    const showStar = t.pinned && !done;   // یک مکانیزمِ اولویت: فقط «سنجاق»
    const row = el('div', 'todo-item' + (done ? ' is-done' : '') + (t.pinned ? ' is-pinned' : '') + (todoRowBulk && bulkSel.has(t.id) ? ' is-selected' : ''));
    row.dataset.id = t.id;

    // چک‌باکسِ انتخابِ چندتایی (فقط در «کارها» با حالتِ انتخاب)
    if (todoRowBulk) {
      const sel = el('label', 'todo-sel');
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = bulkSel.has(t.id);
      cb.setAttribute('aria-label', 'انتخابِ ' + t.title);
      cb.addEventListener('change', () => { cb.checked ? bulkSel.add(t.id) : bulkSel.delete(t.id); row.classList.toggle('is-selected', cb.checked); renderBulkBar(); });
      sel.append(cb, el('span', 'todo-sel-box'));
      row.append(sel);
    }

    // کشیدن: برای زمان‌بندی روی خط‌زمانی (همیشه) و جابه‌جایی در حالت دستی
    if (!done) {
      row.draggable = true;
      row.addEventListener('dragstart', e => {
        dragId = t.id; row.classList.add('dragging');
        document.body.classList.add('task-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', t.id); } catch (_) {}
      });
      row.addEventListener('dragend', () => {
        dragId = null; row.classList.remove('dragging');
        document.body.classList.remove('task-dragging');
        document.querySelectorAll('.drop-over').forEach(x => x.classList.remove('drop-over'));
      });
    }
    if (drag && !done) {
      const handle = el('span', 'todo-drag');
      handle.innerHTML = ICONS.drag;
      handle.title = 'برای جابه‌جایی بکش';
      row.append(handle);
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drop-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop-over'));
      row.addEventListener('drop', async e => {
        e.preventDefault();
        row.classList.remove('drop-over');
        if (!dragId || dragId === t.id) return;
        const ids = [...row.parentElement.querySelectorAll('.todo-item')].map(x => x.dataset.id);
        const from = ids.indexOf(dragId); if (from > -1) ids.splice(from, 1);
        ids.splice(ids.indexOf(t.id), 0, dragId);
        await Store.reorderTasks(ids);
        await renderAll();
      });
    }

    const chk = svgBtn('check' + (done ? ' is-done' : ''), ICONS.check, done ? 'برگردان به باز' : 'انجام شد');
    chk.addEventListener('click', () => completeTask(t.id));

    const main = el('div', 'todo-main');
    const titleRow = el('div', 'todo-title-row');
    if (showStar) { const star = el('span', 'todo-star'); star.innerHTML = ICONS.star; star.title = 'سنجاق‌شده (مهم)'; titleRow.append(star); }
    titleRow.append(el('span', 'todo-title', t.title));
    main.append(titleRow);

    const chips = el('div', 'todo-chips');
    if (t.source === 'monshi' || t.meetingRef) chips.append(meetingChip(t)); // منبعِ جلسه، اول و برجسته
    if (t.due && !done) {
      const d = Store.daysDiff(t.due, now);
      const cls = d < 0 ? 'chip-due-overdue' : d === 0 ? 'chip-due-today' : 'chip-due-future';
      chips.append(el('span', 'chip ' + cls, J.relLabel(t.due, now)));
    }
    if (t.slot && !done) {
      const sc = el('span', 'chip chip-slot');
      sc.innerHTML = ICONS.clock;
      const st = new Date(t.slot.start);
      sc.append(document.createTextNode(` ${sameDay(st, now) ? '' : J.relLabel(J.iso(st), now) + ' '}${hhmm(st)}`));
      chips.append(sc);
    }
    if (t.recur && !done) {
      const rc = el('span', 'chip chip-recur'); rc.innerHTML = ICONS.repeat;
      rc.append(document.createTextNode(DateParser.recurLabel(t.recur))); chips.append(rc);
    }
    if (t.estimate && !done) {
      const ec = el('span', 'chip chip-est'); ec.innerHTML = ICONS.hourglass;
      ec.append(document.createTextNode(' ' + humanDur(t.estimate)));
      ec.title = 'زمانِ لازم — برای جاکردن در وقت آزادِ روز';
      chips.append(ec);
    }
    // وضعیتِ پیگیری روی کارهایی که به دیگری سپرده‌ای
    if (t.dir === 'theirs' && !done) chips.append(fuStateChip(t, now).chip);
    // «چند وقت است تکان نخورده» — تنها سیگنالی که جای دیگری دیده نمی‌شود.
    // بقیهٔ دلایلِ امتیاز (سنجاق، ددلاین، نیمه‌کاره) نشانِ خودشان را دارند.
    if (!done && todoRowIdle) {
      const moved = t.updatedAt || t.createdAt;
      const idle = moved ? Math.floor((now - Date.parse(moved)) / 86400000) : 0;
      if (idle >= 14) {
        const ic = el('span', 'chip chip-idle', `${J.faDigits(idle)} روز بی‌حرکت`);
        ic.title = 'از آخرین باری که به این کار دست زدی';
        chips.append(ic);
      }
    }
    // پیشرفت زیرکارها (کلیک = باز/بستن پنل)
    const subs = t.subtasks || [];
    if (subs.length) {
      const doneN = subs.filter(s => s.done).length;
      const pc = el('button', 'chip chip-sub' + (doneN === subs.length ? ' is-full' : ''));
      pc.innerHTML = ICONS.branch;
      pc.append(document.createTextNode(` ${J.faDigits(doneN)}/${J.faDigits(subs.length)}`));
      pc.addEventListener('click', () => { toggleSubs(t.id); });
      chips.append(pc);
    }
    for (const tag of t.tags || []) {
      const tc = el('button', 'chip chip-tag');
      tc.append(el('span', 'todo-tag-hash', '#'), document.createTextNode(tag));
      tc.addEventListener('click', () => { todoTag = tag; renderTodoAsync(); });
      chips.append(tc);
    }
    if (t.who) chips.append(el('span', 'chip chip-who', t.who));
    if (chips.children.length) main.append(chips);

    // پنل زیرکارها (وقتی باز است)
    if (expandedSubs.has(t.id) && !done) main.append(renderSubPanel(t));

    // فقط پرکاربردترین کنش روی ردیف می‌ماند؛ بقیه زیر «⋯».
    // پیش‌تر ۹ کنترل در هر ردیف بود و صفحه را شلوغ می‌کرد.
    const acts = el('div', 'todo-acts');
    const removeTask = async () => {
      const removed = await Store.removeTask(t.id);
      await renderAll();
      toast('حذف شد', async () => { await Store.restoreTask(removed); renderAll(); });
    };
    if (!done) {
      const dateB = svgBtn('todo-act', ICONS.calendar, 'ددلاین');
      dateB.addEventListener('click', () => openReschedule(dateB, t));
      acts.append(dateB);

      const more = el('details', 'todo-more');
      const sum = el('summary', 'todo-act todo-more-btn');
      sum.innerHTML = ICONS.more;
      sum.title = 'کنش‌های بیشتر';
      sum.setAttribute('aria-label', `کنش‌های بیشتر برای ${t.title}`);
      const menu = el('div', 'todo-more-menu');
      const mk = (icon, label, fn, on) => {
        const b = el('button', 'todo-more-item' + (on ? ' is-on' : ''));
        const ic = el('span', 'todo-more-ic'); ic.innerHTML = icon;
        b.append(ic, el('span', null, label));
        b.addEventListener('click', () => { more.open = false; fn(); });
        menu.append(b);
      };
      mk(ICONS.edit, 'ویرایش', () => startTodoEdit(row, t));
      // «زمان بگذار» معلوم نمی‌کرد چه کار می‌کند — یک بازهٔ خالیِ امروز را به کار می‌دهد
      mk(ICONS.clock, t.slot ? 'تغییر وقتِ امروز' : 'وقت گذاشتن در برنامهٔ امروز',
        () => openTimeblock(sum, t), !!t.slot);
      mk(ICONS.hourglass, t.estimate ? `زمانِ لازم: ${humanDur(t.estimate)}` : 'چقدر طول می‌کشد؟',
        () => openEstimate(sum, t), !!t.estimate);
      if (t.dir === 'theirs') {
        mk(ICONS.bell, 'پیگیری کردم', () => nudge(t));
      }
      if (todoFilter === 'stale') {
        mk(ICONS.repeat, 'هنوز لازمه', async () => {
          await Store.touchTask(t.id); await renderAll(); toast('باشد برای بعد — فعلاً از مرور بیرون رفت');
        });
      }
      // renderTodoAsync فقط فهرستِ صفحهٔ «کارها» را می‌سازد؛ در «تمرکز امروز»
      // هیچ اتفاقی نمی‌افتاد و پنل تازه با رندرِ بعدی ظاهر می‌شد.
      mk(ICONS.branch, 'زیرکار', async () => { expandedSubs.add(t.id); await renderAll(); });
      mk(ICONS.pin, t.pinned ? 'برداشتن سنجاق' : 'سنجاق به بالا', async () => { await Store.updateTask(t.id, { pinned: !t.pinned }); await renderAll(); }, t.pinned);
      mk(ICONS.trash, 'حذف', removeTask);
      more.append(sum, menu);
      // فقط یک منو در هر لحظه باز بماند
      more.addEventListener('toggle', () => {
        if (more.open) document.querySelectorAll('.todo-more[open]').forEach(d => { if (d !== more) d.open = false; });
      });
      acts.append(more);
    } else {
      const del = svgBtn('todo-act todo-act-del', ICONS.trash, 'حذف');
      del.addEventListener('click', removeTask);
      acts.append(del);
    }

    row.append(chk, main, acts);
    return row;
  }

  // همان دلیلِ بالا: چیپِ زیرکار هم در «تمرکز امروز» ظاهر می‌شود، پس باید هر دو
  // فهرست تازه شوند نه فقط صفحهٔ «کارها».
  async function toggleSubs(id) {
    if (expandedSubs.has(id)) expandedSubs.delete(id); else expandedSubs.add(id);
    await renderAll();
  }

  // پنل زیرکارها: چک‌لیست + افزودن
  function renderSubPanel(t) {
    const panel = el('div', 'sub-panel');
    for (const s of t.subtasks || []) {
      const r = el('div', 'sub-row' + (s.done ? ' is-done' : ''));
      const c = svgBtn('sub-check' + (s.done ? ' is-done' : ''), ICONS.check, 'انجام شد');
      c.addEventListener('click', async () => { await Store.toggleSubtask(t.id, s.id); await renderAll(); });
      r.append(c, el('span', 'sub-title', s.title));
      const x = svgBtn('sub-del', ICONS.trash, 'حذف زیرکار');
      x.addEventListener('click', async () => { await Store.removeSubtask(t.id, s.id); await renderAll(); });
      r.append(x);
      panel.append(r);
    }
    const form = el('form', 'sub-add');
    const inp = el('input', 'sub-add-input');
    inp.placeholder = 'افزودن زیرکار…'; inp.setAttribute('aria-label', 'افزودن زیرکار');
    const add = svgBtn('sub-add-btn', ICONS.plus, 'افزودن');
    form.append(inp, add);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      await Store.addSubtask(t.id, v);
      await renderAll();
    });
    panel.append(form);
    // فوکوس روی ورودی وقتی تازه باز شده و زیرکاری نیست
    if (!(t.subtasks || []).length) setTimeout(() => inp.focus(), 0);
    return panel;
  }

  // منوی «زمان بگذار» — فضاهای آزادِ امروز
  // «چقدر طول می‌کشد؟» — تخمینِ درشت، نه دقیق. همین کافی است تا منشی بگوید
  // در وقتِ آزادِ امروز چه چیزهایی جا می‌شود.
  const ESTIMATES = [15, 30, 45, 60, 90, 120, 180];
  function openEstimate(anchor, t) {
    closePops();
    const pop = el('div', 'resched-pop est-pop');
    pop.append(el('div', 'resched-head', 'چقدر طول می‌کشد؟'));
    const grid = el('div', 'est-grid');
    for (const min of ESTIMATES) {
      const b = el('button', 'est-opt' + (t.estimate === min ? ' is-on' : ''), humanDur(min));
      b.addEventListener('click', async () => {
        closePops();
        await Store.updateTask(t.id, { estimate: min });
        await renderAll();
        toast(`زمانِ لازم: ${humanDur(min)}`);
      });
      grid.append(b);
    }
    pop.append(grid);
    if (t.estimate) {
      const clr = el('button', 'resched-opt resched-clear', 'برداشتن تخمین');
      clr.addEventListener('click', async () => {
        closePops(); await Store.updateTask(t.id, { estimate: null }); await renderAll(); toast('تخمین برداشته شد');
      });
      pop.append(clr);
    }
    placePop(pop, anchor);
  }

  async function openTimeblock(anchor, t) {
    closePops();
    const now = new Date();
    const [tasks, evc] = await Promise.all([Store.getTasks(), Store.getEvents()]);
    const items = dayItems(evc.events, tasks, now);
    const gaps = freeGaps(items, now, now);
    const pop = el('div', 'resched-pop');
    pop.append(el('div', 'resched-head', 'زمانِ کار امروز'));
    if (t.slot) {
      const clr = el('button', 'resched-opt resched-clear', 'برداشتن زمان');
      clr.addEventListener('click', async () => { closePops(); await Store.updateTask(t.id, { slot: null }); await renderAll(); toast('زمان برداشته شد'); });
      pop.append(clr);
    }
    if (!gaps.length) pop.append(el('div', 'resched-empty', 'امروز فضای آزادی نمانده'));
    else for (const g of gaps) {
      const b = el('button', 'resched-opt');
      b.append(el('span', 'resched-time', `${hhmm(g.start)}–${hhmm(g.end)}`));
      b.append(el('span', 'resched-sub', `${humanDur(g.min)} آزاد`));
      b.addEventListener('click', () => { closePops(); scheduleTask(t.id, g.start, g.end); });
      pop.append(b);
    }
    placePop(pop, anchor);
  }

  // ویرایش درجا: عنوان (+ تاریخ/برچسب با همان زبان طبیعی)
  function startTodoEdit(row, t) {
    const main = row.querySelector('.todo-main');
    const prev = main.innerHTML;
    main.replaceChildren();
    const box = el('div', 'todo-edit');
    const input = el('input', 'todo-edit-input');
    const seed = t.title + (t.tags || []).map(x => ` #${x}`).join('');
    input.value = seed;
    input.setAttribute('aria-label', 'ویرایش کار');
    const hint = el('div', 'todo-edit-hint', 'می‌تونی تاریخ و #برچسب هم بنویسی');
    box.append(input, hint);
    main.append(box);
    input.focus(); input.setSelectionRange(seed.length, seed.length);
    let saved = false;
    const cancel = () => { if (saved) return; main.innerHTML = prev; };
    const save = async () => {
      if (saved) return; saved = true;
      const val = input.value.trim();
      if (!val) { main.innerHTML = prev; return; }
      const { title, due, recur, tags } = DateParser.parse(val);
      const patch = { title: title || val, tags };
      if (due) patch.due = due;
      if (recur) patch.recur = recur;
      await Store.updateTask(t.id, patch);
      await renderAll();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', save);
  }

  // موقعیت‌دهی و بستنِ پاپ‌آورها (مشترک بین ددلاین و زمان‌بندی)
  function placePop(pop, anchor) {
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = 'auto';
    pop.style.top = `${r.bottom + 6 + window.scrollY}px`;
    pop.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
    // در لبهٔ صفحه، پاپ‌آپ نصفه بیرون می‌افتاد — هر دو محور را داخل دید نگه می‌داریم.
    // offsetWidth/Height نه getBoundingClientRect: پاپ‌آپ انیمیشنِ scale(.85) دارد و
    // اندازه‌گیریِ وسطِ انیمیشن، عرض را نزدیک صفر می‌داد و محدودسازی بی‌اثر می‌شد.
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const maxRight = Math.max(8, window.innerWidth - pw - 8);
    pop.style.right = `${Math.min(Math.max(8, window.innerWidth - r.right), maxRight)}px`;
    if (r.bottom + 6 + ph > window.innerHeight) {
      const above = r.top - 6 - ph;
      pop.style.top = `${(above >= 8 ? above : Math.max(8, window.innerHeight - ph - 8)) + window.scrollY}px`;
    }
    pop.style.maxHeight = `${window.innerHeight - 16}px`;
    setTimeout(() => document.addEventListener('click', onPopOutside, { once: true }), 0);
  }
  function onPopOutside(e) { if (!e.target.closest('.resched-pop')) closePops(); }
  function closePops() { document.querySelectorAll('.resched-pop').forEach(p => p.remove()); }

  // منوی زمان‌بندی سریع (ددلاین)
  function openReschedule(anchor, t) {
    closePops();
    const now = new Date();
    const iso = d => J.iso(d);
    const shift = n => { const x = new Date(now); x.setDate(x.getDate() + n); return x; };
    const endOfWeek = () => { let diff = (5 - J.weekdayIndex(now) + 7) % 7; return shift(diff); };
    const opts = [
      ['امروز', iso(now)],
      ['فردا', iso(shift(1))],
      ['۳ روز دیگه', iso(shift(3))],
      ['آخر هفته', iso(endOfWeek())],
      ['هفتهٔ بعد', iso(shift(7))],
      ['بدون تاریخ', null]
    ];
    const pop = el('div', 'resched-pop');
    pop.append(el('div', 'resched-head', 'تغییر ددلاین'));
    for (const [label, val] of opts) {
      const b = el('button', 'resched-opt' + (t.due === val || (!t.due && val === null) ? ' is-cur' : ''), label);
      b.addEventListener('click', async () => { closePops(); await Store.updateTask(t.id, { due: val }); await renderAll(); });
      pop.append(b);
    }
    // میان‌برها برای حالت‌های رایج‌اند؛ برای هر تاریخ دیگری انتخابگر لازم است
    const pick = el('label', 'resched-pick');
    pick.append(el('span', null, 'تاریخ دلخواه'));
    const input = el('input'); input.type = 'date';
    if (t.due) input.value = t.due;
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('change', async () => {
      const val = input.value || null;
      closePops();
      await Store.updateTask(t.id, { due: val });
      await renderAll();
      toast(val ? `ددلاین شد ${J.relLabel(val)}` : 'ددلاین برداشته شد');
    });
    pick.append(input);
    pop.append(pick);
    placePop(pop, anchor);
  }

  document.querySelectorAll('.todo-filter').forEach(b => b.addEventListener('click', async () => {
    todoFilter = b.dataset.filter;
    document.querySelectorAll('.todo-filter').forEach(x => x.classList.toggle('is-active', x === b));
    renderTodoAsync();
  }));
  $('#todoToolsBtn').addEventListener('click', () => { todoToolsOpen = !todoToolsOpen; renderTodoAsync(); });
  $('#todoSort').addEventListener('change', e => { todoSort = e.target.value; renderTodoAsync(); });
  $('#todoGroup').addEventListener('change', e => { todoGroupBy = e.target.value; renderTodoAsync(); });

  // ---------- اکشن‌های گروهی (B۳) ----------
  function renderBulkBar(tasks) {
    const bar = $('#bulkBar'); if (!bar) return;
    $('#bulkToggle') && $('#bulkToggle').classList.toggle('is-active', bulkMode);
    if (!bulkMode) { bar.hidden = true; bar.replaceChildren(); return; }
    bar.hidden = false;
    bar.replaceChildren();
    const n = bulkSel.size;
    bar.append(el('span', 'bulk-count', n ? `${J.faDigits(n)} کار انتخاب شد` : 'کارها را انتخاب کن'));
    const acts = el('div', 'bulk-acts');
    const mk = (label, cls, fn) => { const b = el('button', 'btn btn-sm ' + cls, label); b.disabled = !n; b.addEventListener('click', fn); return b; };
    acts.append(mk('تکمیل', 'btn-primary', () => bulkComplete()));
    acts.append(mk('زمان‌بندیِ فردا', 'btn-ghost', () => bulkReschedule(1)));
    acts.append(mk('حذف', 'btn-ghost bulk-del', () => bulkDelete()));
    const cancel = el('button', 'btn btn-ghost btn-sm', 'انصراف');
    cancel.addEventListener('click', () => { bulkMode = false; bulkSel.clear(); renderTodoAsync(); });
    acts.append(cancel);
    bar.append(acts);
  }
  async function bulkComplete() {
    const ids = [...bulkSel];
    for (const id of ids) { const t = (await Store.getTasks()).find(x => x.id === id); if (t && t.status === 'open') await Store.toggleDone(id); }
    bulkSel.clear(); await renderAll(); toast(`${J.faDigits(ids.length)} کار تکمیل شد ✓`);
  }
  async function bulkReschedule(days) {
    const now = new Date(); const d = new Date(now); d.setDate(d.getDate() + days); const due = J.iso(d);
    const ids = [...bulkSel];
    for (const id of ids) await Store.updateTask(id, { due });
    bulkSel.clear(); await renderAll(); toast(`${J.faDigits(ids.length)} کار موکول شد به فردا`);
  }
  async function bulkDelete() {
    const ids = [...bulkSel];
    const removed = [];
    for (const id of ids) { const r = await Store.removeTask(id); if (r) removed.push(r); }
    bulkSel.clear(); await renderAll();
    toast(`${J.faDigits(removed.length)} کار حذف شد`, async () => { for (const r of removed) await Store.restoreTask(r); renderAll(); });
  }
  $('#bulkToggle').addEventListener('click', () => { bulkMode = !bulkMode; if (!bulkMode) bulkSel.clear(); renderTodoAsync(); });
  $('#todoSearch').addEventListener('input', e => {
    todoSearch = e.target.value.trim().toLowerCase();
    $('#todoSearchClear').hidden = !e.target.value;
    renderTodoAsync();
  });
  $('#todoSearchClear').addEventListener('click', () => {
    todoSearch = ''; $('#todoSearch').value = ''; $('#todoSearchClear').hidden = true; renderTodoAsync();
  });

  // ---------- جلسه‌ها ----------
  // پاک‌سازی دفاعیِ لینک Meet هنگام رندر (حتی لینک‌های کش‌شدهٔ آلوده را درست می‌کند)
  function cleanMeetUrl(url) {
    if (!url) return '';
    const m = String(url).match(/https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+=%]+/);
    return m ? m[0].replace(/[.,)]+$/, '') : '';
  }

  // رفتن از رویداد تقویم به صفحهٔ جلسه در بخش «جلسه‌ها» (تطبیق با عنوان)
  async function goToMeeting(ev) {
    const sessions = await Store.getSessions();
    const norm = t => (t || '').replace(/\s+/g, '').toLowerCase();
    const target = norm(ev.title);
    const match = sessions.find(s => norm(s.title) === target)
      || (target.length >= 3 && sessions.find(s => norm(s.title).includes(target) || target.includes(norm(s.title))));
    document.querySelector('.rail-item[data-view="meetings"]').click();
    await new Promise(r => setTimeout(r, 60));
    if (match) { openSession(match.id); return; }
    // جلسه در تقویم هست ولی ضبط نشده (حضوری/تلفنی بوده) — به‌جای بن‌بست،
    // فرمِ جلسهٔ دستی را با همان مشخصاتِ رویداد باز کن.
    openManualFromEvent(ev);
  }

  function openManualFromEvent(ev) {
    openManual(null);
    const st = new Date(ev.start), en = new Date(ev.end);
    $('#manualName').value = ev.title || '';
    $('#manualDate').value = J.iso(st);
    $('#manualTime').value = `${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}`;
    $('#manualDur').value = Math.max(1, Math.round((en - st) / 60000)) || 60;
    const emails = ev.attendeeEmails || {};
    $('#manualPeople').value = (ev.attendees || [])
      .map(n => (emails[n] ? `${n} <${emails[n]}>` : n)).join('، ');
    $('#manualHint').textContent = 'این جلسه در تقویم هست ولی ضبط نشده — مشخصاتش از تقویم پر شد، متن جلسه را بنویس یا بچسبان.';
    setTimeout(() => $('#manualBody').focus(), 0);
  }

  // رفتن مستقیم به یک جلسه با شناسه (از چیپِ کارها)
  async function openMeetingById(id) {
    document.querySelector('.rail-item[data-view="meetings"]').click();
    await new Promise(r => setTimeout(r, 60));
    openSession(id);
  }
  const normTitle = t => (t || '').replace(/\s+/g, '').toLowerCase();

  // رویدادِ تقویمِ متناظر با یک جلسه — امتیازدهی: عنوان + همان‌روز بودن (پایدارتر از تطبیقِ صرفِ عنوان)
  function matchEventForSession(s, events) {
    const target = normTitle(s.title);
    const sDay = s.startedAt ? new Date(s.startedAt) : null;
    let best = null, bestScore = 0;
    for (const e of events || []) {
      const et = normTitle(e.title);
      let score = 0;
      if (target && et === target) score += 3;
      else if (target.length >= 3 && (et.includes(target) || target.includes(et))) score += 2;
      if (sDay && sameDay(e.start, sDay)) score += 1;      // همان روز، اطمینان بیشتر
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return bestScore >= 2 ? best : null; // دستِ‌کم تطبیقِ عنوان لازم است
  }

  // شرکت‌کننده‌های یک جلسه: از رویداد تقویم (نام+ایمیل) + گوینده‌های زیرنویس (فقط نام).
  // تقویم اغلب ایمیل می‌دهد و زیرنویس نامِ نمایشی، پس یک نفر دو بار در فهرست می‌آمد.
  // ادغام محتاطانه است: کسی که وسط جلسه اضافه شده و در تقویم نبوده حذف نمی‌شود.
  function sessionParticipants(s, events, settings) {
    const map = new Map();
    const ev = matchEventForSession(s, events);
    if (ev) for (const a of ev.attendees || []) {
      const n = (a || '').trim();
      if (n) map.set(n, (ev.attendeeEmails || {})[n] || '');
    }
    for (const r of s.transcript || []) {
      const n = (typeof r.speaker === 'string' ? r.speaker : '').trim();
      if (n && n !== 'گوینده' && n !== 'یادداشت' && !map.has(n)) map.set(n, '');
    }
    const raw = [...map.entries()].map(([name, email]) => ({ name, email }));
    return Store.mergeParticipants(raw, {
      userName: (settings && settings.userName) || '',
      userEmail: (settings && settings.userEmail) || ''
    });
  }

  // فهرست نهاییِ شرکت‌کننده‌ها. جلسه‌هایی که قبلاً ذخیره شده‌اند فهرستِ ادغام‌نشده
  // دارند، پس آن‌ها هم موقع خواندن از همان ادغام رد می‌شوند.
  async function participantsOf(s) {
    const [settings, evCache] = await Promise.all([Store.getSettings(), Store.getEvents()]);
    const opts = { userName: settings.userName || '', userEmail: settings.userEmail || '' };
    const merged = (s.participants && s.participants.length)
      ? Store.mergeParticipants(s.participants, opts)
      : sessionParticipants(s, evCache.events || [], settings);
    // ادغامِ فقط-برای-نمایش کافی نیست: پرامپتِ صورت‌جلسه از روی session.participants
    // ساخته می‌شود، پس اگر نسخهٔ ذخیره‌شده تکراری بماند مدل هم فهرست تکراری می‌گیرد.
    // یک بار باز کردنِ جلسه، آن را برای همیشه تمیز می‌کند.
    const key = (list) => JSON.stringify((list || []).map(p => [p.name, p.email || '']));
    if (key(s.participants) !== key(merged)) {
      s.participants = merged;
      await Store.updateSession(s.id, { participants: merged });
    }
    return merged;
  }

  // ثبت شرکت‌کننده‌ها در «آدم‌ها» (با ایمیل، اگر بود) — موقع ساخت صورت‌جلسه
  async function registerParticipants(s) {
    const { events } = await Store.getEvents();
    const settings = await Store.getSettings();
    const parts = sessionParticipants(s, events, settings);
    const metAt = s.startedAt ? new Date(s.startedAt).toISOString() : new Date().toISOString();
    for (const p of parts) await Store.savePersonMeta(p.name, { email: p.email, lastMet: metAt });
    await Store.updateSession(s.id, { participants: parts });
    return parts;
  }

  // چیپِ «از جلسهٔ …» روی یک کار — قابل‌کلیک برای باز کردن جلسه
  function meetingChip(t) {
    const ref = t.meetingRef;
    if (!ref) return el('span', 'chip chip-src', 'از منشی');
    const idx = ref.indexOf(' · ');
    const id = idx > -1 ? ref.slice(0, idx) : ref;
    const title = idx > -1 ? ref.slice(idx + 3) : '';
    const clean = (title || 'جلسه').replace(/^جلسه[ٔ‌]?\s+/, '');
    const c = el('button', 'chip chip-meeting');
    c.innerHTML = ICONS.video;
    c.append(document.createTextNode(' از جلسهٔ ' + clean));
    c.title = 'از جلسهٔ ' + clean + ' — برای باز کردن جلسه بزن';
    c.addEventListener('click', e => { e.stopPropagation(); openMeetingById(id); });
    return c;
  }

  const hhmm = d => J.faDigits(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);

  // مدت به فارسیِ خوانا: ۴۵ دقیقه / ۱ ساعت / ۱ ساعت و ۳۰ دقیقه
  function humanDur(min) {
    min = Math.max(0, Math.round(min));
    const h = Math.floor(min / 60), m = min % 60;
    if (h && m) return `${J.faDigits(h)} ساعت و ${J.faDigits(m)} دقیقه`;
    if (h) return `${J.faDigits(h)} ساعت`;
    return `${J.faDigits(m)} دقیقه`;
  }

  // رویدادِ «روزپوش/زمینه»: تمام‌روز یا خیلی طولانی (مثل هکتون ۸ تا ۲۲، مرخصی، سفر).
  // این‌ها جلسه نیستند — نباید در ریلِ خط‌زمانی، فاصله‌ها، بار کاری یا «جلسهٔ بعدی» بیایند.
  const BG_EVENT_MS = 6 * 3.6e6; // ۶ ساعت به بالا = زمینه
  function isBackgroundEvent(ev) {
    return ev.allDay || (new Date(ev.end) - new Date(ev.start)) >= BG_EVENT_MS;
  }

  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const DAY_START_H = 8, DAY_END_H = 20; // پنجرهٔ کاری برای فضاهای آزاد

  // بلوک‌های مشغولِ یک روز: جلسه‌های واقعی + کارهای زمان‌بندی‌شده
  function dayItems(events, tasks, day) {
    const meetings = (events || []).filter(e => !isBackgroundEvent(e) && sameDay(e.start, day))
      .map(e => ({ type: 'meeting', start: new Date(e.start), end: new Date(e.end), ev: e }));
    const slotted = (tasks || []).filter(t => t.slot && t.status === 'open' && sameDay(t.slot.start, day))
      .map(t => ({ type: 'task', start: new Date(t.slot.start), end: new Date(t.slot.end), task: t }));
    return [...meetings, ...slotted].sort((a, b) => a.start - b.start);
  }

  // فضاهای آزادِ ≥۲۰ دقیقه در پنجرهٔ کاری (برای امروز از «الان» شروع می‌کند)
  function freeGaps(items, day, now) {
    const ws = new Date(day); ws.setHours(DAY_START_H, 0, 0, 0);
    const we = new Date(day); we.setHours(DAY_END_H, 0, 0, 0);
    let cursor = new Date(sameDay(day, now) ? Math.max(ws.getTime(), now.getTime()) : ws.getTime());
    const gaps = [];
    for (const it of items) {
      if (it.start > cursor) {
        const min = Math.round((it.start - cursor) / 60000);
        if (min >= 20) gaps.push({ start: new Date(cursor), end: new Date(it.start), min });
      }
      if (it.end > cursor) cursor = new Date(it.end);
    }
    if (we > cursor) {
      const min = Math.round((we - cursor) / 60000);
      if (min >= 20) gaps.push({ start: new Date(cursor), end: we, min });
    }
    return gaps;
  }

  // زمان‌بندی یک کار داخل یک فاصلهٔ آزاد (پیش‌فرض ۶۰ دقیقه یا اندازهٔ فاصله)
  async function scheduleTask(taskId, gapStart, gapEnd) {
    const start = new Date(gapStart);
    const dur = Math.min(60, Math.round((new Date(gapEnd) - start) / 60000));
    const end = new Date(start.getTime() + dur * 60000);
    await Store.updateTask(taskId, { slot: { start: start.toISOString(), end: end.toISOString() } });
    await renderAll();
    toast(`زمان‌بندی شد: ${hhmm(start)}–${hhmm(end)}`);
  }

  // کارهای باز مرتبط با یک جلسه (بر اساس شرکت‌کننده‌ها و کلمات عنوان)
  function relatedOpenTasks(ev, tasks) {
    const attendees = ev.attendees || [];
    const titleWords = (ev.title || '').split(/\s+/).filter(w => w.length >= 3);
    return tasks.filter(t => t.status === 'open' && (
      (t.who && attendees.some(a => t.who.includes(a) || a.includes(t.who))) ||
      titleWords.some(w => t.title.includes(w)) ||
      (t.meetingRef && ev.title && t.meetingRef.includes(ev.title))
    ));
  }

  // ---------- نوار جلسهٔ بعدی / جاری ----------
  function renderNextMeeting(events, tasks) {
    const box = $('#nextMeeting');
    const now = new Date();
    const timed = (events || [])
      .filter(e => !isBackgroundEvent(e) && new Date(e.start).toDateString() === now.toDateString() && new Date(e.end) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
    const cur = timed.find(e => new Date(e.start) <= now && now < new Date(e.end));
    const ev = cur || timed[0];
    if (!ev) { box.hidden = true; box.replaceChildren(); return; }

    box.hidden = false;
    box.replaceChildren();
    const st = new Date(ev.start), en = new Date(ev.end);
    const ongoing = ev === cur;
    box.className = 'nextmtg' + (ongoing ? ' is-live' : '');

    const main = el('div', 'nextmtg-main');
    const pulse = el('span', 'nextmtg-pulse');
    main.append(pulse);
    const txt = el('div', 'nextmtg-text');
    txt.append(el('div', 'nextmtg-kicker', ongoing ? 'همین حالا در جریان' : 'جلسهٔ بعدی'));
    const tt = el('div', 'nextmtg-title');
    tt.append(el('span', 'nextmtg-name', ev.title));
    tt.append(el('span', 'nextmtg-when', ` ${hhmm(st)} تا ${hhmm(en)}`));
    txt.append(tt);
    main.append(txt);

    const side = el('div', 'nextmtg-side');
    const count = el('div', 'nextmtg-count');
    if (ongoing) count.textContent = `${humanDur((en - now) / 60000)} تا پایان`;
    else {
      const mins = (st - now) / 60000;
      count.textContent = mins < 1 ? 'همین حالا شروع می‌شود' : `تا ${humanDur(mins)} دیگر`;
      if (mins <= 10) count.classList.add('soon');
    }
    side.append(count);

    const btns = el('div', 'nextmtg-btns');
    const href = cleanMeetUrl(ev.meet);
    if (href) {
      const a = el('a', 'btn btn-primary btn-sm nextmtg-join');
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = ICONS.join;
      a.append(document.createTextNode(' ورود به جلسه'));
      btns.append(a);
    }
    const rel = relatedOpenTasks(ev, tasks);
    const prep = el('button', 'btn btn-ghost btn-sm');
    prep.textContent = 'آماده‌سازی';
    if (rel.length) prep.append(el('span', 'nextmtg-badge', J.faDigits(rel.length)));
    prep.addEventListener('click', () => openBrief(ev));
    btns.append(prep);
    side.append(btns);

    box.append(main, side);
  }

  // ---------- خط‌زمانی امروز ----------
  function renderMeetings(events, tasks) {
    const wrap = $('#meetingList');
    wrap.replaceChildren();
    const now = new Date();
    const todays = events.filter(e => new Date(e.start).toDateString() === now.toDateString());

    // هشدار بار کاری: فقط جلسه‌های واقعی (نه رویدادهای روزپوش) + ددلاین‌های امروز
    const g = Store.grouped(tasks, now);
    const hours = todays.reduce((s, e) => s + (isBackgroundEvent(e) ? 0 : (new Date(e.end) - new Date(e.start)) / 3.6e6), 0);
    const wl = $('#workloadChip');
    wl.replaceChildren();
    const wlLoad = Store.todayLoad(tasks, new Date());
    if (hours >= 3 && wlLoad.open >= 2) {
      const chip = el('span', 'workload-chip');
      chip.innerHTML = ICONS.alert;
      chip.append(document.createTextNode(
        ` روز شلوغیه: ${J.faDigits(Math.round(hours * 10) / 10)} ساعت جلسه + ${J.faDigits(wlLoad.open)} کار باقی‌مانده`));
      wl.append(chip);
    }

    if (!todays.length) {
      const e = el('div', 'empty');
      e.innerHTML = ICONS.inbox;
      if (hasCalendar) {
        e.append(el('div', null, 'امروز جلسه‌ای در تقویم نیست 🙂'));
      } else {
        e.append(el('div', null, 'تقویم هنوز وصل نیست'));
        const b = el('button', 'btn btn-ghost', 'اتصال تقویم');
        b.addEventListener('click', () => document.querySelector('[data-view="settings"]').click());
        e.append(b);
      }
      wrap.append(e);
      return;
    }

    const background = todays.filter(isBackgroundEvent)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    // رویدادهای روزپوش (تمام‌روز/طولانی) به‌صورت نوار زمینه، نه گرهٔ جلسه
    if (background.length) {
      const ad = el('div', 'tl-allday');
      for (const e of background) {
        const inNow = !e.allDay && new Date(e.start) <= now && now < new Date(e.end);
        const chip = el('span', 'tl-allday-chip' + (inNow ? ' is-now' : ''));
        chip.append(el('span', 'tl-allday-name', e.title));
        if (!e.allDay) chip.append(el('small', null, ` ${hhmm(new Date(e.start))}–${hhmm(new Date(e.end))}`));
        else chip.append(el('small', null, ' تمام‌روز'));
        ad.append(chip);
      }
      wrap.append(ad);
    }

    // جلسه‌های واقعی + کارهای زمان‌بندی‌شدهٔ امروز، به ترتیب زمان
    const items = dayItems(events, tasks, now);
    if (!items.length) {
      const e = el('div', 'tl-empty', background.length
        ? 'جلسهٔ ساعت‌داری امروز نداری. یک کار را بکش اینجا تا برایش وقت بگذاری.'
        : 'جلسه‌ای در تقویم امروز نیست 🙂 — کاری را از «کارهای امروز» بکش اینجا.');
      wrap.append(e);
      return;
    }

    let nowPlaced = false;
    let prevEnd = null;
    for (const it of items) {
      const st = it.start, en = it.end;
      if (!nowPlaced && now < st) { wrap.append(nowMarker(now)); nowPlaced = true; }
      if (prevEnd) {
        const gapMin = Math.round((st - prevEnd) / 60000);
        if (gapMin >= 25) wrap.append(gapNode(prevEnd, st, gapMin, prevEnd <= now && now < st));
      }
      wrap.append(it.type === 'meeting'
        ? meetingNode(it.ev, st, en, now, tasks)
        : taskBlockNode(it.task, st, en, now));
      prevEnd = en;
    }
    if (!nowPlaced && (!prevEnd || now >= prevEnd)) wrap.append(nowMarker(now, true));
  }

  function nowMarker(now, atEnd) {
    const m = el('div', 'tl-now');
    m.append(el('div', 'tl-time tl-now-time', hhmm(now)));
    const rail = el('div', 'tl-rail tl-rail-now');
    rail.append(el('span', 'tl-now-dot'));
    m.append(rail);
    m.append(el('div', 'tl-now-label', atEnd ? 'الان · جلسه‌های امروز تمام شد' : 'الان'));
    return m;
  }

  function gapNode(gapStart, gapEnd, min, isNow) {
    const gp = el('div', 'tl-gap' + (isNow ? ' is-now' : ''));
    gp.append(el('div', 'tl-time', hhmm(gapStart)));
    const rail = el('div', 'tl-rail tl-rail-gap');
    gp.append(rail);
    const label = el('div', 'tl-gap-label', `${humanDur(min)} فضای آزاد${isNow ? ' · همین حالا' : ''}`);
    gp.append(label);
    // مقصدِ رها کردنِ کار برای زمان‌بندی
    gp.addEventListener('dragover', e => { e.preventDefault(); gp.classList.add('drop-over'); });
    gp.addEventListener('dragleave', () => gp.classList.remove('drop-over'));
    gp.addEventListener('drop', async e => {
      e.preventDefault(); gp.classList.remove('drop-over');
      if (dragId) await scheduleTask(dragId, gapStart, gapEnd);
    });
    return gp;
  }

  function taskBlockNode(t, st, en, now) {
    const past = now >= en;
    const li = el('div', 'tl-item tl-task' + (past ? ' tl-past' : ''));
    const time = el('div', 'tl-time');
    time.append(document.createTextNode(hhmm(st)));
    time.append(el('small', null, `تا ${hhmm(en)}`));
    const rail = el('div', 'tl-rail');
    rail.append(el('span', 'tl-dot tl-dot-task'));
    const body = el('div', 'tl-body');
    const titleRow = el('div', 'tl-task-title');
    const chk = svgBtn('check tl-task-check', ICONS.check, 'انجام شد');
    chk.addEventListener('click', () => completeTask(t.id));
    titleRow.append(chk, el('span', null, t.title));
    body.append(titleRow);
    const acts = el('div', 'tl-actions');
    const clr = el('button', 'tl-link', 'برداشتن زمان');
    clr.addEventListener('click', async () => { await Store.updateTask(t.id, { slot: null }); await renderAll(); toast('زمان برداشته شد'); });
    acts.append(clr);
    body.append(acts);
    li.append(time, rail, body);
    return li;
  }

  function meetingNode(ev, st, en, now, tasks) {
    const state = now >= en ? 'past' : (st <= now ? 'now' : 'future');
    const li = el('div', 'tl-item tl-' + state);
    const time = el('div', 'tl-time');
    time.append(document.createTextNode(hhmm(st)));
    time.append(el('small', null, `تا ${hhmm(en)}`));
    const rail = el('div', 'tl-rail');
    rail.append(el('span', 'tl-dot'));
    const body = el('div', 'tl-body');
    body.append(el('div', 'tl-title', ev.title));
    if ((ev.attendees || []).length) {
      body.append(el('div', 'tl-people', ev.attendees.join('، ')));
    }
    const acts = el('div', 'tl-actions');
    const href = cleanMeetUrl(ev.meet);
    if (href && state !== 'past') {
      const a = el('a', 'meeting-join', 'ورود ↗');
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      acts.append(a);
    }
    if (state !== 'past') {
      const prep = el('button', 'tl-link', 'آماده‌سازی');
      prep.addEventListener('click', () => openBrief(ev));
      acts.append(prep);
    }
    const goBtn = el('button', 'tl-link', 'صورت‌جلسه ←');
    goBtn.title = 'رفتن به صفحهٔ این جلسه در بخش جلسه‌ها';
    goBtn.addEventListener('click', () => goToMeeting(ev));
    acts.append(goBtn);
    body.append(acts);
    li.append(time, rail, body);
    return li;
  }

  // ---------- پیگیری‌ها و قول‌ها ----------
  // نشانِ وضعیتِ پیگیری — «چند روز است منتظرم» و «کِی آخرین بار تلنگر زدم»
  function fuStateChip(t, now) {
    const st = Store.followupState(t, now);
    const c = el('span', 'fu-state fu-' + st.level, st.label);
    c.title = st.nudgeCount
      ? `${J.faDigits(st.waitingDays)} روز از سپردن · ${J.faDigits(st.nudgeCount)} بار تلنگر زده‌ای`
      : `${J.faDigits(st.waitingDays)} روز از سپردن · هنوز تلنگری نزده‌ای`;
    return { chip: c, state: st };
  }

  async function nudge(t) {
    await Store.nudgeTask(t.id);
    await renderAll();
    toast('تلنگر ثبت شد — شمارش از امروز');
  }

  function fuRow(t, now, withRemind) {
    const row = el('div', 'fu-item');
    const chk = svgBtn('check', ICONS.check, 'انجام شد');
    chk.addEventListener('click', () => completeTask(t.id));
    const body = el('div', 'fu-body');
    body.append(el('div', 'fu-title', t.title));
    const meta = el('div', 'fu-meta');
    if (t.who) meta.append(el('span', null, t.who));
    const { chip, state } = fuStateChip(t, now);
    meta.append(chip);
    if (t.due && state.level !== 'late') meta.append(el('span', null, J.relLabel(t.due, now)));
    body.append(meta);
    row.append(chk, body);
    if (withRemind) {
      const acts = el('div', 'fu-acts');
      // وقتی واقعاً وقتش است، «پیش‌نویس» کنشِ اصلی می‌شود
      const draft = el('button', 'fu-remind' + (state.level === 'fresh' ? '' : ' is-due'), 'پیش‌نویس یادآوری');
      draft.title = 'یک پیام آماده می‌کند تا برایش بفرستی';
      draft.addEventListener('click', () => openFollowup(t));
      // برای وقتی که بیرون از منشی پیگیری کرده‌ای (زنگ زدی، حضوری گفتی)
      const did = svgBtn('fu-nudged', ICONS.bell, 'خودم پیگیری کردم — شمارش از امروز');
      did.addEventListener('click', () => nudge(t));
      acts.append(draft, did);
      row.append(acts);
    }
    return row;
  }

  // «منتظرِ دیگران» — پیگیری کارهایی که به دیگران سپرده‌ای (داخلِ ستونِ تمرکز)
  function renderFollowups(tasks) {
    const now = new Date();
    // ترتیب: اول آنچه از موعد گذشته، بعد آنچه بیشتر بی‌خبر مانده
    const theirs = Store.followups(tasks, now);
    const wrap = $('#focusWaiting');
    const fu = $('#followupList');
    fu.replaceChildren();
    if (!theirs.length) { if (wrap) wrap.hidden = true; return; }
    if (wrap) wrap.hidden = false;
    theirs.forEach(t => fu.append(fuRow(t, now, true)));
  }

  // پاپ‌آور توضیحاتِ کار (توضیح بده که چی شد)
  function openNotePopover(anchor, t) {
    closePops();
    const pop = el('div', 'resched-pop note-pop');
    pop.append(el('div', 'resched-head', 'توضیحاتِ کار'));
    const ta = el('textarea', 'note-pop-input');
    ta.value = t.notes || ''; ta.rows = 4;
    ta.placeholder = 'چی شد؟ نتیجه چی بود؟ هر توضیحی که خواستی…';
    ta.setAttribute('aria-label', 'توضیحات کار');
    pop.append(ta);
    const acts = el('div', 'note-pop-acts');
    const save = el('button', 'btn btn-primary btn-sm', 'ذخیره');
    save.addEventListener('click', async () => { closePops(); await Store.updateTask(t.id, { notes: ta.value }); await renderAll(); toast('توضیحات ذخیره شد ✓'); });
    acts.append(save);
    pop.append(acts);
    placePop(pop, anchor);
    setTimeout(() => ta.focus(), 0);
  }

  // ---------- برد کانبان ----------
  let tasksView = 'list';   // list | board
  let kanDragId = null;

  function renderTasksView() {
    const isBoard = tasksView === 'board';
    $('#taskListWrap').hidden = isBoard;
    $('#taskBoard').hidden = !isBoard;
    document.querySelectorAll('#tasksViewToggle .seg-btn')
      .forEach(b => b.classList.toggle('is-active', b.dataset.tview === tasksView));
    Store.getTasks().then(t => { renderTasksStats(t); isBoard ? renderKanban(t) : renderTodo(t); });
  }

  function renderKanban(tasks) {
    const board = $('#taskBoard');
    board.replaceChildren();
    const now = new Date();
    const mine = tasks.filter(t => t.dir === 'mine');
    const cols = [
      ['نکرده', 'todo', mine.filter(t => t.status === 'open' && t.stage !== 'doing')],
      ['در حال انجام', 'doing', mine.filter(t => t.status === 'open' && t.stage === 'doing')],
      ['انجام‌شده', 'done', mine.filter(t => t.status === 'done')
        .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')).slice(0, 30)]
    ];
    for (const [title, stage, list] of cols) {
      const col = el('div', 'kanban-col kanban-' + stage);
      col.dataset.stage = stage;
      const head = el('div', 'kanban-col-head');
      head.append(el('span', 'kanban-col-title', title));
      head.append(el('span', 'kanban-col-count', J.faDigits(list.length)));
      col.append(head);
      const body = el('div', 'kanban-col-body');
      if (!list.length) body.append(el('div', 'kanban-empty', 'کاری اینجا نیست'));
      for (const t of list) body.append(kanbanCard(t, now));
      col.append(body);
      col.addEventListener('dragover', e => { if (kanDragId) { e.preventDefault(); col.classList.add('drop-over'); } });
      col.addEventListener('dragleave', () => col.classList.remove('drop-over'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('drop-over');
        if (kanDragId) await moveToStage(kanDragId, stage);
      });
      board.append(col);
    }
  }

  function kanbanCard(t, now) {
    const done = t.status === 'done';
    const card = el('div', 'kanban-card' + (done ? ' is-done' : ''));
    card.draggable = true; card.dataset.id = t.id;
    card.addEventListener('dragstart', e => {
      kanDragId = t.id; card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', t.id); } catch (_) {}
    });
    card.addEventListener('dragend', () => {
      kanDragId = null; card.classList.remove('dragging');
      document.querySelectorAll('.kanban-col.drop-over').forEach(c => c.classList.remove('drop-over'));
    });
    card.append(el('div', 'kanban-card-title', t.title));
    const chips = el('div', 'todo-chips');
    if (t.due && !done) {
      const d = Store.daysDiff(t.due, now);
      const cls = d < 0 ? 'chip-due-overdue' : d === 0 ? 'chip-due-today' : 'chip-due-future';
      chips.append(el('span', 'chip ' + cls, J.relLabel(t.due, now)));
    }
    for (const tag of t.tags || []) {
      const tc = el('span', 'chip chip-tag');
      tc.append(el('span', 'todo-tag-hash', '#'), document.createTextNode(tag));
      chips.append(tc);
    }
    if (t.source === 'monshi' || t.meetingRef) chips.append(meetingChip(t));
    if (chips.children.length) card.append(chips);
    if (t.notes) card.append(el('div', 'kanban-card-note', t.notes));
    const foot = el('div', 'kanban-card-foot');
    const noteB = svgBtn('kc-act' + (t.notes ? ' is-on' : ''), ICONS.note, t.notes ? 'توضیحات' : 'افزودن توضیح');
    noteB.addEventListener('click', () => openNotePopover(noteB, t));
    const delB = svgBtn('kc-act kc-del', ICONS.trash, 'حذف');
    delB.addEventListener('click', async () => {
      const removed = await Store.removeTask(t.id);
      await renderAll();
      toast('حذف شد', async () => { await Store.restoreTask(removed); renderAll(); });
    });
    foot.append(noteB, delB);
    card.append(foot);
    return card;
  }

  async function moveToStage(id, stage) {
    const t = (await Store.getTasks()).find(x => x.id === id);
    if (!t) return;
    if (stage === 'done') { if (t.status !== 'done') await completeTask(id); return; }
    if (t.status === 'done') await Store.toggleDone(id); // بازکردن → stage=todo
    await Store.updateTask(id, { stage });
    await renderAll();
  }

  document.querySelectorAll('#tasksViewToggle .seg-btn').forEach(b =>
    b.addEventListener('click', () => { tasksView = b.dataset.tview; renderTasksView(); }));

  async function completeTask(id) {
    const res = await Store.toggleDone(id);
    await renderAll();
    if (!res || res.task.status !== 'done') return;
    const msg = res.spawned ? `آفرین ✓ — تکرار بعدی: ${J.relLabel(res.spawned.due)}` : 'آفرین ✓ انجام شد';
    toast(msg, async () => {
      if (res.spawned) {
        await Store.removeTask(res.spawned.id);
        await Store.updateTask(id, { status: 'open', doneAt: null, recur: res.spawned.recur });
      } else {
        await Store.updateTask(id, { status: 'open', doneAt: null });
      }
      renderAll();
    });
  }

  // ---------- افزودن سریع ----------
  const quickInput = $('#quickInput');
  quickInput.addEventListener('input', () => {
    const { due, recur } = DateParser.parse(quickInput.value);
    const chip = $('#dueChip');
    chip.hidden = !due;
    if (due) chip.textContent = 'ددلاین: ' + J.relLabel(due);
    const rc = $('#recurChip');
    rc.hidden = !recur;
    if (recur) rc.textContent = '🔁 ' + DateParser.recurLabel(recur);
  });
  $('#delegateCheck').addEventListener('change', e => {
    $('#delegateName').hidden = !e.target.checked;
    if (e.target.checked) $('#delegateName').focus();
  });
  $('#quickAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const { title, due, recur, tags } = DateParser.parse(quickInput.value);
    if (!title) return;
    const delegated = $('#delegateCheck').checked;
    await Store.addTask({
      title, due, recur, tags,
      dir: delegated ? 'theirs' : 'mine',
      who: delegated ? $('#delegateName').value.trim() || null : null
    });
    quickInput.value = '';
    $('#dueChip').hidden = true;
    $('#recurChip').hidden = true;
    $('#delegateCheck').checked = false;
    $('#delegateName').hidden = true; $('#delegateName').value = '';
    await renderAll();
    toast(recur ? `ثبت شد — ${DateParser.recurLabel(recur)}` : due ? `ثبت شد — ${J.relLabel(due)}` : 'ثبت شد');
    quickInput.focus();
  });

  // جابه‌جایی بین حالت‌های کامپوزر: کار سریع ⇄ یادداشت امروز
  document.querySelectorAll('.composer-tab').forEach(tab => tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    document.querySelectorAll('.composer-tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.composer-pane').forEach(p => { p.hidden = p.dataset.pane !== mode; });
    const inp = $(mode === 'note' ? '#scratchInput' : '#quickInput');
    if (inp) inp.focus();
  }));

  // افزودنِ سریع در خودِ صفحهٔ «کارها»
  const tqInput = $('#tasksQuickInput');
  tqInput.addEventListener('input', () => {
    const { due, recur } = DateParser.parse(tqInput.value);
    const dc = $('#tqDueChip'); dc.hidden = !due; if (due) dc.textContent = 'ددلاین: ' + J.relLabel(due);
    const rc = $('#tqRecurChip'); rc.hidden = !recur; if (recur) rc.textContent = '🔁 ' + DateParser.recurLabel(recur);
  });
  // انتخابِ فرد/جلسه برای کارِ در حالِ ثبت
  let tqPerson = null;   // { id, name, email }
  let tqMeeting = null;  // { id, title }
  function paintTqLinks() {
    const pl = $('#tqPersonLabel'), ml = $('#tqMeetingLabel');
    pl.textContent = tqPerson ? tqPerson.name : 'فرد';
    ml.textContent = tqMeeting ? tqMeeting.title.slice(0, 18) : 'جلسه';
    $('#tqPersonBtn').classList.toggle('is-on', !!tqPerson);
    $('#tqMeetingBtn').classList.toggle('is-on', !!tqMeeting);
    $('#tqPersonBtn').title = tqPerson ? `${tqPerson.name}${tqPerson.email ? ' · ' + tqPerson.email : ''} — برای برداشتن دوباره بزن` : 'وصل به یک نفر';
    $('#tqMeetingBtn').title = tqMeeting ? `${tqMeeting.title} — برای برداشتن دوباره بزن` : 'وصل به یک جلسه';
  }

  // انتخابگرِ فرد: از پروندهٔ آدم‌ها (هم‌نام‌ها با ایمیل تفکیک می‌شوند) + افزودنِ فردِ تازه
  $('#tqPersonBtn').addEventListener('click', async () => {
    if (tqPerson) { tqPerson = null; paintTqLinks(); return; }
    closePops();
    const [tasks, evc, meta] = await Promise.all([Store.getTasks(), Store.getEvents(), Store.getPeopleMeta()]);
    const people = Store.peopleFiles(tasks, new Date(), evc.events, meta);
    const pop = el('div', 'resched-pop');
    pop.append(el('div', 'resched-head', 'وصل به کدام نفر؟'));
    if (!people.length) pop.append(el('div', 'resched-empty', 'هنوز کسی در «آدم‌ها» نیست'));
    for (const p of people.slice(0, 12)) {
      const b = el('button', 'resched-opt');
      b.append(el('span', 'resched-time', p.name));
      // برای هم‌نام‌ها ایمیل حتماً نشان داده می‌شود تا اشتباه انتخاب نشود
      if (p.email || p.dupName) b.append(el('span', 'resched-sub', p.email || 'بدون ایمیل'));
      b.addEventListener('click', () => {
        closePops();
        tqPerson = { id: p.id, name: p.name, email: p.email || '' };
        paintTqLinks(); tqInput.focus();
      });
      pop.append(b);
    }
    // فردِ تازه
    const form = el('form', 'qa-new-person');
    const nameI = el('input', 'sub-add-input'); nameI.placeholder = 'نامِ فردِ تازه';
    const mailI = el('input', 'sub-add-input'); mailI.placeholder = 'ایمیل (اختیاری)'; mailI.type = 'email';
    const okB = el('button', 'sub-add-btn'); okB.type = 'submit'; okB.innerHTML = ICONS.plus; okB.title = 'افزودن';
    form.append(nameI, mailI, okB);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const nm = nameI.value.trim(); if (!nm) return;
      const email = mailI.value.trim();
      const id = await Store.savePerson({ name: nm, email, manual: true });
      closePops();
      tqPerson = { id, name: nm, email };
      paintTqLinks(); tqInput.focus();
    });
    pop.append(form);
    placePop(pop, $('#tqPersonBtn'));
    setTimeout(() => nameI.focus(), 0);
  });

  // انتخابگرِ جلسه: جلسه‌های ضبط‌شده + رویدادهای تقویمِ همین هفته
  $('#tqMeetingBtn').addEventListener('click', async () => {
    if (tqMeeting) { tqMeeting = null; paintTqLinks(); return; }
    closePops();
    const [sessions, evc] = await Promise.all([Store.getSessions(), Store.getEvents()]);
    const pop = el('div', 'resched-pop');
    pop.append(el('div', 'resched-head', 'وصل به کدام جلسه؟'));
    const items = [];
    for (const s of (sessions || []).slice(0, 10)) items.push({ id: s.id, title: s.title || 'جلسه', when: s.startedAt ? new Date(s.startedAt) : null, rec: true });
    const now = new Date();
    for (const e2 of (evc.events || []).filter(x => Math.abs(new Date(x.start) - now) < 7 * 86400000).slice(0, 10)) {
      if (items.some(i => normTitle(i.title) === normTitle(e2.title))) continue;
      items.push({ id: '', title: e2.title, when: new Date(e2.start), rec: false });
    }
    if (!items.length) pop.append(el('div', 'resched-empty', 'جلسه‌ای پیدا نشد'));
    for (const it of items) {
      const b = el('button', 'resched-opt');
      b.append(el('span', 'resched-time', it.title));
      b.append(el('span', 'resched-sub', (it.rec ? 'صورت‌جلسه · ' : '') + (it.when ? J.relLabel(J.iso(it.when), now) : '')));
      b.addEventListener('click', () => { closePops(); tqMeeting = { id: it.id, title: it.title }; paintTqLinks(); tqInput.focus(); });
      pop.append(b);
    }
    placePop(pop, $('#tqMeetingBtn'));
  });

  $('#tasksQuickAdd').addEventListener('submit', async e => {
    e.preventDefault();
    const { title, due, recur, tags } = DateParser.parse(tqInput.value);
    if (!title) return;
    await Store.addTask({
      title, due, recur, tags,
      dir: tqPerson ? 'theirs' : 'mine',
      who: tqPerson ? tqPerson.name : null,
      whoId: tqPerson ? tqPerson.id : null,
      meetingRef: tqMeeting ? `${tqMeeting.id} · ${tqMeeting.title}` : null,
      source: tqMeeting ? 'monshi' : 'manual'
    });
    tqInput.value = ''; $('#tqDueChip').hidden = true; $('#tqRecurChip').hidden = true;
    tqPerson = null; tqMeeting = null; paintTqLinks();
    await renderAll();
    toast(recur ? `ثبت شد — ${DateParser.recurLabel(recur)}` : due ? `ثبت شد — ${J.relLabel(due)}` : 'ثبت شد');
    tqInput.focus();
  });

  // ---------- پیش‌نویس یادآوری ----------
  function followupTemplate(t) {
    const name = t.who ? `${t.who} عزیز، سلام` : 'سلام';
    const dueTxt = t.due ? `قرارمون ${J.relLabel(t.due)} بود و ` : '';
    return `${name} 🙌\nببخشید که پیگیر می‌شم — ${dueTxt}می‌خواستم ببینم «${t.title}» به کجا رسید؟\nاگه چیزی از سمت من لازمه بگو. ممنونم 🙏`;
  }
  function openFollowup(t) {
    followupTaskId = t.id;
    $('#fuText').value = followupTemplate(t);
    $('#followupModal').hidden = false;
  }
  $('#fuCopy').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('#fuText').value);
    $('#followupModal').hidden = true;
    // کپی‌کردنِ پیام یعنی داری تلنگر می‌زنی — خودش ثبت می‌شود تا کاربر
    // مجبور نباشد یک کارِ دستیِ اضافه انجام دهد
    if (followupTaskId) { await Store.nudgeTask(followupTaskId); await renderAll(); }
    toast('پیام کپی شد — فقط بفرستش · تلنگر ثبت شد');
  });
  $('#fuAi').addEventListener('click', async () => {
    const s = await Store.getSettings();
    if (!AIClient.configured(s)) { toast('اول در تنظیمات، اتصال AI را کامل کن'); return; }
    const btn = $('#fuAi');
    btn.disabled = true; btn.textContent = 'در حال بازنویسی…';
    try {
      const out = await AIClient.chat(s, [
        { role: 'system', content: 'یک پیام کوتاه پیگیری کاری به فارسی روان و مؤدب بازنویسی کن. فقط متن پیام را بده، بدون توضیح اضافه.' },
        { role: 'user', content: $('#fuText').value }
      ], { maxTokens: 300 });
      $('#fuText').value = out;
    } catch (err) { toast(err.message); }
    btn.disabled = false; btn.textContent = 'بازنویسی با AI';
  });

  // ---------- جمع‌بندی روز ----------
  async function renderDayEnd(tasks, settings) {
    const now = new Date();
    const g = Store.grouped(tasks, now);
    const remaining = [...g.overdue, ...g.today];
    const doneToday = tasks.filter(t => t.doneAt && new Date(t.doneAt).toDateString() === now.toDateString());
    const banner = $('#dayEndBanner');
    const show = now.getHours() >= (settings.dayEndHour || 17) && (remaining.length || doneToday.length);
    banner.hidden = !show;
    if (show) {
      $('#dayEndHint').textContent =
        ` — ${J.faDigits(doneToday.length)} کار بستی، ${J.faDigits(remaining.length)} کار مونده`;
    }
    $('#dayEndOpen').onclick = () => {
      const body = $('#dayEndBody');
      body.replaceChildren();
      const wrap = el('div', 'de-list');
      if (doneToday.length) {
        wrap.append(el('h3', null, `انجام شد (${J.faDigits(doneToday.length)})`));
        const ul = el('ul');
        doneToday.forEach(t => ul.append(el('li', 'de-done', '✓ ' + t.title)));
        wrap.append(ul);
      }
      if (remaining.length) {
        wrap.append(el('h3', null, `مانده (${J.faDigits(remaining.length)})`));
        const ul = el('ul');
        remaining.forEach(t => ul.append(el('li', 'de-open', '○ ' + t.title)));
        wrap.append(ul);
      }
      if (!doneToday.length && !remaining.length) wrap.append(el('p', null, 'روز خلوتی بود.'));
      body.append(wrap);
      $('#deMoveAll').disabled = !remaining.length;
      $('#dayEndModal').hidden = false;
    };
    $('#deMoveAll').onclick = async () => {
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      for (const t of remaining) await Store.updateTask(t.id, { due: J.iso(tomorrow) });
      $('#dayEndModal').hidden = true;
      await renderAll();
      toast('مانده‌ها رفت برای فردا — شب خوش 🌙');
    };
  }

  // ---------- گزارش ----------
  $('#weekRangeSel').addEventListener('change', e => { currentWeek = Number(e.target.value); renderReport(); });

  function buildReportText(st) {
    const L = [];
    L.push(`گزارش هفته — ${J.format(st.start, { weekday: false })} تا ${J.format(new Date(st.end - 86400000), { weekday: false })}`);
    L.push('');
    if (st.meetings) L.push(`• ${J.faDigits(st.meetings)} جلسه (${J.faDigits(st.meetingHours)} ساعت)`);
    L.push(`• ${J.faDigits(st.done)} کار انجام شد، ${J.faDigits(st.created)} کار جدید تعریف شد`);
    if (st.overdue) L.push(`• ${J.faDigits(st.overdue)} کار عقب‌افتاده باز است`);
    if (st.waiting) L.push(`• ${J.faDigits(st.waiting)} مورد در انتظار دیگران`);
    if (st.doneTitles.length) {
      L.push('', 'انجام‌شده‌ها:');
      st.doneTitles.slice(0, 12).forEach(t => L.push(`  ✓ ${t}`));
    }
    if (st.overdueTitles.length) {
      L.push('', 'عقب‌افتاده‌ها:');
      st.overdueTitles.slice(0, 8).forEach(t => L.push(`  ! ${t}`));
    }
    if (st.waitingTitles.length) {
      L.push('', 'در انتظار دیگران:');
      st.waitingTitles.slice(0, 8).forEach(t => L.push(`  ⏳ ${t}`));
    }
    return L.join('\n');
  }

  async function renderReport() {
    const tasks = await Store.getTasks();
    const { events } = await Store.getEvents();
    const st = Store.weekStats(tasks, events, new Date(), currentWeek);
    $('#reportRange').textContent =
      `${J.format(st.start, { weekday: false })} تا ${J.format(new Date(st.end - 86400000), { weekday: false })}`;

    const stats = [
      [st.meetingHours, 'ساعت جلسه', 'stat-blue'],
      [st.done, 'کار انجام‌شده', 'stat-accent'],
      [st.created, 'کار تعریف‌شده', ''],
      [st.overdue, 'عقب‌افتاده', st.overdue ? 'stat-red' : ''],
      [st.waiting, 'در انتظار دیگران', '']
    ];
    const row = $('#statRow');
    row.replaceChildren();
    for (const [num, label, cls] of stats) {
      const s = el('div', 'stat ' + cls);
      s.append(el('div', 'stat-num', J.faDigits(num)));
      s.append(el('div', 'stat-label', label));
      row.append(s);
    }

    const chart = $('#weekChart');
    chart.replaceChildren();
    const max = Math.max(...st.donePerDay, 1);
    st.donePerDay.forEach((v, i) => {
      const col = el('div', 'chart-col');
      col.tabIndex = 0;
      col.title = `${J.WEEKDAYS[i]}: ${J.faDigits(v)} کار انجام‌شده`;
      col.setAttribute('aria-label', col.title);
      col.append(el('div', 'chart-val', v ? J.faDigits(v) : ''));
      const bar = el('div', 'chart-bar' + (v ? '' : ' is-zero'));
      bar.style.height = v ? Math.round(v / max * 100) + '%' : '3px';
      col.append(bar);
      col.append(el('div', 'chart-day', J.WEEKDAYS[i].slice(0, 1) === 'س' ? J.WEEKDAYS[i].slice(0, 2) : J.WEEKDAYS[i].slice(0, 1)));
      chart.append(col);
    });
    chart.setAttribute('aria-label', `کارهای انجام‌شده در هر روز هفته؛ بیشترین: ${J.faDigits(max)}`);

    $('#reportText').textContent = buildReportText(st);
    $('#managerOut').hidden = true;
  }

  $('#copyReport').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('#reportText').textContent);
    toast('گزارش کپی شد');
  });
  $('#managerReport').addEventListener('click', async () => {
    const s = await Store.getSettings();
    if (!AIClient.configured(s)) { toast('اول در تنظیمات، اتصال AI را کامل کن'); return; }
    const btn = $('#managerReport');
    btn.disabled = true;
    try {
      const out = await AIClient.chat(s, [
        { role: 'system', content: 'از دادهٔ خام زیر یک گزارش هفتگی کوتاه و حرفه‌ای برای ارسال به مدیر بنویس: فارسی رسمی و روان، سوم‌شخص نباش («این هفته … انجام شد»)، بدون اغراق، فقط بر اساس داده‌ها، حداکثر ۱۲۰ کلمه. فقط متن گزارش را بده.' },
        { role: 'user', content: $('#reportText').textContent }
      ]);
      $('#managerText').textContent = out;
      $('#managerOut').hidden = false;
    } catch (err) { toast(err.message); }
    btn.disabled = false;
  });
  $('#copyManager').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('#managerText').textContent);
    toast('متن مدیر کپی شد');
  });

  // ---------- ماژول جلسه‌ها ----------
  const gicon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="6" width="12.4" height="12" rx="2.6"/><path d="M15.2 11l4.4-2.6a.7.7 0 0 1 1.1.6v6a.7.7 0 0 1-1.1.6l-4.4-2.6z"/></svg>';

  function fmtSessionDate(ms) {
    const d = new Date(ms);
    const time = J.faDigits(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    return `${J.format(d, { weekday: false })} · ${time}`;
  }

  $('#importMonshiBtn').addEventListener('click', () => $('#importMonshiFile').click());
  $('#importMonshiFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const res = await Store.importMonshiBackup(obj);
      await renderMeetingsModule();
      toast(res.added
        ? `${J.faDigits(res.added)} جلسه از منشی وارد شد${res.skipped ? `، ${J.faDigits(res.skipped)} تکراری رد شد` : ''} ✓`
        : 'جلسهٔ تازه‌ای برای افزودن نبود');
    } catch (err) {
      toast(err.message || 'فایل خوانده نشد');
    }
  });

  let meetingQuery = '';
  const searchInput = $('#meetingSearch');
  if (searchInput) searchInput.addEventListener('input', () => { meetingQuery = searchInput.value.trim().toLowerCase(); renderMeetingsModule(); });

  function sessionMatches(s, q) {
    if (!q) return true;
    q = searchNorm(q);
    if (!q) return true;
    if (searchNorm(s.title).includes(q)) return true;
    return (s.transcript || []).some(r => searchNorm(r.text).includes(q) || searchNorm(r.speaker).includes(q));
  }

  // ── دفتر تصمیم‌ها و ریسک‌ها ──────────────────────────────
  // موتور استخراج این‌ها را از هر جلسه بیرون می‌کشد ولی تا حالا فقط داخل سند دفن می‌شدند.
  let registerKind = 'decision';   // decision | risk
  function registerEntries(sessions, kind) {
    const out = [];
    for (const s of sessions) {
      const d = s.analysisData;
      if (!d) continue;
      const items = MeetNoteMoM.asItems(kind === 'decision' ? d.decisions : d.risks);
      for (const it of items) {
        const text = MeetNoteMoM.itemText(it, kind === 'decision'
          ? ['decision', 'text', 'title']
          : ['risk', 'text', 'title']);
        if (!text) continue;
        out.push({
          text,
          owner: (it && (it.owner || it.approver)) || '',
          due: (it && (it.deadline || it.effectiveDate)) || '',
          detail: (it && (it.rationale || it.context || it.impact || it.mitigation)) || '',
          status: (it && it.status) || '',
          sessionId: s.id,
          sessionTitle: s.title || 'جلسهٔ بدون عنوان',
          at: sessionTime(s)
        });
      }
    }
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  function renderRegister(sessions) {
    const wrap = $('#meetingRegister');
    wrap.replaceChildren();
    const seg = el('div', 'seg register-seg');
    seg.setAttribute('role', 'tablist');
    for (const [kind, label] of [['decision', 'تصمیم‌ها'], ['risk', 'ریسک‌ها']]) {
      const b = el('button', 'seg-btn' + (registerKind === kind ? ' is-active' : ''), label);
      b.addEventListener('click', () => { registerKind = kind; renderRegister(sessions); });
      seg.append(b);
    }
    wrap.append(seg);

    const all = registerEntries(sessions, registerKind);
    const q = searchNorm(meetingQuery);
    const rows = q ? all.filter(e => searchNorm(e.text + ' ' + e.detail + ' ' + e.owner + ' ' + e.sessionTitle).includes(q)) : all;

    if (!rows.length) {
      const e = el('div', 'module-placeholder card');
      e.append(el('h2', null, all.length ? 'چیزی با این جست‌وجو پیدا نشد'
        : (registerKind === 'decision' ? 'هنوز تصمیمی ثبت نشده' : 'هنوز ریسکی ثبت نشده')));
      e.append(el('p', null, all.length ? 'عبارت دیگری را امتحان کن.'
        : 'وقتی برای جلسه‌ای صورت‌جلسه ساخته شود، تصمیم‌ها و ریسک‌هایش خودکار اینجا جمع می‌شوند.'));
      wrap.append(e);
      return;
    }

    wrap.append(el('p', 'report-range', `${J.faDigits(rows.length)} مورد از ${J.faDigits(new Set(rows.map(r => r.sessionId)).size)} جلسه`));
    const list = el('div', 'register-list');
    for (const e of rows) {
      const card = el('div', 'register-item');
      card.append(el('div', 'register-text', e.text));
      if (e.detail) card.append(el('div', 'register-detail', e.detail));
      const meta = el('div', 'register-meta');
      if (e.owner) meta.append(el('span', 'chip chip-who', e.owner));
      if (e.due) meta.append(el('span', 'chip chip-due-future', e.due));
      if (e.status) meta.append(el('span', 'chip chip-tag', e.status));
      const go = el('button', 'register-src');
      go.innerHTML = ICONS.video;
      go.append(document.createTextNode(' ' + e.sessionTitle + ' · ' + J.relLabel(J.iso(new Date(e.at)))));
      go.addEventListener('click', () => openSession(e.sessionId));
      meta.append(go);
      card.append(meta);
      list.append(card);
    }
    wrap.append(list);
  }

  // ── جست‌وجو و پرسش در همهٔ جلسه‌ها ──────────────────────
  // دو حالت روی یک ورودی: جست‌وجوی کلیدواژه‌ای (فوری، بدون هوش مصنوعی) و
  // پرسش با هوش مصنوعی که پاسخ را فقط از قطعاتِ بازیابی‌شده می‌سازد و ارجاع می‌دهد.
  let askQuery = '', askMode = 'keyword', askBusy = false;
  let askAnswer = null;   // { text, sources }

  function renderAsk(sessions) {
    const wrap = $('#meetingAsk');
    wrap.replaceChildren();

    const form = el('form', 'ask-form');
    const inp = el('input', 'ask-input');
    inp.type = 'search';
    inp.placeholder = 'مثلاً: دربارهٔ ظرفیت سرور چه تصمیمی گرفتیم؟';
    inp.setAttribute('aria-label', 'جست‌وجو یا پرسش در همهٔ جلسه‌ها');
    inp.value = askQuery;
    const goSearch = el('button', 'btn btn-ghost', 'جست‌وجو');
    goSearch.type = 'submit';
    const goAsk = el('button', 'btn btn-primary');
    goAsk.type = 'button';
    goAsk.innerHTML = sparkSvg;
    goAsk.append(document.createTextNode(' پرسش از هوش مصنوعی'));
    goAsk.disabled = askBusy;
    form.append(inp, goSearch, goAsk);
    wrap.append(form);
    wrap.append(el('p', 'ask-hint', `در ${J.faDigits(sessions.length)} جلسه جست‌وجو می‌شود. «جست‌وجو» فوری و بدون ارسال چیزی به بیرون است؛ «پرسش» متنِ مرتبط را به سرویس هوش مصنوعیِ خودت می‌فرستد.`));

    form.addEventListener('submit', e => {
      e.preventDefault();
      askQuery = inp.value.trim(); askMode = 'keyword'; askAnswer = null;
      renderAsk(sessions);
    });
    goAsk.addEventListener('click', async () => {
      askQuery = inp.value.trim();
      if (!askQuery) { inp.focus(); return; }
      askMode = 'ai';
      await runAsk(sessions);
    });

    const body = el('div', 'ask-body');
    wrap.append(body);
    if (!askQuery) {
      const e = el('div', 'module-placeholder card');
      e.append(el('h2', null, 'در همهٔ جلسه‌ها بگرد یا سؤال بپرس'));
      e.append(el('p', null, 'مثلاً «قرارداد پشتیبانی به کجا رسید؟» — پاسخ فقط از روی متن جلسه‌های خودت ساخته می‌شود و به هر جلسه‌ای که استفاده کرده ارجاع می‌دهد.'));
      body.append(e);
      return;
    }

    if (askMode === 'ai') {
      if (askBusy) { body.append(el('div', 'ask-loading', 'در حال خواندن جلسه‌های مرتبط…')); return; }
      if (askAnswer) body.append(renderAnswer(askAnswer));
      return;
    }

    // ── حالت کلیدواژه‌ای ──
    const { tokens, groups } = MeetSearch.keywordResults(sessions, askQuery);
    if (!groups.length) {
      body.append(el('div', 'empty', 'در هیچ جلسه‌ای پیدا نشد.'));
      return;
    }
    const total = groups.reduce((n, g) => n + g.total, 0);
    body.append(el('p', 'report-range', `${J.faDigits(total)} مورد در ${J.faDigits(groups.length)} جلسه`));
    for (const g of groups) {
      const card = el('section', 'ask-group');
      const head = el('button', 'ask-group-head');
      head.append(el('span', 'ask-group-title', g.title));
      head.append(el('span', 'ask-group-date', g.date));
      head.append(el('span', 'ask-group-count', `${J.faDigits(g.total)} مورد`));
      head.addEventListener('click', () => openMeetingById(g.sessionId));
      card.append(head);
      for (const h of g.hits) {
        const line = el('div', 'ask-hit');
        line.append(el('span', 'ask-hit-ref', `T${J.faDigits(h.ref)}`));
        line.append(el('span', 'ask-hit-speaker', h.speaker + ':'));
        line.append(highlight(h.text, tokens));
        card.append(line);
      }
      body.append(card);
    }
  }

  // برجسته‌کردنِ واژه‌های پیداشده — با textContent تا متن جلسه هیچ‌وقت به HTML تبدیل نشود
  function highlight(text, tokens) {
    const box = el('span', 'ask-hit-text');
    const hay = MeetSearch.norm(text);
    const marks = [];
    for (const t of tokens) {
      let from = 0;
      while (true) {
        const at = hay.indexOf(t, from);
        if (at === -1) break;
        marks.push([at, at + t.length]); from = at + t.length;
      }
    }
    if (!marks.length) { box.textContent = text; return box; }
    marks.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const m of marks) {
      const last = merged[merged.length - 1];
      if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
      else merged.push([...m]);
    }
    let cur = 0;
    for (const [a, b] of merged) {
      if (a > cur) box.append(document.createTextNode(text.slice(cur, a)));
      box.append(el('mark', null, text.slice(a, b)));
      cur = b;
    }
    if (cur < text.length) box.append(document.createTextNode(text.slice(cur)));
    return box;
  }

  async function runAsk(sessions) {
    const settings = await Store.getSettings();
    if (!AIClient.configured(settings)) {
      toast('اول در تنظیمات یک اتصال هوش مصنوعی اضافه کن');
      document.querySelector('.rail-item[data-view="settings"]').click();
      return;
    }
    const { sources } = MeetSearch.retrieve(sessions, askQuery, { limit: 12, maxChars: 12000 });
    if (!sources.length) {
      askAnswer = { text: 'در جلسه‌های ثبت‌شده چیزی دربارهٔ این پرسش پیدا نشد.', sources: [] };
      renderAsk(sessions);
      return;
    }
    askBusy = true; askAnswer = null; renderAsk(sessions);
    try {
      const { system, user } = MeetSearch.buildQaPrompt(askQuery, sources);
      const profile = AIClient.activeProfile(settings);
      const text = await AIClient.chatStreamWith(profile,
        [{ role: 'system', content: system }, { role: 'user', content: user }],
        { maxTokens: 1600 });
      askAnswer = { text: MeetNoteMoM.cleanMarkdown(text), sources };
    } catch (err) {
      askAnswer = { text: '', error: err.message || 'پاسخ گرفته نشد', sources };
    } finally {
      askBusy = false;
      renderAsk(sessions);
    }
  }

  function renderAnswer(ans) {
    const box = el('div', 'ask-answer');
    if (ans.error) {
      const e = el('div', 'ask-error');
      e.append(el('strong', null, 'پاسخ گرفته نشد — '));
      e.append(document.createTextNode(ans.error));
      box.append(e);
    } else {
      const doc = el('div', 'ask-answer-body');
      renderMom(ans.text, doc);
      box.append(doc);
    }
    if (!ans.sources.length) return box;

    // فقط منابعی که واقعاً در پاسخ ارجاع داده شده‌اند برجسته می‌شوند
    const cited = new Set(MeetSearch.citedNumbers(ans.text || ''));
    const sec = el('section', 'ask-sources');
    sec.append(el('h3', 'ask-sources-title',
      cited.size ? `منابع پاسخ (${J.faDigits(cited.size)} از ${J.faDigits(ans.sources.length)} قطعهٔ بررسی‌شده)`
        : `قطعه‌های بررسی‌شده (${J.faDigits(ans.sources.length)})`));
    for (const s of ans.sources) {
      const used = cited.has(s.n);
      const item = el('div', 'ask-source' + (used ? ' is-cited' : ''));
      const head = el('button', 'ask-source-head');
      head.append(el('span', 'ask-source-n', `[${J.faDigits(s.n)}]`));
      head.append(el('span', 'ask-source-title', s.title));
      head.append(el('span', 'ask-source-date', s.date));
      if (s.kind === 'mom') head.append(el('span', 'chip chip-tag', 'صورت‌جلسه'));
      else head.append(el('span', 'ask-source-ref', `از خط ${J.faDigits(s.ref)}`));
      head.addEventListener('click', () => openMeetingById(s.sessionId));
      item.append(head);
      const ex = el('div', 'ask-source-text', s.text.length > 320 ? s.text.slice(0, 320) + '…' : s.text);
      item.append(ex);
      sec.append(item);
    }
    box.append(sec);
    return box;
  }

  let meetingsTab = 'list';
  $('#meetingsTabs')?.addEventListener('click', e => {
    const b = e.target.closest('[data-mtab]');
    if (!b) return;
    meetingsTab = b.dataset.mtab;
    $('#meetingsTabs').querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('is-active', x === b));
    renderMeetingsModule();
  });

  // ── جلسهٔ دستی ────────────────────────────────────────
  // همهٔ جلسه‌ها آنلاین نیستند؛ باید بشود جلسهٔ حضوری را دستی ساخت و
  // مشخصاتِ جلسهٔ ضبط‌شده را هم ویرایش کرد.
  let manualEditId = null;

  // متنِ چندخطی → نوبت‌های جلسه. یک تابع برای هر سه مسیر (ساخت دستی، ویرایش
  // مشخصات، ویرایشگر متن خام) تا رفتارشان با هم فرق نکند.
  // «نام: متن» فقط وقتی پیشوند واقعاً شبیه نام است — کوتاه، چندکلمه‌ای و بی‌نقطه —
  // وگرنه جمله‌ای مثل «مرحلهٔ بعد: ...» گوینده تلقی می‌شود.
  // واژه‌هایی که در متنِ جلسه برچسب‌اند، نه نامِ گوینده
  const NOT_A_NAME = /^(مرحلهٔ? بعد|قدم بعد|نتیجه|تصمیم|مصوبه|اقدام|ریسک|موضوع|خلاصه|جمع‌?بندی|پیشنهاد|نکته|یادداشت|توضیح|سؤال|سوال|پاسخ|هدف|وضعیت|مسئول|ددلاین|مهلت|تاریخ|حاضران|دستور جلسه)$/;

  function linesToTranscript(text, baseTime, knownNames) {
    const base = baseTime || Date.now();
    const known = new Set((knownNames || []).map(n => searchNorm(n)).filter(Boolean));
    return String(text || '').split('\n').map(s => s.trim()).filter(Boolean).map((raw, i) => {
      const m = raw.match(/^([^:：]{1,30})[:：]\s*(.+)$/);
      const name = m && m[1].trim();
      // نامِ شناخته‌شدهٔ همین جلسه قطعی است؛ وگرنه حدسِ محتاطانه‌ای می‌زنیم که
      // برچسب‌هایی مثل «مرحلهٔ بعد:» را گوینده حساب نکند.
      const isSpeaker = !!name && (
        known.has(searchNorm(name)) ||
        (name.split(/\s+/).length <= 3 && !/[.!?؟،]$/.test(name) && !NOT_A_NAME.test(name))
      );
      return isSpeaker
        ? { speaker: name, text: m[2].trim(), at: base + i * 1000 }
        : { speaker: 'گوینده', text: raw, at: base + i * 1000 };
    });
  }

  function parsePeopleInput(raw) {
    return String(raw || '').split(/[,،؛;\n]/).map(s => s.trim()).filter(Boolean).map(part => {
      const email = (part.match(/[^\s<>()]+@[^\s<>()]+\.[^\s<>()]+/) || [''])[0];
      const name = part.replace(email, '').replace(/[<>()]/g, '').trim();
      return { name: name || (email ? email.split('@')[0] : part), email };
    });
  }
  const peopleToInput = list => (list || [])
    .map(p => (p.email ? (p.name && p.name !== p.email.split('@')[0] ? `${p.name} <${p.email}>` : p.email) : p.name))
    .filter(Boolean).join('، ');

  function openManual(session) {
    manualEditId = session ? session.id : null;
    const start = session ? new Date(sessionTime(session) || Date.now()) : new Date();
    const dur = session && session.updatedAt
      ? Math.max(1, Math.round((new Date(session.updatedAt) - start) / 60000)) : 60;
    $('#manualTitle').textContent = session ? 'ویرایش مشخصات جلسه' : 'جلسهٔ دستی';
    $('#manualHint').textContent = session
      ? 'عنوان، زمان و شرکت‌کننده‌ها را می‌توانی اصلاح کنی. متنِ ضبط‌شده دست‌نخورده می‌ماند.'
      : 'برای جلسه‌های حضوری یا تلفنی که در Meet ضبط نشده‌اند.';
    $('#manualName').value = session ? (session.title || '') : '';
    $('#manualDate').value = J.iso(start);
    $('#manualTime').value = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    $('#manualDur').value = dur;
    $('#manualPeople').value = session ? peopleToInput(session.participants) : '';
    // متنِ ضبط‌شده را در ویرایش نشان نمی‌دهیم تا تصادفی بازنویسی نشود
    const isRecorded = !!(session && (session.transcript || []).length && session.source !== 'manual');
    $('#manualBodyField').hidden = isRecorded;
    $('#manualBody').value = session && !isRecorded
      ? (session.transcript || []).map(r => r.text).join('\n') : '';
    $('#manualModal').hidden = false;
    setTimeout(() => $('#manualName').focus(), 0);
  }

  $('#newManualBtn')?.addEventListener('click', () => openManual(null));

  $('#manualSave')?.addEventListener('click', async () => {
    const title = $('#manualName').value.trim();
    if (!title) { toast('عنوان جلسه لازم است'); $('#manualName').focus(); return; }
    const date = $('#manualDate').value || J.iso(new Date());
    const time = $('#manualTime').value || '09:00';
    const [hh, mm] = time.split(':').map(Number);
    const start = new Date(date + 'T00:00:00');
    start.setHours(hh || 0, mm || 0, 0, 0);
    const dur = Math.max(1, Math.min(1440, +$('#manualDur').value || 60));
    const participants = parsePeopleInput($('#manualPeople').value);
    const startedAt = start.getTime();
    const updatedAt = startedAt + dur * 60000;

    if (manualEditId) {
      const patch = { title, startedAt, updatedAt, participants };
      if (!$('#manualBodyField').hidden) {
        patch.transcript = linesToTranscript($('#manualBody').value, startedAt, participants.map(p => p.name));
      }
      await Store.updateSession(manualEditId, patch);
      for (const p of participants) if (p.name || p.email) await Store.savePerson({ ...p, lastMet: start.toISOString() });
      $('#manualModal').hidden = true;
      toast('مشخصات جلسه ذخیره شد ✓');
      openSession(manualEditId);
      return;
    }

    const body = $('#manualBody').value.trim();
    const session = {
      id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title, startedAt, updatedAt, source: 'manual', participants,
      transcript: linesToTranscript(body, startedAt, participants.map(p => p.name)),
      summary: '', actions: [], analysisData: null, analysisError: ''
    };
    await Store.upsertSession(session);
    for (const p of participants) if (p.name || p.email) await Store.savePerson({ ...p, lastMet: start.toISOString() });
    $('#manualModal').hidden = true;
    toast('جلسه ساخته شد ✓');
    goto('meetings');
    openSession(session.id);
  });

  async function renderMeetingsModule() {
    $('#meetingDetail').hidden = true;
    $('#meetingsArchive').hidden = false;
    const wrap = $('#meetingList2');
    wrap.replaceChildren();
    const all = await Store.getSessions();
    if (searchInput) searchInput.parentElement.style.display = all.length ? '' : 'none';
    $('#meetingsTabs').hidden = !all.length;
    if (!all.length) {
      $('#meetingRegister').hidden = true;
      $('#meetingAsk').hidden = true;
      const e = el('div', 'module-placeholder card');
      e.innerHTML = gicon;
      e.append(el('h2', null, 'هنوز جلسه‌ای ثبت نشده'));
      e.append(el('p', null, 'در Google Meet روی دکمهٔ «شروع ثبت جلسه» بزنید؛ متن ثبت می‌شود و جلسه اینجا ظاهر می‌شود. یا از پشتیبان منشی وارد کنید.'));
      wrap.append(e);
      return;
    }
    // تبِ «تصمیم‌ها و ریسک‌ها» — همان جست‌وجوی بالا رویش هم کار می‌کند
    const searchWrap = searchInput && searchInput.parentElement;
    if (meetingsTab === 'register') {
      wrap.hidden = true;
      $('#meetingRegister').hidden = false;
      $('#meetingAsk').hidden = true;
      if (searchWrap) searchWrap.style.display = '';
      if (searchInput) searchInput.placeholder = 'جست‌وجو در تصمیم‌ها و ریسک‌ها…';
      renderRegister(all);
      return;
    }
    // تبِ پرسش ورودیِ خودش را دارد؛ نوار جست‌وجوی بالا آنجا اضافی است
    if (meetingsTab === 'ask') {
      wrap.hidden = true;
      $('#meetingRegister').hidden = true;
      $('#meetingAsk').hidden = false;
      if (searchWrap) searchWrap.style.display = 'none';
      renderAsk(all);
      return;
    }
    wrap.hidden = false;
    $('#meetingRegister').hidden = true;
    $('#meetingAsk').hidden = true;
    if (searchWrap) searchWrap.style.display = '';
    if (searchInput) searchInput.placeholder = 'جست‌وجو در عنوان و متن جلسه‌ها…';
    const sessions = all.filter(s => sessionMatches(s, meetingQuery))
      .sort(byNewest);
    if (!sessions.length) { wrap.append(el('div', 'empty', 'جلسه‌ای با این جست‌وجو پیدا نشد')); return; }
    const list = el('div', 'session-list');
    for (const s of sessions) {
      const card = el('div', 'session-card');
      card.setAttribute('role', 'button'); card.tabIndex = 0;
      const icon = el('span', 'session-icon'); icon.innerHTML = gicon;
      const body = el('div', 'session-body');
      body.append(el('div', 'session-title', s.title || 'جلسهٔ بدون عنوان'));
      const meta = el('div', 'session-meta');
      meta.append(el('span', null, fmtSessionDate(s.startedAt)));
      meta.append(el('span', null, `${J.faDigits((s.transcript || []).length)} خط گفت‌وگو`));
      if ((s.actions || []).length) meta.append(el('span', null, `${J.faDigits(s.actions.length)} اقدام`));
      body.append(meta);
      const status = el('span', 'session-status ' + (s.summary ? 'ready' : 'raw'), s.summary ? 'صورت‌جلسه آماده' : 'خام');
      const del = svgBtn('session-del', ICONS.trash, 'حذف جلسه');
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const removed = await Store.removeSession(s.id);
        await renderMeetingsModule();
        toast('جلسه حذف شد', async () => { await Store.upsertSession(removed); renderMeetingsModule(); });
      });
      card.append(icon, body, status, del);
      card.addEventListener('click', () => openSession(s.id));
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSession(s.id); } });
      list.append(card);
    }
    wrap.append(list);
  }

  // رندر امنِ مارک‌داون سند (فقط عنوان/بولد/فهرست/جدول؛ همه با textContent)
  function renderMom(md, container) {
    container.replaceChildren();
    const lines = md.split('\n');
    let i = 0, listBuf = null;
    const flushList = () => { if (listBuf) { container.append(listBuf); listBuf = null; } };
    const inline = (parent, text) => {
      // فقط **bold** — بقیه متن خام
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      for (const p of parts) {
        if (/^\*\*[^*]+\*\*$/.test(p)) parent.append(el('strong', null, p.slice(2, -2)));
        else if (p) parent.append(document.createTextNode(p));
      }
    };
    while (i < lines.length) {
      const line = lines[i];
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())) {
        flushList();
        const header = line.split('|').slice(1, -1).map(c => c.trim());
        i += 2;
        const table = el('table', 'mom-table');
        const thead = el('thead'); const htr = el('tr');
        header.forEach(h => htr.append(el('th', null, h))); thead.append(htr); table.append(thead);
        const tbody = el('tbody');
        while (i < lines.length && /^\|/.test(lines[i])) {
          const cells = lines[i].split('|').slice(1, -1).map(c => c.trim().replace(/\\\|/g, '|'));
          const tr = el('tr');
          cells.forEach(c => { const td = el('td'); inline(td, c); tr.append(td); });
          tbody.append(tr); i++;
        }
        table.append(tbody);
        const scroll = el('div', 'mom-table-wrap'); scroll.append(table); container.append(scroll);
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.*)/);
      if (h) { flushList(); container.append(el('h' + (h[1].length + 1), 'mom-h', h[2])); i++; continue; }
      const li = line.match(/^\s*[*-]\s+(.*)/) || line.match(/^\s*\d+\.\s+(.*)/);
      if (li) { if (!listBuf) listBuf = el('ul', 'mom-ul'); const item = el('li'); inline(item, li[1]); listBuf.append(item); i++; continue; }
      if (line.trim() === '---') { flushList(); container.append(el('hr')); i++; continue; }
      if (line.trim()) { flushList(); const p = el('p', 'mom-p'); inline(p, line); container.append(p); i++; continue; }
      flushList(); i++;
    }
    flushList();
  }

  const sparkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2l1.75 5.05L18.8 10l-5.05 1.75L12 16.8l-1.75-5.05L5.2 10l5.05-1.75z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg>';
  const fmtInt = n => J.faDigits(Number(n || 0).toLocaleString('en-US')).replace(/,/g, '٬');

  // ── «از جلسه‌ها چه ماند» (H‑۱ + H‑۲) ─────────────────
  // دو نوع سرِنخِ باز: اقدام‌هایی که به کارها نرفته‌اند، و جلسه‌هایی که صورت‌جلسه ندارند.
  // کلیدِ پایدارِ هر سرِنخ — تا «نادیده گرفتن» فقط همان مورد را ساکت کند، نه کلِ ردیف را
  const keyAction  = (s, a) => Store.looseKey('a', s.id, (a.text || '').trim());
  const keyMinutes = s => Store.looseKey('m', s.id);
  const keyMissed  = e => Store.looseKey('x', e.uid || e.title || '', new Date(e.start).getTime());

  let looseDismissed = {};

  function looseEnds(sessions, tasks, events, now, dismissed) {
    const dis = dismissed || {};
    const DAYS = 7, cutoff = now.getTime() - DAYS * 86400000;
    const recent = (sessions || []).filter(s => (s.startedAt || 0) >= cutoff);
    let hidden = 0;
    // ۱) اقدام‌های معطل
    let pendingActions = 0;
    const actionSessions = [], actionKeys = [];
    for (const s of recent) {
      const notSent = (s.actions || []).filter(a => a.text && actionStatus(a, s, tasks).kind === 'none');
      const live = notSent.filter(a => {
        const k = keyAction(s, a);
        if (dis[k]) { hidden++; return false; }
        actionKeys.push(k); return true;
      });
      if (live.length) { pendingActions += live.length; actionSessions.push({ s, n: live.length }); }
    }
    // ۲) جلسه‌های بدون صورت‌جلسه (متن دارند ولی سند ندارند)
    const noMinutes = recent.filter(s => !s.summary && (s.transcript || []).length >= 3)
      .filter(s => { if (dis[keyMinutes(s)]) { hidden++; return false; } return true; });
    // ۳) جلسه‌های تقویمِ گذشته که اصلاً ثبت نشده‌اند
    const recorded = new Set(recent.map(s => normTitle(s.title)));
    const missed = (events || []).filter(e =>
      !isBackgroundEvent(e) &&
      new Date(e.end) < now && new Date(e.start).getTime() >= cutoff &&
      !recorded.has(normTitle(e.title)))
      .filter(e => { if (dis[keyMissed(e)]) { hidden++; return false; } return true; });
    return {
      pendingActions, actionSessions, noMinutes, missed, hidden,
      actionKeys, minutesKeys: noMinutes.map(keyMinutes), missedKeys: missed.map(keyMissed)
    };
  }

  const looseXSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>';

  function renderLoose(sessions, tasks, events) {
    const box = $('#loose'); if (!box) return;
    const now = new Date();
    const L = looseEnds(sessions, tasks, events, now, looseDismissed);
    if (!L.pendingActions && !L.noMinutes.length && !L.missed.length) { box.hidden = true; return; }
    box.hidden = false;
    box.replaceChildren();

    const head = el('div', 'loose-head');
    head.append(el('h2', 'loose-title', 'از جلسه‌های اخیر چه ماند'));
    head.append(el('span', 'loose-sub', 'هفتهٔ گذشته'));
    box.append(head);

    const list = el('div', 'loose-list');

    // یک ردیف با دکمهٔ «نادیده بگیر»؛ نادیده‌گرفتن با toast قابل برگشت است
    function row(tone, n, lbl, hint, go, onGo, keys) {
      const r = el('div', 'loose-row ' + tone);
      const main = el('button', 'loose-main');
      main.type = 'button';
      main.append(el('span', 'loose-n', J.faDigits(n)));
      const b = el('span', 'loose-body');
      b.append(el('span', 'loose-lbl', lbl));
      b.append(el('span', 'loose-hint', hint));
      main.append(b);
      main.append(el('span', 'loose-go', go));
      main.addEventListener('click', onGo);
      r.append(main);

      const x = el('button', 'loose-x');
      x.type = 'button';
      x.title = 'نادیده بگیر';
      x.setAttribute('aria-label', `نادیده گرفتن: ${lbl}`);
      x.innerHTML = looseXSvg;
      x.addEventListener('click', async ev => {
        ev.stopPropagation();
        looseDismissed = await Store.dismissLoose(keys);
        renderLoose(sessions, tasks, events);
        toast('نادیده گرفته شد', async () => {
          looseDismissed = await Store.undismissLoose(keys);
          renderLoose(sessions, tasks, events);
        });
      });
      r.append(x);
      list.append(r);
    }

    if (L.pendingActions) row('loose-amber', L.pendingActions,
      'اقدامِ استخراج‌شده هنوز به «کارها» نرفته',
      L.actionSessions.slice(0, 2).map(x => x.s.title).join(' · '),
      'بازکردن ←', () => openMeetingById(L.actionSessions[0].s.id), L.actionKeys);

    if (L.noMinutes.length) row('loose-blue', L.noMinutes.length,
      'جلسهٔ ثبت‌شده هنوز صورت‌جلسه ندارد',
      L.noMinutes.slice(0, 2).map(s => s.title).join(' · '),
      'ساخت صورت‌جلسه ←', () => openMeetingById(L.noMinutes[0].id), L.minutesKeys);

    if (L.missed.length) row('loose-grey', L.missed.length,
      'جلسهٔ تقویم که اصلاً ثبت نشد',
      L.missed.slice(0, 2).map(e => e.title).join(' · '),
      'جلسه‌ها ←', () => goto('meetings'), L.missedKeys);

    box.append(list);
  }

  // ── سریِ جلسه‌ها (M‑۴) ──────────────────────────────
  // عنوان را برای تشخیصِ سری نرمال می‌کند: شماره، تاریخ و کلمات تکرارشونده را برمی‌دارد
  function seriesKey(title) {
    const base = (title || '')
      .replace(/[‌‏ً-ْٔ]/g, '')              // نیم‌فاصله و اعراب/همزهٔ رویِ حرف
      .replace(/[#(){}[\]\-–—_.:،,]/g, ' ')
      .replace(/[0-9۰-۹٠-٩]+/g, ' ')        // ارقامِ لاتین، فارسی و عربی
      .toLowerCase();
    // واژه‌های عمومی حذف می‌شوند؛ ولی اگر چیزی نماند، خودِ عنوان ملاک است
    const stripped = base
      .replace(/(هفتگی|روزانه|ماهانه|جلسه|نشست|weekly|daily|monthly|sync|meeting|call)/gi, ' ')
      .replace(/\s+/g, '').trim();
    return stripped || base.replace(/\s+/g, '').trim();
  }
  // همهٔ نشست‌های هم‌سری، جدیدترین اول
  function sessionSeries(s, sessions) {
    const k = seriesKey(s.title);
    if (!k) return [s];
    return (sessions || [])
      .filter(o => seriesKey(o.title) === k)
      .sort(byNewest);
  }
  // وضعیتِ یک اقدامِ جلسه: به کارها رفته؟ انجام شده؟
  let allTasksCache = [];
  function actionStatus(a, session, tasks) {
    const norm = t => (t || '').replace(/\s+/g, '').toLowerCase();
    const target = norm(a.text);
    const match = (tasks || []).find(t =>
      (t.meetingRef && t.meetingRef.startsWith(session.id) && norm(t.title) === target) ||
      (target.length >= 6 && norm(t.title) === target));
    if (!match) return { kind: 'none', label: 'به کارها نرفته' };
    if (match.status === 'done') return { kind: 'done', label: 'انجام شد' };
    const late = match.due && Store.daysDiff(match.due, new Date()) < 0;
    return late ? { kind: 'late', label: 'عقب‌افتاده' } : { kind: 'open', label: 'باز' };
  }

  async function openSession(id) {
    const sessions = await Store.getSessions();
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    $('#meetingsArchive').hidden = true;
    const box = $('#meetingDetail');
    box.hidden = false;
    box.replaceChildren();
    const settings = await Store.getSettings();
    allTasksCache = await Store.getTasks();

    // ── هدر ──
    const topRow = el('div', 'meeting-top');
    const back = el('button', 'btn btn-ghost meeting-back', '→ بازگشت به فهرست');
    back.addEventListener('click', renderMeetingsModule);
    const editMeta = el('button', 'btn btn-ghost btn-sm');
    editMeta.innerHTML = ICONS.edit;
    editMeta.append(document.createTextNode(' ویرایش مشخصات'));
    editMeta.title = 'عنوان، تاریخ و شرکت‌کننده‌های جلسه';
    editMeta.addEventListener('click', () => openManual(s));
    topRow.append(back, editMeta);
    box.append(topRow);
    box.append(el('h1', 'meeting-detail-title', s.title || 'جلسهٔ بدون عنوان'));

    const meta = el('div', 'detail-meta');
    if (s.source === 'manual') meta.append(el('span', 'chip chip-tag', 'دستی'));
    meta.append(el('span', null, fmtSessionDate(s.startedAt)));
    meta.append(el('span', 'dot-sep', `${J.faDigits((s.transcript || []).length)} خط گفت‌وگو`));
    if (s.summary && s.analysisModel) {
      const m = el('span', 'meta-model dot-sep'); m.innerHTML = sparkSvg;
      m.append(document.createTextNode(' ' + s.analysisModel));
      meta.append(m);
    }
    if (s.summary && s.analysisUsage?.total) {
      meta.append(el('span', 'meta-tokens dot-sep', `${fmtInt(s.analysisUsage.total)} توکن`));
    }
    box.append(meta);

    // شرکت‌کننده‌ها (از رویداد تقویم + گوینده‌های زیرنویس)؛ ایمیل روی نگه‌داشتن نشانگر
    const parts = await participantsOf(s);
    if (parts.length) {
      const pw = el('div', 'detail-people');
      pw.append(el('span', 'detail-people-label', 'شرکت‌کننده‌ها'));
      for (const p of parts) {
        const c = el('button', 'chip chip-who chip-person');
        c.textContent = p.name;
        if (p.email) { c.title = p.email; c.append(el('span', 'chip-person-mail', '✉')); }
        c.addEventListener('click', () => { document.querySelector('.rail-item[data-view="people"]').click(); });
        pw.append(c);
      }
      box.append(pw);
    }

    // ── نخِ سری (M‑۴): جلسه‌های هم‌عنوان + «از جلسهٔ قبل چه شد؟» ──
    const series = sessionSeries(s, sessions);
    if (series.length > 1) {
      const prev = series[series.indexOf(s) + 1] || null; // نشستِ قبلی همین سری
      const sw = el('section', 'series-box');
      const sh = el('div', 'series-head');
      sh.append(el('span', 'series-badge', `نشستِ ${J.faDigits(series.length - series.indexOf(s))} از ${J.faDigits(series.length)}`));
      sh.append(el('span', 'series-title', 'این جلسه بخشی از یک سری است'));
      sw.append(sh);

      // فهرست نشست‌های دیگر
      const strip = el('div', 'series-strip');
      for (const o of series.slice(0, 6)) {
        const b = el('button', 'series-chip' + (o.id === s.id ? ' is-cur' : ''));
        b.append(el('span', 'series-chip-date', o.startedAt ? J.relLabel(J.iso(new Date(o.startedAt)), new Date()) : '—'));
        if (o.summary) b.append(el('span', 'series-chip-dot', '●'));
        b.title = o.id === s.id ? 'همین جلسه' : 'باز کردن این نشست';
        if (o.id !== s.id) b.addEventListener('click', () => openSession(o.id));
        strip.append(b);
      }
      sw.append(strip);

      // از جلسهٔ قبل چه شد؟ — وضعیت اقدام‌های نشستِ قبلی
      if (prev && (prev.actions || []).length) {
        const rec = el('div', 'series-recap');
        rec.append(el('div', 'series-recap-title', 'از جلسهٔ قبل چه شد؟'));
        for (const a of prev.actions.slice(0, 6)) {
          const st = actionStatus(a, prev, allTasksCache);
          const r = el('div', 'series-recap-row');
          r.append(el('span', 'series-dot series-dot-' + st.kind));
          r.append(el('span', 'series-recap-text', a.text));
          r.append(el('span', 'series-recap-state series-' + st.kind, st.label));
          rec.append(r);
        }
        sw.append(rec);
      }
      box.append(sw);
    }

    // ── نوار عملیات ──
    const bar = el('div', 'btn-row detail-toolbar');
    const tplSelect = el('select', 'tpl-select');
    tplSelect.setAttribute('aria-label', 'قالب صورت‌جلسه');
    for (const tpl of MeetNoteMoM.allTemplates(settings.momTemplates)) {
      const o = document.createElement('option');
      o.value = tpl.id; o.textContent = tpl.name + (tpl.custom ? ' ✎' : '');
      if (tpl.id === (s.templateId || 'standard')) o.selected = true;
      tplSelect.append(o);
    }
    // انتخاب‌گر مدل (مثل منشی) — پیش‌فرض اتصال فعال
    let modelSelect = null;
    if ((settings.aiProfiles || []).length) {
      modelSelect = el('select', 'tpl-select');
      modelSelect.setAttribute('aria-label', 'مدل هوش مصنوعی');
      for (const p of settings.aiProfiles) {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = `${p.name} · ${p.model}`;
        if (p.id === settings.activeAiId) o.selected = true;
        modelSelect.append(o);
      }
    }
    // وقتی سند ساخته شده، «ساخت دوباره» کنشِ اصلی نیست — بازنویسی است و باید ثانویه بماند
    const analyzeBtn = el('button', 'btn ' + (s.summary ? 'btn-ghost' : 'btn-primary'));
    analyzeBtn.innerHTML = sparkSvg;
    analyzeBtn.append(document.createTextNode(s.summary ? ' ساخت دوباره' : ' ساخت صورت‌جلسه'));
    if (s.summaryEditedAt) analyzeBtn.title = 'این صورت‌جلسه دستی ویرایش شده — ساخت دوباره آن را بازنویسی می‌کند';
    // بدون متن، AI چیزی برای خواندن ندارد — دکمه نباید وعدهٔ الکی بدهد
    if (!(s.transcript || []).length) {
      analyzeBtn.disabled = true;
      analyzeBtn.title = 'این جلسه متنی ندارد. یا صورت‌جلسه را خودت بنویس، یا از تب «متن خام» متن را وارد کن.';
    }
    analyzeBtn.addEventListener('click', () => {
      if (s.summaryEditedAt && !confirm('این صورت‌جلسه را دستی ویرایش کرده‌ای. ساخت دوباره، متن فعلی را دور می‌ریزد و از نو می‌سازد.\n\nادامه می‌دهی؟')) return;
      runAnalysis(s.id, analyzeBtn, tplSelect.value, modelSelect ? modelSelect.value : '');
    });
    bar.append(tplSelect);
    if (modelSelect) bar.append(modelSelect);
    bar.append(analyzeBtn);
    if (s.summary) {
      const share = el('details', 'share-menu');
      const summ = el('summary', 'btn btn-primary share-summary', 'اشتراک‌گذاری ▾');
      share.append(summ);
      const items = el('div', 'share-items');
      const mk = (label, fn) => { const b = el('button', 'share-item', label); b.addEventListener('click', () => { share.open = false; fn(); }); items.append(b); };
      mk('کپی صورت‌جلسه', async () => { await navigator.clipboard.writeText(s.summary); toast('صورت‌جلسه کپی شد'); });
      mk('کپی حرفه‌ای و بازکردن Google Docs', async () => {
        const mode = await copyRichMom(s.summary);
        toast(mode === 'rich' ? 'قالب حرفه‌ای کپی شد — در Google Docs با Ctrl/⌘+V پیست کن' : 'متن کپی شد — در Google Docs پیست کن');
        window.open('https://docs.new', '_blank', 'noopener');
      });
      share.append(items);
      bar.append(share);
    }
    box.append(bar);

    // ── تب‌ها ──
    const tabsBar = el('div', 'detail-tabs');
    tabsBar.setAttribute('role', 'tablist');
    const panel = el('div', 'detail-panel'); panel.id = 'meetingPanel';
    const tabDefs = [
      ['doc', 'صورت‌جلسه', 0],
      ['actions', 'اقدام‌ها', (s.actions || []).length],
      ['review', 'بازبینی شواهد', 0],
      ['tools', 'ابزارها', 0],
      ['raw', 'متن خام', (s.transcript || []).length]
    ];
    const renderTab = key => {
      tabsBar.querySelectorAll('.detail-tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === key));
      panel.replaceChildren();
      panel.append(key === 'doc' ? buildDocPanel(s, parts)
        : key === 'actions' ? buildActionsPanel(s)
        : key === 'review' ? buildReviewPanel(s)
        : key === 'tools' ? buildMeetingTools(s)
        : buildRawPanel(s));
    };
    for (const [key, label, count] of tabDefs) {
      const t = el('button', 'detail-tab'); t.dataset.tab = key; t.setAttribute('role', 'tab');
      t.append(el('span', null, label));
      if (count) t.append(el('span', 'tab-count', J.faDigits(count)));
      t.addEventListener('click', () => renderTab(key));
      tabsBar.append(t);
    }
    box.append(tabsBar, panel);
    renderTab('doc');
  }

  // اسکلتِ آمادهٔ صورت‌جلسه برای وقتی که کاربر خودش می‌نویسد — صفحهٔ سفید بدترین
  // شروع است. عنوان، تاریخ و شرکت‌کننده‌ها از خودِ جلسه پر می‌شوند.
  // بخشِ اقدام‌ها عمداً جدول است تا موقع ذخیره به تب «اقدام‌ها» هم برود.
  function blankMomTemplate(s, parts) {
    const who = (parts || []).map(p => p.name).filter(Boolean);
    return [
      `# ${s.title || 'صورت‌جلسه'}`, '',
      `**تاریخ:** ${fmtSessionDate(s.startedAt)}`,
      `**شرکت‌کننده‌ها:** ${who.length ? who.join('، ') : '—'}`, '',
      '## خلاصهٔ جلسه', '', '',
      '## موضوع‌های بررسی‌شده', '- ', '',
      '## تصمیم‌ها', '- ', '',
      '## اقدام‌ها', '| اقدام | مسئول | مهلت |', '| --- | --- | --- |', '|  |  |  |', '',
      '## جلسهٔ بعد', ''
    ].join('\n');
  }

  // ویرایشگرِ صورت‌جلسه — هم برای ویرایشِ سندِ ساخته‌شده و هم برای نوشتنِ از صفر.
  // ذخیره، `summaryEditedAt` می‌گذارد تا «ساخت دوباره» قبل از بازنویسی تأیید بگیرد.
  function openDocEditor(s, host, initialText) {
    const editor = el('div', 'doc-editor');
    const ta = el('textarea', 'doc-textarea');
    ta.value = initialText; ta.rows = 22;
    ta.setAttribute('aria-label', 'متن صورت‌جلسه');
    const acts = el('div', 'btn-row');
    const save = el('button', 'btn btn-primary', 'ذخیرهٔ صورت‌جلسه');
    const cancel = el('button', 'btn btn-ghost', 'لغو');
    acts.append(save, cancel);
    editor.append(el('p', 'hint', 'متن با Markdown نوشته می‌شود. هرچه در جدولِ «اقدام‌ها» بنویسی، به تب اقدام‌ها هم اضافه می‌شود.'), ta, acts);
    host.replaceWith(editor);
    ta.focus();
    // نشانگر را ابتدای متن بگذار، نه ته اسکلت
    ta.setSelectionRange(0, 0);

    cancel.addEventListener('click', () => openSession(s.id));
    save.addEventListener('click', async () => {
      const patch = { summary: ta.value, summaryEditedAt: new Date().toISOString() };
      // اقدام‌های تازه‌ای که در جدول نوشته شده را برداشت کن (تکراری‌ها را نه)
      const seen = new Set((s.actions || []).map(a => (a.text || '').trim()));
      const picked = MeetNoteMoM.parseActionsFromMarkdown(ta.value)
        .filter(a => a.text && !seen.has(a.text.trim()));
      if (picked.length) patch.actions = [...(s.actions || []), ...picked];
      await Store.updateSession(s.id, patch);
      toast(picked.length ? `صورت‌جلسه ذخیره شد ✓ · ${J.faDigits(picked.length)} اقدام برداشته شد` : 'صورت‌جلسه ذخیره شد ✓');
      openSession(s.id);
    });
  }

  // پنل «صورت‌جلسه» — سند + ویرایش دستی، یا حالت خالی/خطا
  function buildDocPanel(s, parts) {
    const wrap = el('div');
    // در هر حالتِ خالی باید راهِ «خودم می‌نویسم» باز باشد — جلسهٔ حضوری متنی ندارد
    // که AI رویش کار کند، و بن‌بستِ قبلی همین‌جا بود.
    const writeBtn = (kind) => {
      const b = el('button', 'btn btn-' + kind);
      b.innerHTML = ICONS.edit;
      b.append(document.createTextNode(' خودم می‌نویسم'));
      b.addEventListener('click', () => openDocEditor(s, wrap, blankMomTemplate(s, parts)));
      return b;
    };

    if (s.summary) {
      const head = el('div', 'doc-head');
      const editBtn = el('button', 'btn btn-ghost btn-sm', 'ویرایش');
      head.append(editBtn);
      wrap.append(head);
      const doc = el('section', 'card mom-doc'); renderMom(s.summary, doc); wrap.append(doc);
      editBtn.addEventListener('click', () => { head.style.display = 'none'; openDocEditor(s, doc, s.summary); });
      return wrap;
    }

    const hasText = (s.transcript || []).length > 0;
    const e = el('div', 'empty');
    if (s.analysisError) {
      e.innerHTML = ICONS.alert;
      e.append(el('div', null, 'تحلیل قبلی ناموفق بود: ' + s.analysisError));
      e.append(el('div', 'hint', 'می‌توانی دوباره «ساخت صورت‌جلسه» را از بالا بزنی، یا خودت بنویسی.'));
    } else {
      e.innerHTML = gicon;
      e.append(el('div', null, hasText
        ? 'هنوز صورت‌جلسه ساخته نشده'
        : 'این جلسه متنِ ضبط‌شده ندارد'));
      e.append(el('div', 'hint', hasText
        ? 'قالب را انتخاب کن و «ساخت صورت‌جلسه» را بزن — یا خودت بنویس.'
        : 'برای جلسهٔ حضوری، صورت‌جلسه را خودت بنویس. اگر یادداشت یا متنی داری، از تب «متن خام» واردش کن تا AI هم بتواند کمک کند.'));
    }
    const row = el('div', 'btn-row empty-actions');
    row.append(writeBtn(hasText ? 'ghost' : 'primary'));
    e.append(row);
    wrap.append(e);
    return wrap;
  }

  // پنل «اقدام‌ها» → کارها — قابل ویرایش: افزودن دستی، ددلاین، ویرایش متن، حذف
  function buildActionsPanel(s) {
    if (!Array.isArray(s.actions)) s.actions = [];
    const wrap = el('div', 'ma-panel');
    wrap.append(el('p', 'hint', 'اقدام‌های این جلسه را می‌توانی ویرایش کنی، ددلاین بگذاری، حذف کنی یا خودت اضافه کنی — بعد همه را به «کارها» بفرست.'));

    const persist = async () => {
      await Store.updateSession(s.id, { actions: s.actions });
      const badge = document.querySelector('.detail-tab[data-tab="actions"] .tab-count');
      if (badge) badge.textContent = J.faDigits(s.actions.length);
      const p = document.getElementById('meetingPanel');
      if (p) p.replaceChildren(buildActionsPanel(s));
    };

    const list = el('div', 'ma-list');
    if (!s.actions.length) list.append(el('div', 'ma-empty', 'هنوز اقدامی نیست — از پایین یکی اضافه کن یا اول «ساخت صورت‌جلسه» را بزن.'));
    else s.actions.forEach((a, i) => list.append(actionRow(s, a, i, persist)));
    wrap.append(list);

    // افزودن اقدام دستی (تاریخِ داخل متن هم خوانده می‌شود)
    const form = el('form', 'ma-add');
    const inp = el('input', 'ma-add-input');
    inp.placeholder = 'افزودن اقدام دستی… (مثلاً: فاکتور را بفرست تا شنبه)';
    inp.setAttribute('aria-label', 'افزودن اقدام دستی');
    const addBtn = el('button', 'sub-add-btn'); addBtn.type = 'submit'; addBtn.innerHTML = ICONS.plus; addBtn.title = 'افزودن';
    form.append(inp, addBtn);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = inp.value.trim(); if (!v) return;
      const { title, due } = DateParser.parse(v);
      s.actions.push({ text: title || v, owner: '', deadline: '', due: due || null, manual: true });
      await persist();
    });
    wrap.append(form);

    if (s.actions.length) {
      const sendBtn = el('button', 'btn btn-primary', `فرستادن ${J.faDigits(s.actions.length)} اقدام به کارها`);
      sendBtn.addEventListener('click', () => sendActionsToTasks(s));
      wrap.append(sendBtn);
    }
    return wrap;
  }

  function actionRow(s, a, i, persist) {
    const row = el('div', 'ma-row');
    const body = el('div', 'ma-body');
    const text = el('div', 'ma-text', a.text);
    text.title = 'برای ویرایش کلیک کن';
    text.addEventListener('click', () => editActionText(text, a, persist));
    body.append(text);
    const chips = el('div', 'ma-chips');
    if (a.owner) chips.append(el('span', 'chip chip-who', a.owner));
    if (a.due) {
      const c = el('span', 'chip chip-slot'); c.innerHTML = ICONS.clock;
      c.append(document.createTextNode(' ' + J.relLabel(a.due))); chips.append(c);
    } else if (a.deadline) {
      chips.append(el('span', 'chip chip-due-future', a.deadline));
    }
    if (a.manual) chips.append(el('span', 'chip chip-src', 'دستی'));
    if (chips.children.length) body.append(chips);
    row.append(body);

    const acts = el('div', 'ma-acts');
    const dateB = svgBtn('todo-act', ICONS.calendar, 'ددلاین');
    dateB.addEventListener('click', () => openActionDate(dateB, a, persist));
    const editB = svgBtn('todo-act', ICONS.edit, 'ویرایش');
    editB.addEventListener('click', () => editActionText(text, a, persist));
    const delB = svgBtn('todo-act todo-act-del', ICONS.trash, 'حذف');
    delB.addEventListener('click', async () => { s.actions.splice(i, 1); await persist(); });
    acts.append(dateB, editB, delB);
    row.append(acts);
    return row;
  }

  function editActionText(textEl, a, persist) {
    const prev = a.text;
    const inp = el('input', 'ma-edit-input');
    inp.value = a.text; inp.setAttribute('aria-label', 'ویرایش اقدام');
    textEl.replaceWith(inp); inp.focus();
    let done = false;
    const save = async () => { if (done) return; done = true; a.text = inp.value.trim() || prev; await persist(); };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      else if (e.key === 'Escape') { done = true; persist(); }
    });
    inp.addEventListener('blur', save);
  }

  // پاپ‌آور ددلاینِ یک اقدام
  function openActionDate(anchor, a, persist) {
    closePops();
    const now = new Date();
    const iso = d => J.iso(d);
    const shift = n => { const x = new Date(now); x.setDate(x.getDate() + n); return x; };
    const eow = () => { let diff = (5 - J.weekdayIndex(now) + 7) % 7; return shift(diff); };
    const opts = [
      ['امروز', iso(now)], ['فردا', iso(shift(1))], ['۳ روز دیگه', iso(shift(3))],
      ['آخر هفته', iso(eow())], ['هفتهٔ بعد', iso(shift(7))], ['بدون ددلاین', null]
    ];
    const pop = el('div', 'resched-pop');
    pop.append(el('div', 'resched-head', 'ددلاینِ این اقدام'));
    for (const [label, val] of opts) {
      const b = el('button', 'resched-opt' + (a.due === val ? ' is-cur' : ''), label);
      b.addEventListener('click', async () => { closePops(); a.due = val; if (val) a.deadline = ''; await persist(); });
      pop.append(b);
    }
    placePop(pop, anchor);
  }

  // پنل «بازبینی شواهد» — هر ادعا با شماره‌های T؛ کلیک روی T خط مکالمه را نشان می‌دهد
  const REVIEW_COLLECTIONS = [
    ['تصمیم‌ها', 'decisions', ['decision', 'text', 'title']],
    ['اقدام‌ها', 'actions', ['text', 'task', 'action']],
    ['موضوعات باز', 'openItems', ['topic', 'text', 'title']],
    ['ریسک‌ها', 'risks', ['risk', 'text', 'title']],
    ['موضوعات جلسه', 'discussedTopics', ['topic', 'title', 'name']],
    ['داده‌های کلیدی', 'usefulData', ['label', 'title', 'text']]
  ];
  function buildReviewPanel(s) {
    const wrap = el('div');
    const data = s.analysisData;
    if (!data) {
      const e = el('div', 'empty'); e.innerHTML = ICONS.inbox;
      e.append(el('div', null, 'بازبینی شواهد برای قالب «استاندارد ۱۶بخشی» در دسترس است — این جلسه یا با قالب خلاصه ساخته شده یا هنوز تحلیل نشده.'));
      wrap.append(e); return wrap;
    }
    wrap.append(el('p', 'hint', 'هر مورد به‌همراه شماره‌های شاهد (T). روی هر T بزن تا خط دقیق مکالمه را ببینی — بی‌مدرک چیزی نوشته نمی‌شود.'));
    const tr = s.transcript || [];
    // ارجاع‌های شاهد شمارهٔ خط‌اند. متن هنگام خواندن به تکه‌های کوتاه‌تر شکسته می‌شود،
    // پس تحلیل‌های قدیمی (که پیش از شکستن ساخته شده‌اند) با شمارهٔ خطِ اصلی کار می‌کنند
    // و تحلیل‌های تازه با شمارهٔ تکه. بدون این تفکیک، T۱۲ به جملهٔ دیگری می‌رسید.
    const refRow = (n) => {
      const i = +n - 1;
      if (s.refBase === 'split') return tr[i];
      return tr.find(r => r.srcIndex === i) || tr[i];
    };
    // «اقدام‌ها» یک فهرستِ زنده و قابل‌ویرایش است (تبِ اقدام‌ها). اگر اینجا نسخهٔ
    // منجمدِ analysisData را نشان دهیم، بعد از هر ویرایش دو تب دو چیز متفاوت می‌گویند.
    // منبعِ حقیقت همان s.actions است؛ شواهد هم از نسخهٔ ۰٫۶٫۳ روی خودِ اقدام می‌ماند
    // و برای تحلیل‌های قدیمی از روی ترتیب بازیابی می‌شود.
    const collectionItems = (coll) => {
      if (coll !== 'actions') return MeetNoteMoM.asItems(data[coll]);
      const live = Array.isArray(s.actions) ? s.actions : [];
      if (!live.length) return MeetNoteMoM.asItems(data.actions);
      const old = MeetNoteMoM.asItems(data.actions);
      return live.map((a, i) => {
        if (a.evidenceRefs || a.confidence || a.manual) return a;
        const m = old[i];
        return m ? { ...a, evidenceRefs: m.evidenceRefs, confidence: m.confidence } : a;
      });
    };

    let any = false;
    for (const [label, coll, keys] of REVIEW_COLLECTIONS) {
      const items = collectionItems(coll);
      if (!items.length) continue;
      any = true;
      const sec = el('section', 'card review-sec');
      sec.append(el('h3', 'review-title', `${label} (${J.faDigits(items.length)})`));
      for (const it of items) {
        const row = el('div', 'review-item');
        const head = el('div', 'review-head');
        head.append(el('div', 'review-text', MeetNoteMoM.itemText(it, keys) || '—'));
        // مدل برای هر مورد «سطح اطمینان» می‌دهد ولی تا حالا هیچ‌جا نمایش داده نمی‌شد.
        // مهم‌ترین سیگنالِ یک بازبینی همین است: کجا باید دقیق‌تر نگاه کنی.
        const CONF = {
          high: ['قطعی', 'conf-high'], 'قطعی': ['قطعی', 'conf-high'],
          medium: ['محتمل', 'conf-mid'], 'محتمل': ['محتمل', 'conf-mid'],
          low: ['مبهم', 'conf-low'], 'مبهم': ['مبهم', 'conf-low']
        };
        const conf = CONF[String((it && it.confidence) || '').toLowerCase().trim()];
        if (it && it.manual) {
          // اقدامِ دست‌نویس شاهد ندارد چون از متن استخراج نشده — این «کمبود» نیست
          const b = el('span', 'review-conf conf-manual', 'دستی');
          b.title = 'خودت اضافه کرده‌ای — از متن جلسه استخراج نشده';
          head.append(b);
        } else if (conf) {
          head.append(el('span', 'review-conf ' + conf[1], conf[0]));
          if (conf[1] === 'conf-low') row.classList.add('is-uncertain');
        }
        row.append(head);
        const refs = MeetNoteMoM.asItems(it.evidenceRefs).filter(n => Number.isFinite(+n) && +n >= 1);
        if (refs.length) {
          const chips = el('div', 'review-refs');
          for (const n of refs) {
            const chip = el('button', 'ref-chip', 'T' + J.faDigits(n));
            const rowData = refRow(n);
            chip.title = rowData ? `${rowData.speaker || 'گوینده'}: ${rowData.text}` : 'خط یافت نشد';
            chip.addEventListener('click', () => {
              const existing = row.querySelector('.ref-line');
              if (existing) { existing.remove(); return; }
              const line = el('div', 'ref-line');
              line.append(el('span', 'tp-speaker', (rowData?.speaker || 'گوینده') + ': '));
              line.append(document.createTextNode(rowData?.text || '(خط یافت نشد)'));
              row.append(line);
            });
            chips.append(chip);
          }
          row.append(chips);
        }
        sec.append(row);
      }
      wrap.append(sec);
    }
    if (!any) { const e = el('div', 'empty'); e.append(el('div', null, 'مورد قابل‌بازبینی‌ای استخراج نشد.')); wrap.append(e); }
    return wrap;
  }

  // پنل «متن خام» — نمایش، ویرایش/واردکردنِ دستی، و خروجی برای سرویس‌های AI
  const EXTERNAL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-8.5 8.5"/><path d="M19 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.5"/></svg>';

  function buildRawPanel(s) {
    const wrap = el('div');
    const lines = s.transcript || [];

    // کنش‌های خودِ متن، جدا از «باز کردن در سرویس بیرونی» — قبلاً همه در یک ردیف
    // قاطی بودند و بدشکل می‌شکستند.
    const bar = el('div', 'raw-bar');
    const own = el('div', 'raw-own');
    const editT = el('button', 'btn btn-primary btn-sm');
    editT.innerHTML = ICONS.edit;
    editT.append(document.createTextNode(lines.length ? ' ویرایش متن' : ' نوشتن متن جلسه'));
    editT.addEventListener('click', () => openRawEditor(s, wrap));
    const copyT = el('button', 'btn btn-ghost btn-sm', 'کپی متن خام');
    copyT.disabled = !lines.length;
    copyT.addEventListener('click', async () => { await navigator.clipboard.writeText(MeetNoteMoM.buildTranscriptText(s)); toast('متن خام کپی شد'); });
    own.append(editT, copyT);

    const ext = el('div', 'raw-ext');
    ext.append(el('span', 'raw-ext-label', 'باز کردن در'));
    for (const [name, url] of [['Claude', 'https://claude.ai/new'], ['ChatGPT', 'https://chatgpt.com/'], ['Gemini', 'https://gemini.google.com/app']]) {
      const b = el('button', 'raw-ext-btn');
      b.append(el('span', 'raw-ext-name', name));
      const ic = el('span', 'raw-ext-ic'); ic.innerHTML = EXTERNAL_SVG;
      b.append(ic);
      b.title = `متن خام کپی می‌شود و ${name} باز می‌شود`;
      b.disabled = !lines.length;
      b.addEventListener('click', () => exportRawToAssistant(s, url));
      ext.append(b);
    }
    bar.append(own, ext);
    wrap.append(bar);

    const t = el('section', 'card transcript-preview');
    if (!lines.length) {
      const e = el('div', 'empty');
      e.append(el('div', null, 'متنی ثبت نشده است.'));
      e.append(el('div', 'hint', 'اگر این جلسه حضوری بوده یا ضبط نشده، «نوشتن متن جلسه» را بزن و متن را بنویس یا بچسبان.'));
      t.append(e);
    }
    for (const r of lines) {
      const line = el('div', 'tp-line');
      line.append(el('span', 'tp-speaker', (r.speaker || 'گوینده') + ':'));
      line.append(document.createTextNode(' ' + r.text));
      t.append(line);
    }
    wrap.append(t);
    return wrap;
  }

  // ویرایشِ متنِ خام: هر خط یک نوبت. «نام: متن» گوینده را هم نگه می‌دارد.
  function openRawEditor(s, wrap) {
    const lines = s.transcript || [];
    const box = el('div', 'raw-editor');
    box.append(el('p', 'hint', 'هر خط یک نوبت است. اگر گوینده مشخص است، به شکل «نام: متن» بنویس.'));
    const ta = el('textarea', 'raw-textarea');
    ta.rows = 18;
    ta.setAttribute('aria-label', 'ویرایش متن خام جلسه');
    ta.value = lines.map(r => (r.speaker && r.speaker !== 'گوینده' ? `${r.speaker}: ` : '') + r.text).join('\n');
    ta.placeholder = 'مثلاً:\nنگار: دربارهٔ تاریخ انتشار صحبت کردیم.\nکامران: تست‌ها تا پنجشنبه تمام می‌شود.';
    const acts = el('div', 'btn-row');
    const save = el('button', 'btn btn-primary', 'ذخیرهٔ متن');
    const cancel = el('button', 'btn btn-ghost', 'انصراف');
    acts.append(save, cancel);
    box.append(ta, acts);
    wrap.replaceChildren(box);
    ta.focus();

    cancel.addEventListener('click', () => openSession(s.id));
    save.addEventListener('click', async () => {
      const base = sessionTime(s) || Date.now();
      const transcript = linesToTranscript(ta.value, base, (s.participants || []).map(p => p.name));
      await Store.updateSession(s.id, { transcript });
      toast(transcript.length ? `${J.faDigits(transcript.length)} خط ذخیره شد ✓` : 'متن پاک شد');
      openSession(s.id);
    });
  }

  async function exportRawToAssistant(s, url) {
    const text = `این متن خام یک جلسه است (هر خط با شناسهٔ T و نام گوینده). بر اساس آن به سؤال‌های بعدی من پاسخ بده:\n\n${MeetNoteMoM.buildTranscriptText(s)}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    toast('متن خام کپی شد — در صفحهٔ باز‌شده پیست کن');
    window.open(url, '_blank', 'noopener');
  }

  async function runAnalysis(id, btn, templateId, profileId) {
    const settings = await Store.getSettings();
    if (!AIClient.configured(settings)) { toast('اول در تنظیمات یک اتصال هوش مصنوعی اضافه کن'); document.querySelector('.rail-item[data-view="settings"]').click(); return; }
    const sessions = await Store.getSessions();
    const s = sessions.find(x => x.id === id);
    if (!s) return;
    // پیش از ساختِ سند، فهرست حاضران باید ادغام‌شده باشد وگرنه مدل نامِ تکراری می‌گیرد
    await participantsOf(s);
    const template = MeetNoteMoM.getTemplate(templateId || s.templateId || 'standard', settings.momTemplates);
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'در حال ساخت صورت‌جلسه…';

    // به تب «صورت‌جلسه» برو و پیش‌نمایش زنده را همان‌جا نشان بده
    document.querySelector('.detail-tab[data-tab="doc"]')?.click();
    const panel = document.getElementById('meetingPanel');
    if (panel) {
      panel.replaceChildren();
      const live = el('section', 'card mom-doc mom-live');
      const note = el('div', 'live-note'); note.textContent = '✍️ دارم همین‌جا زنده می‌نویسم…';
      const liveBody = el('div', 'mom-live-body');
      live.append(note, liveBody);
      panel.append(live);
      live.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      // چک‌پوینت برای تکمیل خودکار پس‌زمینه (اگر تب بسته شد)
      await Store.setAnalysisJob({ sessionId: id, templateId: template.id, profileId: profileId || '' });
      try {
        const result = await MeetNoteMoM.analyzeSession(s, settings, template, {
          profileId: profileId || '',
          onProgress: p => {
            Store.setAnalysisJob({ sessionId: id, templateId: template.id, profileId: profileId || '' });
            note.textContent = p.phase === 'extract'
              ? `⛏ در حال استخراج بخش ${J.faDigits(p.index)} از ${J.faDigits(p.total)}…`
              : '✍️ در حال نوشتن سند نهایی…';
            btn.textContent = p.phase === 'extract' ? `استخراج ${J.faDigits(p.index)}/${J.faDigits(p.total)}…` : 'نوشتن سند…';
          },
          onDoc: (summaryMd) => renderMom(summaryMd, liveBody)
        });
        await Store.updateSession(id, { summary: result.summary, actions: result.actions, analysisData: result.data, analysisError: '', templateId: template.id, analysisModel: result.model, analysisUsage: result.usage, summaryEditedAt: null, refBase: 'split' });
        await Store.clearAnalysisJob();
        const parts = await registerParticipants(s);
        toast(parts.length ? `صورت‌جلسه آماده شد ✓ — ${J.faDigits(parts.length)} نفر به «آدم‌ها» رفت` : 'صورت‌جلسه آماده شد ✓');
        openSession(id);
      } catch (err) {
        await Store.clearAnalysisJob();
        await Store.updateSession(id, { analysisError: err.message });
        toast(err.message);
        btn.disabled = false;
        btn.textContent = label;
        openSession(id);
      }
    }
  }

  // خلاصهٔ دلخواه + از جلسه بپرس + خروجی به دستیار
  function buildMeetingTools(s) {
    const card = el('section', 'card meeting-tools');
    // خلاصهٔ دلخواه
    card.append(el('h2', 'card-title', 'خلاصهٔ دلخواه'));
    card.append(el('p', 'hint', 'بگو خروجی را چطور می‌خواهی؛ روی متن همین جلسه ساخته می‌شود.'));
    const csRow = el('div', 'tool-row');
    const csInput = el('input', 'tool-input'); csInput.type = 'text'; csInput.placeholder = 'مثلاً: ۵ بولت کلیدی / ایمیل رسمی برای مدیر / English summary';
    const csBtn = el('button', 'btn btn-primary', 'بساز');
    csRow.append(csInput, csBtn);
    card.append(csRow);
    const csChips = el('div', 'tool-chips');
    ['۵ بولت کلیدی', 'ایمیل رسمی', 'خلاصهٔ یک‌پاراگرافی', 'English summary'].forEach(preset => {
      const c = el('button', 'tool-chip', preset);
      c.addEventListener('click', () => { csInput.value = preset; csBtn.click(); });
      csChips.append(c);
    });
    card.append(csChips);
    const csOut = el('pre', 'tool-out'); csOut.hidden = true;
    const csCopy = el('button', 'btn btn-ghost tool-copy', 'کپی'); csCopy.hidden = true;
    csCopy.addEventListener('click', async () => { await navigator.clipboard.writeText(csOut.textContent); toast('کپی شد'); });
    card.append(csOut, csCopy);
    csBtn.addEventListener('click', async () => {
      const req = csInput.value.trim();
      if (!req) return;
      const settings = await Store.getSettings();
      if (!AIClient.configured(settings)) { toast('اول یک اتصال هوش مصنوعی اضافه کن'); return; }
      csBtn.disabled = true; csBtn.textContent = 'در حال ساخت…';
      try {
        const out = await AIClient.chat(settings, [
          { role: 'system', content: 'بر اساس متن جلسهٔ زیر و طبق درخواست کاربر، خروجی را به فارسی روان (مگر درخواست زبان دیگری) بساز. فقط بر پایهٔ متن جلسه؛ چیزی از خودت اضافه نکن. فقط خروجی نهایی را بده.' },
          { role: 'user', content: `درخواست: ${req}\n\nمتن جلسه:\n${MeetNoteMoM.buildTranscriptText(s)}` }
        ], { maxTokens: 1200 });
        csOut.textContent = out; csOut.hidden = false; csCopy.hidden = false;
      } catch (e) { toast(e.message); }
      csBtn.disabled = false; csBtn.textContent = 'بساز';
    });

    // از جلسه بپرس
    card.append(el('h2', 'card-title mt', 'از جلسه بپرس'));
    card.append(el('p', 'hint', 'هر سؤالی از محتوای جلسه بپرس؛ فقط از روی متن پاسخ می‌دهد.'));
    const qRow = el('div', 'tool-row');
    const qInput = el('input', 'tool-input'); qInput.type = 'text'; qInput.placeholder = 'مثلاً: چه تصمیمی دربارهٔ تاریخ انتشار گرفته شد؟';
    const qBtn = el('button', 'btn btn-primary', 'بپرس');
    qRow.append(qInput, qBtn);
    card.append(qRow);
    const qLog = el('div', 'qa-log');
    card.append(qLog);
    const ask = async () => {
      const q = qInput.value.trim();
      if (!q) return;
      const settings = await Store.getSettings();
      if (!AIClient.configured(settings)) { toast('اول یک اتصال هوش مصنوعی اضافه کن'); return; }
      qInput.value = '';
      const item = el('div', 'qa-item');
      item.append(el('div', 'qa-q', q));
      const ans = el('div', 'qa-a', 'در حال پاسخ…');
      item.append(ans); qLog.prepend(item);
      try {
        const out = await AIClient.chat(settings, [
          { role: 'system', content: 'فقط بر اساس متن جلسهٔ زیر پاسخ بده. اگر پاسخ در متن نبود صریح بگو «در این جلسه مطرح نشد». کوتاه و دقیق و به فارسی.' },
          { role: 'user', content: `سؤال: ${q}\n\nمتن جلسه:\n${MeetNoteMoM.buildTranscriptText(s)}` }
        ], { maxTokens: 700 });
        ans.textContent = out;
      } catch (e) { ans.textContent = 'خطا: ' + e.message; }
    };
    qBtn.addEventListener('click', ask);
    qInput.addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
    return card;
  }

  async function exportToAssistant(s, url) {
    const text = `این صورت‌جلسه است. لطفاً بر اساس آن به سؤال‌های بعدی من پاسخ بده:\n\n${s.summary || MeetNoteMoM.buildTranscriptText(s)}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    toast('متن جلسه کپی شد — در صفحهٔ باز‌شده پیست کن');
    window.open(url, '_blank', 'noopener');
  }

  // کپی حرفه‌ای (HTML قالب‌دار) برای Google Docs — منتقل‌شده از منشی
  function escHtml(str) { return String(str).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function markdownToRichHtml(md) {
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = []; let list = '';
    const closeL = () => { if (list) { out.push(`</${list}>`); list = ''; } };
    const inline = t => escHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    for (let i = 0; i < lines.length;) {
      const line = lines[i];
      const isTable = /^\s*\|.*\|\s*$/.test(line) && /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(lines[i + 1] || '');
      if (isTable) {
        closeL();
        const headers = line.split('|').slice(1, -1).map(c => c.trim()); i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim().replace(/\\\|/g, '|'))); i++; }
        const head = headers.map(h => `<th style="background:#eee;font-weight:700">${inline(h)}</th>`).join('');
        const body = rows.map(r => `<tr>${headers.map((_, ci) => `<td>${inline(r[ci] || '')}</td>`).join('')}</tr>`).join('');
        out.push(`<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;direction:rtl;text-align:right;margin:12px 0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
        continue;
      }
      const h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) { closeL(); const lv = h[1].length; out.push(`<h${lv} style="direction:rtl;text-align:right;margin:${lv === 1 ? '22px 0 14px' : '18px 0 10px'};font-weight:700">${inline(h[2])}</h${lv}>`); i++; continue; }
      const li = line.match(/^\s*[-*]\s+(.+)$/) || line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (li) { if (list !== 'ul') { closeL(); list = 'ul'; out.push('<ul style="direction:rtl;text-align:right;padding-right:24px">'); } out.push(`<li>${inline(li[1])}</li>`); i++; continue; }
      if (/^\s*---+\s*$/.test(line)) { closeL(); out.push('<hr style="border:0;border-top:1px solid #bbb;margin:18px 0">'); i++; continue; }
      if (!line.trim()) { closeL(); i++; continue; }
      closeL(); out.push(`<p style="direction:rtl;text-align:right;line-height:1.8;margin:8px 0">${inline(line)}</p>`); i++;
    }
    closeL();
    return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"></head><body><article dir="rtl" style="font-family:Arial,Tahoma,sans-serif;direction:rtl;text-align:right;color:#202124">${out.join('')}</article></body></html>`;
  }
  async function copyRichMom(markdown) {
    const html = markdownToRichHtml(markdown);
    if (globalThis.ClipboardItem && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([markdown], { type: 'text/plain' })
        })]);
        return 'rich';
      } catch { /* برخی مرورگرها کپی قالب‌دار نمی‌دهند */ }
    }
    await navigator.clipboard.writeText(markdown);
    return 'plain';
  }

  async function sendActionsToTasks(s) {
    // مسئولِ هر اقدام به پروندهٔ فرد وصل می‌شود؛ پیش‌تر owner کلاً دور ریخته می‌شد
    // و همهٔ اقدام‌ها کارِ خودِ کاربر ثبت می‌شدند.
    const [settings, meta, evCache] = await Promise.all([Store.getSettings(), Store.getPeopleMeta(), Store.getEvents()]);
    const parts = Store.mergeParticipants(
      (s.participants && s.participants.length) ? s.participants : sessionParticipants(s, evCache.events || [], settings),
      { userName: settings.userName || '', userEmail: settings.userEmail || '' });
    const me = searchNorm(settings.userName);
    let added = 0, linked = 0, ambiguous = 0;
    for (const a of (s.actions || [])) {
      if (!a.text || a.text.trim().length < 2) continue;
      const due = a.due || (a.deadline ? DateParser.parse('x ' + a.deadline).due : null);
      const owner = (a.owner || '').trim();
      const ref = owner ? Store.resolvePersonRef(owner, parts, meta) : null;
      const isMine = !owner || (me && searchNorm(owner) === me);
      if (ref && !isMine) { linked++; if (ref.ambiguous) ambiguous++; }
      await Store.addTask({
        title: a.text, due,
        dir: isMine ? 'mine' : 'theirs',
        who: isMine ? null : (ref ? ref.who : owner),
        whoId: isMine ? null : (ref ? ref.whoId : null),
        source: 'monshi', meetingRef: `${s.id} · ${s.title || 'جلسه'}`
      });
      added++;
    }
    await renderAll();
    if (!added) return toast('اقدام قابل‌افزودنی نبود');
    let msg = `${J.faDigits(added)} اقدام به «کارها» اضافه شد`;
    if (linked) msg += ` · ${J.faDigits(linked)} مورد به آدم‌ها وصل شد`;
    if (ambiguous) msg += ` (${J.faDigits(ambiguous)} هم‌نامِ مبهم — خودت مشخص کن)`;
    toast(msg);
  }

  // ---------- پروندهٔ آدم‌ها ----------
  function staleLabel(days) {
    if (days == null) return 'بدون سابقهٔ تماس';
    if (days <= 0) return 'آخرین تماس: امروز';
    if (days === 1) return 'آخرین تماس: دیروز';
    if (days < 7) return `آخرین تماس: ${J.faDigits(days)} روز پیش`;
    if (days < 30) return `آخرین تماس: ${J.faDigits(Math.floor(days / 7))} هفته پیش`;
    return `آخرین تماس: ${J.faDigits(Math.floor(days / 30))} ماه پیش`;
  }

  function personCard(p, now, sessions, allPeople) {
    const card = el('div', 'person-card');
    const head = el('div', 'person-head');
    head.append(el('div', 'person-avatar', p.name.slice(0, 1)));
    const info = el('div', 'person-head-info');
    const nameRow = el('div', 'person-name-row');
    nameRow.append(el('div', 'person-name', p.name));
    if (p.group) nameRow.append(el('span', 'person-group', p.group));
    // هم‌نام: نشانِ هشدار تا با آن یکی اشتباه نشود
    if (p.dupName) {
      const dup = el('span', 'person-dup', p.email ? 'هم‌نام' : 'هم‌نام · بدون ایمیل');
      dup.title = 'فردِ دیگری با همین نام هست — با ایمیل از هم جدا می‌شوند';
      nameRow.append(dup);
    }
    info.append(nameRow);
    if (p.email) {
      const mail = el('a', 'person-email', p.email);
      mail.href = 'mailto:' + p.email;
      info.append(mail);
    }
    const stats = el('div', 'person-stats');
    stats.append(el('span', null, `${J.faDigits(p.open.length)} باز`));
    if (p.done) stats.append(el('span', null, `${J.faDigits(p.done)} انجام‌شده`));
    if (p.overdue) stats.append(el('span', 'warn', `${J.faDigits(p.overdue)} عقب‌افتاده`));
    if (p.meetings.length) stats.append(el('span', null, `${J.faDigits(p.meetings.length)} جلسه`));
    info.append(stats);
    head.append(info);
    card.append(head);

    // نوار رابطه: آخرین تماس + جلسهٔ بعدی
    const rel = el('div', 'person-rel');
    const stale = p.staleDays != null && p.staleDays >= 21;
    rel.append(el('span', 'person-contact' + (stale ? ' warn' : ''), staleLabel(p.staleDays)));
    if (p.nextMeet) {
      const nm = new Date(p.nextMeet);
      rel.append(el('span', 'person-next', `جلسهٔ بعدی: ${J.relLabel(J.iso(nm), now)} ${hhmm(nm)}`));
    }
    card.append(rel);
    if (stale) {
      const nudge = el('div', 'person-nudge', 'مدتی است سراغش نرفته‌ای — شاید وقتِ یک پیام باشد.');
      card.append(nudge);
    }

    const openWrap = el('div', 'person-open');
    if (!p.open.length) openWrap.append(el('div', 'person-empty', 'کار باز ندارد 🙂'));
    else for (const t of p.open) {
      const row = el('div', 'person-task');
      const chk = svgBtn('check', ICONS.check, 'انجام شد');
      chk.addEventListener('click', async () => { await completeTask(t.id); renderPeople(); });
      const b = el('div', 'person-task-body');
      b.append(el('div', 'person-task-title', t.title));
      const meta = el('div', 'fu-meta');
      if (t.due) {
        const d = Store.daysDiff(t.due, now);
        meta.append(el('span', d < 0 ? 'late' : '', d < 0 ? `${J.faDigits(-d)} روز گذشته` : J.relLabel(t.due, now)));
      }
      b.append(meta);
      row.append(chk, b);
      if (t.dir === 'theirs') {
        const rb = el('button', 'fu-remind', 'یادآوری');
        rb.addEventListener('click', () => openFollowup(t));
        row.append(rb);
      }
      openWrap.append(row);
    }
    card.append(openWrap);

    // جلسه‌های مشترک با این نفر (قابل‌کلیک)
    const mtgs = personMeetings(p, sessions);
    if (mtgs.length) {
      const mw = el('div', 'person-meetings');
      mw.append(el('div', 'person-meetings-title', `جلسه‌ها با ${p.name}`));
      for (const m of mtgs) {
        const row = el('button', 'person-meeting');
        const ic = el('span', 'person-meeting-ic'); ic.innerHTML = ICONS.video;
        row.append(ic);
        const body = el('div', 'person-meeting-body');
        body.append(el('span', 'person-meeting-title', m.title));
        if (m.date) body.append(el('span', 'person-meeting-date', J.relLabel(J.iso(m.date), now)));
        row.append(body);
        if (m.recorded) { const b = el('span', 'person-meeting-badge', 'صورت‌جلسه'); row.append(b); }
        row.title = m.recorded ? 'باز کردن صورت‌جلسه' : 'رفتن به جلسه';
        row.addEventListener('click', m.act);
        mw.append(row);
      }
      card.append(mw);
    }

    // یادداشت شخصی (ذخیرهٔ خودکار)
    const noteWrap = el('div', 'person-note');
    const ta = el('textarea', 'person-note-input');
    ta.value = p.note || '';
    ta.placeholder = 'یادداشت شخصی دربارهٔ این نفر…';
    ta.setAttribute('aria-label', `یادداشت دربارهٔ ${p.name}`);
    ta.rows = 1;
    const status = el('span', 'person-note-status');
    let tmr = null;
    ta.addEventListener('input', () => {
      status.textContent = '…';
      clearTimeout(tmr);
      tmr = setTimeout(async () => {
        await Store.savePerson({ id: p.id, name: p.name, email: p.email, note: ta.value });
        status.textContent = 'ذخیره شد ✓';
        setTimeout(() => { if (status.textContent === 'ذخیره شد ✓') status.textContent = ''; }, 1400);
      }, 600);
    });
    noteWrap.append(ta, status);
    card.append(noteWrap);

    // تیم + ادغام (B۸)
    const admin = el('div', 'person-admin');
    const teamWrap = el('label', 'person-team');
    teamWrap.append(el('span', 'person-team-label', 'تیم'));
    const teamInput = el('input', 'person-team-input');
    teamInput.type = 'text'; teamInput.value = p.group || ''; teamInput.placeholder = 'مثلاً فروش';
    teamInput.setAttribute('aria-label', `تیمِ ${p.name}`);
    teamInput.addEventListener('change', async () => { await Store.savePerson({ id: p.id, name: p.name, email: p.email, group: teamInput.value.trim() }); renderPeople(); });
    teamWrap.append(teamInput);
    admin.append(teamWrap);
    if ((allPeople || []).length > 1) {
      const mergeBtn = el('button', 'person-merge-btn', 'ادغام با…');
      mergeBtn.title = 'اگر این همان فردِ دیگری است، ادغامشان کن';
      mergeBtn.addEventListener('click', () => openMergePicker(mergeBtn, p, allPeople));
      admin.append(mergeBtn);
    }
    card.append(admin);
    return card;
  }

  // جلسه‌های یک نفر: جلسه‌های ضبط‌شده (منشی) + رویدادهای تقویم، یکتا و مرتب بر اساس زمان
  function personMeetings(p, sessions) {
    const items = [], seen = new Set();
    const match = n => n && (n === p.name || n.includes(p.name) || p.name.includes(n));
    for (const s of sessions || []) {
      let names = (s.participants || []).map(x => x.name);
      if (!names.length) names = (s.transcript || []).map(r => typeof r.speaker === 'string' ? r.speaker : '');
      if (!names.some(match)) continue;
      const k = normTitle(s.title); if (seen.has(k)) continue; seen.add(k);
      items.push({ title: s.title || 'جلسه', date: s.startedAt ? new Date(s.startedAt) : null, recorded: true, act: () => openMeetingById(s.id) });
    }
    for (const ev of p.meetings || []) {
      const k = normTitle(ev.title); if (seen.has(k)) continue; seen.add(k);
      items.push({ title: ev.title, date: new Date(ev.start), recorded: false, act: () => goToMeeting(ev) });
    }
    items.sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0));
    return items.slice(0, 6);
  }

  async function renderPeople() {
    const [tasks, evc, meta, sessions] = await Promise.all([Store.getTasks(), Store.getEvents(), Store.getPeopleMeta(), Store.getSessions()]);
    const now = new Date();
    const people = Store.peopleFiles(tasks, now, evc.events, meta);
    const grid = $('#peopleGrid');
    grid.replaceChildren();
    if (!people.length) {
      const e = el('div', 'empty');
      e.innerHTML = ICONS.inbox;
      e.append(el('div', null, 'هنوز کاری به کسی نسپرده‌ای — موقع افزودن کار، گزینهٔ «سپرده به…» را بزن'));
      grid.append(e);
      return;
    }
    // گروه‌بندی بر اساس تیم (اگر تیمی تعریف شده باشد)
    const groups = new Map();
    for (const p of people) { const g = p.group || ''; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(p); }
    const teamNames = [...groups.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fa'));
    if (!teamNames.length) { for (const p of people) grid.append(personCard(p, now, sessions, people)); return; }
    const teamHead = (label, n) => { const h = el('div', 'people-team-head'); h.append(el('span', null, label)); h.append(el('span', 'people-team-count', J.faDigits(n))); return h; };
    for (const g of teamNames) { grid.append(teamHead(g, groups.get(g).length)); for (const p of groups.get(g)) grid.append(personCard(p, now, sessions, people)); }
    if (groups.has('')) { grid.append(teamHead('بدون تیم', groups.get('').length)); for (const p of groups.get('')) grid.append(personCard(p, now, sessions, people)); }
  }

  // منوی ادغامِ دو نفر (نامِ هم‌معنا)
  function openMergePicker(anchor, p, allPeople) {
    closePops();
    const pop = el('div', 'resched-pop');
    pop.append(el('div', 'resched-head', `ادغامِ «${p.name}» در…`));
    // هم‌نام‌ها هم قابل ادغام‌اند (دو «نگار» که یک نفرند)؛ فقط خودش حذف می‌شود
    const others = allPeople.filter(x => x.id !== p.id);
    if (!others.length) pop.append(el('div', 'resched-empty', 'فردِ دیگری برای ادغام نیست'));
    else for (const o of others) {
      const b = el('button', 'resched-opt');
      b.append(el('span', 'resched-time', o.name));
      b.append(el('span', 'resched-sub', o.email || 'بدون ایمیل'));
      b.addEventListener('click', async () => {
        closePops();
        await Store.savePerson({ id: p.id, name: p.name, email: p.email }); // مطمئن شو پرونده وجود دارد
        await Store.savePerson({ id: o.id, name: o.name, email: o.email });
        await Store.mergePeople(p.id, o.id);
        await renderPeople();
        toast(`«${p.name}» در «${o.name}» ادغام شد`);
      });
      pop.append(b);
    }
    placePop(pop, anchor);
  }

  // افزودنِ دستیِ فرد
  $('#addPersonBtn').addEventListener('click', () => {
    const f = $('#personAddForm');
    f.hidden = !f.hidden;
    if (!f.hidden) $('#paName').focus();
  });
  $('#obAddTask').addEventListener('click', () => { goto('today'); quickInput.focus(); });
  $('#personAddForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#paName').value.trim();
    if (!name) { $('#paName').focus(); return; }
    await Store.savePersonMeta(name, { email: $('#paEmail').value.trim(), group: $('#paGroup').value.trim(), manual: true });
    $('#paName').value = ''; $('#paEmail').value = ''; $('#paGroup').value = '';
    $('#personAddForm').hidden = true;
    await renderPeople();
    toast(`«${name}» به آدم‌ها اضافه شد ✓`);
  });

  // ---------- نمای هفته ----------
  let weekOffset = 0;
  async function renderWeek() {
    const [tasks, evc] = await Promise.all([Store.getTasks(), Store.getEvents()]);
    const now = new Date();
    const start = J.startOfWeek(now); start.setDate(start.getDate() + weekOffset * 7);
    const days = [...Array(7)].map((_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    $('#weekRange').textContent = `${J.format(days[0], { weekday: false, year: false })} تا ${J.format(days[6], { weekday: false })}`;

    // سینیِ کارهای بی‌تاریخ (منبعِ کشیدن برای B۹)
    const tray = $('#weekTray'), trayList = $('#weekTrayList');
    if (tray && trayList) {
      const undated = tasks.filter(t => t.dir === 'mine' && t.status === 'open' && !t.due).slice(0, 12);
      trayList.replaceChildren();
      tray.hidden = !undated.length;
      for (const t of undated) {
        const chip = el('div', 'week-tray-chip', t.title);
        chip.draggable = true;
        chip.title = 'بکش روی یکی از روزها تا ددلاین بگیرد';
        chip.addEventListener('dragstart', e => {
          dragId = t.id; chip.classList.add('dragging');
          document.body.classList.add('task-dragging');
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', t.id); } catch (_) {}
        });
        chip.addEventListener('dragend', () => {
          dragId = null; chip.classList.remove('dragging');
          document.body.classList.remove('task-dragging');
          document.querySelectorAll('.week-day.drop-over').forEach(c => c.classList.remove('drop-over'));
        });
        trayList.append(chip);
      }
    }

    const grid = $('#weekGrid');
    grid.replaceChildren();
    for (const day of days) {
      const isToday = sameDay(day, now);
      const col = el('div', 'week-day' + (isToday ? ' is-today' : ''));
      // B۹ — رها کردنِ یک کار روی این روز، ددلاینش را به همان روز می‌برد
      const dayIso = J.iso(day);
      col.addEventListener('dragover', e => { if (dragId) { e.preventDefault(); col.classList.add('drop-over'); } });
      col.addEventListener('dragleave', () => col.classList.remove('drop-over'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('drop-over');
        if (!dragId) return;
        await Store.updateTask(dragId, { due: dayIso });
        dragId = null;
        document.body.classList.remove('task-dragging');
        await renderAll(); await renderWeek();
        toast(`ددلاین رفت به ${J.relLabel(dayIso, new Date())}`);
      });
      const head = el('div', 'week-day-head');
      const j = J.fromDate(day);
      head.append(el('span', 'week-day-name', J.WEEKDAYS[J.weekdayIndex(day)]));
      head.append(el('span', 'week-day-date', `${J.faDigits(j.jd)} ${J.MONTHS[j.jm - 1]}`));
      if (isToday) head.append(el('span', 'week-today-dot', 'امروز'));
      col.append(head);

      const body = el('div', 'week-day-body');
      // رویدادهای روزپوش
      for (const e of evc.events.filter(e => isBackgroundEvent(e) && sameDay(e.start, day))) {
        body.append(el('div', 'week-bg', e.title));
      }
      // جلسه‌ها + کارهای زمان‌بندی‌شده
      const items = dayItems(evc.events, tasks, day);
      for (const it of items) {
        const title = it.type === 'meeting' ? it.ev.title : it.task.title;
        const row = el('button', 'week-item week-' + it.type);
        row.append(el('span', 'week-item-time', `${hhmm(it.start)}–${hhmm(it.end)}`));
        row.append(el('span', 'week-item-title', title));
        // عنوانِ کامل روی نگه‌داشتن نشانگر + پرش به همان جلسه/کار
        row.title = it.type === 'meeting'
          ? `${title}\n${hhmm(it.start)} تا ${hhmm(it.end)}${(it.ev.attendees || []).length ? '\n' + it.ev.attendees.join('، ') : ''}`
          : `${title}\n${hhmm(it.start)} تا ${hhmm(it.end)}`;
        row.addEventListener('click', () => it.type === 'meeting' ? goToMeeting(it.ev) : goto('tasks'));
        body.append(row);
      }
      // ددلاین‌های آن روز (که زمان‌بندی نشده‌اند)
      const due = tasks.filter(t => t.status === 'open' && t.due && sameDay(J.fromISO(t.due), day)
        && !(t.slot && sameDay(t.slot.start, day)));
      for (const t of due) {
        const row = el('button', 'week-item week-due');
        row.append(el('span', 'week-due-dot', '● ددلاین'));
        row.append(el('span', 'week-item-title', t.title));
        row.title = `ددلاین: ${t.title}`;
        row.addEventListener('click', () => goto('tasks'));
        body.append(row);
      }
      if (!body.children.length) body.append(el('div', 'week-empty', '—'));
      col.append(body);
      grid.append(col);
    }
  }
  $('#weekPrev').addEventListener('click', () => { weekOffset--; renderWeek(); });
  $('#weekNext').addEventListener('click', () => { weekOffset++; renderWeek(); });
  $('#weekToday').addEventListener('click', () => { weekOffset = 0; renderWeek(); });

  // ---------- بریف جلسه ----------
  let briefContext = null;
  async function openBrief(ev) {
    const tasks = await Store.getTasks();
    const now = new Date();
    const attendees = ev.attendees || [];
    const related = relatedOpenTasks(ev, tasks);
    const mine = related.filter(t => t.dir === 'mine');
    const theirs = related.filter(t => t.dir === 'theirs');

    $('#briefTitle').textContent = 'بریف: ' + ev.title;
    $('#briefAgendaOut').hidden = true;
    const body = $('#briefBody');
    body.replaceChildren();

    if (attendees.length) {
      const pw = el('div', 'brief-people');
      attendees.forEach(a => pw.append(el('span', 'chip chip-who', a)));
      body.append(pw);
    }
    const section = (title, list, prefix) => {
      if (!list.length) return;
      const s = el('div', 'brief-section');
      s.append(el('h3', null, title));
      const ul = el('ul');
      list.forEach(t => {
        const li = el('li');
        li.append(el('span', 'dot', prefix));
        li.append(document.createTextNode(t.title + (t.who ? ` — ${t.who}` : '')));
        ul.append(li);
      });
      s.append(ul);
      body.append(s);
    };
    section('کارهای باز مرتبط با تو', mine, '○');
    section('منتظر دیگران', theirs, '⏳');

    // ── از نشست قبلیِ همین سری چه ماند ──
    const sessions = await Store.getSessions();
    const key = seriesKey(ev.title);
    const prev = key
      ? sessions.filter(s => seriesKey(s.title) === key).sort(byNewest)[0]
      : null;
    const carry = [];
    if (prev) {
      for (const a of (prev.actions || [])) {
        if (!a.text) continue;
        const st = actionStatus(a, prev, tasks);
        if (st.kind !== 'done') carry.push({ text: a.text, note: st.label, who: a.owner || '' });
      }
      for (const it of MeetNoteMoM.asItems(prev.analysisData && prev.analysisData.openItems)) {
        const txt = MeetNoteMoM.itemText(it, ['topic', 'text', 'title']);
        if (txt) carry.push({ text: txt, note: 'موضوع باز', who: (it && it.owner) || '' });
      }
    }
    if (carry.length) {
      const s = el('div', 'brief-section');
      s.append(el('h3', null, `از نشست قبلی (${J.relLabel(J.iso(new Date(prev.startedAt)))}) چه ماند`));
      const ul = el('ul');
      for (const c of carry.slice(0, 8)) {
        const li = el('li');
        li.append(el('span', 'dot', '•'));
        li.append(document.createTextNode(c.text + (c.who ? ` — ${c.who}` : '')));
        li.append(el('span', 'brief-tag', c.note));
        ul.append(li);
      }
      s.append(ul);
      const go = el('button', 'brief-link', 'دیدن صورت‌جلسهٔ قبلی ←');
      go.addEventListener('click', () => { $('#briefModal').hidden = true; openMeetingById(prev.id); });
      s.append(go);
      body.append(s);
    }

    if (!related.length && !carry.length) body.append(el('div', 'brief-empty', 'مورد باز مرتبطی پیدا نشد — جلسهٔ تازه‌ای است. یادت باشد بعدش با منشی صورت‌جلسه بگیری.'));

    briefContext = {
      title: ev.title, attendees,
      items: [...related.map(t => `${t.title}${t.who ? ` (${t.who})` : ''}`),
        ...carry.map(c => `${c.text} — ${c.note}`)]
    };
    $('#briefModal').hidden = false;
  }
  $('#briefAgenda').addEventListener('click', async () => {
    const s = await Store.getSettings();
    if (!AIClient.configured(s)) { toast('اول در تنظیمات، اتصال AI را کامل کن'); return; }
    if (!briefContext) return;
    const btn = $('#briefAgenda');
    btn.disabled = true;
    try {
      const ctx = `عنوان جلسه: ${briefContext.title}\nشرکت‌کننده‌ها: ${briefContext.attendees.join('، ') || 'نامشخص'}\nکارهای باز مرتبط:\n${briefContext.items.map(x => '- ' + x).join('\n') || '- موردی ثبت نشده'}`;
      const out = await AIClient.chat(s, [
        { role: 'system', content: 'بر اساس اطلاعات زیر یک دستور جلسهٔ کوتاه و عملی به فارسی پیشنهاد بده: ۳ تا ۵ بند، هر بند یک خط، فقط بندها را بنویس بدون مقدمه.' },
        { role: 'user', content: ctx }
      ], { maxTokens: 400 });
      const out2 = $('#briefAgendaOut');
      out2.textContent = out;
      out2.hidden = false;
    } catch (err) { toast(err.message); }
    btn.disabled = false;
  });

  // ---------- تنظیمات ----------
  async function loadSettingsForm() {
    const s = await Store.getSettings();
    $('#setIcs').value = s.icsUrl;
    $('#setMonshi').value = s.monshiId;
    $('#setName').value = s.userName;
    $('#setEmail').value = s.userEmail || '';
    paintHeroPrefs(s);
    $('#setDayEnd').value = String(s.dayEndHour);
    initAiProviderOptions();
    await renderAiList();
    resetAiEditor();
    await renderTplList();
  }

  // ---------- قالب‌های صورت‌جلسه (سفارشی) ----------
  async function renderTplList() {
    const s = await Store.getSettings();
    const list = $('#tplList');
    list.replaceChildren();
    const builtin = MeetNoteMoM.BUILTIN_TEMPLATES;
    const custom = MeetNoteMoM.customTemplates(s.momTemplates);
    for (const tpl of [...builtin, ...custom]) {
      const row = el('div', 'ai-row');
      const info = el('div', 'ai-info');
      info.append(el('div', 'ai-name', tpl.name + (tpl.custom ? ' ✎' : '')));
      info.append(el('div', 'ai-meta', tpl.description || ''));
      row.append(info);
      if (tpl.custom) {
        const del = el('button', 'ai-mini ai-del', 'حذف');
        del.addEventListener('click', async () => {
          const next = (s.momTemplates || []).filter(x => x.id !== tpl.id);
          await Store.saveSettings({ momTemplates: next });
          renderTplList();
        });
        row.append(del);
      } else {
        row.append(el('span', 'brief-tag', 'آماده'));
      }
      list.append(row);
    }
  }
  $('#tplSave').addEventListener('click', async () => {
    const name = $('#tplName').value.trim();
    const instructions = $('#tplInstructions').value.trim();
    if (!name || !instructions) { flash('#tplStatus', 'نام و دستور قالب هر دو لازم‌اند', false); return; }
    const s = await Store.getSettings();
    const tpl = { id: 'tpl' + Date.now().toString(36), name, description: 'قالب سفارشی', instructions };
    await Store.saveSettings({ momTemplates: [...(s.momTemplates || []), tpl] });
    $('#tplName').value = ''; $('#tplInstructions').value = '';
    await renderTplList();
    flash('#tplStatus', 'قالب ذخیره شد ✓');
  });

  // ---------- مدیریت چند اتصال هوش مصنوعی ----------
  function initAiProviderOptions() {
    const sel = $('#aiEdProvider');
    if (sel.options.length) return;
    for (const [key, p] of Object.entries(AIClient.PROVIDERS)) {
      const o = document.createElement('option');
      o.value = key; o.textContent = p.label;
      sel.append(o);
    }
    sel.addEventListener('change', () => {
      const preset = AIClient.PROVIDERS[sel.value];
      if (!preset) return;
      if (preset.baseUrl) $('#aiEdBaseUrl').value = preset.baseUrl;
      if (preset.model) $('#aiEdModel').value = preset.model;
      if (!$('#aiEdName').value.trim()) $('#aiEdName').value = preset.label;
    });
  }
  function resetAiEditor() {
    $('#aiEditId').value = '';
    $('#aiEdProvider').value = 'openai';
    $('#aiEdName').value = '';
    $('#aiEdBaseUrl').value = AIClient.PROVIDERS.openai.baseUrl;
    $('#aiEdModel').value = AIClient.PROVIDERS.openai.model;
    $('#aiEdExtractModel').value = '';
    $('#aiEdKey').value = '';
    $('#aiEditorTitle').textContent = 'افزودن اتصال جدید';
    $('#aiCancel').hidden = true;
  }
  function readAiEditor() {
    return {
      id: $('#aiEditId').value || undefined,
      provider: $('#aiEdProvider').value,
      name: $('#aiEdName').value.trim(),
      baseUrl: $('#aiEdBaseUrl').value.trim(),
      key: $('#aiEdKey').value.trim(),
      model: $('#aiEdModel').value.trim(),
      extractModel: $('#aiEdExtractModel').value.trim()
    };
  }
  async function renderAiList() {
    const s = await Store.getSettings();
    const profiles = s.aiProfiles || [];
    const list = $('#aiList');
    list.replaceChildren();
    if (!profiles.length) {
      list.append(el('div', 'ai-empty', 'هنوز اتصالی اضافه نشده — از فرم پایین اولین سرویس را بساز.'));
      return;
    }
    for (const p of profiles) {
      const row = el('div', 'ai-row' + (p.id === s.activeAiId ? ' is-active' : ''));
      const radio = el('button', 'ai-radio', '');
      radio.setAttribute('aria-label', 'اتصال فعال');
      radio.title = 'انتخاب به‌عنوان اتصال فعال';
      radio.addEventListener('click', async () => { await Store.setActiveAi(p.id); renderAiList(); });
      const info = el('div', 'ai-info');
      info.append(el('div', 'ai-name', p.name));
      info.append(el('div', 'ai-meta', `${AIClient.PROVIDERS[p.provider]?.label || p.provider} · ${p.model || 'بدون مدل'}${p.extractModel ? ` · استخراج: ${p.extractModel}` : ''}${p.id === s.activeAiId ? ' · فعال' : ''}`));
      const edit = el('button', 'ai-mini', 'ویرایش');
      edit.addEventListener('click', () => fillAiEditor(p));
      const del = el('button', 'ai-mini ai-del', 'حذف');
      del.addEventListener('click', async () => { await Store.removeAiProfile(p.id); renderAiList(); resetAiEditor(); });
      row.append(radio, info, edit, del);
      list.append(row);
    }
  }
  function fillAiEditor(p) {
    $('#aiEditId').value = p.id;
    $('#aiEdProvider').value = AIClient.PROVIDERS[p.provider] ? p.provider : 'custom';
    $('#aiEdName').value = p.name;
    $('#aiEdBaseUrl').value = p.baseUrl;
    $('#aiEdModel').value = p.model;
    $('#aiEdExtractModel').value = p.extractModel || '';
    $('#aiEdKey').value = p.key;
    $('#aiEditorTitle').textContent = 'ویرایش اتصال';
    $('#aiCancel').hidden = false;
    $('#aiEdName').focus();
  }
  $('#aiCancel').addEventListener('click', resetAiEditor);
  $('#aiSave').addEventListener('click', async () => {
    const p = readAiEditor();
    if (!p.baseUrl || !p.key || !p.model) { flash('#aiStatus', 'Base URL، کلید و مدل هر سه لازم‌اند', false); return; }
    await Store.saveAiProfile(p);
    await renderAiList();
    resetAiEditor();
    flash('#aiStatus', 'اتصال ذخیره شد ✓');
  });
  $('#aiTest').addEventListener('click', async () => {
    const p = readAiEditor();
    if (!p.baseUrl || !p.key || !p.model) { flash('#aiStatus', 'برای تست، هر سه فیلد را پر کن', false); return; }
    flash('#aiStatus', 'در حال تست…');
    try { await AIClient.testProfile(p); flash('#aiStatus', 'اتصال برقرار است ✓'); }
    catch (e) { flash('#aiStatus', e.message, false); }
  });
  function flash(id, msg, ok = true) {
    const n = $(id);
    n.textContent = msg;
    n.className = 'field-status ' + (ok ? 'ok' : 'err');
    setTimeout(() => { n.textContent = ''; }, 4000);
  }
  $('#saveIcs').addEventListener('click', async () => {
    const url = $('#setIcs').value.trim();
    await Store.saveSettings({ icsUrl: url });
    if (!url) { flash('#icsStatus', 'پاک شد'); return; }
    if (Store.isExt && chrome.permissions) {
      try {
        const origin = new URL(url).origin + '/*';
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) { flash('#icsStatus', 'دسترسی داده نشد', false); return; }
      } catch { flash('#icsStatus', 'آدرس نامعتبر است', false); return; }
    }
    flash('#icsStatus', 'در حال دریافت…');
    try {
      await refreshCalendar(true);
      flash('#icsStatus', 'وصل شد ✓');
      renderAll();
    } catch (e) { flash('#icsStatus', e.message, false); }
  });
  $('#saveMonshi').addEventListener('click', async () => {
    await Store.saveSettings({ monshiId: $('#setMonshi').value.trim() });
    flash('#monshiStatus', 'ذخیره شد ✓');
  });
  $('#savePrefs').addEventListener('click', async () => {
    await Store.saveSettings({
      userName: $('#setName').value.trim(),
      userEmail: $('#setEmail').value.trim(),
      dayEndHour: Number($('#setDayEnd').value)
    });
    heroName = $('#setName').value.trim();
    flash('#prefsStatus', 'ذخیره شد ✓');
    renderAll();
  });

  // ---------- پشتیبان‌گیری ----------
  $('#backupSecrets').addEventListener('change', e => { $('#backupWarn').hidden = !e.target.checked; });
  $('#exportBtn').addEventListener('click', async () => {
    const data = await Store.exportData({ includeSecrets: $('#backupSecrets').checked });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vardast-backup-${J.iso(new Date())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('#backupStatus', 'فایل پشتیبان ساخته شد ✓');
  });
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const res = await Store.importData(obj, { replace: false });
      await renderAll();
      flash('#backupStatus', `${J.faDigits(res.added)} کار وارد شد${res.kept ? `، ${J.faDigits(res.kept)} تکراری رد شد` : ''} ✓`);
      toast(`بازگردانی شد — ${J.faDigits(res.added)} کار اضافه شد`);
    } catch (err) {
      flash('#backupStatus', err.message || 'فایل خوانده نشد', false);
    }
  });

  async function refreshCalendar(throwErr) {
    if (Store.isExt) {
      const res = await chrome.runtime.sendMessage({ type: 'vardast/refreshCalendar' });
      if (!res?.ok && throwErr) throw new Error(res?.error || 'دریافت تقویم ناموفق بود');
    }
  }
  $('#calRefresh').addEventListener('click', async () => {
    await refreshCalendar(false);
    await renderAll();
    toast('تقویم به‌روز شد');
  });

  // ---------- مودال‌ها ----------
  document.querySelectorAll('.modal-close').forEach(b =>
    b.addEventListener('click', () => b.closest('.modal-wrap').hidden = true));
  document.querySelectorAll('.modal-wrap').forEach(w =>
    w.addEventListener('click', e => { if (e.target === w) w.hidden = true; }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-wrap').forEach(w => w.hidden = true);
  });

  // ---------- جستجوی سراسری (کامند پالت) + میان‌برها ----------
  let cmdItems = [], cmdIndex = 0;
  const PERSON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0"/></svg>';
  const VIEW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16M4 12h16M4 17.5h10"/></svg>';

  async function openCmd() {
    const box = $('#cmdPalette');
    box.hidden = false;
    const inp = $('#cmdInput');
    inp.value = '';
    await buildCmd('');
    setTimeout(() => inp.focus(), 0);
  }
  function closeCmd() { $('#cmdPalette').hidden = true; }

  async function buildCmd(raw) {
    const typed = (raw || '').trim();
    const q = searchNorm(typed);
    const [tasks, sessions, meta] = await Promise.all([Store.getTasks(), Store.getSessions(), Store.getPeopleMeta()]);
    const items = [];
    if (typed) items.push({ icon: ICONS.plus, type: 'افزودن', label: `افزودن کار: «${typed}»`,
      act: async () => { const p = DateParser.parse(typed); await Store.addTask({ title: p.title || typed, due: p.due, recur: p.recur, tags: p.tags, dir: 'mine' }); await renderAll(); toast('کار اضافه شد ✓'); goto('today'); } });
    const views = [['today', 'امروز'], ['week', 'هفته'], ['meetings', 'جلسه‌ها'], ['tasks', 'کارها'], ['people', 'آدم‌ها'], ['report', 'گزارش'], ['settings', 'تنظیمات']];
    for (const [v, l] of views) if (!q || searchNorm(l).includes(q)) items.push({ icon: VIEW_SVG, type: 'بخش', label: l, act: () => goto(v) });
    for (const t of tasks) {
      if (q ? !(searchNorm(t.title).includes(q) || (t.tags || []).some(x => searchNorm(x).includes(q))) : t.status === 'done') continue;
      items.push({ icon: ICONS.check, type: 'کار', label: t.title, sub: t.status === 'done' ? 'انجام‌شده' : (t.due ? J.relLabel(t.due) : ''), act: () => goto('tasks') });
    }
    for (const s of [...sessions].sort(byNewest)) {
      if (q && !searchNorm(s.title).includes(q)) continue;
      items.push({ icon: ICONS.video, type: 'جلسه', label: s.title || 'جلسه', act: () => openMeetingById(s.id) });
    }
    // کلیدهای meta شناسهٔ فردند (e:ایمیل / n:نام) — نامِ نمایشی باید از خودِ پرونده بیاید
    const names = new Set(Object.values(meta || {}).map(p => p && p.name).filter(Boolean));
    tasks.forEach(t => { if (t.who) names.add(t.who); });
    for (const n of names) { if (q && !searchNorm(n).includes(q)) continue; items.push({ icon: PERSON_SVG, type: 'آدم', label: n, act: () => goto('people') }); }
    cmdItems = items.slice(0, 40);
    cmdIndex = 0;
    paintCmd();
  }
  function paintCmd() {
    const box = $('#cmdResults');
    box.replaceChildren();
    if (!cmdItems.length) { box.append(el('div', 'cmd-empty', 'چیزی پیدا نشد')); return; }
    cmdItems.forEach((it, i) => {
      const row = el('button', 'cmd-item' + (i === cmdIndex ? ' is-active' : ''));
      row.setAttribute('role', 'option');
      const ic = el('span', 'cmd-ic'); ic.innerHTML = it.icon; row.append(ic);
      const body = el('div', 'cmd-body');
      body.append(el('div', 'cmd-label', it.label));
      if (it.sub) body.append(el('div', 'cmd-sub', it.sub));
      row.append(body);
      row.append(el('span', 'cmd-type', it.type));
      row.addEventListener('click', () => { closeCmd(); it.act(); });
      row.addEventListener('mousemove', () => { if (cmdIndex !== i) { cmdIndex = i; paintCmd(); } });
      box.append(row);
    });
  }
  $('#cmdInput').addEventListener('input', e => buildCmd(e.target.value));
  $('#cmdInput').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdIndex = Math.min(cmdIndex + 1, cmdItems.length - 1); paintCmd(); scrollCmd(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdIndex = Math.max(cmdIndex - 1, 0); paintCmd(); scrollCmd(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = cmdItems[cmdIndex]; if (it) { closeCmd(); it.act(); } }
    else if (e.key === 'Escape') { e.preventDefault(); closeCmd(); }
  });
  function scrollCmd() { const a = $('#cmdResults').querySelector('.cmd-item.is-active'); if (a) a.scrollIntoView({ block: 'nearest' }); }

  // میان‌برهای سراسری
  const inField = e => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
  const VIEW_KEYS = ['today', 'week', 'meetings', 'tasks', 'people', 'report'];
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openCmd(); return; }
    if (inField(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); openCmd(); }
    else if (e.key === 'n') { e.preventDefault(); goto('today'); quickInput.focus(); }
    else if (e.key >= '1' && e.key <= '6') { e.preventDefault(); goto(VIEW_KEYS[+e.key - 1]); }
  });

  // ---------- رندر کلی ----------
  let heroName = '';
  let hasCalendar = false;

  async function renderAll() {
    const [tasks, settings, evCache, pMeta] = await Promise.all([
      Store.getTasks(), Store.getSettings(), Store.getEvents(), Store.getPeopleMeta()
    ]);
    peopleMetaCache = pMeta || {};
    heroName = settings.userName;
    hasCalendar = !!settings.icsUrl || (!Store.isExt && evCache.events.length > 0);
    $('#calRefresh').hidden = !hasCalendar;
    const events = evCache.events || [];
    cachedTasks = tasks; cachedEvents = events;
    const todayEvents = events.filter(e => new Date(e.start).toDateString() === new Date().toDateString());
    // خوش‌آمدِ کاربر جدید (بدون کار، بدون تقویم، بدون AI)
    const noAI = !(settings.aiProfiles || []).length && !settings.aiKey;
    const isNew = tasks.length === 0 && !hasCalendar && noAI;
    $('#onboarding').hidden = !isNew;
    renderHero(tasks, todayEvents);
    renderKPI(tasks, events);
    renderQuickActions();
    startClocks();
    if (isNew) { $('#kpiStrip').hidden = true; $('#quickActions').replaceChildren(); }
    renderNextMeeting(events, tasks);
    // «از جلسه‌ها چه ماند» — به تاریخچهٔ جلسه‌ها نیاز دارد
    looseDismissed = settings.looseDismissed || {};
    Store.getSessions().then(ss => {
      allTasksCache = tasks;
      if (isNew) { $('#loose').hidden = true; return; }
      renderLoose(ss, tasks, events);
    });
    renderFocusToday(tasks);
    renderMeetings(events, tasks);
    renderFollowups(tasks);
    renderTasksView();
    renderDayEnd(tasks, settings);
    weatherOn = !!settings.weatherOn;
    if (!weatherOn) weatherTxt = '';
    clockZones = (settings.clockZones || []).map(tz => {
      const found = CLOCK_CHOICES.find(c => c[1] === tz);
      return found || null;
    }).filter(Boolean);
    renderNews(settings);
    checkUpdateQuietly();
  }

  // ---------- کیوسک ----------
  // صفحهٔ مکث. هر کارت اختیاری است و همه‌شان جز اخبار کاملاً آفلاین‌اند.
  const KIOSK_CARDS = [
    ['calendar', 'تقویم و مناسبت‌ها', 'شمارش معکوس و مناسبت‌های پیشِ رو — آفلاین'],
    ['prayer', 'اوقات شرعی', 'روی همین دستگاه حساب می‌شود — آفلاین'],
    ['focus', 'تایمر تمرکز', 'دورِ ۲۵ دقیقه‌ای روی یک کار — زمانش روی همان کار ثبت می‌شود'],
    ['beyt', 'سخن روز', 'شعر فارسی و نقل‌قولِ آدم‌های بزرگ — آفلاین، با امکان تازه‌سازی'],
    ['market', 'بازار', 'دلار، طلا و سکه — به سایت بیرونی وصل می‌شود'],
    ['news', 'اخبار', 'فناوری، ورزشی، اقتصاد و عمومی — به سایت بیرونی وصل می‌شود']
  ];

  // ── بازار: ارز، طلا و سکه ────────────────────────────
  // منبع یکی است ولی دو صفحه دارد. هر کدام جدا خوانده می‌شود تا اگر یکی نبود،
  // آن یکی همچنان کار کند.
  const MARKET_PAGES = [
    { key: 'currencies', url: 'https://alanchand.com/currencies-price', parse: h => Market.parseCurrencies(h) },
    { key: 'gold', url: 'https://alanchand.com/gold-price', parse: h => Market.parseGold(h) }
  ];
  const MARKET_REFRESH_MS = 10 * 60 * 1000;
  let marketItems = [], marketStatus = [], marketLoadedAt = 0;

  async function fetchMarketPage(page) {
    const origin = new URL(page.url).origin + '/*';
    if (Store.isExt && chrome.permissions) {
      try {
        if (!await chrome.permissions.contains({ origins: [origin] })) {
          return { key: page.key, items: [], error: 'دسترسی به این سایت داده نشده' };
        }
      } catch (_) { /* ادامه بده */ }
    }
    let r;
    try { r = await fetch(page.url, { cache: 'no-store', redirect: 'follow' }); }
    catch (_) { return { key: page.key, items: [], error: Store.isExt ? 'سایت پاسخ نداد (شبکه یا فیلترینگ)' : 'در پیش‌نمایش مرورگر ممکن نیست (CORS)' }; }
    if (!r.ok) return { key: page.key, items: [], error: `سایت خطای ${J.faDigits(r.status)} داد` };
    let text = '';
    try { text = await r.text(); } catch (_) { return { key: page.key, items: [], error: 'پاسخ خوانده نشد' }; }
    const items = page.parse(text);
    return { key: page.key, items, error: items.length ? '' : 'صفحه خوانده شد ولی قیمتی پیدا نشد (شاید ساختارش عوض شده)' };
  }

  async function loadMarket() {
    const results = await Promise.all(MARKET_PAGES.map(fetchMarketPage));
    marketStatus = results.map(r => ({
      name: r.key === 'gold' ? 'طلا و سکه' : 'ارز',
      count: r.items.length, error: r.error
    }));
    const fresh = results.flatMap(r => r.items);
    if (!fresh.length) { marketItems = []; return; }
    // تاریخچهٔ محلی: ذخیره کن، بعد تغییر را از همان حساب کن
    const now = new Date();
    const hist = Market.pushSnapshot(await Store.getMarketHistory(), fresh, now);
    await Store.saveMarketHistory(hist);
    marketItems = Market.withChange(fresh, hist, now);
    marketLoadedAt = Date.now();
  }

  function marketRow(it) {
    const r = el('div', 'mk-row');
    r.append(el('span', 'mk-name', it.label));
    const v = el('span', 'mk-val');
    v.append(el('span', 'mk-num', Market.faPrice(it.value)));
    v.append(el('span', 'mk-unit', it.unit));
    r.append(v);
    const ch = it.change;
    if (ch && Math.abs(ch.percent) >= 0.01) {
      const up = ch.amount > 0;
      const c = el('span', 'mk-ch ' + (up ? 'is-up' : 'is-down'));
      c.append(el('span', 'mk-arrow', up ? '▲' : '▼'));
      c.append(document.createTextNode(Market.faPercent(ch.percent)));
      c.title = `${up ? 'افزایش' : 'کاهش'} ${Market.faPrice(Math.abs(ch.amount))} ${it.unit}` +
        (ch.since ? ` نسبت به ${J.relLabel(ch.since)}` : ' نسبت به دیروز');
      r.append(c);
    } else {
      r.append(el('span', 'mk-ch is-flat', '—'));
    }
    return r;
  }

  function buildMarketCard() {
    const when = marketLoadedAt ? `آخرین بروزرسانی ${J.faDigits(hhmm(new Date(marketLoadedAt)))}` : '';
    const card = kioskCard('بازار', when);
    card.classList.add('tint-amber');
    if (!marketItems.length) {
      const why = el('div', 'kiosk-empty');
      if (marketStatus.length) {
        for (const st of marketStatus) {
          const row = el('div', 'news-status');
          row.append(el('span', 'news-status-name', st.name));
          row.append(el('span', null, st.error || `${J.faDigits(st.count)} قلم`));
          why.append(row);
        }
      } else why.append(document.createTextNode('هنوز قیمتی خوانده نشده.'));
      const grant = el('button', 'btn btn-ghost btn-sm', 'دادن دسترسی و امتحان دوباره');
      grant.addEventListener('click', () => grantAndReload(['https://alanchand.com/*'], async () => {
        marketLoadedAt = 0; await loadMarket(); renderKiosk();
      }));
      why.append(grant);
      card.append(why);
      return card;
    }
    for (const group of ['ارز', 'طلا', 'سکه', 'جهانی']) {
      const rows = marketItems.filter(x => x.group === group);
      if (!rows.length) continue;
      const sec = el('div', 'mk-group');
      sec.append(el('div', 'mk-group-t', group));
      for (const it of rows) sec.append(marketRow(it));
      card.append(sec);
    }
    const note = el('p', 'kiosk-note', 'از alanchand.com · ممکن است چند دقیقه تأخیر داشته باشد.');
    note.title = 'درصدِ تغییرِ ارز از مقایسه با قیمتی که خودِ منشی دیروز ذخیره کرده حساب می‌شود. طلا و سکه درصدِ خودِ منبع را دارند.';
    card.append(note);
    return card;
  }

  // درخواستِ دسترسی به یک سایت، بعد اجرای دوبارهٔ همان کار
  async function grantAndReload(origins, after) {
    if (!Store.isExt || !chrome.permissions) { toast('این کار فقط داخل خودِ اکستنشن ممکن است'); return; }
    try {
      const ok = await chrome.permissions.request({ origins });
      if (!ok) { toast('دسترسی داده نشد'); return; }
      await after();
    } catch (e) { toast('درخواست دسترسی ناموفق بود'); }
  }

  function kioskCard(title, sub) {
    const c = el('section', 'kiosk-card');
    const h = el('div', 'kiosk-card-head');
    h.append(el('h2', 'kiosk-card-title', title));
    if (sub) h.append(el('span', 'kiosk-card-sub', sub));
    c.append(h);
    return c;
  }

  const dayLabel = (n) => n === 0 ? 'امروز' : n === 1 ? 'فردا' : `${J.faDigits(n)} روز`;

  function buildCalendarCard(now) {
    const card = kioskCard('تقویم', J.format(now));
    card.classList.add('tint-blue');
    const today = Kiosk.todayOccasions(now);
    if (today.length) {
      const b = el('div', 'kiosk-today');
      for (const o of today) b.append(el('span', 'kiosk-badge' + (o.holiday ? ' is-holiday' : ''), o.title));
      card.append(b);
    }
    const cds = el('div', 'kiosk-counts');
    for (const c of Kiosk.countdowns(now)) {
      const x = el('div', 'kiosk-count' + (c.holiday ? ' is-holiday' : ''));
      x.append(el('span', 'kiosk-count-n', c.days === 0 ? 'امروز' : J.faDigits(c.days)));
      x.append(el('span', 'kiosk-count-l', c.label));
      if (c.days > 0) x.title = `${J.faDigits(c.days)} روز مانده`;
      cds.append(x);
    }
    card.append(cds);

    const list = el('div', 'kiosk-list');
    for (const o of Kiosk.upcomingOccasions(now, 5)) {
      const r = el('div', 'kiosk-row');
      r.append(el('span', 'kiosk-row-when', dayLabel(o.days)));
      const t = el('span', 'kiosk-row-title', o.title);
      if (o.holiday) t.append(el('span', 'kiosk-holiday-dot', ' تعطیل'));
      r.append(t);
      r.append(el('span', 'kiosk-row-date', `${J.faDigits(o.jd)} ${J.MONTHS[o.jm - 1]}`));
      list.append(r);
    }
    card.append(list);
    // صادق باش دربارهٔ آنچه نیست
    card.append(el('p', 'kiosk-note', 'فقط مناسبت‌های تقویم شمسی. مناسبت‌های قمری هر سال جابه‌جا می‌شوند و بدون رؤیت هلال دقیق نیستند، پس اینجا نیامده‌اند.'));
    return card;
  }

  function buildPrayerCard(now, cityName) {
    const [name, lat, lng] = Kiosk.cityByName(cityName);
    const card = kioskCard('اوقات شرعی', name);
    card.classList.add('tint-teal');
    const times = Kiosk.prayerTimes(now, lat, lng, Kiosk.IRAN_TZ);
    const next = Kiosk.nextPrayer(times, now);
    if (next) {
      const n = el('div', 'kiosk-next');
      const h = Math.floor(next.minutes / 60), m = next.minutes % 60;
      const left = h ? `${J.faDigits(h)} ساعت و ${J.faDigits(m)} دقیقه` : `${J.faDigits(m)} دقیقه`;
      n.append(el('span', 'kiosk-next-l', `تا ${next.label}${next.tomorrow ? 'ِ فردا' : ''}`));
      n.append(el('span', 'kiosk-next-v', left));
      card.append(n);
    }
    const grid = el('div', 'kiosk-times');
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const cell = el('div', 'kiosk-time' + (next && next.key === k && !next.tomorrow ? ' is-next' : ''));
      cell.append(el('span', 'kiosk-time-l', Kiosk.PRAYER_LABELS[k]));
      cell.append(el('span', 'kiosk-time-v', J.faDigits(Kiosk.hhmm(times[k]))));
      grid.append(cell);
    }
    card.append(grid);
    const pick = el('label', 'kiosk-city');
    pick.append(el('span', null, 'شهر'));
    const sel = el('select');
    for (const [c] of Kiosk.CITIES) {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      if (c === name) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener('change', async () => {
      await Store.saveSettings({ prayerCity: sel.value });
      renderKiosk();
    });
    pick.append(sel);
    card.append(pick);
    card.append(el('p', 'kiosk-note', 'به روشِ مؤسسهٔ ژئوفیزیک دانشگاه تهران، بدون ساعت تابستانی. ممکن است یکی‌دو دقیقه با تقویم محلی فرق کند.'));
    return card;
  }

  // ── تایمر تمرکز ─────────────────────────────────────
  // یک دورِ ۲۵ دقیقه‌ای روی یک کارِ مشخص. وقتی تمام شد، همان دقیقه‌ها روی
  // خودِ کار ثبت می‌شود تا کنارِ «تخمین زمان» معنا پیدا کند.
  let focusTick = null;

  async function startFocus(taskId, minutes) {
    const s = await Store.getSettings();
    const prev = s.focusSession;
    const round = prev && prev.mode === 'break' ? (prev.round || 1) + 1 : 1;
    await Store.saveSettings({ focusSession: Kiosk.startSession(taskId, minutes, new Date(), round) });
    renderKiosk();
  }

  // ثبتِ زمانِ کارشده روی کار و رفتن به مرحلهٔ بعد
  async function finishFocus(goNext) {
    const s = await Store.getSettings();
    const sess = s.focusSession;
    if (!sess) return;
    const worked = Kiosk.workedMinutes(sess, new Date());
    const patch = { focusSession: goNext ? Kiosk.nextSession(sess, new Date()) : null };
    if (worked > 0) {
      patch.focusLog = Kiosk.addFocus(s.focusLog, worked, new Date());
      if (sess.taskId) {
        const t = (await Store.getTasks()).find(x => x.id === sess.taskId);
        if (t) await Store.updateTask(t.id, { focusMin: (t.focusMin || 0) + worked });
      }
    }
    await Store.saveSettings(patch);
    if (worked > 0) toast(`${J.faDigits(worked)} دقیقه تمرکز ثبت شد`);
    renderKiosk();
  }

  async function cancelFocus() {
    await Store.saveSettings({ focusSession: null });
    renderKiosk();
  }

  function buildFocusCard(settings, tasks) {
    const card = kioskCard('تمرکز', '');
    card.classList.add('tint-green');
    const now = new Date();
    const st = Kiosk.focusState(settings.focusSession, now);
    const today = Kiosk.todayFocus(settings.focusLog, now);
    const task = settings.focusSession?.taskId
      ? (tasks || []).find(t => t.id === settings.focusSession.taskId) : null;

    if (st.phase === 'idle') {
      const open = (tasks || []).filter(t => t.status === 'open' && t.dir === 'mine');
      if (!open.length) {
        card.append(el('p', 'kiosk-note', 'اول یک کار در «کارها» بنویس، بعد اینجا برایش دور بگذار.'));
        return card;
      }
      const pick = el('label', 'kiosk-city');
      pick.append(el('span', null, 'روی چه کاری'));
      const sel = el('select');
      sel.id = 'focusTask';
      for (const t of open.slice(0, 30)) {
        const o = document.createElement('option');
        o.value = t.id;
        o.textContent = t.title + (t.estimate ? ` (${humanDur(t.estimate)})` : '');
        sel.append(o);
      }
      pick.append(sel);
      card.append(pick);
      const row = el('div', 'kiosk-acts');
      const go = el('button', 'btn btn-primary btn-sm', `شروع ${J.faDigits(Kiosk.FOCUS.work)} دقیقه`);
      go.addEventListener('click', () => startFocus(sel.value, Kiosk.FOCUS.work));
      row.append(go);
      for (const m of [15, 50]) {
        const b = el('button', 'btn btn-ghost btn-sm', `${J.faDigits(m)} دقیقه`);
        b.addEventListener('click', () => startFocus(sel.value, m));
        row.append(b);
      }
      card.append(row);
    } else {
      const isBreak = st.mode === 'break';
      const done = st.phase === 'done';
      const ring = el('div', 'focus-ring' + (isBreak ? ' is-break' : '') + (done ? ' is-done' : ''));
      ring.style.setProperty('--pct', String(st.pct));
      ring.append(el('span', 'focus-time', J.faDigits(Kiosk.clock(st.leftSec))));
      ring.append(el('span', 'focus-mode', done ? 'تمام شد' : isBreak ? 'استراحت' : `دور ${J.faDigits(st.round)}`));
      card.append(ring);
      if (task) card.append(el('p', 'focus-task', task.title));
      if (task?.estimate) {
        card.append(el('p', 'kiosk-note',
          `تخمین ${humanDur(task.estimate)} · تا حالا ${humanDur((task.focusMin || 0) + (isBreak ? 0 : st.elapsedMin))} کار شده`));
      }
      const row = el('div', 'kiosk-acts');
      if (done) {
        const nx = el('button', 'btn btn-primary btn-sm', isBreak ? 'دور بعدی' : 'استراحت');
        nx.addEventListener('click', () => finishFocus(true));
        const stop = el('button', 'btn btn-ghost btn-sm', 'بس است');
        stop.addEventListener('click', () => finishFocus(false));
        row.append(nx, stop);
      } else {
        const fin = el('button', 'btn btn-ghost btn-sm', isBreak ? 'رد کن' : 'تمامش کردم');
        fin.addEventListener('click', () => finishFocus(!isBreak));
        const cancel = el('button', 'btn btn-ghost btn-sm', 'لغو');
        cancel.addEventListener('click', cancelFocus);
        row.append(fin, cancel);
      }
      card.append(row);
    }

    if (today.rounds) {
      card.append(el('p', 'focus-sum',
        `امروز ${J.faDigits(today.rounds)} دور · ${humanDur(today.minutes)} تمرکز`));
    }
    return card;
  }

  let sayingMode = 'all';   // all | poem | quote
  let quoteCache = [];      // نقل‌قول‌های گرفته‌شده از وب (از تنظیمات خوانده می‌شود)

  // گرفتنِ نقل‌قولِ تازه — همان الگوی اخبار و بازار: اختیاری، اجازه‌محور و خودآزما.
  // چند منبع پشتِ سرِ هم امتحان می‌شوند؛ اولی که جواب داد برنده است.
  async function fetchOneQuoteSource(feed) {
    const origin = new URL(feed.url).origin + '/*';
    if (Store.isExt && chrome.permissions) {
      try {
        const has = await chrome.permissions.contains({ origins: [origin] });
        if (!has) return { items: [], error: 'دسترسی داده نشده' };
      } catch (_) { /* ادامه بده */ }
    }
    let r;
    try { r = await fetch(feed.url, { cache: 'no-store' }); }
    catch (_) { return { items: [], error: Store.isExt ? 'پاسخ نداد' : 'در پیش‌نمایش ممکن نیست (CORS)' }; }
    if (!r.ok) return { items: [], error: `خطای ${J.faDigits(r.status)}` };
    let text = '';
    try { text = await r.text(); } catch (_) { return { items: [], error: 'پاسخ خوانده نشد' }; }
    const items = Kiosk.parseQuotes(text);
    return items.length ? { items, error: '' } : { items: [], error: 'نقل‌قولی نداشت' };
  }

  let quoteStatus = [];   // وضعیتِ هر منبع، برای «چرا نشد»
  async function fetchQuotes() {
    quoteStatus = [];
    for (const feed of Kiosk.QUOTE_FEEDS) {
      const r = await fetchOneQuoteSource(feed);
      quoteStatus.push({ name: feed.name, count: r.items.length, error: r.error });
      if (r.items.length) return { items: r.items, source: feed.name, error: '' };
    }
    return { items: [], source: '', error: quoteStatus.map(x => `${x.name}: ${x.error}`).join(' · ') };
  }

  async function refreshQuotes(silent) {
    const s = await Store.getSettings();
    if (!s.quotesOn) return;
    const { items, source, error } = await fetchQuotes();
    if (error) { if (!silent) toast('هیچ منبعی جواب نداد — ' + error); return; }
    const have = new Set((s.quotesCache || []).map(q => q.lines[0].toLowerCase()));
    const fresh = items.filter(q => !have.has(q.lines[0].toLowerCase()));
    const merged = Kiosk.trimQuotes([...(s.quotesCache || []), ...fresh]);
    await Store.saveSettings({ quotesCache: merged, quotesFetchedAt: Date.now() });
    quoteCache = merged;
    if (!silent) toast(fresh.length ? `${J.faDigits(fresh.length)} سخن تازه از ${source}` : `${source} چیز تازه‌ای نداشت`);
    renderKiosk();
  }

  function buildSayingCard(now, settings) {
    const total = Kiosk.allSayings(quoteCache).length;
    const card = kioskCard('سخن روز', `${J.faDigits(total)} سخن`);
    card.classList.add('tint-violet');

    // این دکمه‌ها قبلاً کلاسی می‌گرفتند که در CSS وجود نداشت، پس خام و بدشکل بودند
    const tabs = el('div', 'say-tabs');
    for (const [key, label] of [['all', 'همه'], ['poem', 'شعر'], ['quote', 'نقل‌قول']]) {
      const b = el('button', 'say-tab' + (sayingMode === key ? ' is-on' : ''), label);
      b.type = 'button';
      b.addEventListener('click', () => { sayingMode = key; renderKiosk(); });
      tabs.append(b);
    }
    card.append(tabs);

    const box = el('div', 'kiosk-beyt');
    let current = null;
    const paint = (s) => {
      current = s;
      box.replaceChildren();
      if (!s) { box.append(el('p', 'kiosk-mesra', '—')); return; }
      box.classList.toggle('is-quote', s.kind === 'quote');
      box.classList.toggle('is-latin', /^[\x00-\x7F\s'"’“”—–,.!?;:()-]+$/.test(s.lines[0]));
      for (const line of s.lines) box.append(el('p', 'kiosk-mesra', line));
      const by = el('p', 'kiosk-by', s.poet);
      if (s.src === 'web') by.title = 'از zenquotes.io گرفته شده';
      box.append(by);
    };
    paint(Kiosk.sayingOfDay(now, sayingMode, quoteCache));
    card.append(box);

    const acts = el('div', 'kiosk-acts');
    const again = el('button', 'btn btn-ghost btn-sm', 'یکی دیگر');
    again.addEventListener('click', () => paint(Kiosk.randomSaying(sayingMode, current?.lines[0], quoteCache)));
    const copy = el('button', 'btn btn-ghost btn-sm', 'کپی');
    copy.addEventListener('click', async () => {
      if (!current) return;
      await navigator.clipboard.writeText(`${current.lines.join('\n')}\n— ${current.poet}`);
      toast('کپی شد');
    });
    acts.append(again, copy);

    // تازه‌سازی از وب — فقط وقتی خودش روشنش کرده باشد
    if (settings?.quotesOn) {
      const upd = el('button', 'btn btn-ghost btn-sm', 'تازه‌سازی');
      upd.title = 'سخن‌های تازه از zenquotes.io — هرچه گرفته شد محلی می‌ماند';
      upd.addEventListener('click', async () => {
        upd.disabled = true; upd.textContent = 'در حال گرفتن…';
        await refreshQuotes(false);
      });
      acts.append(upd);
    }
    card.append(acts);

    const web = quoteCache.length;
    if (web) {
      const n = el('p', 'kiosk-note', `${J.faDigits(web)} سخن از اینترنت گرفته و اینجا ذخیره شده — بدون اینترنت هم می‌مانند.`);
      card.append(n);
    }
    return card;
  }

  let newsCat = '';        // '' = همه
  let newsExpanded = false; // فهرستِ کوتاه یا کامل
  function buildNewsCard(settings) {
    const card = kioskCard('اخبار', newsItems.length ? `${J.faDigits(newsItems.length)} خبر` : '');
    card.classList.add('tint-green');
    if (!newsItems.length) {
      const why = el('div', 'kiosk-empty');
      if (newsStatus.length) {
        for (const st of newsStatus) {
          const row = el('div', 'news-status');
          row.append(el('span', 'news-status-name', st.name));
          row.append(el('span', null, st.error || `${J.faDigits(st.count)} خبر`));
          why.append(row);
        }
      } else why.append(document.createTextNode('هنوز خبری خوانده نشده.'));
      const go = el('button', 'btn btn-ghost btn-sm', 'تنظیمات اخبار');
      go.addEventListener('click', () => goto('settings'));
      why.append(go);
      card.append(why);
      return card;
    }
    // فیلترِ دسته — فقط دسته‌هایی که واقعاً خبری دارند
    const live = NEWS_CATS.filter(c => newsItems.some(x => x.cat === c));
    if (live.length > 1) {
      const tabs = el('div', 'kiosk-cats');
      const mk = (label, val) => {
        const b = el('button', 'kiosk-cat' + (newsCat === val ? ' is-on' : ''), label);
        b.addEventListener('click', () => { newsCat = val; renderKiosk(); });
        tabs.append(b);
      };
      mk('همه', '');
      for (const c of live) mk(c, c);
      card.append(tabs);
    }
    // فهرستِ بلند هم کارت را غول می‌کرد و ستون را به‌هم می‌ریخت، هم خلافِ قرارِ
    // «این صفحه باید ته داشته باشد» بود. شش‌تا، و اگر خواستی بازش کن.
    const matching = newsItems.filter(x => !newsCat || x.cat === newsCat);
    const shown = newsExpanded ? matching.slice(0, 20) : matching.slice(0, 6);
    const list = el('div', 'kiosk-news');
    if (!shown.length) list.append(el('div', 'kiosk-empty', 'در این دسته خبری نیست'));
    for (const it of shown) {
      const a = el('a', 'kiosk-news-item');
      a.href = it.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
      if (it.image) {
        const img = document.createElement('img');
        img.className = 'kiosk-news-thumb';
        img.src = it.image;
        img.alt = '';                       // تزئینی است؛ عنوان کنارش خوانده می‌شود
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';  // آدرسِ منشی برای سرورِ عکس فرستاده نشود
        // عکسِ خراب نباید جای خالی بگذارد
        img.addEventListener('error', () => { img.remove(); a.classList.add('no-thumb'); });
        a.append(img);
      }
      const body = el('span', 'kiosk-news-body');
      body.append(el('span', 'kiosk-news-title', it.title));
      const meta = el('span', 'kiosk-news-meta');
      meta.append(el('span', 'kiosk-news-src', it.source));
      if (it.cat) meta.append(el('span', 'kiosk-news-cat', it.cat));
      if (it.at) meta.append(el('span', null, J.relLabel(J.iso(new Date(it.at)))));
      body.append(meta);
      a.append(body);
      list.append(a);
    }
    card.append(list);
    if (matching.length > shown.length || newsExpanded) {
      const more = el('button', 'kiosk-more');
      more.textContent = newsExpanded
        ? 'کمتر'
        : `${J.faDigits(Math.min(matching.length, 20) - shown.length)} خبر دیگر`;
      more.addEventListener('click', () => { newsExpanded = !newsExpanded; renderKiosk(); });
      card.append(more);
    }
    return card;
  }

  // انتخابِ کارت‌ها — همین‌جا روی صفحه، نه سفرِ رفت‌وبرگشت به تنظیمات
  function openKioskPrefs(anchor, on) {
    closePops();
    const pop = el('div', 'resched-pop kiosk-pop');
    pop.append(el('div', 'resched-head', 'چه چیزهایی دیده شود'));
    for (const [key, label, hint] of KIOSK_CARDS) {
      const row = el('label', 'kiosk-pref');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = on.includes(key);
      cb.addEventListener('change', async () => {
        const next = cb.checked ? [...new Set([...on, key])] : on.filter(x => x !== key);
        on = next;
        await Store.saveSettings({ kioskCards: next });
        renderKiosk();
      });
      const txt = el('span', 'kiosk-pref-txt');
      txt.append(el('span', 'kiosk-pref-l', label));
      txt.append(el('span', 'kiosk-pref-h', hint));
      row.append(cb, txt);
      pop.append(row);
    }
    placePop(pop, anchor);
  }

  // شمارنده هر ثانیه فقط وقتی جلسه‌ای در جریان است — وگرنه رندرِ بیهوده
  function syncFocusTick(settings) {
    const st = Kiosk.focusState(settings.focusSession, new Date());
    const live = st.phase === 'work' || st.phase === 'break';
    if (live && !focusTick) {
      focusTick = setInterval(() => {
        const view = document.getElementById('view-kiosk');
        if (!view || !view.classList.contains('is-active')) return;
        renderKiosk();
      }, 1000);
    } else if (!live && focusTick) { clearInterval(focusTick); focusTick = null; }
  }

  async function renderKiosk() {
    const grid = $('#kioskGrid');
    if (!grid) return;
    const settings = await Store.getSettings();
    const on = settings.kioskCards || [];
    quoteCache = settings.quotesCache || [];
    syncFocusTick(settings);
    // تازه‌سازیِ خودکار در پس‌زمینه، بی‌سروصدا؛ خطایش صفحه را نمی‌شکند
    if (settings.quotesOn && on.includes('beyt')
        && Date.now() - (settings.quotesFetchedAt || 0) > Kiosk.QUOTE_REFRESH_MS) {
      setTimeout(() => refreshQuotes(true), 0);
    }
    const now = new Date();
    $('#kioskSub').textContent = J.format(now);
    grid.replaceChildren();

    if (!on.length) {
      const e = el('div', 'empty');
      e.innerHTML = ICONS.inbox;
      e.append(el('div', null, 'هیچ کارتی روشن نیست'));
      e.append(el('div', 'hint', 'از «چه چیزهایی دیده شود» انتخاب کن چه می‌خواهی اینجا ببینی.'));
      grid.append(e);
      return;
    }
    // تایمر اول می‌آید — وقتی در جریان است، مهم‌ترین چیزِ صفحه است
    if (on.includes('focus')) grid.append(buildFocusCard(settings, await Store.getTasks()));
    if (on.includes('calendar')) grid.append(buildCalendarCard(now));
    if (on.includes('prayer')) grid.append(buildPrayerCard(now, settings.prayerCity));
    if (on.includes('beyt')) grid.append(buildSayingCard(now, settings));
    if (on.includes('market')) {
      const ph = buildMarketCard();
      grid.append(ph);
      if (!marketItems.length || Date.now() - marketLoadedAt > MARKET_REFRESH_MS) {
        await loadMarket();
        if ($('#view-kiosk').classList.contains('is-active')) ph.replaceWith(buildMarketCard());
      }
    }
    if (on.includes('news')) {
      const placeholder = buildNewsCard(settings);
      grid.append(placeholder);
      // فید را تازه کن و بعد همان کارت را جایگزین کن — صفحه معطل نمی‌ماند
      if (!newsItems.length || Date.now() - newsLoadedAt > NEWS_REFRESH_MS) {
        await loadNews(settings.newsSources);
        if (document.getElementById('view-kiosk').classList.contains('is-active')) {
          placeholder.replaceWith(buildNewsCard(settings));
        }
      }
    }
  }

  $('#kioskPrefsBtn')?.addEventListener('click', async () => {
    const s = await Store.getSettings();
    openKioskPrefs($('#kioskPrefsBtn'), s.kioskCards || []);
  });

  // ---------- خبرِ نسخهٔ تازه ----------
  // منشی از فروشگاه نصب نمی‌شود، پس خودش به‌روز نمی‌شود. فقط خبر می‌دهد.
  async function fetchRelease() {
    const origin = new URL(Updater.API).origin + '/*';
    if (Store.isExt && chrome.permissions) {
      try {
        const has = await chrome.permissions.contains({ origins: [origin] });
        if (!has) return { rel: null, error: 'دسترسی به گیت‌هاب داده نشده' };
      } catch (_) { /* ادامه بده */ }
    }
    let r;
    try { r = await fetch(Updater.API, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } }); }
    catch (_) { return { rel: null, error: 'گیت‌هاب پاسخ نداد' }; }
    if (r.status === 404) return { rel: null, error: 'هنوز نسخه‌ای منتشر نشده' };
    if (!r.ok) return { rel: null, error: `گیت‌هاب خطای ${J.faDigits(r.status)} داد` };
    let txt = '';
    try { txt = await r.text(); } catch (_) { return { rel: null, error: 'پاسخ خوانده نشد' }; }
    const rel = Updater.parseRelease(txt);
    return rel ? { rel, error: '' } : { rel: null, error: 'پاسخ گیت‌هاب شناخته نشد' };
  }

  // نسخه یک بار خوانده و نگه داشته می‌شود. پیش‌تر از DOM خوانده می‌شد و چون
  // خواندنِ manifest ناهمگام است، بررسیِ نسخه گاهی «۰.۰.۰» می‌دید.
  let currentVersion = '';
  async function appVersion() {
    if (currentVersion) return currentVersion;
    try { currentVersion = chrome?.runtime?.getManifest?.()?.version || ''; } catch (_) {}
    if (!currentVersion) {
      try { currentVersion = (await (await fetch('manifest.json', { cache: 'no-store' })).json()).version || ''; }
      catch (_) { currentVersion = ''; }
    }
    return currentVersion;
  }

  async function paintUpdateBanner(rel, settings) {
    const box = $('#updateBanner');
    if (!box) return;
    const cur = await appVersion();
    if (!cur) { box.hidden = true; return; }   // تا نسخهٔ خودمان معلوم نشده، چیزی ادعا نکن
    if (!rel || !Updater.isNewer(rel.version, cur) || settings?.updateSeen === rel.version) {
      box.hidden = true; return;
    }
    box.hidden = false;
    box.replaceChildren();
    const body = el('div', 'update-body');
    body.append(el('strong', null, `نسخهٔ ${J.faDigits(rel.version)} منتشر شد`));
    body.append(el('span', null, `نسخهٔ تو ${J.faDigits(cur)} است — منشی خودش به‌روز نمی‌شود و باید دستی بگیری.`));
    box.append(body);
    const acts = el('div', 'update-acts');
    const go = el('a', 'btn btn-primary btn-sm', 'دیدن نسخهٔ تازه');
    go.href = rel.url; go.target = '_blank'; go.rel = 'noopener noreferrer';
    const later = el('button', 'btn btn-ghost btn-sm', 'بعداً');
    later.addEventListener('click', async () => {
      await Store.saveSettings({ updateSeen: rel.version });
      box.hidden = true;
    });
    acts.append(go, later);
    box.append(acts);
  }

  // یک بار در روز، بی‌سروصدا؛ خطایش هیچ‌جا دیده نمی‌شود
  async function checkUpdateQuietly() {
    const s = await Store.getSettings();
    if (!s.updateCheckOn) { $('#updateBanner').hidden = true; return; }
    if (!Updater.dueForCheck(s.updateCheckedAt)) { await paintUpdateBanner(s.lastRelease, s); return; }
    const { rel } = await fetchRelease();
    await Store.saveSettings({ updateCheckedAt: Date.now(), ...(rel ? { lastRelease: rel } : {}) });
    await paintUpdateBanner(rel || s.lastRelease, s);
  }

  $('#checkUpdate')?.addEventListener('click', async () => {
    const st = $('#updateStatus');
    const say = (m) => { if (st) { st.textContent = m; setTimeout(() => { st.textContent = ''; }, 5000); } };
    say('در حال بررسی…');
    const { rel, error } = await fetchRelease();
    if (error) { say(error); return; }
    const cur = await appVersion();
    await Store.saveSettings({ updateCheckedAt: Date.now(), lastRelease: rel, updateSeen: '' });
    if (Updater.isNewer(rel.version, cur)) {
      say(`نسخهٔ ${J.faDigits(rel.version)} هست — بالای صفحهٔ «امروز» ببین`);
      await paintUpdateBanner(rel, { updateSeen: '' });
    } else say('همین نسخه تازه‌ترین است ✓');
  });

  // ---------- یادداشت روز ----------
  const scratchInput = $('#scratchInput');
  const scratchStatus = $('#scratchStatus');
  let scratchTimer = null;
  const dayKey = () => { const n = new Date(); return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`; };

  async function loadScratch() { scratchInput.value = await Store.getScratch(dayKey()); }

  scratchInput.addEventListener('input', () => {
    scratchStatus.textContent = 'در حال نوشتن…';
    clearTimeout(scratchTimer);
    scratchTimer = setTimeout(async () => {
      await Store.saveScratch(dayKey(), scratchInput.value);
      scratchStatus.textContent = 'ذخیره شد ✓';
      setTimeout(() => { if (scratchStatus.textContent === 'ذخیره شد ✓') scratchStatus.textContent = ''; }, 1600);
    }, 600);
  });

  // خطِ جاری (یا متن انتخاب‌شده) را به یک کار تبدیل کن — با همان تحلیل زبان طبیعی
  $('#scratchToTask').addEventListener('click', async () => {
    const ta = scratchInput;
    let line = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim().split('\n')[0].trim();
    if (!line) {
      const upto = ta.value.slice(0, ta.selectionStart);
      const start = upto.lastIndexOf('\n') + 1;
      const nl = ta.value.indexOf('\n', ta.selectionStart);
      line = ta.value.slice(start, nl === -1 ? undefined : nl).trim();
    }
    if (!line) { toast('اول یک خط بنویس یا انتخابش کن'); return; }
    const { title, due, recur, tags } = DateParser.parse(line);
    await Store.addTask({ title: title || line, due, recur, tags, dir: 'mine' });
    await renderAll();
    toast(due ? `به کارها اضافه شد — ${J.relLabel(due)}` : 'به کارها اضافه شد ✓');
  });

  // ---------- شروع ----------
  // نسخه از manifest خوانده می‌شود تا هیچ‌وقت با عددِ دستی در کد ناهماهنگ نشود
  async function paintVersion() {
    const box = $('#appVersion');
    if (!box) return;
    const v = await appVersion();
    box.textContent = v ? J.faDigits(v) : '—';
  }

  (async () => {
    paintVersion();
    await Store.seedPreview();
    await applyTheme();
    await loadScratch();
    await renderAll();
    quickInput.focus();
    // هر دقیقه وضعیت «الان» جلسه‌ها و بنر پایان روز تازه شود
    setInterval(renderAll, 60000);
    // شمارش معکوسِ «جلسهٔ بعدی» روان‌تر: هر ۲۰ ثانیه فقط همان نوار تازه شود
    setInterval(() => renderNextMeeting(cachedEvents, cachedTasks), 20000);
  })();
})();
