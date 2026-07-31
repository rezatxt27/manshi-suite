// منشی سوئیت — کلاینت AI با چند پروفایل (BYOK، سازگار با هر درگاه OpenAI-compatible)
// متن فقط هنگام درخواست صریح کاربر و فقط به سرویس انتخابی خودش ارسال می‌شود.
const AIClient = (() => {
  // درگاه‌های آماده؛ baseUrl پیش‌فرض و مدل پیشنهادی
  const PROVIDERS = {
    openai:     { label: 'OpenAI',            baseUrl: 'https://api.openai.com',                                  model: 'gpt-4o-mini' },
    gemini:     { label: 'Gemini',            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
    grok:       { label: 'Grok (xAI)',        baseUrl: 'https://api.x.ai',                                        model: 'grok-2-latest' },
    deepseek:   { label: 'DeepSeek',          baseUrl: 'https://api.deepseek.com',                                model: 'deepseek-chat' },
    openrouter: { label: 'OpenRouter',        baseUrl: 'https://openrouter.ai/api/v1',                            model: '' },
    gapgpt:     { label: 'GapGPT (ایران)',    baseUrl: 'https://api.gapgpt.app/v1',                               model: 'gpt-4o-mini' },
    custom:     { label: 'دیگر (سازگار با OpenAI)', baseUrl: '',                                                  model: '' }
  };

  // پروفایل فعال از روی تنظیمات؛ با سازگاری عقب‌رو با فیلدهای تکیِ قدیمی
  function activeProfile(settings) {
    const profiles = Array.isArray(settings?.aiProfiles) ? settings.aiProfiles : [];
    if (profiles.length) {
      return profiles.find(p => p.id === settings.activeAiId) || profiles[0];
    }
    if (settings?.aiBaseUrl && settings?.aiKey && settings?.aiModel) {
      return { id: 'legacy', name: 'پیش‌فرض', provider: 'custom', baseUrl: settings.aiBaseUrl, key: settings.aiKey, model: settings.aiModel };
    }
    return null;
  }

  // متنِ کاملِ جلسه و کلید API از این آدرس عبور می‌کنند؛ روی http هر دو رمزنگاری‌نشده
  // می‌روند. فقط https پذیرفته است — مگر localhost که از دستگاه بیرون نمی‌رود
  // (برای مدل‌های محلی مثل Ollama).
  function secureEndpoint(baseUrl) {
    let u;
    try { u = new URL(String(baseUrl || '').trim()); } catch (_) { return false; }
    if (u.protocol === 'https:') return true;
    if (u.protocol !== 'http:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]' || u.hostname === '::1';
  }

  function profileReady(p) {
    return !!(p && p.baseUrl && p.key && p.model && secureEndpoint(p.baseUrl));
  }
  function configured(settings) {
    return profileReady(activeProfile(settings));
  }

  function endpointOf(baseUrl) {
    const base = String(baseUrl || '').replace(/\/+$/, '');
    if (base.endsWith('/chat/completions')) return base;
    if (/\/v\d|\/openai$/.test(base)) return base + '/chat/completions';
    return base + '/v1/chat/completions';
  }

  // بدنهٔ خطا ممکن است داده حساس داشته باشد، پس فقط از روی کد وضعیت راهنمایی می‌کنیم.
  // «خطای سرویس (۴۰۲)» به‌تنهایی به کاربر نمی‌گوید باید چه کار کند.
  const HTTP_HINT = {
    400: 'درخواست پذیرفته نشد — شاید متن جلسه برای این مدل بلند است. مدل دیگری انتخاب کن یا جلسه را کوتاه‌تر کن.',
    401: 'کلید API نامعتبر است — در تنظیمات بررسی‌اش کن.',
    402: 'اعتبار حساب سرویس تمام شده — باید در پنل همان سرویس شارژ کنی. (این خطا از سمت سرویس است، نه منشی.)',
    403: 'دسترسی این کلید به این مدل باز نیست.',
    404: 'این مدل روی این آدرس پیدا نشد — نام مدل و آدرس را بررسی کن.',
    413: 'متن جلسه برای یک درخواست بزرگ است — مدلی با ظرفیت بیشتر انتخاب کن.',
    429: 'سقف مصرف یا سرعت درخواست پر شده — چند دقیقه بعد دوباره امتحان کن.',
    500: 'خطای داخلی سرویس — کمی بعد دوباره امتحان کن.',
    502: 'سرویس در دسترس نیست — کمی بعد دوباره امتحان کن.',
    503: 'سرویس موقتاً در دسترس نیست — کمی بعد دوباره امتحان کن.'
  };
  const httpError = (status) => new Error(`خطای سرویس (${status})${HTTP_HINT[status] ? ' — ' + HTTP_HINT[status] : ''}`);

  async function chatWith(profile, messages, { maxTokens = 900, onUsage } = {}) {
    if (!profileReady(profile)) {
      throw new Error(profile && profile.baseUrl && !secureEndpoint(profile.baseUrl)
        ? 'آدرس سرویس باید https باشد — روی http متن جلسه و کلید API رمزنگاری‌نشده می‌روند.'
        : 'اتصال هوش مصنوعی کامل نشده است');
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      const res = await fetch(endpointOf(profile.baseUrl), {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${profile.key}` },
        body: JSON.stringify({ model: profile.model, messages, max_tokens: maxTokens })
      });
      if (!res.ok) throw httpError(res.status);
      const data = await res.json();
      if (onUsage && data.usage) onUsage(data.usage);
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('پاسخ خالی از سرویس');
      return text.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  // نسخهٔ استریم (SSE) — onDelta(fullTextSoFar, delta) با هر تکه صدا زده می‌شود
  async function chatStreamWith(profile, messages, { maxTokens = 8000, onDelta, onUsage } = {}) {
    if (!profileReady(profile)) {
      throw new Error(profile && profile.baseUrl && !secureEndpoint(profile.baseUrl)
        ? 'آدرس سرویس باید https باشد — روی http متن جلسه و کلید API رمزنگاری‌نشده می‌روند.'
        : 'اتصال هوش مصنوعی کامل نشده است');
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 180000);
    try {
      const res = await fetch(endpointOf(profile.baseUrl), {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${profile.key}` },
        body: JSON.stringify({ model: profile.model, messages, max_tokens: maxTokens, stream: true, stream_options: { include_usage: true } })
      });
      if (!res.ok) throw httpError(res.status);
      if (!res.body || !res.body.getReader) { // درگاهی که استریم نداد — غیراستریم
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        if (text && onDelta) onDelta(text, text);
        return text;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            if (json.usage && onUsage) onUsage(json.usage);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) { full += delta; if (onDelta) onDelta(full, delta); }
          } catch { /* خط ناقص SSE؛ نادیده */ }
        }
      }
      if (!full) throw new Error('پاسخ خالی از سرویس');
      return full.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  // با پروفایل فعالِ تنظیمات — همهٔ ماژول‌ها این را صدا می‌زنند (بدون تغییر call site)
  async function chat(settings, messages, opts) {
    return chatWith(activeProfile(settings), messages, opts);
  }
  async function chatStream(settings, messages, opts) {
    return chatStreamWith(activeProfile(settings), messages, opts);
  }
  async function testProfile(profile) {
    return chatWith(profile, [{ role: 'user', content: 'فقط بنویس: اتصال برقرار است' }], { maxTokens: 20 });
  }
  async function test(settings) {
    return testProfile(activeProfile(settings));
  }

  return { PROVIDERS, activeProfile, profileReady, secureEndpoint, configured, chat, chatWith, chatStream, chatStreamWith, test, testProfile };
})();

if (typeof module !== 'undefined') module.exports = AIClient;
