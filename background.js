// وردست — Service Worker: زنگ‌های روزانه، نوار آدرس، به‌روزرسانی تقویم و پل امن منشی
// search.js باید پیش از store.js بیاید: store برای یکسان‌سازیِ نامِ آدم‌ها از
// MeetSearch.norm استفاده می‌کند. اگر نباشد، سرویس‌ورکر همان خط می‌میرد و
// کلیکِ روی آیکون هیچ کاری نمی‌کند — بی‌آنکه خطایی به چشمِ کاربر بیاید.
importScripts('core/jalali.js', 'core/date-parser.js', 'core/ai-client.js', 'core/transcript-cleaner.js', 'core/mom-core.js', 'core/search.js', 'core/store.js', 'core/ics.js');

const ALARMS = { MORNING: 'vd-morning', EVENING: 'vd-evening', ICS: 'vd-ics', FINISH: 'vd-finish' };

function nextTime(hour, minute = 0) {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t.getTime();
}

async function setupAlarms() {
  const s = await Store.getSettings();
  chrome.alarms.create(ALARMS.MORNING, { when: nextTime(8, 0), periodInMinutes: 1440 });
  chrome.alarms.create(ALARMS.EVENING, { when: nextTime(s.dayEndHour || 17, 30), periodInMinutes: 1440 });
  chrome.alarms.create(ALARMS.ICS, { periodInMinutes: 180, delayInMinutes: 1 });
  chrome.alarms.create(ALARMS.FINISH, { periodInMinutes: 1 });
}

// اگر تب اپ وسط ساخت صورت‌جلسه بسته شد، Service Worker کار را تمام می‌کند
let finisherBusy = false;
async function finishAbandonedAnalysis() {
  if (finisherBusy) return;
  const job = await Store.getAnalysisJob();
  if (!job?.sessionId) return;
  if (Date.now() - (job.heartbeatAt || 0) < 30000) return; // تب هنوز زنده است
  finisherBusy = true;
  try {
    await Store.clearAnalysisJob();
    const [sessions, settings] = await Promise.all([Store.getSessions(), Store.getSettings()]);
    const session = sessions.find(x => x.id === job.sessionId);
    if (!session || !AIClient.configured(settings)) return;
    const template = MeetNoteMoM.getTemplate(job.templateId || 'standard', settings.momTemplates);
    const result = await MeetNoteMoM.analyzeSession(session, settings, template, { profileId: job.profileId || '' });
    await Store.updateSession(job.sessionId, {
      summary: result.summary, actions: result.actions, analysisData: result.data,
      analysisError: '', templateId: template.id, analysisModel: result.model, analysisUsage: result.usage
    });
    notify('vd-finish', 'صورت‌جلسه در پس‌زمینه آماده شد ✅', `«${session.title || 'جلسه'}» را تا شما نبودید تمام کردم.`);
  } catch (e) {
    if (job?.sessionId) await Store.updateSession(job.sessionId, { analysisError: e.message });
    console.warn('manshi: background finisher failed:', e.message);
  } finally {
    finisherBusy = false;
  }
}

chrome.runtime.onInstalled.addListener(setupAlarms);
chrome.runtime.onStartup.addListener(setupAlarms);

function notify(id, title, message) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icon128.png',
    title,
    message,
    silent: false
  });
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === ALARMS.FINISH) { await finishAbandonedAnalysis(); return; }
  if (alarm.name === ALARMS.ICS) { await refreshCalendar(); return; }

  const tasks = await Store.getTasks();
  const now = new Date();

  if (alarm.name === ALARMS.MORNING) {
    const g = Store.grouped(tasks, now);
    const { events } = await Store.getEvents();
    const todayEvents = (events || []).filter(e =>
      new Date(e.start).toDateString() === now.toDateString());
    const bits = [];
    if (todayEvents.length) bits.push(`${Jalali.faDigits(todayEvents.length)} جلسه`);
    if (g.today.length) bits.push(`${Jalali.faDigits(g.today.length)} ددلاین امروز`);
    if (g.overdue.length) bits.push(`${Jalali.faDigits(g.overdue.length)} کار عقب‌افتاده`);
    if (g.theirs.length) bits.push(`${Jalali.faDigits(g.theirs.length)} پیگیری`);
    const msg = bits.length ? bits.join('، ') : 'امروز برنامهٔ سبکی داری — روز خوبی بساز';
    notify('vd-morning', `صبح بخیر — ${Jalali.format(now)}`, msg);
    // شنبه: یادآوری گزارش هفتگی
    if (Jalali.weekdayIndex(now) === 0) {
      notify('vd-weekly', 'گزارش هفتهٔ گذشته آماده است', 'یک تب جدید باز کن و از بخش «گزارش» ببینش');
    }
    return;
  }

  if (alarm.name === ALARMS.EVENING) {
    const g = Store.grouped(tasks, now);
    const remaining = g.today.length + g.overdue.length;
    if (remaining > 0) {
      notify('vd-evening', 'جمع‌بندی روز', `${Jalali.faDigits(remaining)} کار باز مانده — توی تب جدید روزت رو ببند`);
    }
  }
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'app.html' });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'app.html' });
});

async function refreshCalendar() {
  const s = await Store.getSettings();
  if (!s.icsUrl) return;
  try {
    const events = await ICS.refresh(s.icsUrl);
    await Store.saveEvents(events);
  } catch (e) {
    // خطای شبکه طبیعی است؛ کش قبلی معتبر می‌ماند. آدرس ICS هرگز لاگ نمی‌شود.
    console.warn('vardast: calendar refresh failed:', e.message);
  }
}

// ---------- نوار آدرس: «ود فاکتور رو بفرست تا چهارشنبه» ----------
chrome.omnibox.setDefaultSuggestion({ description: 'ثبت کار در منشی — تاریخ را طبیعی بنویس: «تا چهارشنبه»، «فردا»، «۵ مرداد»' });

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const { title, due, recur } = DateParser.parse(text);
  if (!title) return suggest([]);
  const tail = recur ? `تکرار: ${DateParser.recurLabel(recur)}` : due ? `ددلاین: ${Jalali.relLabel(due)}` : 'بدون ددلاین';
  suggest([{ content: text, description: `ثبت: ${(`${title} — ${tail}`).replace(/[<>&"']/g, '')}` }]);
});

chrome.omnibox.onInputEntered.addListener(async text => {
  const { title, due, recur } = DateParser.parse(text);
  if (!title) return;
  await Store.addTask({ title, due, recur, source: 'omnibox' });
  notify('vd-added-' + Date.now(), 'ثبت شد ✓',
    recur ? `${title} — ${DateParser.recurLabel(recur)}` : due ? `${title} — ${Jalali.relLabel(due)}` : title);
});

// ---------- پل امن بین‌اکستنشنی (دریافت اقدام‌ها از منشی) ----------
// فقط پیام از شناسهٔ تنظیم‌شدهٔ منشی پذیرفته می‌شود؛ پیش‌فرض: هیچ‌کس.
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  (async () => {
    const s = await Store.getSettings();
    if (!s.monshiId || sender.id !== s.monshiId) {
      sendResponse({ ok: false, error: 'unauthorized' });
      return;
    }
    if (msg?.type === 'vardast/addTasks' && Array.isArray(msg.items)) {
      let added = 0;
      for (const item of msg.items.slice(0, 50)) {
        if (typeof item?.title !== 'string' || !item.title.trim()) continue;
        let due = /^\d{4}-\d{2}-\d{2}$/.test(item.due || '') ? item.due : null;
        // ددلاین متنی فارسی از منشی («تا چهارشنبه»، «۵ مرداد») با تجزیه‌گر خود وردست
        if (!due && typeof item.dueText === 'string' && item.dueText.trim()) {
          due = DateParser.parse('x ' + item.dueText.slice(0, 60)).due;
        }
        await Store.addTask({
          title: item.title.slice(0, 300),
          who: typeof item.who === 'string' ? item.who.slice(0, 80) : null,
          dir: item.dir === 'theirs' ? 'theirs' : 'mine',
          due,
          source: 'monshi',
          meetingRef: typeof item.meetingRef === 'string' ? item.meetingRef.slice(0, 200) : null
        });
        added++;
      }
      if (added) notify('vd-monshi', 'اقدام‌های جلسه رسید', `${Jalali.faDigits(added)} کار از نسخهٔ قدیمی منشی وارد شد`);
      sendResponse({ ok: true, added });
      return;
    }
    sendResponse({ ok: false, error: 'unknown-message' });
  })();
  return true; // پاسخ ناهمگام
});

// درخواست به‌روزرسانی تقویم از سمت داشبورد
let sessionSaveQueue = Promise.resolve();
function mergeSession(prev, next) {
  // متن جدید کامل‌تر است؛ سند تولیدشدهٔ قبلی حفظ می‌شود مگر جلسه دوباره تحلیل شود
  return { ...prev, ...next, summary: next.summary || prev.summary, actions: next.actions?.length ? next.actions : prev.actions };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'vardast/refreshCalendar') {
    refreshCalendar().then(() => sendResponse({ ok: true }), e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  // ثبت جلسه از content script روی Google Meet
  if (msg?.type === 'SAVE_SESSION' && msg.session?.id) {
    sessionSaveQueue = sessionSaveQueue.then(async () => {
      const { sessions = [] } = await chrome.storage.local.get('sessions');
      const idx = sessions.findIndex(s => s.id === msg.session.id);
      if (idx >= 0) sessions[idx] = mergeSession(sessions[idx], msg.session);
      else sessions.unshift(msg.session);
      await chrome.storage.local.set({ sessions });
      sendResponse({ ok: true });
    }).catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});
