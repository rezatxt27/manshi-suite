// منشی سوئیت — هستهٔ صورت‌جلسه (پرامپت و فرمت‌ساز از منشی، تحلیل روی AI چنداتصالی مشترک)
// بخش‌های خالص (formatMomDocument/validateAnalysisData/normalizeActions/پرامپت ۱۶بخشی) عیناً از منشی منتقل شده‌اند.
(() => {
const AI = (typeof AIClient !== 'undefined') ? AIClient : require('./ai-client.js');

const asItems = (value) => Array.isArray(value) ? value : [];
const itemText = (item, keys = []) => typeof item === "string" ? item : keys.map((key) => item?.[key]).find(Boolean) || "";
const safeCell = (value = "") => String(value).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

// evidenceRefs و confidence باید روی خودِ اقدام بمانند: فهرست اقدام‌ها قابل‌ویرایش است
// و اگر شواهد جدا نگه داشته شود، بعد از هر ویرایش/حذف/افزودن از هم می‌پاشند.
function normalizeActions(items = []) {
  return asItems(items).map((item) => {
    if (typeof item === "string") return { text: item, expectedOutput: "", owner: "", dependencies: "", deadline: "", priority: "", status: "", done: false };
    const out = { text: item.text || item.task || item.action || "", expectedOutput: item.expectedOutput || item.output || "", owner: item.owner || "", dependencies: item.dependencies || item.collaborators || "", deadline: item.deadline || "", priority: item.priority || "", status: item.status || "", done: false };
    const refs = asItems(item.evidenceRefs).filter((n) => Number.isFinite(+n) && +n >= 1);
    if (refs.length) out.evidenceRefs = refs;
    if (item.confidence) out.confidence = String(item.confidence);
    return out;
  }).filter((item) => item.text.trim());
}

function formatMomDocument(data, session, template = { name: "صورت‌جلسه جامع" }) {
  const empty = "موردی از متن جلسه استخراج نشد.";
  const faNum = (n) => String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  const value = (input, fallback = "ذکر نشده") => input !== undefined && input !== null && String(input).trim() ? String(input).trim() : fallback;
  const assigned = (input) => value(input, "تعیین نشده");
  const list = (input, fallback = "ذکر نشده") => Array.isArray(input) ? (input.filter(Boolean).join("، ") || fallback) : value(input, fallback);
  const cell = (input, fallback = "ذکر نشده") => safeCell(value(input, fallback));
  const rows = (items, render, columns) => asItems(items).length ? asItems(items).map(render).join("\n") : `| ۱ | ${empty} |${" — |".repeat(columns - 2)}`;
  const dateOnly = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(session.startedAt);
  const timeOnly = (input) => input ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(input) : "ذکر نشده";
  const participants = [...new Set((session.transcript || []).map((row) => row.speaker).filter((name) => name && name !== "گوینده"))];
  const durationMinutes = Math.max(1, Math.round(((session.updatedAt || Date.now()) - session.startedAt) / 60000));
  const info = data.meetingInfo || {};
  const topics = asItems(data.discussedTopics);
  const agendaTopics = asItems(data.agendaTopics).length ? data.agendaTopics : topics.map((item) => itemText(item, ["topic", "title", "name"]));
  const incidents = asItems(data.incidents);
  const decisions = asItems(data.decisions);
  const proposals = asItems(data.proposals);
  const actions = normalizeActions(data.actions).map((action, index) => ({ ...asItems(data.actions)[index], ...action }));
  const openItems = asItems(data.openItems);
  const risks = asItems(data.risks);
  const disagreements = asItems(data.disagreements || data.ambiguities);
  const usefulData = asItems(data.usefulData);
  const entities = data.entities || {};
  const unanswered = asItems(data.unansweredQuestions);
  const nextAgenda = asItems(data.nextMeetingAgenda);
  const coverage = data.coverageReport || {};
  // فقط سطرهایی که واقعاً مقدار دارند نوشته می‌شوند — وگرنه یک موضوعِ ساده
  // ۱۳ خط «ذکر نشده» تولید می‌کرد.
  const has = (input) => input !== undefined && input !== null &&
    (Array.isArray(input) ? input.filter(Boolean).length > 0 : String(input).trim() !== "");
  const bullets = (pairs) => pairs
    .filter(([, v]) => has(v))
    .map(([k, v]) => `* **${k}:** ${Array.isArray(v) ? v.filter(Boolean).join("، ") : String(v).trim()}`)
    .join("\n");
  const detailedTopics = topics.map((item, index) => {
    const body = bullets([
      ["نوع موضوع", item?.type],
      ["سرویس، پروژه یا مشتری مرتبط", item?.relatedEntity || item?.service || item?.project || item?.customer],
      ["شرح موضوع", item?.discussionSummary || item?.description || item?.details],
      ["رخدادها یا مصادیق مطرح‌شده", item?.incidents || item?.examples],
      ["دیدگاه یا نگرانی مطرح‌شده", item?.concern || item?.firstView],
      ["توضیح یا پاسخ طرف مقابل", item?.response || item?.secondView],
      ["اثر یا پیامد", item?.impact],
      ["جمع‌بندی جلسه", item?.outcome || item?.conclusion],
      ["تصمیم مرتبط", item?.decision],
      ["اقدام مرتبط", item?.action],
      ["موضوعات حل‌نشده", item?.unresolvedItems || item?.unresolved],
      ["وضعیت", item?.status]
    ]);
    const head = `### موضوع شماره ${faNum(index + 1)}: ${assigned(itemText(item, ["topic", "title", "name"]))}`;
    return body ? `${head}\n\n${body}` : head;
  });
  const entityTable = (items, fields) => asItems(items).length
    ? asItems(items).map((item, index) => `| ${faNum(index + 1)} | ${cell(itemText(item, ["name", "title", "text"]))} | ${fields.map((field) => cell(item?.[field])).join(" | ")} |`).join("\n")
    : null;

  // ── سند به‌صورت فهرستی از بخش‌ها ساخته می‌شود؛ بخشِ بی‌محتوا اصلاً نوشته نمی‌شود ──
  const sections = [];
  const omitted = [];
  const add = (title, body) => { if (body && String(body).trim()) sections.push({ title, body: String(body).trim() }); };
  // اگر جدولی داده ندارد، به‌جای پُرکردنش از «ذکر نشده» نامش در فهرستِ موارد مطرح‌نشده می‌آید.
  // ستونی هم که در هیچ سطری مقدار ندارد کلاً حذف می‌شود تا جدول باریک و خوانا بماند.
  const table = (label, items, cols) => {
    const list = asItems(items);
    if (!list.length) { omitted.push(label); return; }
    const keep = cols.filter((c, i) => i === 0 || list.some((it) => has(c.get(it))));
    add(label, [
      `| ردیف | ${keep.map((c) => c.h).join(" | ")} |`,
      `| ---: |${" --- |".repeat(keep.length)}`,
      list.map((it, i) => `| ${faNum(i + 1)} | ${keep.map((c) => cell(c.get(it), c.fb)).join(" | ")} |`).join("\n")
    ].join("\n"));
  };
  add("شناسنامه جلسه", bullets([
    ["عنوان جلسه", session.title],
    ["تاریخ", dateOnly],
    ["ساعت شروع", timeOnly(session.startedAt)],
    ["ساعت پایان", timeOnly(session.updatedAt)],
    ["مدت", `${faNum(durationMinutes)} دقیقه`],
    ["محل یا بستر برگزاری", "Google Meet"],
    ["برگزارکننده", info.organizer],
    ["تهیه‌کننده صورت‌جلسه", info.minuteTaker],
    ["شرکت‌کنندگان", asItems(info.participants).length ? info.participants : participants],
    ["غایبان", info.absentees],
    ["هدف جلسه", info.objective],
    ["مشتری، پروژه یا سرویس مرتبط", info.customerProjectService]
  ]));

  add("خلاصه مدیریتی", has(data.executiveSummary || data.summary) ? String(data.executiveSummary || data.summary).trim() : "");

  if (agendaTopics.length) {
    add("فهرست محورهای جلسه", agendaTopics
      .map((item, index) => `${faNum(index + 1)}. ${value(itemText(item, ["title", "topic", "name"]) || item)}`).join("\n"));
  }
  if (detailedTopics.length) add("شرح موضوعات", detailedTopics.join("\n\n"));

  table("رخدادهای مطرح‌شده", incidents, [
    { h: "رخداد", get: (x) => itemText(x, ["incident", "title", "text"]) },
    { h: "زمان یا بازه", get: (x) => x?.timeRange },
    { h: "سرویس یا مشتری درگیر", get: (x) => x?.relatedEntity },
    { h: "اثر", get: (x) => x?.impact },
    { h: "علت", get: (x) => x?.cause },
    { h: "اقدام انجام‌شده", get: (x) => x?.actionTaken },
    { h: "وضعیت فعلی", get: (x) => x?.currentStatus }
  ]);

  table("تصمیم‌های قطعی جلسه", decisions, [
    { h: "تصمیم قطعی", get: (x) => itemText(x, ["decision", "text", "title"]) },
    { h: "موضوع مرتبط", get: (x) => x?.relatedTopic },
    { h: "دلیل یا زمینه", get: (x) => x?.rationale || x?.context },
    { h: "تصمیم‌گیر", get: (x) => x?.approver },
    { h: "مالک اجرا", get: (x) => x?.owner, fb: "تعیین نشده" },
    { h: "ددلاین", get: (x) => x?.deadline || x?.effectiveDate, fb: "تعیین نشده" },
    { h: "وضعیت", get: (x) => x?.status }
  ]);

  table("پیشنهادها و گزینه‌های مطرح‌شده", proposals, [
    { h: "پیشنهاد یا گزینه", get: (x) => itemText(x, ["proposal", "option", "text"]) },
    { h: "ارائه‌دهنده", get: (x) => x?.proposer },
    { h: "دلیل", get: (x) => x?.rationale },
    { h: "مزایا", get: (x) => x?.benefits },
    { h: "نگرانی یا محدودیت", get: (x) => x?.concerns },
    { h: "وضعیت بررسی", get: (x) => x?.status }
  ]);

  table("اقدامات و قدم‌های بعدی", actions, [
    { h: "اقدام مشخص", get: (x) => x.text },
    { h: "خروجی مورد انتظار", get: (x) => x.expectedOutput },
    { h: "موضوع مرتبط", get: (x) => x.relatedTopic },
    { h: "مسئول", get: (x) => x.owner, fb: "تعیین نشده" },
    { h: "همکاران", get: (x) => x.collaborators },
    { h: "وابستگی", get: (x) => x.dependencies },
    { h: "ددلاین", get: (x) => x.deadline, fb: "تعیین نشده" },
    { h: "اولویت", get: (x) => x.priority },
    { h: "وضعیت", get: (x) => x.status }
  ]);

  table("موضوعات باز و تصمیم‌گیری‌نشده", openItems, [
    { h: "موضوع باز", get: (x) => itemText(x, ["topic", "text", "title"]) },
    { h: "سؤال یا تصمیم موردنیاز", get: (x) => x?.questionOrDecision },
    { h: "دلیل نهایی نشدن", get: (x) => x?.reason || x?.why },
    { h: "اطلاعات موردنیاز", get: (x) => x?.requiredInfo },
    { h: "مسئول پیگیری", get: (x) => x?.owner || x?.followUpOwner, fb: "تعیین نشده" },
    { h: "زمان بررسی مجدد", get: (x) => x?.reviewTime || x?.nextStep }
  ]);

  table("ریسک‌ها و پیامدها", risks, [
    { h: "ریسک", get: (x) => itemText(x, ["risk", "text", "title"]) },
    { h: "منشأ ریسک", get: (x) => x?.source },
    { h: "اثر احتمالی", get: (x) => x?.impact },
    { h: "احتمال یا شدت", get: (x) => x?.likelihoodSeverity },
    { h: "اقدام کاهشی", get: (x) => x?.mitigation || x?.suggestedAction },
    { h: "مالک پیگیری", get: (x) => x?.owner, fb: "تعیین نشده" }
  ]);

  table("اختلاف‌نظرها و ابهامات", disagreements, [
    { h: "موضوع", get: (x) => itemText(x, ["topic", "title"]) },
    { h: "دیدگاه اول", get: (x) => x?.viewOne || x?.views },
    { h: "دیدگاه دوم", get: (x) => x?.viewTwo || x?.ambiguity },
    { h: "وضعیت اختلاف", get: (x) => x?.status },
    { h: "تصمیم موردنیاز", get: (x) => x?.decisionNeeded }
  ]);

  table("داده‌ها و اطلاعات کلیدی", usefulData, [
    { h: "داده یا اطلاعات", get: (x) => itemText(x, ["label", "title", "text"]) },
    { h: "دسته", get: (x) => x?.category },
    { h: "مقدار", get: (x) => x?.value },
    { h: "واحد", get: (x) => x?.unit },
    { h: "موضوع مرتبط", get: (x) => x?.relatedTopic || x?.topic },
    { h: "سطح اطمینان", get: (x) => x?.confidence },
    { h: "توضیح", get: (x) => x?.description || x?.context }
  ]);

  const entityParts = [
    ["سرویس‌ها و محصولات", entityTable(entities.servicesProducts, ["relatedTopic", "keyPoint"]), "| ردیف | نام | موضوع مرتبط | نکته مهم مطرح‌شده |"],
    ["شرکت‌ها، مشتریان و اپراتورها", entityTable(entities.organizations, ["role", "relatedTopic"]), "| ردیف | نام | نقش در جلسه | موضوع مرتبط |"],
    ["فناوری‌ها و مؤلفه‌های فنی", entityTable(entities.technologies, ["relation", "issue"]), "| ردیف | نام | کاربرد یا ارتباط | مسئله مطرح‌شده |"]
  ].filter(([, body]) => body);
  if (entityParts.length) {
    add("موجودیت‌های نام‌برده‌شده", entityParts
      .map(([sub, body, header]) => `### ${sub}\n\n${header}\n| ---: | --- | --- | --- |\n${body}`).join("\n\n"));
  } else omitted.push("موجودیت‌های نام‌برده‌شده");

  table("سؤالات بی‌پاسخ", unanswered, [
    { h: "سؤال", get: (x) => itemText(x, ["question", "text", "title"]) },
    { h: "موضوع مرتبط", get: (x) => x?.relatedTopic },
    { h: "پاسخ‌دهنده مورد انتظار", get: (x) => x?.expectedResponder },
    { h: "اهمیت", get: (x) => x?.importance }
  ]);

  table("موارد جلسه بعد", nextAgenda, [
    { h: "موضوع جلسه بعد", get: (x) => itemText(x, ["topic", "text", "title"]) },
    { h: "هدف", get: (x) => x?.objective },
    { h: "مستندات یا داده موردنیاز", get: (x) => x?.requiredInfo },
    { h: "افراد یا تیم‌های موردنیاز", get: (x) => x?.preparedBy || x?.owner }
  ]);
  const finalText = data.finalSummary && String(data.finalSummary).trim();
  if (finalText && finalText !== String(data.executiveSummary || data.summary || "").trim()) {
    add("جمع‌بندی نهایی", finalText);
  }

  const unclear = asItems(coverage.unclearSections).filter(Boolean);
  const lowConf = asItems(coverage.lowConfidenceItems).filter(Boolean);
  if (unclear.length || lowConf.length) {
    add("نکات کیفیت متن", [
      unclear.length ? `* **بخش‌های مبهم یا کم‌کیفیت متن:** ${unclear.join("، ")}` : "",
      lowConf.length ? `* **مواردی که با اطمینان کامل قابل استخراج نبودند:** ${lowConf.join("، ")}` : ""
    ].filter(Boolean).join("\n"));
  }

  const body = sections
    .map((sec, index) => `## ${faNum(index + 1)}. ${sec.title}\n\n${sec.body}`)
    .join("\n\n");

  const footer = [
    omitted.length ? `**موارد مطرح‌نشده در این جلسه:** ${omitted.join("، ")}.` : "",
    `این صورت‌جلسه براساس متن ثبت‌شده و قالب «${value(template?.name)}» تهیه شده است. هیچ نام، عدد، تاریخ، تصمیم، مسئول یا ددلاینی حدس زده نشده است.`
  ].filter(Boolean).join("\n\n");

  return `# صورت‌جلسه\n\n${body}\n\n---\n${footer}`;
}

function validateAnalysisData(data, session) {
  if (!data || typeof data !== "object") throw new Error("مدل داده ساختاریافته برنگرداند.");
  const summary = String(data.executiveSummary || data.summary || "").trim();
  const finalSummary = String(data.finalSummary || "").trim();
  const topics = asItems(data.discussedTopics);
  const genericTopics = topics.filter((item) => /^موضوع\s*\d+$/i.test(itemText(item, ["topic", "title", "name"]).trim())).length;
  const durationMinutes = Math.max(1, Math.round(((session.updatedAt || Date.now()) - session.startedAt) / 60000));
  const transcriptChars = (session.transcript || []).reduce((sum, row) => sum + (row.text || "").length, 0);
  const tinyMeeting = transcriptChars < 2500;
  if (tinyMeeting) {
    const hasAnything = summary || finalSummary || topics.length || asItems(data.actions).length || asItems(data.decisions).length || asItems(data.usefulData).length;
    if (!hasAnything) throw new Error("متن ثبت‌شده این جلسه بسیار کوتاه بود و چیز قابل‌استخراجی نداشت؛ اگر جلسه واقعی بود، مطمئن شوید زیرنویس از ابتدای جلسه روشن بوده است.");
  } else {
    if (!summary || !topics.length) throw new Error("پاسخ مدل ناقص بود و خلاصه یا محورهای جلسه را نداشت.");
  }
  if (topics.length >= 3 && genericTopics / topics.length > 0.5) throw new Error("مدل برای محورهای جلسه عنوان معنادار تولید نکرد.");
  if (durationMinutes >= 30 && !tinyMeeting && summary.length < 280) throw new Error("خلاصه مدل برای یک جلسه طولانی بیش‌ازحد کوتاه بود.");
  return data;
}

const COMPREHENSIVE_MOM_SYSTEM_PROMPT = `شما تحلیل‌گر ارشد جلسات، مدیر پروژه و مسئول حرفه‌ای تهیه صورت‌جلسه هستید. ابتدا همه اطلاعات مهم را استخراج و طبقه‌بندی کنید و فقط پس از کنترل پوشش، JSON نهایی را بسازید. خروجی خلاصه کوتاه نیست؛ باید سندی جامع، دقیق، بی‌طرف، قابل استناد و قابل پیگیری به زبان فارسی باشد.

فقط JSON معتبر و بدون Markdown با این ساختار برگردانید:
{"meetingInfo":{"organizer":"","minuteTaker":"","participants":[],"absentees":[],"objective":"","customerProjectService":""},"executiveSummary":"","agendaTopics":[{"title":""}],"discussedTopics":[{"topic":"","type":"","relatedEntity":"","discussionSummary":"","incidents":[],"concern":"","response":"","impact":"","outcome":"","decision":"","action":"","unresolvedItems":[],"status":"","confidence":"قطعی|محتمل|مبهم","evidenceRefs":[1]}],"incidents":[{"incident":"","timeRange":"","relatedEntity":"","impact":"","cause":"","actionTaken":"","currentStatus":"","evidenceRefs":[1]}],"decisions":[{"decision":"","relatedTopic":"","rationale":"","approver":"","owner":"","deadline":"","status":"","evidenceRefs":[1],"confidence":"high|medium|low"}],"proposals":[{"proposal":"","proposer":"","rationale":"","benefits":"","concerns":"","status":"","evidenceRefs":[1]}],"actions":[{"text":"","expectedOutput":"","relatedTopic":"","owner":"","collaborators":"","dependencies":"","deadline":"","priority":"","status":"","evidenceRefs":[1],"confidence":"high|medium|low"}],"openItems":[{"topic":"","questionOrDecision":"","reason":"","requiredInfo":"","owner":"","reviewTime":"","evidenceRefs":[1],"confidence":"high|medium|low"}],"risks":[{"risk":"","source":"","impact":"","likelihoodSeverity":"","mitigation":"","owner":"","evidenceRefs":[1],"confidence":"high|medium|low"}],"disagreements":[{"topic":"","viewOne":"","viewTwo":"","status":"","decisionNeeded":"","evidenceRefs":[1]}],"usefulData":[{"category":"","label":"","value":"","unit":"","relatedTopic":"","confidence":"قطعی|محتمل|مبهم","description":"","evidenceRefs":[1]}],"entities":{"servicesProducts":[{"name":"","relatedTopic":"","keyPoint":""}],"organizations":[{"name":"","role":"","relatedTopic":""}],"technologies":[{"name":"","relation":"","issue":""}]},"unansweredQuestions":[{"question":"","relatedTopic":"","expectedResponder":"","importance":"","evidenceRefs":[1]}],"nextMeetingAgenda":[{"topic":"","objective":"","requiredInfo":"","preparedBy":""}],"finalSummary":"","coverageReport":{"topicCount":0,"incidentCount":0,"decisionCount":0,"proposalCount":0,"actionCount":0,"openItemCount":0,"numericDataCount":0,"identifiedServices":[],"unclearSections":[],"lowConfidenceItems":[]}}.

قواعد الزامی:
- احوال‌پرسی، خداحافظی، تعارف، تست صدا، مکث، تکیه‌کلام و گفت‌وگوی شخصی فاقد ارزش جلسه را وارد MoM نکنید؛ اما هیچ سابقه، عدد، مثال، استدلال یا نکته کاری را به‌دلیل محاوره‌ای بودن حذف نکنید.
- همه موضوعات مستقل، سرویس‌ها، مشتریان، رخدادها، اعداد، نام‌ها، نسخه‌ها، فناوری‌ها، IPها، اپراتورها، شهرها، SLAها و داده‌های فنی یا تجاری مهم را حفظ کنید؛ حتی اگر فقط یک‌بار یا پراکنده مطرح شده‌اند.
- موضوعات دارای سرویس، رخداد، علت، مسئول، اقدام، اثر تجاری یا ذی‌نفع متفاوت را ادغام نکنید. CDN، DNS، BGP، فیبر، پاپ‌سایت، اپراتور و رنج IP را مگر در صورت تصریح متن، موضوع‌های جدا بدانید.
- برای هر رخداد، زمان، موجودیت درگیر، اثر، علت قطعی یا احتمالی، اقدام انجام‌شده و وضعیت فعلی را در صورت وجود ثبت کنید. رخدادهای متفاوت را ترکیب نکنید.
- دیدگاه یا نارضایتی یک طرف و توضیح طرف مقابل را هر دو ثبت کنید. شدت مسئله را حفظ و لحن محاوره‌ای را حرفه‌ای کنید.
- پیشنهاد، احتمال، توضیح، تصمیم قطعی، تعهد، اقدام، موضوع باز، سؤال بی‌پاسخ، ریسک و اختلاف‌نظر را از هم جدا کنید. «بهتر است»، «شاید»، «بررسی کنیم» و عبارات مشابه تصمیم قطعی نیستند.
- اطلاعات قطعی، محتمل و مبهم را حذف نکنید؛ سطح اطمینان را ثبت کنید و بخش ناقص را قطعی جلوه ندهید.
- Never invent an owner, deadline, date, decision, number, participant, cause, rationale, or next step. مقدار ناموجود را رشته یا آرایه خالی بگذارید.
- تکرارهای تبدیل گفتار را ادغام کنید، اما کامل‌ترین نسخه و هر جزئیات تازه را نگه دارید. اولویت با پوشش کامل و قابلیت پیگیری است، نه کوتاهی خروجی.
- agendaTopics باید با discussedTopics تطابق کامل داشته باشد و تمام محورهای اصلی حداقل یک‌بار در executiveSummary نام برده شوند.
- برای هر موضوع، رخداد، تصمیم، پیشنهاد، اقدام، موضوع باز، ریسک، اختلاف، داده و سؤال فقط شماره T شاهد مستقیم را در evidenceRefs قرار دهید.
- متن ورودی حاصل تبدیل گفتار به متن است. تکرار، مکث و شکست جمله را حذف و پاسخ‌ها را با جمله‌بندی و نشانه‌گذاری حرفه‌ای بازنویسی کنید؛ اما فقط خطاهای کاملاً روشن را با اتکا به بافت اصلاح کنید. نام یا اصطلاح نامطمئن را حدس نزنید و در unclearSections ثبت کنید.
- متن خام را در خروجی کپی نکنید و عبارت‌های کلی مانند «موضوعاتی بررسی شد» را جایگزین شواهد مشخص نکنید. هر موضوع اصلی باید شرح منسجم، جزئیات مشخص، نتیجه و وضعیت خودش را داشته باشد.
- برای جلسه‌های بیش از ۳۰ دقیقه، executiveSummary باید ۴ تا ۸ پاراگراف محتوایی و ناظر به محورهای واقعی جلسه باشد؛ نه یک پاراگراف بسیار کوتاه. طول شرح موضوعات باید متناسب با اهمیت و حجم گفت‌وگو باشد.
- اگر نوع جلسه مصاحبه شغلی است، سابقه زمانی، نقش‌ها، دستاوردهای عددی، تجربه ساخت تیم و فرایند، روش فروش و حل مسئله، دانش کسب‌وکار، انگیزه تغییر، شرایط همکاری و مرحله بعد را جداگانه پوشش دهید. سؤال مصاحبه‌گر تصمیم یا اقدام نیست و توصیه استخدامی فقط در صورت بیان صریح مجاز است.
- در coverageReport شمارش واقعی آرایه‌ها، نام سرویس‌ها و موارد کم‌اطمینان یا ناشی از کیفیت پایین متن را گزارش کنید.`;

// ---------- افزوده‌های سوئیت ----------
function parseModelJson(raw, label = 'پاسخ مدل') {
  const normalized = String(raw || '').replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  try { return JSON.parse(normalized); }
  catch {
    const match = normalized.match(/\{[\s\S]*\}/);
    if (match) try { return JSON.parse(match[0]); } catch {}
  }
  throw new Error(`${label} JSON کامل و معتبری نبود؛ احتمالاً خروجی مدل نیمه‌کاره قطع شده است.`);
}

function meetingTypeHint(session) {
  const sample = asItems(session.transcript).map((row) => row.text).join(' ').slice(0, 80000);
  const interview = ['مصاحبه', 'سابقه', 'تجربه', 'رزومه', 'پوزیشن', 'حقوق', 'مرحله بعد', 'مدیر فروش'].filter((s) => sample.includes(s)).length;
  if (interview >= 4) return 'مصاحبه شغلی';
  const sales = ['مشتری', 'قرارداد', 'پیشنهاد قیمت', 'بودجه', 'دمو', 'فروش'].filter((s) => sample.includes(s)).length;
  return sales >= 4 ? 'جلسه فروش یا مذاکره تجاری' : 'جلسه عمومی';
}

function transcriptLine(session, row, index) {
  const startedAt = session.startedAt || 0;
  const seconds = Math.max(0, Math.round(((row.at || startedAt) - startedAt) / 1000));
  const stamp = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return `[T${index + 1} | ${stamp} | ${row.speaker || 'گوینده'}] ${row.text || ''}`;
}

// حاضرانِ جلسه را خودِ برنامه می‌داند (از تقویم و از نامِ گوینده‌های زیرنویس).
// نباید به حدسِ مدل واگذار شود: در استخراجِ تکه‌ای اصلاً فیلدی برای گوینده وجود ندارد،
// پس در جلسه‌های بلند نام‌ها پیش از نوشتنِ سند کاملاً از بین می‌رفتند.
function knownParticipants(session) {
  const out = new Map();
  for (const p of asItems(session?.participants)) {
    const name = String((p && (p.name || p)) || '').trim();
    if (name) out.set(name, (p && p.email) || '');
  }
  const counts = new Map();
  for (const row of asItems(session?.transcript)) {
    const name = String(row?.speaker || '').trim();
    if (!name || name === 'گوینده' || name === 'یادداشت') continue;
    counts.set(name, (counts.get(name) || 0) + 1);
    if (!out.has(name)) out.set(name, '');
  }
  return [...out.entries()].map(([name, email]) => ({ name, email, lines: counts.get(name) || 0 }));
}

function participantsBlock(session) {
  const list = knownParticipants(session);
  if (!list.length) return '';
  const names = list.map(p => p.email ? `${p.name} <${p.email}>` : p.name).join('، ');
  return `\nحاضران جلسه (قطعی — از تقویم و زیرنویس استخراج شده؛ همین‌ها را بنویس و کسی را جا نینداز): ${names}`;
}

function buildTranscriptText(session, maxChars = 120000) {
  const rows = asItems(session.transcript);
  let total = 0; const lines = [];
  for (let i = 0; i < rows.length; i++) {
    const line = transcriptLine(session, rows[i], i);
    if (total + line.length > maxChars) break;
    total += line.length + 1; lines.push(line);
  }
  return lines.join('\n');
}

// تکه‌تکه کردن متن برای استخراج دومرحله‌ای (منتقل‌شده از منشی)
function transcriptChunks(session, maxChars = 18000, overlapRows = 2) {
  const rows = asItems(session.transcript);
  const chunks = [];
  let start = 0;
  while (start < rows.length) {
    const lines = []; let total = 0; let end = start;
    while (end < rows.length) {
      const line = transcriptLine(session, rows[end], end);
      if (lines.length && total + line.length + 1 > maxChars) break;
      lines.push(line); total += line.length + 1; end += 1;
    }
    chunks.push({ index: chunks.length, startRef: start + 1, endRef: end, text: lines.join('\n') });
    if (end >= rows.length) break;
    start = Math.max(start + 1, end - Math.max(0, overlapRows));
  }
  return chunks;
}

// پرامپت استخراج هر بخش (مرحلهٔ اول، منتقل‌شده از منشی)
const CHUNK_EXTRACTION_PROMPT = `فقط بر اساس همین بخش از Transcript، داده‌های مهم را به فارسی و به شکل JSON معتبر استخراج کن. تکرار و تعارف را حذف کن، اما عدد، نام، استدلال و جزئیات کاری را نگه دار. تصمیم قطعی، پیشنهاد، اقدام، موضوع باز و سؤال را با هم اشتباه نگیر. هیچ Owner، Deadline، عدد یا نتیجه‌ای نساز. هر مورد باید evidenceRefs مستقیم از شناسه‌های T همین بخش داشته باشد.
ساختار خروجی:
{"topics":[{"topic":"","discussion":"","outcome":"","status":"","evidenceRefs":[1]}],"incidents":[{"incident":"","impact":"","cause":"","status":"","evidenceRefs":[1]}],"decisions":[{"decision":"","rationale":"","owner":"","deadline":"","evidenceRefs":[1]}],"proposals":[{"proposal":"","proposer":"","rationale":"","status":"","evidenceRefs":[1]}],"actions":[{"text":"","expectedOutput":"","owner":"","deadline":"","dependencies":"","evidenceRefs":[1]}],"openItems":[{"topic":"","questionOrDecision":"","reason":"","owner":"","reviewTime":"","evidenceRefs":[1]}],"risks":[{"risk":"","impact":"","mitigation":"","owner":"","evidenceRefs":[1]}],"usefulData":[{"label":"","value":"","unit":"","description":"","evidenceRefs":[1]}],"entities":[{"name":"","type":"person|organization|product|technology","relation":"","evidenceRefs":[1]}],"questions":[{"question":"","expectedResponder":"","evidenceRefs":[1]}],"unclearSections":[""]}`;

const EXTRACT_KEYS = ['topics', 'incidents', 'decisions', 'proposals', 'actions', 'openItems', 'risks', 'usefulData', 'entities', 'questions', 'unclearSections'];
function mergeExtracted(parts) {
  const out = {};
  for (const k of EXTRACT_KEYS) out[k] = [];
  for (const part of parts) for (const k of EXTRACT_KEYS) if (Array.isArray(part?.[k])) out[k].push(...part[k]);
  return out;
}

function buildFinalPrompt(session, template, extracted) {
  const durationMinutes = Math.max(1, Math.round(((session.updatedAt || Date.now()) - session.startedAt) / 60000));
  return `عنوان جلسه: ${session.title || 'جلسه'}\nمدت تقریبی: ${durationMinutes} دقیقه\nنوع احتمالی جلسه: ${meetingTypeHint(session)}${participantsBlock(session)}\nقالب انتخابی: ${template.name}\nدستور قالب: ${template.instructions || ''}\n\nاین داده‌ها در مرحلهٔ اول از تمام بخش‌های Transcript استخراج شده‌اند. موارد تکراری را ادغام کن، تناقض‌ها را نگه دار، evidenceRefs را حفظ کن و Schema جامع را کامل کن:\n${JSON.stringify(extracted)}`;
}

// پارس تدریجیِ JSON نیمه‌کاره برای پیش‌نمایش زنده (ترمیم رشته/براکت باز)
function parsePartialJson(raw) {
  let s = String(raw || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = s.indexOf('{');
  if (start < 0) return null;
  s = s.slice(start);
  try { return JSON.parse(s); } catch { /* ادامه: ترمیم */ }
  let repaired = s.replace(/,\s*$/, '');
  const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quotes % 2 !== 0) repaired += '"';
  const stack = [];
  let inStr = false, esc = false;
  for (const ch of repaired) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  while (stack.length) repaired += stack.pop() === '{' ? '}' : ']';
  try { return JSON.parse(repaired); } catch { return null; }
}

function cleanMarkdown(raw) {
  return String(raw || '').replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// استخراج اقدام‌ها از جدولِ «## اقدامات» در خروجی Markdown قالب freeform
function parseActionsFromMarkdown(md) {
  const lines = String(md || '').split('\n');
  const out = [];
  let inActions = false, afterSep = false;
  for (const line of lines) {
    if (/^#{1,3}\s+اقدام/.test(line)) { inActions = true; afterSep = false; continue; }
    if (inActions && /^#{1,3}\s+/.test(line)) break; // بخش بعدی
    if (!inActions) continue;
    if (/^\s*\|/.test(line)) {
      if (/^\s*\|(?:\s*:?-{2,}:?\s*\|?)+\s*$/.test(line)) { afterSep = true; continue; }
      if (!afterSep) continue; // ردیف سرستون
      const cells = line.split('|').slice(1, -1).map(c => c.trim().replace(/\\\|/g, '|'));
      const text = cells[0] || '';
      if (!text || /^-+$/.test(text)) continue;
      const clean = v => (/مشخص نشده|—|-{2,}/.test(v || '') ? '' : (v || ''));
      out.push({ text, owner: clean(cells[1]), deadline: clean(cells[2]) });
    }
  }
  return normalizeActions(out);
}

// آستانهٔ تک‌مرحله‌ای؛ زیر این حجم یک‌مرحله‌ای، بالای آن دومرحله‌ای
const SINGLE_PASS_LIMIT = 14000;

// تحلیل روی پروفایل AI فعالِ سوئیت. متن کوتاه = یک‌مرحله‌ای؛ متن بلند = استخراج دومرحله‌ای chunked.
// onDoc(partialData): با پیش‌نمایش زندهٔ سند حین تولید صدا زده می‌شود (مرحلهٔ نهاییِ استریم).
async function analyzeSession(session, settings, template = { name: 'صورت‌جلسه جامع', instructions: '' }, { onProgress = () => {}, onDoc = null, profileId = '' } = {}) {
  if (!AI.configured(settings)) throw new Error('اتصال هوش مصنوعی کامل نشده است');
  // انتخاب مدل: overrideِ صفحهٔ جلسه، وگرنه پروفایل فعال
  const chosen = profileId && Array.isArray(settings.aiProfiles) ? settings.aiProfiles.find(p => p.id === profileId) : null;
  const profile = chosen || AI.activeProfile(settings);
  // مدل جدا برای استخراج (ارزان‌تر) در صورت تعیین
  const extractProfile = profile.extractModel ? { ...profile, model: profile.extractModel } : profile;
  const modelLabel = profile ? `${profile.name} · ${profile.model}${profile.extractModel ? ` (استخراج: ${profile.extractModel})` : ''}` : '';
  const rows = asItems(session.transcript);
  if (!rows.length) throw new Error('این جلسه متنی برای تحلیل ندارد');
  const durationMinutes = Math.max(1, Math.round(((session.updatedAt || Date.now()) - session.startedAt) / 60000));
  const transcriptChars = rows.reduce((sum, r) => sum + (r.text || '').length, 0);

  // تجمیع مصرف توکن
  const usage = { prompt: 0, completion: 0, total: 0, requests: 0 };
  const addUsage = u => {
    if (!u) return;
    const p = u.prompt_tokens || 0, c = u.completion_tokens || 0;
    usage.prompt += p; usage.completion += c;
    usage.total += u.total_tokens || (p + c); usage.requests += 1;
  };

  // ── قالب freeform (خروجی مستقیم Markdown، مثل «استاندارد رایج» و «رسمی») ──
  if (template.mode === 'freeform' && template.systemPrompt) {
    const head = `${session.title ? `عنوان جلسه: ${session.title}\n` : ''}تاریخ: ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(session.startedAt)}\nمدت تقریبی: ${durationMinutes} دقیقه${participantsBlock(session)}`;
    let userMsg;
    if (transcriptChars <= SINGLE_PASS_LIMIT) {
      onProgress({ phase: 'final', index: 1, total: 1 });
      userMsg = `${head}\n\nمتن جلسه:\n${buildTranscriptText(session)}`;
    } else {
      // جلسهٔ بلند را نمی‌شود یک‌جا فرستاد؛ سرویس با خطای اندازه یا سقفِ مصرف
      // (۴۰۲/۴۱۳/۴۲۹) ردش می‌کند. مثل مسیر ساختاریافته اول تکه‌تکه استخراج می‌کنیم.
      const chunks = transcriptChunks(session);
      const parts = [];
      for (const chunk of chunks) {
        onProgress({ phase: 'extract', index: chunk.index + 1, total: chunks.length });
        const text = await AI.chatWith(extractProfile, [
          { role: 'system', content: CHUNK_EXTRACTION_PROMPT },
          { role: 'user', content: `عنوان جلسه: ${session.title || 'جلسه'}\nنوع احتمالی جلسه: ${meetingTypeHint(session)}\nمحدودهٔ شواهد: T${chunk.startRef} تا T${chunk.endRef}\n\n${chunk.text}` }
        ], { maxTokens: 4000, onUsage: addUsage });
        parts.push(parseModelJson(text, `استخراج بخش ${chunk.index + 1}`));
      }
      onProgress({ phase: 'final', index: chunks.length, total: chunks.length });
      userMsg = `${head}\n\nدادهٔ زیر از تمام بخش‌های همین جلسه استخراج شده است. فقط بر اساس آن بنویس و چیزی به آن اضافه نکن:\n${JSON.stringify(mergeExtracted(parts))}`;
    }
    const messages = [{ role: 'system', content: template.systemPrompt }, { role: 'user', content: userMsg }];
    let out;
    if (onDoc) out = await AI.chatStreamWith(profile, messages, { maxTokens: 4000, onUsage: addUsage, onDelta: full => onDoc(cleanMarkdown(full)) });
    else out = await AI.chatWith(profile, messages, { maxTokens: 4000, onUsage: addUsage });
    const summary = cleanMarkdown(out);
    if (summary.length < 50) throw new Error('خروجی صورت‌جلسه بسیار کوتاه بود؛ شاید متن جلسه کافی نبود.');
    return { summary, actions: parseActionsFromMarkdown(summary), data: null, model: modelLabel, usage };
  }

  let finalUser;
  if (transcriptChars <= SINGLE_PASS_LIMIT) {
    onProgress({ phase: 'final', index: 1, total: 1 });
    finalUser = `عنوان جلسه: ${session.title || 'جلسه'}\nمدت تقریبی: ${durationMinutes} دقیقه\nنوع احتمالی جلسه: ${meetingTypeHint(session)}${participantsBlock(session)}\nقالب انتخابی: ${template.name}${template.instructions ? `\nدستور قالب: ${template.instructions}` : ''}\n\nمتن جلسه (هر خط با شناسهٔ T و نام گوینده — در evidenceRefs همین شماره‌ها را بیاور):\n${buildTranscriptText(session)}`;
  } else {
    const chunks = transcriptChunks(session);
    const parts = [];
    for (const chunk of chunks) {
      onProgress({ phase: 'extract', index: chunk.index + 1, total: chunks.length });
      const text = await AI.chatWith(extractProfile, [
        { role: 'system', content: CHUNK_EXTRACTION_PROMPT },
        { role: 'user', content: `عنوان جلسه: ${session.title || 'جلسه'}\nنوع احتمالی جلسه: ${meetingTypeHint(session)}\nمحدودهٔ شواهد: T${chunk.startRef} تا T${chunk.endRef}\n\n${chunk.text}` }
      ], { maxTokens: 4000, onUsage: addUsage });
      parts.push(parseModelJson(text, `استخراج بخش ${chunk.index + 1}`));
    }
    onProgress({ phase: 'final', index: chunks.length, total: chunks.length });
    finalUser = buildFinalPrompt(session, template, mergeExtracted(parts));
  }

  const finalMessages = [
    { role: 'system', content: COMPREHENSIVE_MOM_SYSTEM_PROMPT },
    { role: 'user', content: finalUser }
  ];
  let text;
  if (onDoc) {
    // مرحلهٔ نهاییِ استریم + پیش‌نمایش زنده
    text = await AI.chatStreamWith(profile, finalMessages, {
      maxTokens: 8000, onUsage: addUsage,
      onDelta: (full) => { const partial = parsePartialJson(full); if (partial) onDoc(formatMomDocument(partial, session, template)); }
    });
  } else {
    text = await AI.chatWith(profile, finalMessages, { maxTokens: 8000, onUsage: addUsage });
  }
  const data = parseModelJson(text, 'صورت‌جلسه نهایی');

  validateAnalysisData(data, session);
  return { summary: formatMomDocument(data, session, template), actions: normalizeActions(data.actions), data, model: modelLabel, usage };
}

// پرامپت قالب «استاندارد رایج» (freeform؛ خروجی مستقیم Markdown، نه JSON)
const CONCISE_MOM_PROMPT = `متن زیر، پیاده‌سازی کامل یک جلسه کاری است. بر اساس همین متن، یک صورت‌جلسه حرفه‌ای، خلاصه و قابل‌استفاده تهیه کن.

## اصول مهم
- فقط بر اساس متن جلسه بنویس و هیچ نام، عدد، تصمیم، مسئول یا ددلاینی را حدس نزن.
- احوال‌پرسی، شوخی، تکرار، مکالمات نامرتبط و جزئیات کم‌اهمیت را حذف کن.
- نکات مهم را بیش از حد خلاصه نکن؛ اطلاعات مالی، قراردادی، عملیاتی و تصمیم‌های مهم باید حفظ شوند.
- بین «تصمیم قطعی»، «موضوع موردبحث»، «پیشنهاد» و «موضوع باز» تفاوت قائل شو.
- اگر درباره موضوعی تصمیم نهایی گرفته نشده، آن را به‌عنوان «موضوع باز» یا «نیازمند تعیین تکلیف» ثبت کن.
- اگر مسئول یا مهلت اقدام در متن مشخص نیست، بنویس «مشخص نشده».
- از تکرار یک موضوع در بخش‌های مختلف خودداری کن.
- لحن خروجی رسمی، شفاف، انسانی و مدیریتی باشد.
- خروجی را کوتاه و کاربردی نگه دار؛ معمولاً بین ۵۰۰ تا ۸۰۰ کلمه.
- فقط برای بخش اقدامات از جدول استفاده کن و جدول حداکثر ۵ ستون داشته باشد.

## ساختار خروجی (دقیقاً همین ساختار Markdown را رعایت کن)
# صورت‌جلسه
**عنوان جلسه:**
**تاریخ:**
**حاضرین:** فقط اسامی قابل تشخیص از متن

## خلاصه جلسه
در یک یا دو پاراگراف کوتاه: جلسه درباره چه بود؟ مهم‌ترین نتیجه یا جهت‌گیری چه بود؟ چه موضوعاتی نیازمند پیگیری‌اند؟

## تصمیم‌های اصلی
فقط تصمیم‌های روشن و تأییدشده را بولت کن. اگر نبود بنویس: «تصمیم قطعی مشخصی در این بخش ثبت نشد.»

## اقدامات
فقط اقدامات مشخص و اجرایی را در یک جدول با همین ستون‌ها بیاور:
| اقدام | مسئول | مهلت | وضعیت یا توضیح |
| ----- | ----- | ---- | -------------- |
اقدامات مشابه را ادغام کن، بیشتر از ۸ اقدام ننویس، و «مشخص نشده» را برای مسئول/مهلت نامشخص بگذار.

## موضوعات باز
موضوعات مطرح‌شده بدون تصمیم نهایی را بولت کن.

## ریسک‌ها و موانع
فقط ریسک‌ها یا موانعی که مستقیماً از متن قابل برداشت‌اند را بولت کن.

## جمع‌بندی
در یک پاراگراف، اولویت‌های بعد از جلسه و مهم‌ترین موارد پیگیری.

کنترل نهایی: هیچ اطلاعاتی حدس زده نشده باشد؛ موضوع مهمی حذف نشده باشد؛ تصمیم قطعی با پیشنهاد اشتباه نشده باشد؛ خروجی بیش از حد طولانی نباشد؛ جدول اضافی ساخته نشده باشد. فقط خروجی نهایی Markdown را بده، بدون توضیح اضافه.`;

// ---------- قالب‌های MoM ----------
// صورت‌جلسهٔ رسمی — بر پایهٔ چیزی که یک سندِ حاکمیتیِ قابل‌استناد لازم دارد
// (شناسنامه و شمارهٔ سند، حدنصاب، حاضر/غایب با عذر، تصویبِ صورت‌جلسهٔ قبل،
// شناسهٔ یکتا برای هر مصوبه و هر اقدام، جلسهٔ بعد، توزیع، و بلوکِ تأیید).
// هیچ‌کدام از قالب‌های موجود این‌ها را تولید نمی‌کردند.
// گزارش جلسه — روایتی و بدون هیچ جدولی.
// درخواستِ صریح کاربر: چیزی که مثل یک گزارش خوانده شود، نه شبکه‌ای از سلول‌ها.
const REPORT_MOM_PROMPT = `متن زیر پیاده‌سازی یک جلسه است. از رویش یک «گزارش جلسه» بنویس — چیزی که یک نفر بتواند از اول تا آخر بخواند و بفهمد در جلسه چه گذشت، بدون اینکه لازم باشد جدول بررسی کند.

## قواعد شکل
- **هیچ جدولی ننویس.** نه جدول Markdown، نه چیزی شبیه جدول با خط عمودی. اگر وسوسه شدی جدول بسازی، همان را به جملهٔ روان تبدیل کن.
- پاراگرافِ روان بنویس. فهرست فقط جایی که واقعاً فهرست است (مثل اقدام‌ها)، آن‌هم با خط تیره.
- زیرعنوان‌ها ساده و کم. سند باید مثل یادداشتِ یک همکارِ دقیق خوانده شود، نه فرم اداری.
- طول را از خودِ جلسه بگیر، نه از سقفی که در ذهن داری. تقریباً: نیم‌ساعته ۵۰۰ تا ۹۰۰ کلمه، یک‌ساعته ۹۰۰ تا ۱۸۰۰، دوساعته ۲۰۰۰ تا ۳۵۰۰، و جلسهٔ بلندتر به همین نسبت بیشتر. **سقفِ بالا ندارد**؛ اگر جلسه پرمحتوا بود، سند هم باید بلند باشد.
- کوتاه‌نویسی به قیمتِ افتادنِ یک موضوع، خطاست. ولی پرحرفی هم نه: هر بند باید چیزی به سند اضافه کند.
- عددها و تاریخ‌ها فارسی.

## قواعد محتوا (غیرقابل‌عبور)
- فقط از متن جلسه بنویس. هیچ نام، عدد، تصمیم، مسئول یا مهلتی را حدس نزن.
- چیزی که در متن نیست را ننویس؛ اگر لازم شد بگو «در جلسه مشخص نشد».
- تصمیمِ قطعی را از پیشنهاد و بحثِ باز جدا کن. «بهتر است» و «بررسی کنیم» تصمیم نیستند.
- احوال‌پرسی، شوخی و حاشیه را بینداز؛ ولی عدد، مبلغ، تاریخ و تعهد را هرگز.
- اگر بین دو نفر اختلاف‌نظر بود، هر دو دیدگاه را بنویس؛ طرفِ کسی را نگیر.
- **هیچ موضوعی را نینداز.** هر چیزی که در جلسه مطرح شد — حتی کوتاه — دست‌کم یک بند دارد. افتادنِ یک موضوع بدتر از طولانی‌شدنِ سند است.
- فقط «چه شد» را ننویس؛ «چرا» را هم بنویس. دغدغه، محدودیت و انگیزه‌ای که پشتِ حرف بود همان چیزی است که ماه‌ها بعد سند را قابل‌فهم نگه می‌دارد.
- عدد را با قیدش بیاور. اگر رقمی شفاهی، تقریبی یا منوط به بررسی بود، همان‌طور بنویسش — عددِ بی‌قید بعداً تعهد خوانده می‌شود.

## ساختار

# گزارش جلسه

اول حاضران: نامِ هر کس زیرِ سازمانِ خودش گروه شود، دقیقاً از فهرستی که در ورودی آمده و بدون جاانداختنِ کسی. اگر سازمان‌ها در متن معلوم نیست، همه را در یک فهرست بیاور.

بعد یک پاراگرافِ کوتاه: این جلسه دربارهٔ چه بود و مهم‌ترین چیزی که از آن بیرون آمد.

## چه گذشت
بدنهٔ گزارش. موضوع‌به‌موضوع، به‌صورت روایت. برای هر موضوع بگو چه مطرح شد، چه کسی چه نظری داشت، و به کجا رسید. اگر جلسه چند محور داشت، برای هرکدام یک زیرعنوان کوتاه با ### بگذار.

## نتیجه‌ها
آنچه قطعی شد، هرکدام در یک بند. اگر تصمیم‌گیرنده یا تاریخ اجرا در متن آمده، همان‌جا داخل جمله بیاور. اگر هیچ چیز قطعی نشد، صریح بنویس.

## کارهایی که ماند
هر اقدام یک خط با خط تیره: چه کاری، بر عهدهٔ چه کسی، تا چه زمانی. مسئول یا زمانِ نامعلوم را «مشخص نشد» بنویس. جدول نساز.

همهٔ تعهدها بیایند، نه فقط مهم‌ترین‌ها. «فلان قابلیت از تیم فنی استعلام شود» هم یک اقدام است.

## آنچه باز ماند
موضوع‌هایی که تصمیم‌گیری نشدند و دلیلش. اگر چیزی نبود، این بخش را ننویس.

## برای جلسهٔ بعد
فقط اگر در متن به جلسهٔ بعد یا موضوع‌های بعدی اشاره شده. اگر نشده، این بخش را ننویس.

---
اگر جایی از متن نامفهوم بود یا برداشتت مطمئن نبود، در یک خط انتهایی بنویس «نکتهٔ تنظیم‌کننده: …» تا بعداً بررسی شود.`;


const FORMAL_MOM_PROMPT = `متن زیر پیاده‌سازی یک جلسه است. از رویش یک «صورت‌جلسهٔ رسمی» بساز — سندی که بشود به آن استناد کرد، در بایگانی نگه داشت و جلسهٔ بعد رویش پیگیری کرد.

## اصول غیرقابل‌عبور
- فقط از متن جلسه بنویس. هیچ نام، سِمت، عدد، تاریخ، مصوبه، مسئول یا مهلتی را حدس نزن.
- هر چیزی که در متن نیست، دقیقاً بنویس «ثبت نشده». جای خالی را با حدس پر نکن.
- «تصمیم قطعی» را از «پیشنهاد»، «بررسی» و «موضوع باز» جدا کن. «بهتر است»، «شاید» و «بررسی کنیم» مصوبه نیستند.
- اگر چیزی مبهم یا نامفهوم بود، در بخش «موارد نیازمند تأیید» بیاور، نه اینکه تفسیرش کنی.
- لحن رسمی و بی‌طرف. نقلِ گفتگو نکن؛ جمع‌بندی کن.
- عددها و تاریخ‌ها را فارسی بنویس.

## ساختار خروجی (دقیقاً همین ترتیب و همین عنوان‌ها)

# صورت‌جلسه

## ۱. مشخصات سند
| | |
| --- | --- |
| عنوان جلسه | |
| نوع جلسه | (عادی / فوق‌العاده / کارگروه / بازبینی — اگر مشخص نیست: ثبت نشده) |
| تاریخ و ساعت | |
| محل برگزاری | |
| مدت | |
| تنظیم‌کننده | |
| وضعیت سند | پیش‌نویس |

## ۲. حاضران و غایبان
| ردیف | نام | سِمت یا نقش | وضعیت |
| ---: | --- | --- | --- |
وضعیت هرکس یکی از این‌هاست: حاضر / غایب با اطلاع / غایب / مهمان. فقط کسانی را بیاور که در متن نامشان آمده یا صحبت کرده‌اند.
پس از جدول، اگر در متن به رسمیت‌یافتن جلسه یا حدنصاب اشاره شده، در یک خط بنویس؛ وگرنه: «حدنصاب: ثبت نشده».

## ۳. دستور جلسه
موضوع‌های اصلی به‌صورت فهرست شماره‌دار. اگر دستور جلسه‌ای اعلام نشده، محورهای واقعیِ گفتگو را فهرست کن و زیرش بنویس «دستور جلسهٔ از پیش اعلام‌شده ثبت نشده».

## ۴. پیگیری مصوبات جلسهٔ قبل
اگر در متن به جلسهٔ قبل یا کارهای عقب‌مانده اشاره شده، هرکدام را با وضعیتش بیاور (انجام شد / در جریان / انجام نشد / منتفی). اگر اشاره‌ای نشده، فقط بنویس «موردی مطرح نشد».

## ۵. مذاکرات
برای هر موضوعِ دستور جلسه یک زیربخش با همان شماره:
### ۵‑۱. عنوان موضوع
- **طرح موضوع:** چه چیزی و از سوی چه کسی مطرح شد
- **بحث:** جمع‌بندیِ بی‌طرفِ دیدگاه‌ها، شامل مخالفت‌ها اگر بود
- **نتیجه:** مصوبه شد / به جلسهٔ بعد موکول شد / منتفی شد / نیازمند اطلاعات بیشتر

## ۶. مصوبات
| شناسه | مصوبه | مبنا یا دلیل | تصویب‌کننده | تاریخ اجرا |
| --- | --- | --- | --- | --- |
شناسه را به شکل «م‑۱»، «م‑۲» بده. فقط تصمیم‌های قطعی. اگر هیچ مصوبهٔ قطعی‌ای نبود، صریح بنویس «در این جلسه مصوبهٔ قطعی ثبت نشد».

## ۷. اقدامات
| شناسه | اقدام | مسئول | مهلت | خروجی مورد انتظار | وابستگی |
| --- | --- | --- | --- | --- | --- |
شناسه به شکل «ا‑۱»، «ا‑۲». هر اقدام باید فعلِ مشخص داشته باشد، نه عنوانِ کلی. مسئول یا مهلتِ نامعلوم را «تعیین نشده» بنویس.

## ۸. موضوعات باز
| موضوع | چه چیزی مانع تصمیم شد | چه اطلاعاتی لازم است | مسئول پیگیری |
| --- | --- | --- | --- |

## ۹. ریسک‌ها و هشدارها
فقط ریسک‌هایی که در جلسه مطرح شد، با اثر و اقدام کاهشی اگر گفته شد. اگر نبود: «موردی مطرح نشد».

## ۱۰. جلسهٔ بعد
تاریخ، ساعت، محل و موضوع‌های پیشنهادی — هرکدام که در متن آمده. اگر نیامده: «تعیین نشده».

## ۱۱. موارد نیازمند تأیید
هر جایی که متن نامفهوم بود، نام یا عددی مشکوک بود، یا برداشت دو پهلو داشت را اینجا فهرست کن تا تنظیم‌کننده پیش از نهایی‌سازی بررسی کند. اگر چیزی نبود: «موردی نیست».

---
**تنظیم‌کننده:** ثبت نشده  **تأییدکننده:** ثبت نشده  **تاریخ تأیید:** ثبت نشده
این صورت‌جلسه صرفاً از متنِ ثبت‌شدهٔ جلسه تهیه شده و تا زمان تأیید، پیش‌نویس است.`;


const BUILTIN_TEMPLATES = Object.freeze([
  { id: 'standard', name: 'صورت‌جلسهٔ استاندارد', description: 'MoM کامل و ۱۶بخشی', instructions: 'همه بخش‌های استاندارد را متوازن، رسمی و قابل‌پیگیری تکمیل کن.' },
  { id: 'formal', name: 'صورت‌جلسهٔ رسمی (استاندارد)', description: 'سندِ قابل‌استناد: مصوبه و اقدامِ شناسه‌دار، حاضر/غایب، جلسهٔ بعد، بلوک تأیید', mode: 'freeform', systemPrompt: FORMAL_MOM_PROMPT },
  { id: 'report', name: 'گزارش جلسه (بدون جدول)', description: 'روایتی و خوانا — پاراگراف به‌جای جدول', mode: 'freeform', systemPrompt: REPORT_MOM_PROMPT },
  { id: 'concise', name: 'استاندارد رایج (خلاصه)', description: 'کوتاه و کاربردی، ۵۰۰–۸۰۰ کلمه', mode: 'freeform', systemPrompt: CONCISE_MOM_PROMPT },
  { id: 'executive', name: 'گزارش مدیریتی', description: 'کوتاه و تصمیم‌محور', instructions: 'خلاصهٔ مدیریتی، تصمیم‌های قطعی، ریسک‌های کلیدی و اقدام‌های سطح‌بالا را برجسته کن و جزئیات کم‌اهمیت را کوتاه نگه دار.' },
  { id: 'standup', name: 'Stand-up تیم', description: 'پیشرفت، مانع و قدم بعد', instructions: 'تمرکز اصلی روی پیشرفت‌ها، موانع، وابستگی‌ها، Owner و قدم بعدی هر موضوع باشد.' },
  { id: 'sales', name: 'جلسهٔ فروش', description: 'نیاز، اعتراض و پیگیری', instructions: 'نیاز مشتری، مسئلهٔ اصلی، بودجه یا محدودیت، اعتراض‌ها، تعهدها، مرحلهٔ بعد و مسئول پیگیری را برجسته کن.' },
  { id: 'one-on-one', name: 'جلسهٔ یک‌به‌یک', description: 'بازخورد و تعهدها', instructions: 'بازخوردها، دغدغه‌ها، توافق‌های توسعه‌ای، حمایت موردنیاز و تعهدهای دو طرف را با لحن حرفه‌ای برجسته کن.' },
  { id: 'interview', name: 'مصاحبه و تحقیق', description: 'سابقه، شایستگی و شواهد', instructions: 'اگر جلسه مصاحبهٔ شغلی است، سابقهٔ نامزد، نقش‌ها، دستاوردهای عددی، روش حل مسئله، انگیزهٔ تغییر و مرحلهٔ بعد را موضوع‌های مستقل بدان. توصیهٔ استخدامی نساز مگر صریحاً بیان شده باشد.' }
]);
function customTemplates(value) {
  return Array.isArray(value) ? value.filter(x => x?.id && x?.name && x?.instructions).map(x => ({ id: String(x.id), name: String(x.name).slice(0, 60), description: String(x.description || 'قالب سفارشی').slice(0, 100), instructions: String(x.instructions).slice(0, 4000), custom: true })) : [];
}
function allTemplates(custom = []) { return [...BUILTIN_TEMPLATES, ...customTemplates(custom)]; }
function getTemplate(id, custom = []) { return allTemplates(custom).find(x => x.id === id) || BUILTIN_TEMPLATES[0]; }

globalThis.MeetNoteMoM = Object.freeze({ asItems, itemText, safeCell, normalizeActions, formatMomDocument, validateAnalysisData, COMPREHENSIVE_MOM_SYSTEM_PROMPT, CHUNK_EXTRACTION_PROMPT, parseModelJson, parsePartialJson, cleanMarkdown, parseActionsFromMarkdown, meetingTypeHint, knownParticipants, buildTranscriptText, transcriptChunks, mergeExtracted, buildFinalPrompt, analyzeSession, BUILTIN_TEMPLATES, customTemplates, allTemplates, getTemplate });
if (typeof module !== 'undefined') module.exports = globalThis.MeetNoteMoM;
})();
