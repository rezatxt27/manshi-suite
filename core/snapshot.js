// منشی — عکسِ لحظه‌ایِ داده برای ابزارهای بیرونیِ هوش مصنوعی.
//
// دو خروجی از یک منطقِ مشترک:
//   buildSnapshot()  → JSON، برای پلِ MCP (یک فایل روی دیسک)
//   buildContext()   → مارک‌داون، برای کلیپ‌بورد (چسباندن در هر چت‌باتی)
//
// قاعدهٔ ثابت و غیرقابلِ مذاکره: **هیچ تنظیماتی وارد خروجی نمی‌شود.**
// نه آدرس iCal، نه کلید هوش مصنوعی، نه پروفایل‌ها. به‌جای فیلترکردنِ کلیدهای
// حساس (که با اضافه‌شدنِ کلیدِ تازه بی‌صدا می‌شکند) اصلاً به settings دست نمی‌زنیم.
//
// سه سطحِ حساسیت، چون متنِ خامِ جلسه حساس‌ترین دادهٔ کلِ منشی است:
//   meta — فقط عنوان و تاریخ و شرکت‌کنندگان
//   mom  — + خلاصه و کارها (پیش‌فرض)
//   full — + متنِ کلمه‌به‌کلمه
const Snapshot = (() => {
  const J = typeof Jalali !== 'undefined' ? Jalali
    : (typeof require !== 'undefined' ? require('./jalali.js') : null);

  const SCHEMA = 1;
  const MODES = ['meta', 'mom', 'full'];
  const MODE_LABEL = { meta: 'فقط فراداده', mom: 'صورت‌جلسه', full: 'متن کامل' };
  const SCOPES = ['today', 'week', 'month', 'open', 'unanalyzed', 'session', 'person'];
  const SCOPE_LABEL = {
    today: 'امروز', week: 'هفتهٔ گذشته', month: 'ماه گذشته',
    open: 'کارهای باز', unanalyzed: 'جلسه‌های بدون صورت‌جلسه',
    session: 'یک جلسه', person: 'یک نفر'
  };

  // ── کارهای آماده ────────────────────────────────────
  // کاربر به «کار» فکر می‌کند، نه به «دامنه و سطح». این‌ها همان تنظیمات‌اند،
  // ولی با نامِ کاری که انجام می‌دهند — و هرکدام سؤالِ آماده‌اش را با خود می‌برد
  // تا کاربر بعد از چسباندن لازم نباشد چیزی بنویسد.
  const RECIPES = [
    {
      id: 'catchup',
      title: 'صورت‌جلسه‌های عقب‌افتاده را بساز',
      hint: 'جلسه‌هایی که فقط متن دارند را می‌فرستد تا خلاصه و کارهایشان درآید',
      scope: 'unanalyzed', mode: 'full',
      ask: 'برای هر جلسه‌ای که بالا آمده، این‌ها را دربیاور: یک خلاصهٔ کوتاه، تصمیم‌های گرفته‌شده، و کارها با نامِ مسئول و سررسید. فارسی و مرتب بنویس و هر جلسه را جدا کن.'
    },
    {
      id: 'weekly',
      title: 'گزارش این هفته را بنویس',
      hint: 'جلسه‌ها و کارهای هفت روز گذشته',
      scope: 'week', mode: 'mom',
      ask: 'یک گزارش هفتگی حرفه‌ای بنویس: چه چیزی پیش رفت، چه چیزی عقب ماند، و چه ریسکی برای هفتهٔ بعد هست. کوتاه و قابل‌فرستادن برای مدیر باشد.'
    },
    {
      id: 'triage',
      title: 'کارهایم را اولویت‌بندی کن',
      hint: 'همهٔ کارهای باز',
      scope: 'open', mode: 'mom',
      ask: 'این کارها را اولویت‌بندی کن. بگو امروز روی کدام سه کار تمرکز کنم و چرا، کدام‌ها را می‌شود عقب انداخت، و کدام‌ها بوی گیرکردن می‌دهند.'
    },
    {
      id: 'brief',
      title: 'برای جلسه با یک نفر آماده‌ام کن',
      hint: 'همهٔ جلسه‌ها و کارهای مربوط به یک نفر',
      scope: 'person', mode: 'mom',
      ask: 'یک بریفِ کوتاه برای جلسهٔ بعدی با این شخص بنویس: آخرین چیزهایی که گفته شد، قول‌هایی که هنوز انجام نشده، و سه سؤالی که بهتر است بپرسم.'
    },
    {
      id: 'oneMeeting',
      title: 'دربارهٔ یک جلسه بپرس',
      hint: 'متن کاملِ یک جلسهٔ مشخص',
      scope: 'session', mode: 'full',
      ask: 'این جلسه را خلاصه کن، تصمیم‌ها و کارها را دربیاور، و بگو چه چیزی بی‌جواب ماند و باید پیگیری شود.'
    },
    {
      id: 'custom',
      title: 'سؤال خودم را می‌نویسم',
      hint: 'خودت انتخاب کن چه چیزی برود',
      scope: 'week', mode: 'mom', ask: '', custom: true
    }
  ];
  const recipeById = id => RECIPES.find(r => r.id === id) || null;

  // اندازه را به زبانِ آدمیزاد بگو. «۱۲۰۰۰ توکن» برای کسی که مدل را نمی‌شناسد
  // هیچ معنایی ندارد؛ «ممکن است در نسخهٔ رایگان جا نشود» تصمیم‌پذیر است.
  const SIZE_SMALL = 8000, SIZE_MED = 40000;
  function sizeLabel(chars) {
    if (chars <= SIZE_SMALL) return { key: 'small', text: 'کوچک — در هر چت‌باتی جا می‌شود' };
    if (chars <= SIZE_MED) return { key: 'medium', text: 'متوسط — در بیشتر چت‌بات‌ها جا می‌شود' };
    return { key: 'large', text: 'بزرگ — ممکن است در نسخه‌های رایگان جا نشود' };
  }

  // ── راه‌اندازی پل ────────────────────────────────────
  // اکستنشن مسیرِ پوشه را نمی‌بیند (showDirectoryPicker فقط نام می‌دهد)، پس
  // نمی‌تواند خودش تشخیص دهد پوشه همگام‌شونده است. ولی اگر کاربر یک بار مسیر را
  // بچسباند، هم می‌شود هشدار داد هم تنظیماتِ دقیق ساخت.
  const SYNC_SIGNS = [
    { re: /\/Library\/Mobile Documents\//i, why: 'iCloud Drive' },
    { re: /\/Dropbox(\/|$)/i, why: 'Dropbox' },
    { re: /\/Google[ _]?Drive[^/]*(\/|$)/i, why: 'Google Drive' },
    { re: /\/OneDrive[^/]*(\/|$)/i, why: 'OneDrive' },
    { re: /\/(Nextcloud|ownCloud|pCloud|MEGA(sync)?|Yandex\.?Disk|Sync\.com|Box Sync|Creative Cloud Files)(\/|$)/i, why: 'سرویس همگام‌سازی' }
  ];
  // تلهٔ مک: با روشن‌بودنِ «Desktop & Documents» در iCloud، هر پوشه‌ای داخل این دو
  // در واقع داخل iCloud است — و Finder هیچ نشانه‌ای نشان نمی‌دهد.
  // تلهٔ سیستم‌عامل: روی مک با «Desktop & Documents» در iCloud، و روی ویندوز با
  // «OneDrive Backup»، هر پوشه‌ای داخل Documents/Desktop در واقع همگام می‌شود —
  // نه Finder نشانه‌ای می‌دهد نه Explorer.
  const OS_SYNCED = /^(?:~|\/Users\/[^/]+|[A-Za-z]:\/Users\/[^/]+|\/home\/[^/]+)\/(Documents|Desktop)(?:\/|$)/i;

  // مسیرِ ویندوزی با \ می‌آید. بدون یکسان‌سازیِ جداکننده هیچ الگویی نمی‌گیرد و
  // کاربر «فقط روی همین دستگاه» می‌بیند — یعنی یک آرامشِ دروغین.
  const slash = v => String(v == null ? '' : v).replace(/\\/g, '/');

  // این هشدار **منع نمی‌کند**. گذاشتنِ پوشه در iCloud یا دراپ‌باکس می‌تواند انتخابِ
  // آگاهانه باشد (دسترسی از دستگاه دیگر). کارِ ما فقط این است که بگوییم داده کجا
  // می‌رود، چون Finder هیچ نشانه‌ای نشان نمی‌دهد. تصمیم با کاربر است.
  function pathRisk(p) {
    const s = slash(p).trim();
    if (!s) return { level: 'none', why: '', text: '' };
    for (const h of SYNC_SIGNS) if (h.re.test(s)) {
      return {
        level: 'sync', why: h.why,
        text: 'این پوشه در ' + h.why + ' است، پس یک نسخه از متنِ جلسه‌هایت روی سرورِ '
          + h.why + ' هم می‌نشیند. اگر آگاهانه همین را می‌خواهی — مثلاً برای دسترسی از '
          + 'دستگاه دیگر — هیچ ایرادی ندارد. فقط بدان که دیگر «فقط روی این دستگاه» نیست.'
      };
    }
    if (OS_SYNCED.test(s)) {
      return {
        level: 'maybe', why: 'Documents/Desktop',
        text: 'این پوشه داخل Documents یا Desktop است. روی مک اگر «Desktop & Documents» '
          + 'در iCloud روشن باشد، و روی ویندوز اگر OneDrive از این پوشه‌ها پشتیبان بگیرد، '
          + 'این پوشه هم همگام می‌شود — و Finder یا Explorer هیچ نشانه‌ای نشان نمی‌دهند. '
          + 'اگر نمی‌خواهی همگام شود، پوشه‌ای بیرون از این دو بساز؛ اگر می‌خواهی، همین‌جا بماند.'
      };
    }
    return { level: 'local', why: '', text: '✓ نشانه‌ای از همگام‌سازی ندارد — فقط روی همین دستگاه می‌ماند.' };
  }

  // فقط ابزارهایی که از قالبِ تنظیماتشان مطمئنم. بقیه با گزینهٔ «ابزار دیگر»
  // پوشش داده می‌شوند، چون تقریباً همه همان شکلِ استانداردِ mcpServers را می‌پذیرند.
  const TOOLS = [
    { id: 'claude-code', name: 'Claude Code', kind: 'shell' },
    { id: 'claude-desktop', name: 'Claude Desktop', kind: 'json',
      file: {
        mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
        win: '%APPDATA%\\Claude\\claude_desktop_config.json',
        linux: '~/.config/Claude/claude_desktop_config.json'
      } },
    { id: 'codex', name: 'Codex — اپ، افزونه و CLI', kind: 'toml', cli: true,
      file: { mac: '~/.codex/config.toml', win: '%USERPROFILE%\\.codex\\config.toml' },
      note: 'هر سه از همین یک فایل می‌خوانند. اگر ترمینال codex را نشناخت، '
        + 'روی مک به‌جای codex این را بگذار: /Applications/ChatGPT.app/Contents/Resources/codex' },
    { id: 'cursor', name: 'Cursor', kind: 'json',
      file: { mac: '~/.cursor/mcp.json', win: '%USERPROFILE%\\.cursor\\mcp.json' },
      note: 'برای یک پروژهٔ خاص: mcp.json داخل پوشهٔ ‎.cursor‎ در ریشهٔ همان پروژه.' },
    { id: 'vscode', name: 'VS Code — Copilot', kind: 'json',
      file: { mac: '.vscode/mcp.json', win: '.vscode\\mcp.json' },
      note: 'کلیدش servers است، نه mcpServers. این فایل داخل خودِ پروژه ساخته می‌شود.' },
    { id: 'windsurf', name: 'Windsurf', kind: 'json',
      file: { mac: '~/.codeium/windsurf/mcp_config.json', win: '%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json' } },
    { id: 'other', name: 'ابزار دیگر', kind: 'json',
      file: { mac: 'فایلِ تنظیماتِ MCP همان ابزار' },
      note: 'بیشترِ ابزارها همین قالبِ استاندارد را می‌پذیرند. اگر ابزارت شکل دیگری می‌خواهد، در مستنداتش «MCP» را بگرد.' }
  ];

  const OSES = ['mac', 'win', 'linux'];
  // مسیرِ فایلِ تنظیمات برای هر سیستم‌عامل. اگر برای آن سیستم چیزی تعریف نشده،
  // به mac برمی‌گردیم چون شکلش یونیکسی است و برای لینوکس هم می‌خواند.
  function toolFile(tool, os) {
    if (!tool || !tool.file) return '';
    if (typeof tool.file === 'string') return tool.file;
    return tool.file[os] || tool.file.mac || '';
  }


  // نقلِ امن برای JSON/TOML؛ مسیر می‌تواند فاصله یا کوتیشن داشته باشد
  const q = s => JSON.stringify(String(s == null ? '' : s));

  // ── مسیرِ Node ───────────────────────────────────────
  // بزرگ‌ترین چالهٔ راه‌اندازی: اپ‌های گرافیکی (Codex دسکتاپ، Claude Desktop)
  // مسیرِ ترمینال را به ارث نمی‌برند، پس «node» خالی را پیدا نمی‌کنند و
  // خطایشان هم چیزی جز «سرور بالا نیامد» نیست. مسیرِ کامل این را حل می‌کند.
  const NODE_FINDER = { mac: 'which node', linux: 'which node', win: 'where node' };
  const nodeFinder = os => NODE_FINDER[os] || NODE_FINDER.mac;

  function nodeOf(nodePath, os) {
    const n = String(nodePath == null ? '' : nodePath).trim();
    if (n) return n;
    return os === 'win' ? 'node' : 'node';
  }

  // آیا مسیرِ داده شده مسیرِ کاملِ Node است یا فقط نامِ دستور؟
  function nodeIsBare(nodePath) {
    const n = String(nodePath == null ? '' : nodePath).trim();
    return !n || !/[\\/]/.test(n);
  }

  // دو مسیرِ کاملاً متفاوت که کاربر راحت با هم اشتباه می‌گیرد: پوشهٔ برنامه و
  // پوشهٔ داده. اگر یکی باشند، سرور فایلِ خودش را پیدا نمی‌کند.
  function pathClash(repo, data) {
    const a = slash(repo).trim().replace(/\/+$/, '');
    const b = slash(data).trim().replace(/\/+$/, '');
    if (!a || !b) return '';
    if (a.toLowerCase() === b.toLowerCase()) {
      return 'این همان پوشهٔ داده است. اینجا باید پوشهٔ خودِ منشی باشد — جایی که فایل‌های برنامه‌اند.';
    }
    return '';
  }

  function mcpSnippet(toolId, script, data, os, nodePath) {
    const win = os === 'win';
    const s = String(script || '').trim() || (win ? 'C:\\path\\to\\manshi\\mcp\\manshi-mcp.js' : '/path/to/manshi/mcp/manshi-mcp.js');
    const d = String(data || '').trim() || (win ? 'C:\\path\\to\\manshi-data' : '/path/to/manshi-data');
    const node = nodeOf(nodePath, os);
    if (toolId === 'claude-code') {
      // نقلِ پوسته فرق دارد: cmd.exe کوتیشنِ تک‌نقل را نمی‌فهمد و عیناً چاپش می‌کند.
      const sh = win
        ? v => /\s/.test(v) ? '"' + v + '"' : v
        : v => /[\s'"$`\\]/.test(v) ? "'" + v.replace(/'/g, "'\\''") + "'" : v;
      return 'claude mcp add manshi -s user -- ' + sh(node) + ' ' + sh(s) + ' --data ' + sh(d);
    }
    if (toolId === 'codex') {
      return '[mcp_servers.manshi]\ncommand = ' + q(node) + '\nargs = [' + q(s) + ', "--data", ' + q(d) + ']';
    }
    const key = toolId === 'vscode' ? 'servers' : 'mcpServers';
    return '{\n  ' + q(key) + ': {\n    "manshi": {\n      "command": ' + q(node) + ',\n'
      + '      "args": [' + q(s) + ', "--data", ' + q(d) + ']\n    }\n  }\n}';
  }

  // دستورِ رسمیِ خودِ ابزار. همیشه بهتر از دست‌بردن در فایلِ تنظیمات است:
  // فایل معمولاً از قبل پر است و ادغامِ دستیِ JSON/TOML جایی است که کار خراب می‌شود.
  function cliSnippet(toolId, script, data, os, nodePath) {
    const win = os === 'win';
    const s = String(script || '').trim();
    const d = String(data || '').trim();
    if (!s || !d) return '';
    const node = nodeOf(nodePath, os);
    const sh = win
      ? v => /\s/.test(v) ? '"' + v + '"' : v
      : v => /[\s'"$`\\]/.test(v) ? "'" + v.replace(/'/g, "'\\''") + "'" : v;
    if (toolId === 'codex') {
      return 'codex mcp add manshi -- ' + sh(node) + ' ' + sh(s) + ' --data ' + sh(d);
    }
    return '';
  }

  // ── پیشرفتِ راه‌اندازی ───────────────────────────────
  // بعضی قدم‌ها را خودمان می‌فهمیم (مسیر پر شد، تنظیمات کپی شد، صندوق ورودی آمد)،
  // بعضی را نه (Node نصب است؟ ابزار را باز کردی؟) — آن‌ها را کاربر تأیید می‌کند.
  // «مانده» یعنی هنوز نه، نه اینکه غلط است.
  const SETUP_STEPS = [
    { id: 'node', auto: false },
    { id: 'path', auto: true },
    { id: 'config', auto: true },
    { id: 'restart', auto: false },
    { id: 'ask', auto: true }
  ];

  function setupProgress(flags) {
    const f = flags || {};
    const states = {};
    for (const s of SETUP_STEPS) states[s.id] = !!f[s.id];
    const order = SETUP_STEPS.map(s => s.id);
    const done = order.filter(id => states[id]).length;
    // «الان اینجایی» = اولین قدمی که هنوز انجام نشده
    const next = order.find(id => !states[id]) || null;
    return { states, done, total: order.length, next, complete: done === order.length };
  }

  const DAY = 86400000;
  const clean = v => String(v == null ? '' : v);
  const norm = s => clean(s).trim().replace(/\s+/g, ' ').toLowerCase();

  // ── شناختِ جلسه ─────────────────────────────────────

  // شرکت‌کننده‌ها از دو جا می‌آیند: گوینده‌های زیرنویس و مسئولِ کارها.
  // جلسه‌ای که فقط متن دارد هم گوینده دارد، پس این برای جلسهٔ تحلیل‌نشده هم کار می‌کند.
  function participants(s) {
    const out = [];
    const seen = new Set();
    const add = v => {
      const t = clean(v).trim();
      if (!t || seen.has(t)) return;
      seen.add(t); out.push(t);
    };
    for (const r of (s && s.transcript) || []) if (r) add(r.speaker);
    for (const a of (s && s.actions) || []) if (a) add(a.owner);
    return out;
  }

  // «تحلیل‌شده» یعنی هر خروجیِ هوش مصنوعی‌ای دارد — خلاصه، کار، یا دادهٔ تحلیل.
  // این پرچم در خروجی می‌آید تا مدل بداند خلاصهٔ خالی یعنی «هنوز ساخته نشده»،
  // نه «جلسه چیزی نداشته». بدون این، مدل با اطمینان جوابِ ناقص می‌دهد.
  function isAnalyzed(s) {
    if (!s) return false;
    if (clean(s.summary).trim()) return true;
    if (Array.isArray(s.actions) && s.actions.length) return true;
    return !!s.analysisData;
  }

  function transcriptChars(s) {
    let n = 0;
    for (const r of (s && s.transcript) || []) n += clean(r && r.text).length;
    return n;
  }

  // تخمینِ توکن. برای فارسی تقریبی‌تر از انگلیسی است چون بیشترِ توکنایزرها
  // فارسی را ریزتر می‌شکنند؛ عدد را «حدودی» نشان بده، نه قطعی.
  function estimateTokens(text) { return Math.ceil(clean(text).length / 2.5); }

  function dateLabel(ts) {
    if (!ts || !J) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return J.format(d, { weekday: false, year: true });
  }

  // ── لاغرکردنِ رکوردها ────────────────────────────────

  function slimSession(s, mode) {
    const out = {
      id: clean(s.id),
      title: clean(s.title),
      startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
      date: dateLabel(s.startedAt),
      participants: participants(s),
      analyzed: isAnalyzed(s),
      turns: ((s && s.transcript) || []).length,
      chars: transcriptChars(s)
    };
    if (mode === 'meta') return out;

    out.summary = clean(s.summary);
    out.actions = ((s && s.actions) || []).map(a => ({
      text: clean(a && a.text),
      owner: clean(a && a.owner),
      due: (a && a.due) || null
    }));
    if (mode !== 'full') return out;

    out.transcript = ((s && s.transcript) || []).map(r => ({
      speaker: clean(r && r.speaker) || 'گوینده',
      text: clean(r && r.text)
    }));
    return out;
  }

  function slimTask(t, mode) {
    const out = {
      id: clean(t.id),
      title: clean(t.title),
      who: t.who || null,
      dir: t.dir === 'theirs' ? 'theirs' : 'mine',
      due: t.due || null,
      status: t.status === 'done' ? 'done' : 'open',
      tags: Array.isArray(t.tags) ? t.tags.slice() : [],
      estimate: t.estimate || null,
      createdAt: t.createdAt || null,
      doneAt: t.doneAt || null,
      meetingRef: t.meetingRef || null
    };
    // یادداشتِ کار نوشتهٔ خودِ کاربر است و می‌تواند خصوصی باشد — در سطحِ meta نیاید.
    if (mode !== 'meta' && clean(t.notes).trim()) out.notes = clean(t.notes);
    return out;
  }

  // ── خروجی JSON برای پلِ MCP ─────────────────────────

  function buildSnapshot(data, opts) {
    const o = opts || {};
    const mode = MODES.includes(o.mode) ? o.mode : 'mom';
    const sessions = (data && data.sessions) || [];
    const tasks = (data && data.tasks) || [];
    const people = (data && data.people) || {};

    return {
      app: 'manshi',
      schema: SCHEMA,
      mode,
      exportedAt: new Date(o.now || Date.now()).toISOString(),
      counts: {
        meetings: sessions.length,
        tasks: tasks.length,
        openTasks: tasks.filter(t => t && t.status !== 'done').length,
        unanalyzed: sessions.filter(s => !isAnalyzed(s)).length
      },
      meetings: sessions.map(s => slimSession(s || {}, mode)),
      tasks: tasks.map(t => slimTask(t || {}, mode)),
      people: Object.keys(people).map(name => {
        const p = people[name] || {};
        const row = { name };
        if (mode !== 'meta' && p.email) row.email = clean(p.email);
        return row;
      })
    };
  }

  // ── انتخابِ داده برای یک دامنه ──────────────────────

  function startOfDay(now) {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function pickSessions(sessions, scope, o, now) {
    const all = (sessions || []).filter(Boolean);
    if (scope === 'session') return all.filter(s => s.id === o.id);
    if (scope === 'person') {
      const want = norm(o.name);
      if (!want) return [];
      return all.filter(s => participants(s).some(p => norm(p) === want));
    }
    if (scope === 'unanalyzed') return all.filter(s => !isAnalyzed(s));
    if (scope === 'open') return [];
    const from = scope === 'today' ? startOfDay(now)
      : now - (scope === 'month' ? 30 : 7) * DAY;
    return all.filter(s => (s.startedAt || 0) >= from);
  }

  function pickTasks(tasks, scope, o, now) {
    const all = (tasks || []).filter(Boolean);
    const open = t => t.status !== 'done';
    if (scope === 'session') return all.filter(t => t.meetingRef === o.id);
    if (scope === 'person') {
      const want = norm(o.name);
      return want ? all.filter(t => norm(t.who) === want) : [];
    }
    if (scope === 'unanalyzed') return [];
    if (scope === 'open') return all.filter(open);
    // بازه‌ای: کارهای باز + آنچه در همین بازه تمام شده
    const from = scope === 'today' ? startOfDay(now)
      : now - (scope === 'month' ? 30 : 7) * DAY;
    return all.filter(t => open(t) || (t.doneAt && new Date(t.doneAt).getTime() >= from));
  }

  // شمارشِ سبک، بدون ساختنِ متن. برای اینکه کنارِ هر «کار» بشود نشان داد چقدر
  // داده دارد — کاربر نباید انتخاب کند و بعد بفهمد خالی است.
  function counts(data, opts) {
    const o = opts || {};
    const now = o.now || Date.now();
    const scope = SCOPES.includes(o.scope) ? o.scope : 'week';
    return {
      meetings: pickSessions((data && data.sessions) || [], scope, o, now).length,
      tasks: pickTasks((data && data.tasks) || [], scope, o, now).length
    };
  }

  // ── خروجی مارک‌داون برای کلیپ‌بورد ──────────────────

  function sessionBlock(s, mode) {
    const L = [];
    const when = dateLabel(s.startedAt);
    L.push('## ' + (clean(s.title).trim() || 'جلسهٔ بی‌عنوان') + (when ? ' — ' + when : ''));
    const p = participants(s);
    if (p.length) L.push('شرکت‌کنندگان: ' + p.join('، '));

    if (!isAnalyzed(s)) {
      L.push('> این جلسه هنوز صورت‌جلسه ندارد.'
        + (mode === 'full' ? ' آنچه می‌آید متنِ خام است.' : ''));
    }

    if (mode !== 'meta') {
      const sum = clean(s.summary).trim();
      if (sum) { L.push(''); L.push(sum); }
      const acts = (s.actions || []).filter(Boolean);
      if (acts.length) {
        L.push(''); L.push('کارهای این جلسه:');
        for (const a of acts) {
          L.push('- ' + clean(a.text)
            + (a.owner ? ' — ' + clean(a.owner) : '')
            + (a.due ? ' (' + clean(a.due) + ')' : ''));
        }
      }
    }

    if (mode === 'full') {
      const tr = (s.transcript || []).filter(Boolean);
      if (tr.length) {
        L.push(''); L.push('متن جلسه:');
        for (const r of tr) L.push((clean(r.speaker) || 'گوینده') + ': ' + clean(r.text));
      }
    }
    L.push('');
    return L.join('\n');
  }

  function taskLine(t) {
    const bits = [];
    if (t.who) bits.push(t.dir === 'theirs' ? 'سپرده به ' + clean(t.who) : clean(t.who));
    if (t.due) bits.push('سررسید ' + clean(t.due));
    if (t.status === 'done') bits.push('انجام‌شده');
    return '- ' + clean(t.title) + (bits.length ? ' — ' + bits.join('، ') : '');
  }

  function buildContext(data, opts) {
    const o = opts || {};
    const now = o.now || Date.now();
    const mode = MODES.includes(o.mode) ? o.mode : 'mom';
    const scope = SCOPES.includes(o.scope) ? o.scope : 'week';
    const budget = Math.max(2000, o.budget || 48000);

    const sessions = pickSessions((data && data.sessions) || [], scope, o, now)
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    const tasks = pickTasks((data && data.tasks) || [], scope, o, now);
    const unanalyzed = sessions.filter(s => !isAnalyzed(s)).length;

    const ask = clean(o.ask).trim();

    const head = ['# زمینه از منشی', ''];
    // سرِ متن فقط قاب می‌دهد؛ خودِ درخواست ته متن می‌آید. برای متنِ بلند،
    // دستوری که *بعد* از داده بیاید بهتر دنبال می‌شود.
    if (ask) head.push('دادهٔ زیر از «منشی» است — جلسه‌ها و کارهای من. درخواستم ته همین متن آمده.', '');
    head.push('تاریخ خروجی: ' + dateLabel(now));
    let scopeText = SCOPE_LABEL[scope] || scope;
    if (scope === 'person' && o.name) scopeText += ' (' + clean(o.name) + ')';
    head.push('دامنه: ' + scopeText);
    head.push('سطح: ' + (MODE_LABEL[mode] || mode));

    // مدل باید بداند چه چیزی را *نمی‌بیند*، وگرنه با اطمینان جوابِ ناقص می‌دهد.
    const missing = [];
    if (mode !== 'full') missing.push('متنِ کلمه‌به‌کلمهٔ جلسه‌ها در این خروجی نیست');
    if (mode === 'meta') missing.push('خلاصه و کارهای جلسه‌ها هم نیست');
    if (unanalyzed) missing.push(unanalyzed + ' جلسه هنوز صورت‌جلسه ندارد');
    if (missing.length) { head.push(''); head.push('> ' + missing.join('؛ ') + '.'); }

    let out = head.join('\n') + '\n';
    let omitted = 0;

    if (sessions.length) {
      out += '\n# جلسه‌ها\n\n';
      for (const s of sessions) {
        const block = sessionBlock(s, mode);
        // اگر یکی بزرگ بود ردش می‌کنیم ولی بقیه را امتحان می‌کنیم — تا جای ممکن پر شود.
        if (out.length + block.length > budget) { omitted++; continue; }
        out += block + '\n';
      }
    }

    if (tasks.length) {
      const openList = tasks.filter(t => t.status !== 'done');
      const doneList = tasks.filter(t => t.status === 'done');
      let block = '\n# کارها\n';
      if (openList.length) {
        block += '\nباز:\n' + openList.map(taskLine).join('\n') + '\n';
      }
      if (doneList.length) {
        block += '\nانجام‌شده:\n' + doneList.map(taskLine).join('\n') + '\n';
      }
      if (out.length + block.length <= budget) out += block;
      else omitted += tasks.length;
    }

    if (omitted) {
      out += '\n> ' + omitted + ' مورد به‌خاطر محدودیتِ اندازه در این خروجی نیامد.\n';
    }

    if (ask) out += '\n---\n\n# درخواست من\n\n' + ask + '\n';

    return {
      text: out,
      chars: out.length,
      tokens: estimateTokens(out),
      size: sizeLabel(out.length),
      meetings: sessions.length,
      tasks: tasks.length,
      unanalyzed,
      omitted,
      truncated: omitted > 0,
      empty: sessions.length === 0 && tasks.length === 0
    };
  }

  return {
    SCHEMA, MODES, MODE_LABEL, SCOPES, SCOPE_LABEL,
    RECIPES, recipeById, sizeLabel, counts,
    TOOLS, OSES, toolFile, pathRisk, mcpSnippet, cliSnippet, SETUP_STEPS, setupProgress,
    nodeFinder, nodeIsBare, pathClash,
    participants, isAnalyzed, transcriptChars, estimateTokens,
    buildSnapshot, buildContext,
    // برای تست
    _slimSession: slimSession, _slimTask: slimTask,
    _pickSessions: pickSessions, _pickTasks: pickTasks
  };
})();

if (typeof module !== 'undefined') module.exports = Snapshot;
