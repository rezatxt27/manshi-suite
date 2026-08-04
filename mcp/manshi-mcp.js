#!/usr/bin/env node
// سرور MCP منشی — بدون هیچ وابستگی، فقط Node.
//
//   node mcp/manshi-mcp.js --data ~/manshi-data
//
// می‌خواند:  snapshot.json  (منشی می‌نویسدش)
// می‌نویسد: inbox.json      (منشی بعداً نشان می‌دهد و با تأیید تو اعمال می‌کند)
//
// نه پورتی باز می‌کند، نه درخواستی به شبکه می‌زند. فقط دو فایل روی دیسکِ خودت
// و ارتباط با ابزار AI از راه ورودی/خروجی استاندارد.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── آرگومان‌ها ───────────────────────────────────────
function argOf(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function expand(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
}

const DATA = expand(argOf('--data', './manshi-data'));
const SNAP = path.join(DATA, 'snapshot.json');
const INBOX = path.join(DATA, 'inbox.json');
const READ_ONLY = process.argv.includes('--read-only');

// خطای راه‌اندازی باید خوانا باشد، نه stack trace
if (!fs.existsSync(DATA)) {
  console.error('پوشهٔ داده پیدا نشد: ' + DATA
    + '\nدر منشی: تنظیمات ← پل هوش مصنوعی ← انتخاب پوشه، و همان مسیر را با --data بده.');
  process.exit(1);
}

// ── خواندن عکسِ لحظه‌ای ──────────────────────────────
function snapshot() {
  if (!fs.existsSync(SNAP)) {
    throw new Error('snapshot.json در ' + DATA + ' نیست. در منشی «نوشتن همین حالا» را بزن.');
  }
  const data = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  if (data.app !== 'manshi') throw new Error('این فایل عکسِ لحظه‌ایِ منشی نیست.');
  return data;
}

// هر جوابی تاریخِ داده را همراه دارد. بدون این، مدل نمی‌داند دادهٔ قدیمی دستش است
// و با اطمینان جوابِ کهنه می‌دهد.
function withMeta(snap, body) {
  return Object.assign({
    _dataFrom: snap.exportedAt,
    _detailLevel: snap.mode,
    _note: snap.mode === 'full' ? undefined
      : 'سطحِ فایل «' + snap.mode + '» است؛ متنِ کاملِ جلسه‌ها در آن نیست.'
  }, body);
}

// ── صندوق ورودی ─────────────────────────────────────
function readInbox() {
  if (!fs.existsSync(INBOX)) return { app: 'manshi-inbox', schema: 1, items: [] };
  try {
    const o = JSON.parse(fs.readFileSync(INBOX, 'utf8'));
    if (o && Array.isArray(o.items)) return o;
  } catch (e) { /* فایلِ خراب را دور می‌ریزیم، نه اینکه بترکیم */ }
  return { app: 'manshi-inbox', schema: 1, items: [] };
}

function queueMinutes(meetingId, summary, actions) {
  const box = readInbox();
  // اگر برای همین جلسه از قبل چیزی در صف است، جایش را بگیر — نه اینکه تلنبار شود
  box.items = box.items.filter(x => !(x && x.kind === 'minutes' && x.meetingId === meetingId));
  box.items.push({
    id: 'in' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    kind: 'minutes',
    meetingId,
    summary: String(summary || ''),
    actions: Array.isArray(actions) ? actions : [],
    by: 'mcp',
    createdAt: new Date().toISOString()
  });
  // نوشتنِ اتمی: اول فایل موقت، بعد جابه‌جایی. وگرنه اگر وسط نوشتن قطع شود،
  // منشی یک JSONِ نصفه می‌بیند.
  const body = JSON.stringify(box, null, 2);
  const tmp = INBOX + '.tmp';
  fs.writeFileSync(tmp, body, 'utf8');
  try {
    fs.renameSync(tmp, INBOX);
  } catch (e) {
    // ویندوز اگر فایل مقصد را برنامهٔ دیگری باز نگه داشته باشد EPERM/EBUSY می‌دهد.
    // آن‌وقت نوشتنِ مستقیم تنها راه است — اتمی نیست ولی از شکست بهتر است.
    fs.writeFileSync(INBOX, body, 'utf8');
    try { fs.unlinkSync(tmp); } catch (e2) { /* مهم نیست */ }
  }
  return box.items.length;
}

// ── ابزارها ─────────────────────────────────────────
// تعریفشان در core/mcp-tools.js است تا راهنمای داخل اکستنشن و اینجا یکی بمانند.
const TOOLS = require('../core/mcp-tools.js').forServer();

// ── استانداردِ نگارشِ صورت‌جلسه ───────────────────────
// همان قالب‌هایی که خودِ منشی موقع تحلیل به مدل می‌دهد. اگر اینجا تکرارشان
// می‌کردم، دو استانداردِ جداگانه می‌شد و مسیرِ MCP کم‌کم عقب می‌افتاد —
// چیزی که همین حالا هم اتفاق افتاده بود و صورت‌جلسه‌ها چندخطی درمی‌آمدند.
const MoM = require('../core/mom-core.js');
// «گزارشی» نه «رسمی»: خروجیِ روایی با بخش‌بندیِ موضوعی همان چیزی است که
// در عمل خوانده می‌شود. رسمی جدول و بلوکِ تأیید می‌خواهد و برای بایگانی است.
const DEFAULT_TEMPLATE = 'report';

function templateList() {
  return MoM.BUILTIN_TEMPLATES.map(t => ({
    id: t.id, name: t.name, description: t.description,
    depth: t.mode === 'freeform' ? 'دستورِ کاملِ اختصاصی' : 'ساختارِ ۱۶بخشیِ استاندارد'
  }));
}

// متنی که مدل باید مو‌به‌مو رعایتش کند. قالب‌های freeform دستورِ کاملِ خودشان
// را دارند؛ بقیه روی همان اسکلتِ جامعِ منشی سوار می‌شوند.
function minutesGuide(id) {
  const t = MoM.getTemplate(id || DEFAULT_TEMPLATE);
  const head = 'قالب: ' + t.name + ' — ' + t.description;
  const body = t.systemPrompt
    ? t.systemPrompt
    : MoM.COMPREHENSIVE_MOM_SYSTEM_PROMPT + '\n\nتأکیدِ این قالب: ' + (t.instructions || '');
  return {
    template: t.id,
    guide: head + '\n\n' + body,
    reminder: 'این استانداردِ خودِ منشی است. خروجی باید سندی کامل باشد، نه چکیدهٔ چندخطی. '
      + 'هیچ نام، عدد، مهلت یا تصمیمی از خودت نساز؛ هرچه می‌نویسی باید در متنِ جلسه ریشه داشته باشد.'
  };
}

function call(name, args) {
  const a = args || {};

  if (name === 'list_meetings') {
    const snap = snapshot();
    const limit = Math.min(Math.max(1, a.limit || 20), 100);
    const offset = Math.max(0, a.offset || 0);
    let list = snap.meetings || [];
    if (a.only_unanalyzed) list = list.filter(m => !m.analyzed);
    const page = list.slice(offset, offset + limit).map(m => ({
      id: m.id, title: m.title, date: m.date,
      participants: m.participants, analyzed: m.analyzed,
      turns: m.turns, chars: m.chars
    }));
    return withMeta(snap, { total: list.length, offset, returned: page.length, meetings: page });
  }

  if (name === 'get_meeting') {
    const snap = snapshot();
    const m = (snap.meetings || []).find(x => x.id === a.id);
    if (!m) throw new Error('جلسه‌ای با این شناسه نیست: ' + a.id);
    if (snap.mode !== 'full' && !m.summary) {
      throw new Error('سطحِ فایل «' + snap.mode + '» است، پس متنِ این جلسه در آن نیامده. '
        + 'در منشی: تنظیمات ← پل هوش مصنوعی ← سطح جزئیات را روی «متن کامل» بگذار.');
    }
    return withMeta(snap, { meeting: m, minutes_guide: minutesGuide(a.template) });
  }

  if (name === 'list_tasks') {
    const snap = snapshot();
    const st = a.status || 'open';
    let list = snap.tasks || [];
    if (st !== 'all') list = list.filter(t => t.status === st);
    return withMeta(snap, { total: list.length, tasks: list.slice(0, Math.min(a.limit || 100, 500)) });
  }

  if (name === 'write_minutes') {
    if (READ_ONLY) throw new Error('سرور با --read-only بالا آمده؛ نوشتن خاموش است.');
    const snap = snapshot();
    const m = (snap.meetings || []).find(x => x.id === a.id);
    if (!m) throw new Error('جلسه‌ای با این شناسه نیست: ' + a.id);
    if (!String(a.summary || '').trim() && !(a.actions || []).length) {
      throw new Error('هم summary و هم actions خالی است — چیزی برای نوشتن نیست.');
    }
    const n = queueMinutes(a.id, a.summary, a.actions);
    return {
      queued: true,
      meeting: m.title,
      pending: n,
      next: 'در منشی نواری می‌آید که می‌گوید صورت‌جلسه‌ای رسیده. تا کاربر تأیید نکند اعمال نمی‌شود.'
    };
  }

  if (name === 'minutes_templates') {
    return { default: DEFAULT_TEMPLATE, templates: templateList() };
  }

  if (name === 'inbox_status') {
    const box = readInbox();
    return { pending: box.items.length, file: INBOX };
  }

  throw new Error('ابزار ناشناخته: ' + name);
}

// ── JSON-RPC روی ورودی/خروجی استاندارد ──────────────
const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
const ok = (id, result) => send({ jsonrpc: '2.0', id, result });
const err = (id, message) => send({ jsonrpc: '2.0', id, error: { code: -32000, message } });

function handle(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return ok(id, {
      protocolVersion: (params && params.protocolVersion) || '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'manshi', version: '1.0.0' }
    });
  }
  if (method === 'notifications/initialized') return;          // اعلان است، جواب ندارد
  if (method === 'ping') return ok(id, {});
  if (method === 'tools/list') return ok(id, { tools: TOOLS });

  if (method === 'tools/call') {
    const name = params && params.name;
    try {
      const out = call(name, params && params.arguments);
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
    } catch (e) {
      // خطای ابزار به‌صورت نتیجه برمی‌گردد نه خطای پروتکل، تا مدل بتواند بخواندش
      return ok(id, { content: [{ type: 'text', text: 'خطا: ' + e.message }], isError: true });
    }
  }

  if (id !== undefined) err(id, 'متد پشتیبانی نمی‌شود: ' + method);
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { continue; }
    try { handle(msg); }
    catch (e) { if (msg && msg.id !== undefined) err(msg.id, e.message); }
  }
});
process.stdin.on('end', () => process.exit(0));
