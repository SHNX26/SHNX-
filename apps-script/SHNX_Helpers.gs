/**
 * ============================================================
 *  SHNX: دوال مساعدة لبوت التيليجرام (Google Apps Script)
 * ============================================================
 *  طريقة التركيب:
 *   1) افتح الشيت ← Extensions ← Apps Script
 *   2) أضف ملف جديد (+ ← Script) وسمّه SHNX_Helpers والصق هذا الكود كامل
 *   3) Project Settings (⚙️) ← Script Properties ← أضف:
 *        BOT_TOKEN   = توكن البوت من BotFather
 *        ADMIN_IDS   = رقم الـ chat id حقك (وأكثر من رقم مفصولة بفاصلة)
 *        CHANNEL_ID  = @shnx6   (لازم البوت يكون مشرف في القناة)
 *        SITE_URL    = https://shnx26.github.io/SHNX-/
 *   4) استخدم الدوال من كود البوت الحالي (أمثلة تحت)
 *
 *  ⚠️ لا تكتب التوكن داخل الكود. خلّه في Script Properties بس.
 *
 *  أمثلة داخل doPost حق البوت:
 *
 *    const chatId = update.message.chat.id;
 *    if (!shnxIsAdmin(chatId)) return;          // أي أحد غيرك يتجاهله البوت
 *
 *    // إضافة حلقة (+ نشر تلقائي في القناة):
 *    shnxAddEpisode('كحيلان', 8, 'https://ok.ru/videoembed/123');
 *
 *    // حلقة من موسم ثاني مع عنوان، بدون نشر في القناة:
 *    shnxAddEpisode('شباب البومب', 1, 'https://ok.ru/videoembed/456',
 *                   { season: 2, title: 'البداية', notify: false });
 *
 *    // إضافة مسلسل جديد:
 *    shnxAddSeries({ name: 'مسلسل جديد', cat: 'drama', year: '2026',
 *                    genre: 'دراما', img: 'https://...', desc: '...' });
 * ============================================================
 */

var SHNX = {
  SERIES_SHEET: 'Series',
  EPISODES_SHEET: 'Sheet1',
  DEFAULT_SITE: 'https://shnx26.github.io/SHNX-/'
};

function shnxProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

/** يرجع true لو الرقم من ضمن المشرفين في ADMIN_IDS */
function shnxIsAdmin(chatId) {
  var ids = shnxProp_('ADMIN_IDS').split(',').map(function (s) { return s.trim(); }).filter(String);
  return ids.indexOf(String(chatId)) !== -1;
}

function shnxSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('ما لقيت الورقة: ' + name);
  return sh;
}

/** يقرأ عناوين الأعمدة، ويضيف أي عمود ناقص في آخر الصف الأول */
function shnxHeaders_(sh, keys) {
  var lastCol = sh.getLastColumn();
  var headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  keys.forEach(function (k) {
    var exists = headers.some(function (h) { return h.toLowerCase() === k.toLowerCase(); });
    if (!exists) {
      headers.push(k);
      sh.getRange(1, headers.length).setValue(k);
    }
  });
  return headers;
}

/** يضيف صف حسب أسماء الأعمدة (ترتيب الأعمدة في الشيت ما يفرق) */
function shnxAppendRow_(sh, obj) {
  var keys = Object.keys(obj);
  var headers = shnxHeaders_(sh, keys);
  var row = headers.map(function (h) {
    for (var i = 0; i < keys.length; i++) if (keys[i].toLowerCase() === h.toLowerCase()) return obj[keys[i]];
    return '';
  });
  sh.appendRow(row);
}

/** التاريخ كنص ثابت (yyyy-MM-dd HH:mm) عشان الموقع يقرأه صح ويطلع شارة "حلقة جديدة" */
function shnxNow_() {
  return "'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

/**
 * إضافة حلقة لورقة الحلقات.
 * opts: { season: رقم الموسم, title: عنوان الحلقة, notify: false لإيقاف النشر في القناة }
 * لو أضفت نفس الحلقة مرة ثانية (مثلاً تصحيح الرابط) الموقع يعتمد آخر صف.
 */
function shnxAddEpisode(series, episode, link, opts) {
  opts = opts || {};
  var row = { series: String(series).trim(), episode: Number(episode), link: String(link).trim(), added_at: shnxNow_() };
  if (opts.season) row.season = Number(opts.season);
  if (opts.title) row.title = opts.title;
  shnxAppendRow_(shnxSheet_(SHNX.EPISODES_SHEET), row);
  if (opts.notify !== false) shnxNotifyChannel(row.series, row.episode, opts.season);
}

/**
 * إضافة مسلسل لورقة المسلسلات.
 * الحقول: name, cat, year, genre, img, desc
 * اختيارية: cover, badge, quality, total_eps, top, featured
 */
function shnxAddSeries(data) {
  if (!data || !data.name) throw new Error('اسم المسلسل مطلوب');
  shnxAppendRow_(shnxSheet_(SHNX.SERIES_SHEET), data);
}

/** يدوّر على بوستر المسلسل في ورقة المسلسلات (آخر صف بنفس الاسم) */
function shnxFindPoster_(series) {
  var sh = shnxSheet_(SHNX.SERIES_SHEET);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return '';
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var nameCol = headers.indexOf('name');
  var imgCol = headers.indexOf('img');
  if (nameCol === -1 || imgCol === -1) return '';
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][nameCol]).trim() === series) return String(values[r][imgCol]).trim();
  }
  return '';
}

/** ينشر في القناة: بوستر + زر يفتح الحلقة مباشرة في الموقع */
function shnxNotifyChannel(series, episode, season) {
  var token = shnxProp_('BOT_TOKEN');
  var channel = shnxProp_('CHANNEL_ID');
  if (!token || !channel) return;

  var site = shnxProp_('SITE_URL') || SHNX.DEFAULT_SITE;
  var ss = Number(season) || 1;
  var link = site + (site.indexOf('?') === -1 ? '?' : '&') +
    's=' + encodeURIComponent(series) + (ss !== 1 ? '&ss=' + ss : '') + '&e=' + episode;

  var caption = '🎬 نزلت الحلقة ' + episode + (ss !== 1 ? ' (الموسم ' + ss + ')' : '') +
    ' من «' + series + '»\n\n▶ شاهدها الآن على SHNX';
  var markup = JSON.stringify({ inline_keyboard: [[{ text: '▶ شاهد الحلقة', url: link }]] });
  var api = 'https://api.telegram.org/bot' + token + '/';
  var poster = shnxFindPoster_(series);

  if (poster) {
    var res = UrlFetchApp.fetch(api + 'sendPhoto', {
      method: 'post', muteHttpExceptions: true,
      payload: { chat_id: channel, photo: poster, caption: caption, reply_markup: markup }
    });
    if (res.getResponseCode() === 200) return;
  }
  UrlFetchApp.fetch(api + 'sendMessage', {
    method: 'post', muteHttpExceptions: true,
    payload: { chat_id: channel, text: caption + '\n' + link, reply_markup: markup }
  });
}

/** للتجربة: شغّلها من المحرر (Run) وتأكد إن المنشور وصل القناة */
function shnxTestNotify() {
  shnxNotifyChannel('كحيلان', 1);
}
