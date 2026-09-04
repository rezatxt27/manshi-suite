(() => {
  if (window.__meetnoteLoaded) return;
  window.__meetnoteLoaded = true;

  const CAPTION_BLOCK = '[jsname="tgaKEf"],.nMcdL,.iTTPOb,[data-is-caption="true"]';
  const CAPTION_PART = '[jsname="YSxPC"],[jsname="E2KThb"],.zs7s8d,.CNusmb,[data-caption-text],[data-speaker-name]';
  // فقط «اعلان‌های سیستمیِ Meet» را حذف می‌کند — نه هر جمله‌ای که واژه‌ای مثل «ارائه/میکروفون/دوربین» دارد.
  // نکته: الگوهای تک‌واژه‌ای عمداً حذف شده‌اند چون گفتارِ واقعی را قیچی می‌کردند و ضبط را ناقص می‌کرد.
  const SYSTEM_MESSAGE = new RegExp([
    'audio setup is causing echo',
    'presentation by .+ (?:was added to|is on) the main screen',
    'go to the more options menu for help',
    '^you are presenting',
    '^(?:someone|.{1,40}) (?:joined|left) the (?:call|meeting)',
    '(?:your|the) microphone is (?:muted|unmuted|off|on)',
    '(?:your|the) camera is (?:off|on)',
    '^recording (?:started|stopped)',
    'یک پژواک',
    'ارائه(?:ٔ| ی)? .{0,40} به صفحه(?: |‌)اصلی',
    'میکروفون شما (?:بی‌صدا|قطع|وصل|روشن|خاموش)',
    'دوربین شما (?:روشن|خاموش)',
    '^(?:ضبط) (?:شروع|متوقف)'
  ].join('|'), 'i');
  const SAVE_DELAY_MS = 1800;
  const MAX_UNSAVED_MS = 10000;
  const NO_CAPTION_WARN_MS = 20000;   // بعد از این مدت بی‌زیرنویس، هشدار بده
  const IDLE_MS = 90000;              // احتمالاً فقط کسی حرف نمی‌زند — نگران‌کننده نیست
  const STALLED_WARN_MS = 300000;     // ۵ دقیقه سکوتِ ممتد — احتمالاً واقعاً مشکلی هست
  const MAX_CAPTION_CHARS = 200000;   // فقط محافظِ DOMِ خراب، نه محدودیتِ گفتار
  const ROW_ROLLOVER_CHARS = 1200;    // نوبت که از این بلندتر شد، بسته و نوبتِ تازه باز می‌شود

  let active = false;
  let session = null;
  let saveTimer = 0;
  let flushTimer = 0;
  let dirtySince = 0;
  const health = { captionContainerDetected: false, lastCaptionAt: 0, lastSavedAt: 0, speakerCount: 0 };
  const lastBySpeaker = new Map();
  let rowByCaption = new WeakMap();
  const captionObservers = new Map();
  const pendingCaptions = new Set();

  // کنترل شناور روی صفحهٔ Meet: شروع/پایان ثبت (سوئیت popup ندارد؛ کنترل روی خود صفحه است)
  const badge = document.createElement("div");
  badge.id = "meetnote-status";
  badge.setAttribute("role", "region");
  badge.setAttribute("aria-label", "کنترل ثبت جلسهٔ منشی");
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "manshi-capture-toggle";
  toggleBtn.type = "button";
  toggleBtn.innerHTML = '<i aria-hidden="true"></i><span>شروع ثبت جلسه</span>';
  const setToggleLabel = (txt) => { const s = toggleBtn.querySelector("span"); if (s) s.textContent = txt; };
  const grip = document.createElement("span");
  grip.id = "manshi-capture-grip";
  grip.title = "برای جابه‌جایی بکش";
  // ردیفِ کنترل جداست تا راهنما زیرش بیاید، نه کنارش
  const row = document.createElement("div");
  row.id = "manshi-capture-row";
  row.appendChild(toggleBtn);
  row.appendChild(grip);
  badge.appendChild(row);
  document.documentElement.appendChild(badge);

  // ── جای دکمه ─────────────────────────────────────────
  // پیش‌فرضِ قبلی بالا-راست بود، که هم زیرِ کنترل‌های خودِ Meet می‌رفت و هم با باز
  // شدن پنلِ کناری پوشانده می‌شد. هیچ گوشه‌ای برای همهٔ چیدمان‌ها درست نیست، پس
  // جایش را کاربر تعیین می‌کند و همان‌جا یادش می‌ماند.
  // runtimeAlive پایین‌تر تعریف می‌شود و اینجا هنوز در TDZ است؛ نسخهٔ محلی.
  const runtimeAliveSafe = () => Boolean(globalThis.chrome?.runtime?.id && chrome.storage?.local);
  const POS_KEY = "manshi_badge_pos";
  const MARGIN = 12;

  // دو جا، نه یکی. `wanted` خواستهٔ کاربر است و `shown` جایی که واقعاً رسم شده.
  // اگر یکی بودند، کوچک‌کردنِ پنجره خواستهٔ کاربر را روی مقدارِ کلمپ‌شده بازنویسی
  // می‌کرد و با بزرگ‌شدنِ دوباره هم دکمه به جای انتخابی برنمی‌گشت.
  let wanted = null;                    // { x, y } از گوشهٔ بالا-چپ — همین ذخیره می‌شود
  let shown = null;                     // کلمپ‌شدهٔ wanted در اندازهٔ فعلیِ پنجره

  function clampPos(p) {
    const w = badge.offsetWidth || 160, h = badge.offsetHeight || 40;
    return {
      x: Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, innerWidth - w - MARGIN)),
      y: Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, innerHeight - h - MARGIN))
    };
  }
  function renderPos() {
    if (!wanted) return;
    shown = clampPos(wanted);
    badge.style.inset = shown.y + "px auto auto " + shown.x + "px";
  }
  function moveTo(p) { wanted = p; renderPos(); }
  // پایین-چپ: نوارِ کنترلِ Meet وسط و پایین است، پنل‌هایش سمت راست.
  const defaultPos = () => ({ x: MARGIN, y: Math.max(MARGIN, innerHeight - (badge.offsetHeight || 40) - 96) });

  // نوشتن روی storage با تأخیر جمع می‌شود — نگه‌داشتنِ کلیدِ جهت‌دار وگرنه ده‌ها
  // نوشتنِ پشت‌سرهم می‌سازد. کشیدن با ماوس یک‌بار و فوری ذخیره می‌شود.
  let posSaveTimer = 0;
  function savePos(immediate = false) {
    clearTimeout(posSaveTimer);
    posSaveTimer = 0;
    const write = () => {
      if (!wanted || !runtimeAliveSafe()) return;
      try { chrome.storage.local.set({ [POS_KEY]: wanted }); } catch {}
    };
    if (immediate) write();
    else posSaveTimer = setTimeout(() => { posSaveTimer = 0; write(); }, 300);
  }

  if (runtimeAliveSafe()) {
    try {
      chrome.storage.local.get(POS_KEY, (o) => {
        const saved = o && o[POS_KEY];
        moveTo(saved && typeof saved.x === "number" ? saved : defaultPos());
      });
    } catch { moveTo(defaultPos()); }
  } else moveTo(defaultPos());

  // فقط دوباره رسم می‌کند؛ خواستهٔ کاربر دست‌نخورده می‌ماند تا با برگشتنِ فضا
  // دکمه هم به جای خودش برگردد.
  addEventListener("resize", renderPos);
  // اگر تب پیش از سررسیدنِ تأخیر بسته شد، جای تازه نباید از دست برود
  addEventListener("pagehide", () => { if (posSaveTimer) savePos(true); });

  // کشیدن از دستگیره. خودِ دکمه کشیده نمی‌شود تا کلیک هیچ‌وقت با کشیدن اشتباه نشود.
  let drag = null;
  grip.addEventListener("pointerdown", (e) => {
    drag = { dx: e.clientX - badge.getBoundingClientRect().left, dy: e.clientY - badge.getBoundingClientRect().top };
    grip.setPointerCapture(e.pointerId);
    badge.classList.add("dragging");
    e.preventDefault();
  });
  grip.addEventListener("pointermove", (e) => {
    if (!drag) return;
    moveTo({ x: e.clientX - drag.dx, y: e.clientY - drag.dy });
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    badge.classList.remove("dragging");
    savePos(true);
  };
  grip.addEventListener("pointerup", endDrag);
  grip.addEventListener("pointercancel", endDrag);

  // جابه‌جایی با صفحه‌کلید هم ممکن باشد — دکمه فقط با ماوس نباید قابل‌استفاده باشد
  grip.tabIndex = 0;
  grip.setAttribute("role", "button");
  grip.setAttribute("aria-label", "جابه‌جایی کنترل منشی — با کلیدهای جهت‌دار");
  grip.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 40 : 8;
    const d = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[e.key];
    if (!d || !shown) return;
    e.preventDefault();
    // گام از جای دیده‌شده برداشته می‌شود، نه از خواستهٔ شاید بیرونِ کادر —
    // وگرنه چند فشارِ اول هیچ حرکتی دیده نمی‌شد.
    moveTo({ x: shown.x + d[0], y: shown.y + d[1] });
    savePos();
  });

  toggleBtn.addEventListener("click", () => { if (active) stopCapture(); else startCapture(); });

  const clean = (text = "") => text.replace(/\s+/g, " ").trim();
  const nowTitle = () => document.title.replace(/\s*-\s*Google Meet\s*$/i, "").trim() || "جلسه بدون عنوان";
  const runtimeAlive = () => Boolean(globalThis.chrome?.runtime?.id);

  // After an extension reload/update this copy of the script is orphaned:
  // chrome.runtime disappears. Retire quietly instead of throwing forever.
  function teardownOrphan() {
    try { stopObservers(); } catch {}
    clearTimeout(saveTimer);
    saveTimer = 0;
    active = false;
    badge.remove();
  }

  function safeSendMessage(payload, onResponse) {
    if (!runtimeAlive()) { teardownOrphan(); return; }
    try {
      const result = chrome.runtime.sendMessage(payload);
      const tracked = onResponse ? result?.then?.(onResponse) : result;
      tracked?.catch?.(() => {});
    } catch { teardownOrphan(); }
  }

  const setCaptureIndicator = (isActive) => safeSendMessage({ type: "CAPTURE_INDICATOR", active: isActive });

  function parseCaption(node) {
    const speakerNode = node.querySelector('[jsname="E2KThb"],.zs7s8d,[data-speaker-name]');
    const textNodes = [...node.querySelectorAll('[jsname="YSxPC"],.CNusmb,[data-caption-text]')];
    let speaker = clean(speakerNode?.textContent || speakerNode?.getAttribute("data-speaker-name"));
    let text = clean(textNodes.map((item) => item.textContent).join(" "));

    if (!text) {
      const lines = (node.innerText || "").split("\n").map(clean).filter(Boolean);
      if (!lines.length) return null;
      speaker ||= lines.length > 1 ? lines[0] : "گوینده";
      text = lines.length > 1 ? clean(lines.slice(1).join(" ")) : lines[0];
    }

    speaker ||= "گوینده";
    // سقفِ قدیمی ۱۲٬۰۰۰ بود و بلوکِ زیرنویس را که از آن رد می‌شد **می‌انداخت** — یعنی
    // ضبط بی‌صدا قطع می‌شد. در جلسه‌ای که یک نفر یک‌ریز حرف می‌زند (تک‌نفره، یا دو نفر
    // با یک میکروفون) بلوک هیچ‌وقت عوض نمی‌شود و همان‌جا به سقف می‌خورد.
    // حالا سقف فقط محافظِ DOMِ خراب است؛ بزرگ‌شدنِ نوبت را planCaption مدیریت می‌کند.
    if (!text || text.length > MAX_CAPTION_CHARS || speaker === text || SYSTEM_MESSAGE.test(text) || SYSTEM_MESSAGE.test(speaker)) return null;
    if (/^(captions|زیرنویس|more options)$/i.test(text)) return null;
    return { speaker, text };
  }

  function persist(immediate = false) {
    clearTimeout(saveTimer);
    if (!session) return;
    const send = () => safeSendMessage({ type: "SAVE_SESSION", session }, (response) => { if (response?.ok) health.lastSavedAt = Date.now(); });
    if (immediate) { dirtySince = 0; send(); }
    else {
      dirtySince ||= Date.now();
      const maxWait = Math.max(0, MAX_UNSAVED_MS - (Date.now() - dirtySince));
      saveTimer = setTimeout(() => { dirtySince = 0; send(); }, Math.min(SAVE_DELAY_MS, maxWait));
    }
  }

  // ادغامِ امنِ زیرنویس — اگر ماژولِ پاک‌سازی به هر دلیلی نبود، ضبط نباید بمیرد.
  // (پیش‌تر نبودِ این ماژول باعث می‌شد بعد از اولین جملهٔ هر گوینده، بقیه از دست برود.)
  function mergeCaptionSafe(prevText, nextText, elapsed) {
    try {
      if (globalThis.MeetNoteTranscript?.mergeCaptionText) {
        return globalThis.MeetNoteTranscript.mergeCaptionText(prevText, nextText, elapsed);
      }
    } catch (_) { /* به حالتِ پشتیبان برگرد */ }
    // پشتیبان: اگر متنِ تازه ادامهٔ قبلی است جایگزینش کن، وگرنه سطرِ جدید بساز
    const a = String(prevText || '').trim(), b = String(nextText || '').trim();
    if (!b) return a;
    if (b === a) return a;
    if (b.startsWith(a)) return b;
    if (a.endsWith(b)) return a;
    return null;
  }

  // بلوکِ زیرنویسِ Meet متن را روی هم انباشته می‌کند. اگر یک نفر یک‌ریز حرف بزند
  // (جلسهٔ تک‌نفره، یا دو نفر با یک میکروفون) بلوک هرگز عوض نمی‌شود و یک «نوبت»
  // بی‌پایان بزرگ می‌شود تا به سقفِ نویسه بخورد و ضبط بی‌صدا بایستد.
  //
  // این تابع خالص است تا قابل تست باشد. baseline = کلِ متنی که تا حالا از همین بلوک
  // دیده‌ایم — نه فقط نوبتِ آخر؛ چون بعد از شکستنِ نوبت، نوبتِ آخر دیگر کلِ متن نیست
  // و مقایسه با آن باعث می‌شد همه‌چیز دوباره از اول نوشته شود.
  // قرار (invariant): هرچه در baseline هست، در متنِ جلسه نوشته شده است.
  function planCaption({ baseline, incoming, prevLen, elapsed, cap = ROW_ROLLOVER_CHARS }) {
    const merged = mergeCaptionSafe(baseline, incoming, elapsed);
    if (merged === null) return { kind: 'new', text: incoming, full: incoming };
    if (!baseline) return { kind: 'new', text: merged, full: merged };
    if (merged === baseline) return { kind: 'noop', full: baseline };
    if (merged.startsWith(baseline)) {
      const addition = merged.slice(baseline.length).trim();
      if (!addition) return { kind: 'noop', full: merged };
      // نوبت به اندازهٔ کافی بلند شده — ببندش و ادامه را در نوبتِ تازه بنویس
      return prevLen >= cap
        ? { kind: 'new', text: addition, full: merged }
        : { kind: 'append', text: addition, full: merged };
    }
    // Meet متنِ قبلی را اصلاح کرده. اگر نوبت هنوز شکسته نشده، جایگزینش کن؛
    // اگر شکسته شده، دست نزن — اصلاحِ کوچک ارزشِ دوباره‌نویسیِ کلِ متن را ندارد.
    return prevLen === baseline.length
      ? { kind: 'replace', text: merged, full: merged }
      : { kind: 'noop', full: merged };
  }

  function addEntry(entry, captionNode) {
    const timestamp = Date.now();
    const track = rowByCaption.get(captionNode);
    const sameBlock = track?.speaker === entry.speaker;
    const previous = (sameBlock ? track.row : null) || lastBySpeaker.get(entry.speaker) || null;
    const baseline = sameBlock ? track.full : (previous?.text || '');
    const elapsed = previous ? Math.max(0, timestamp - (previous.updatedAt || previous.at || timestamp)) : Infinity;
    const plan = previous?.speaker === entry.speaker
      ? planCaption({ baseline, incoming: entry.text, prevLen: previous.text.length, elapsed })
      : { kind: 'new', text: entry.text, full: entry.text };

    let row = previous;
    if (plan.kind === 'new') {
      row = { ...entry, text: plan.text, at: timestamp, updatedAt: timestamp };
      session.transcript.push(row);
    } else if (plan.kind === 'append') {
      row.text = row.text ? `${row.text} ${plan.text}` : plan.text;
      row.updatedAt = timestamp;
    } else if (plan.kind === 'replace') {
      row.text = plan.text;
      row.updatedAt = timestamp;
    }
    rowByCaption.set(captionNode, { row, full: plan.full, speaker: entry.speaker });
    lastBySpeaker.set(entry.speaker, row);
    // «هیچ تغییری نبود» یعنی Meet فقط دوباره رندر کرده — این را «صدای تازه» حساب نکن،
    // وگرنه هشدارِ سلامت هیچ‌وقت مشکلِ واقعی را نمی‌بیند.
    if (plan.kind === 'noop') return;
    session.updatedAt = timestamp;
    health.lastCaptionAt = timestamp;
    health.speakerCount = new Set(session.transcript.map((item) => item.speaker)).size;
    persist();
  }

  function flushPending() {
    flushTimer = 0;
    if (!active || !session) return pendingCaptions.clear();
    const nodes = [...pendingCaptions];
    pendingCaptions.clear();
    nodes.forEach((node) => {
      const entry = parseCaption(node);
      if (entry) addEntry(entry, node);
    });
  }

  function queueCaption(node) {
    pendingCaptions.add(node);
    if (!flushTimer) flushTimer = setTimeout(flushPending, 100);
  }

  function registerCaption(node) {
    if (!(node instanceof Element) || captionObservers.has(node) || !node.isConnected) return;
    const observer = new MutationObserver(() => queueCaption(node));
    observer.observe(node, { subtree: true, childList: true, characterData: true });
    captionObservers.set(node, observer);
    health.captionContainerDetected = true;
    queueCaption(node);
  }

  function discoverWithin(root) {
    if (!(root instanceof Element)) return;
    if (root.matches(CAPTION_BLOCK)) registerCaption(root);
    root.querySelectorAll(CAPTION_BLOCK).forEach(registerCaption);
    const live = root.matches('[aria-live="polite"],[aria-live="assertive"]') ? [root] : [...root.querySelectorAll('[aria-live="polite"],[aria-live="assertive"]')];
    live.forEach((node) => {
      if (!node.querySelector(CAPTION_BLOCK) && node.querySelector(CAPTION_PART)) registerCaption(node);
    });
  }

  function cleanupDetached() {
    for (const [node, observer] of captionObservers) {
      if (!node.isConnected) { observer.disconnect(); captionObservers.delete(node); pendingCaptions.delete(node); }
    }
  }

  const discoveryObserver = new MutationObserver((mutations) => {
    let removed = false;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(discoverWithin);
      if (mutation.removedNodes.length) removed = true;
    }
    if (removed) { flushPending(); cleanupDetached(); }
  });

  function startObservers() {
    discoverWithin(document.body);
    discoveryObserver.observe(document.body, { subtree: true, childList: true });
  }

  function stopObservers() {
    discoveryObserver.disconnect();
    captionObservers.forEach((observer) => observer.disconnect());
    captionObservers.clear();
    pendingCaptions.clear();
    clearTimeout(flushTimer);
    flushTimer = 0;
  }

  // ── سلامتِ ضبط (M‑۱) ────────────────────────────────
  // تشخیصِ خالص و قابل‌تست: بر اساس زمانِ سپری‌شده و آخرین زیرنویس، وضعیت را بگو.
  function assessCapture({ startedAt, lastCaptionAt, lines, now }) {
    const sinceStart = now - startedAt;
    if (!lastCaptionAt) {
      return sinceStart >= NO_CAPTION_WARN_MS
        ? { level: 'error', text: 'زیرنویس Meet روشن نیست — ثبت نمی‌شود', hint: 'در Meet روی «CC / زیرنویس» بزن تا ضبط شروع شود.' }
        : { level: 'ok', text: '● در حال ثبت — منتظر اولین زیرنویس' };
    }
    // سکوت با خرابی فرق دارد. حالتِ میانی نباید کاربر را بترساند —
    // متنِ ثبت‌شده سرِ جایش است و ضبط همچنان روشن.
    if (now - lastCaptionAt >= STALLED_WARN_MS) {
      // آنچه می‌دانیم را بگو، نه تشخیصی که مطمئن نیستیم: ما فقط می‌دانیم ۵ دقیقه است
      // چیزی نشنیده‌ایم. «زیرنویس بروز نمی‌شود» در جلسه‌ای که خودت تنها حرف می‌زنی
      // و کمی مکث کرده‌ای، غلط و ترسناک بود.
      return { level: 'warn', text: `${faNum(lines)} خط ثبت شده — ۵ دقیقه چیزی شنیده نشد`, hint: 'ضبط روشن است و هرچه گفته شده ذخیره شده. اگر کسی دارد حرف می‌زند و اینجا اضافه نمی‌شود، در Meet زیرنویس (CC) را خاموش و دوباره روشن کن.' };
    }
    if (now - lastCaptionAt >= IDLE_MS) {
      return { level: 'idle', text: `● در حال ثبت — ${faNum(lines)} خط · سکوت`, hint: '' };
    }
    return { level: 'ok', text: `● در حال ثبت — ${faNum(lines)} خط` };
  }
  const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

  // برچسبِ دکمه. «برای پایان بزن» فقط وقتی می‌آید که همه‌چیز عادی است — کنارِ هشدار
  // خوانده می‌شد «جلسه دارد تمام می‌شود» و کاربر فکر می‌کرد ضبط قطع شده.
  function captureLabel(state) {
    return (state.level === 'ok' || state.level === 'idle') ? `${state.text} · برای پایان بزن` : state.text;
  }

  let healthTimer = 0;
  function paintHealth() {
    if (!active || !session) return;
    const st = assessCapture({
      startedAt: session.startedAt,
      lastCaptionAt: health.lastCaptionAt,
      lines: session.transcript.length,
      now: Date.now()
    });
    badge.classList.toggle('warn', st.level === 'warn');
    badge.classList.toggle('err', st.level === 'error');
    setToggleLabel(captureLabel(st));
    toggleBtn.title = st.hint || '';
    // راهنمای زیرِ دکمه، فقط وقتی مشکلی هست
    let tip = badge.querySelector('#manshi-capture-hint');
    if (st.hint) {
      if (!tip) { tip = document.createElement('div'); tip.id = 'manshi-capture-hint'; badge.appendChild(tip); }
      tip.textContent = st.hint;
    } else if (tip) tip.remove();
  }

  function startCapture() {
    if (active) return;
    active = true;
    lastBySpeaker.clear();
    rowByCaption = new WeakMap();
    session = { id: crypto.randomUUID(), title: nowTitle(), meetUrl: location.href, startedAt: Date.now(), updatedAt: Date.now(), transcript: [], summary: "", actions: [] };
    Object.assign(health, { captionContainerDetected: false, lastCaptionAt: 0, lastSavedAt: 0, speakerCount: 0 });
    dirtySince = 0;
    badge.classList.add("on");
    setToggleLabel("● در حال ثبت — پایان و ذخیره");
    setCaptureIndicator(true);
    startObservers();
    clearInterval(healthTimer);
    healthTimer = setInterval(paintHealth, 5000);
    paintHealth();
    return session;
  }

  function stopCapture() {
    if (!active) return;
    active = false;
    stopObservers();
    clearInterval(healthTimer); healthTimer = 0;
    badge.classList.remove("on", "warn", "err");
    badge.querySelector('#manshi-capture-hint')?.remove();
    const n = session ? session.transcript.length : 0;
    setToggleLabel(n ? `ذخیره شد — ${faNum(n)} خط` : "شروع ثبت جلسه");
    if (n) setTimeout(() => { if (!active) setToggleLabel("شروع ثبت جلسه"); }, 6000);
    toggleBtn.title = '';
    setCaptureIndicator(false);
    persist(true);
    return session;
  }

  // وقتی تب مخفی می‌شود مرورگر setTimeout را کند می‌کند (تا ۱ ثانیه، و اگر صدا قطع شود
  // تا ۱ دقیقه). پس همان لحظه هرچه در صف است را خالی و ذخیره می‌کنیم تا پنجرهٔ
  // عوض‌کردن، چیزی از متن جلسه نیندازد.
  document.addEventListener('visibilitychange', () => {
    if (!active || !document.hidden) return;
    flushPending();
    persist(true);
  });
  // بستنِ ناگهانیِ تب یا رفتن به bfcache
  window.addEventListener('pagehide', () => {
    if (!active) return;
    flushPending();
    persist(true);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "START_CAPTURE") sendResponse({ ok: true, session: startCapture() });
    if (message.type === "STOP_CAPTURE") sendResponse({ ok: true, session: stopCapture() });
    if (message.type === "GET_CAPTURE_STATE") sendResponse({ active, session, health });
    return true;
  });

  // برای تست‌های واحد (در مرورگر بی‌اثر است)
  if (typeof module !== 'undefined') module.exports = { assessCapture, captureLabel, planCaption, mergeCaptionSafe, SYSTEM_MESSAGE, ROW_ROLLOVER_CHARS };
})();
