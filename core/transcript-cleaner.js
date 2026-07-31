(() => {
  const normalize = (value = "") => String(value).replace(/[\u200c\u200f]/g, " ").replace(/\s+/g, " ").trim();
  const words = (value) => normalize(value).split(" ").filter(Boolean);

  function commonPrefixLength(a, b) {
    const limit = Math.min(a.length, b.length);
    let index = 0;
    while (index < limit && a[index] === b[index]) index += 1;
    return index;
  }

  function suffixPrefixOverlap(leftWords, rightWords) {
    const limit = Math.min(leftWords.length, rightWords.length, 40);
    for (let size = limit; size >= 4; size -= 1) {
      if (leftWords.slice(-size).join(" ") === rightWords.slice(0, size).join(" ")) return size;
    }
    return 0;
  }

  function orderedWordOverlap(leftWords, rightWords) {
    const left = leftWords.slice(0, 60);
    const right = rightWords.slice(0, 60);
    const scores = new Uint16Array(right.length + 1);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
      let diagonal = 0;
      for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        const above = scores[rightIndex];
        scores[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1] ? diagonal + 1 : Math.max(scores[rightIndex], scores[rightIndex - 1]);
        diagonal = above;
      }
    }
    return scores[right.length] / Math.max(1, Math.min(left.length, right.length));
  }

  // بلوکِ زیرنویسِ Meet متن را روی هم انباشته می‌کند، پس هر بروزرسانی با متنِ قبلی
  // شروع می‌شود و ادغام بی‌کران رشد می‌کند: در دادهٔ واقعی خطی با ۱۱٬۹۹۹ نویسه دیده شد
  // و ۷۵٪ کلِ متن در خطوطِ غول‌آسا حبس شده بود. نتیجه: ارجاعِ شواهد (T۱، T۲…) بی‌معنا
  // می‌شود، تکه‌بندیِ جلسه‌های بلند می‌شکند و نوبتِ گوینده‌ها قابل‌تفکیک نیست.
  // راهکار: ادغام دست‌نخورده می‌ماند و در پایان، نوبتِ بلند روی مرزِ جمله/کلمه شکسته می‌شود.
  const MAX_TURN_CHARS = 600;

  function splitLongTurn(row, cap) {
    const text = row.text || "";
    if (text.length <= cap) return [row];
    // اول روی مرزِ جمله، بعد روی مرزِ کلمه
    const pieces = [];
    let buffer = "";
    for (const sentence of text.split(/(?<=[.!?؟…])\s+/)) {
      for (const word of sentence.split(" ")) {
        if (buffer && buffer.length + word.length + 1 > cap) { pieces.push(buffer); buffer = ""; }
        buffer = buffer ? buffer + " " + word : word;
      }
      if (buffer.length >= cap * 0.6) { pieces.push(buffer); buffer = ""; }
    }
    if (buffer) pieces.push(buffer);
    return pieces.map((piece, index) => ({
      ...row, text: piece,
      ...(pieces.length > 1 ? { turnPart: index + 1, turnParts: pieces.length } : {})
    }));
  }

  // شمارهٔ خطِ اصلی روی هر تکه می‌ماند تا ارجاع‌های شاهد (T۱، T۲…) که پیش از
  // شکستن ساخته شده‌اند همچنان به خطِ درست برسند.
  function withSourceIndex(rows, cap) {
    const out = [];
    (Array.isArray(rows) ? rows : []).forEach((row, srcIndex) => {
      for (const piece of splitLongTurn(row, cap)) out.push({ ...piece, srcIndex });
    });
    return out;
  }

  function mergeCaptionText(previousText, nextText, elapsedMs = 0) {
    const previous = normalize(previousText);
    const next = normalize(nextText);
    if (!previous) return next || null;
    if (!next) return previous;
    if (previous === next) return previous;
    const shorter = Math.min(previous.length, next.length);
    const shortWindow = shorter < 20;
    if (shortWindow && elapsedMs > 15000) return null;
    if (next.startsWith(previous) || previous.startsWith(next)) return next.length >= previous.length ? next : previous;

    const prefix = commonPrefixLength(previous, next);
    const prefixRatio = prefix / shorter;
    if ((prefix >= 24 && prefixRatio >= 0.52) || (prefix >= 55 && prefixRatio >= 0.38)) return next.length >= previous.length ? next : previous;

    const previousWords = words(previous);
    const nextWords = words(next);
    if (Math.min(previousWords.length, nextWords.length) >= 4 && orderedWordOverlap(previousWords, nextWords) >= 0.72) return next.length >= previous.length ? next : previous;
    const overlap = suffixPrefixOverlap(previousWords, nextWords);
    if (overlap) return [...previousWords, ...nextWords.slice(overlap)].join(" ");
    return null;
  }

  function consolidate(rows = [], options = {}) {
    const result = [];
    const lastIndexBySpeaker = new Map();
    const maxRevisionGapMs = options.maxRevisionGapMs || 5 * 60 * 1000;
    for (const original of Array.isArray(rows) ? rows : []) {
      const text = normalize(original?.text);
      const speaker = normalize(original?.speaker) || "گوینده";
      if (!text || text.length === 1 || options.isSystemMessage?.(text) || options.isSystemMessage?.(speaker)) continue;
      const row = { ...original, speaker, text };
      const previousIndex = lastIndexBySpeaker.get(speaker);
      const previous = previousIndex === undefined ? null : result[previousIndex];
      const elapsed = previous ? Math.max(0, (row.at || 0) - (previous.updatedAt || previous.at || 0)) : Infinity;
      const merged = previous && elapsed <= maxRevisionGapMs ? mergeCaptionText(previous.text, row.text, elapsed) : null;
      if (merged !== null) {
        previous.text = merged;
        previous.updatedAt = Math.max(previous.updatedAt || previous.at || 0, row.updatedAt || row.at || 0);
      } else {
        lastIndexBySpeaker.set(speaker, result.length);
        result.push(row);
      }
    }
    // srcIndex = شمارهٔ نوبت پیش از شکستن — همان چیزی که ارجاع شاهد به آن اشاره می‌کند
    return withSourceIndex(result, options.maxTurnChars || MAX_TURN_CHARS);
  }

  // فقط شکستن، بدون ادغام — برای متنی که قبلاً ضبط و ادغام شده است.
  // ادغامِ دوباره خطرِ چسباندنِ دو نوبتِ جدا را دارد؛ اینجا لازم نیست.
  function splitTurns(rows = [], cap = MAX_TURN_CHARS) {
    return withSourceIndex(rows, cap);
  }

  globalThis.MeetNoteTranscript = Object.freeze({ normalize, mergeCaptionText, consolidate, splitTurns });
if (typeof module !== "undefined") module.exports = globalThis.MeetNoteTranscript;
})();
