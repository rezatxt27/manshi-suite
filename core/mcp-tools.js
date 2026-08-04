// منشی — تعریفِ ابزارهای MCP، **منبعِ واحد**.
//
// هم سرور (mcp/manshi-mcp.js) از اینجا می‌خواند، هم راهنمای داخل تنظیمات.
// اگر دو جا نوشته می‌شد، دیر یا زود از هم می‌افتادند و کاربر راهنمای غلط می‌دید.
//
// هر ابزار دو توضیح دارد:
//   description — برای مدل؛ می‌گوید کِی صدایش بزند
//   faDesc      — برای آدم؛ در راهنمای تنظیمات دیده می‌شود
const MCPTools = (() => {

  const TOOLS = [
    {
      name: 'list_meetings',
      fa: 'فهرست جلسه‌ها',
      faDesc: 'عنوان، تاریخ و شرکت‌کننده‌ها را می‌دهد — بدون متن، پس سبک است.',
      writes: false,
      description: 'فهرست جلسه‌ها بدون متنشان. برای پیداکردنِ جلسه‌های بدون صورت‌جلسه '
        + 'از only_unanalyzed=true استفاده کن. متنِ جلسه را جداگانه با get_meeting بگیر '
        + '— هرگز همه را یکجا نخواه، چون هر جلسه ده‌ها هزار توکن است.',
      inputSchema: {
        type: 'object',
        properties: {
          only_unanalyzed: { type: 'boolean', description: 'فقط جلسه‌هایی که هنوز صورت‌جلسه ندارند' },
          limit: { type: 'number', description: 'چند تا (پیش‌فرض ۲۰)' },
          offset: { type: 'number', description: 'از چندمی به بعد' }
        }
      }
    },
    {
      name: 'get_meeting',
      fa: 'خواندن یک جلسه',
      faDesc: 'متن کاملِ یک جلسه. سنگین است — یکی‌یکی، نه دسته‌جمعی.',
      writes: false,
      description: 'یک جلسه با متن کاملش. شناسه را از list_meetings بگیر. '
        + 'پاسخ فیلدِ minutes_guide دارد: استانداردِ نگارشِ صورت‌جلسه در منشی. '
        + 'اگر قرار است صورت‌جلسه بنویسی، مو‌به‌مو از آن پیروی کن.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          template: { type: 'string', description: 'قالبِ صورت‌جلسه؛ فهرستش را از minutes_templates بگیر. پیش‌فرض: formal' }
        },
        required: ['id']
      }
    },
    {
      name: 'minutes_templates',
      fa: 'قالب‌های صورت‌جلسه',
      faDesc: 'همان قالب‌هایی که خودِ منشی دارد — رسمی، گزارشی، خلاصه و بقیه.',
      writes: false,
      description: 'قالب‌های صورت‌جلسهٔ منشی با شناسه و توضیح. '
        + 'اگر کاربر سبکِ خاصی خواست، شناسه‌اش را به get_meeting بده تا دستورِ همان قالب را بگیری.',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'list_tasks',
      fa: 'فهرست کارها',
      faDesc: 'کارهای باز، انجام‌شده، یا همه.',
      writes: false,
      description: 'کارها با امکان فیلتر وضعیت.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['open', 'done', 'all'] },
          limit: { type: 'number' }
        }
      }
    },
    {
      name: 'write_minutes',
      fa: 'ثبت صورت‌جلسه',
      faDesc: 'تنها ابزاری که می‌نویسد — و مستقیم ثبت نمی‌کند، در صفِ تأیید تو می‌گذارد.',
      writes: true,
      description: 'صورت‌جلسهٔ ساخته‌شده را برای یک جلسه در صف می‌گذارد. '
        + 'مستقیماً در منشی نمی‌نشیند: کاربر آن را در منشی می‌بیند و خودش تأیید می‌کند.\n'
        + 'قبل از صدا زدنِ این ابزار، get_meeting را بزن و minutes_guide آن را بخوان — '
        + 'خروجی باید سندی کامل و قابل استناد باشد، نه چکیدهٔ چندخطی. '
        + 'جلسهٔ یک‌ساعته معمولاً چند صفحه صورت‌جلسه دارد.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'شناسهٔ جلسه' },
          summary: {
            type: 'string',
            description: 'متنِ کاملِ صورت‌جلسه — فارسی، مارک‌داون، با تیتر و بخش‌بندی، '
              + 'طبقِ minutes_guide همان جلسه. تصمیم‌ها با دلیلشان، عددها، نام‌ها، '
              + 'موضوع‌های باز و اختلاف‌نظرها باید بیایند. چند خطِ کلی کافی نیست.'
          },
          actions: {
            type: 'array',
            description: 'کارهای بیرون‌آمده از جلسه — همهٔ تعهدها، نه فقط چندتای اول',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                owner: { type: 'string' },
                due: { type: 'string', description: 'YYYY-MM-DD میلادی، اگر معلوم است' }
              },
              required: ['text']
            }
          }
        },
        required: ['id']
      }
    },
    {
      name: 'inbox_status',
      fa: 'وضعیت صف',
      faDesc: 'چند صورت‌جلسه منتظر تأیید توست.',
      writes: false,
      description: 'چند صورت‌جلسه در صفِ تأیید منتظر است.',
      inputSchema: { type: 'object', properties: {} }
    }
  ];

  // جمله‌هایی که کاربر واقعاً می‌نویسد. لازم نیست نامِ ابزار را بلد باشد —
  // مدل خودش انتخاب می‌کند. ولی وقتی مدل راه را گم می‌کند، نام‌بردن کمک می‌کند.
  const EXAMPLES = [
    { want: 'ببینم چه جلسه‌هایی دارم',
      say: 'فهرست جلسه‌های من را نشان بده', uses: ['list_meetings'] },
    { want: 'بدانم کدام‌ها صورت‌جلسه ندارند',
      say: 'جلسه‌هایی که هنوز صورت‌جلسه ندارند را فهرست کن', uses: ['list_meetings'] },
    { want: 'متن یک جلسه را بخوانم',
      say: 'متن کامل جلسهٔ [عنوان جلسه] را بخوان و خلاصه کن', uses: ['list_meetings', 'get_meeting'] },
    { want: 'صورت‌جلسه بسازم',
      say: 'سه جلسهٔ بدون صورت‌جلسه را یکی‌یکی بخوان و طبق minutes_guide صورت‌جلسهٔ کامل بنویس و ثبت کن',
      uses: ['list_meetings', 'get_meeting', 'write_minutes'] },
    { want: 'سبکِ صورت‌جلسه را عوض کنم',
      say: 'قالب‌های صورت‌جلسه را نشان بده، بعد با قالبِ گزارشی برای جلسهٔ [عنوان] بنویس',
      uses: ['minutes_templates', 'get_meeting', 'write_minutes'] },
    { want: 'دنبال موضوعی بگردم',
      say: 'در جلسه‌هایم بگرد و بگو دربارهٔ [موضوع] چه تصمیمی گرفته شد',
      uses: ['list_meetings', 'get_meeting'] },
    { want: 'برای جلسه‌ای آماده شوم',
      say: 'جلسه‌ها و کارهای مربوط به [نام] را نگاه کن و برایم بریف بنویس',
      uses: ['list_meetings', 'get_meeting', 'list_tasks'] },
    { want: 'کارهایم را ببینم',
      say: 'کارهای بازم را نشان بده و اولویت‌بندی کن', uses: ['list_tasks'] },
    { want: 'ببینم چه چیزی در صف تأیید است',
      say: 'چند صورت‌جلسه منتظر تأیید من است؟', uses: ['inbox_status'] }
  ];

  const byName = n => TOOLS.find(t => t.name === n) || null;
  // آنچه سرور به مدل می‌دهد — بدون فیلدهای فارسیِ رابط
  const forServer = () => TOOLS.map(t => ({
    name: t.name, description: t.description, inputSchema: t.inputSchema
  }));

  return { TOOLS, EXAMPLES, byName, forServer };
})();

if (typeof module !== 'undefined') module.exports = MCPTools;
