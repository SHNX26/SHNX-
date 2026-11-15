/* ============================================================
   SHNX — الإعدادات والبيانات الاحتياطية
   ------------------------------------------------------------
   - SHNX_CONFIG: إعدادات الموقع (رقم الشيت، أسماء الأوراق، روابط).
   - SHNX_FALLBACK: بيانات احتياطية تظهر لو تعذّر الوصول للشيت.
     أي مسلسل أو حلقة موجودة في الشيت تتقدّم على اللي هنا،
     فتقدر تنقل كل شي للشيت وتفضّي هذي القوائم مع الوقت.
   ============================================================ */

window.SHNX_CONFIG = {
  sheetID: "1UChkTwIZFxkwV0vDepyNcWNe0Gb6eSbpDajdWX5mvOE",
  seriesSheet: "Series",
  episodesSheet: "Sheet1",
  telegramUrl: "https://t.me/shnx6",
  siteName: "SHNX",
  defaultImg: "https://i.ibb.co/hJTvQBRJ/20260216-133106.jpg",
  defaultQuality: "1080p HD",
  // كم يوم تبقى شارة "حلقة جديدة" ظاهرة (تحتاج عمود added_at في ورقة الحلقات)
  newBadgeDays: 3,
  // أقصى وقت انتظار للشيت قبل ما نعرض البيانات المحفوظة (بالملي ثانية)
  fetchTimeoutMs: 10000,
  // تحويل أسماء التصنيفات الإنجليزية (اللي يرسلها البوت) لأسماء عربية
  categoryMap: {
    trending: "رمضان 2026",
    comedy: "كوميديا",
    drama: "دراما",
    horror: "رعب",
    action: "أكشن",
    kids: "أطفال",
    shows: "برامج"
  }
};

window.SHNX_FALLBACK = {
  series: [
    { name: "شارع الأعشى 2", cat: "رمضان 2026", year: "2026", genre: "دراما اجتماعية", badge: "🇸🇦 إنتاج محلي", img: "https://i.ibb.co/hJTvQBRJ/20260216-133106.jpg", desc: "بعد نجاح الجزء الأول، تستمر الحكايات والصراعات في أزقة شارع الأعشى العريق، لتكشف عن أسرار جديدة ومواقف تحبس الأنفاس." },
    { name: "شباب البومب 14", cat: "رمضان 2026", year: "2026", genre: "كوميديا شبابية", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/CMQqZ9FF/20260222-143351.jpg", desc: "يعود عامر والعيال في موسم جديد مليء بالمواقف الكوميدية التي تعكس واقع الشباب وقضاياهم بأسلوب ساخر وخفيف." },
    { name: "جاك العلم 3", cat: "رمضان 2026", year: "2026", genre: "كوميديا عائلية", badge: "🇸🇦 إنتاج محلي", img: "https://i.ibb.co/KxnpLcmd/76ca87a1-5326-42e9-9af4-39592736f2f6.jpg", desc: "أبو صامل وأم صامل في مغامرات يومية لا تنتهي، ومفارقات مضحكة تسلط الضوء على الحياة الزوجية والمواقف العائلية الطريفة." },
    { name: "كحيلان", cat: "رمضان 2026", year: "2026", genre: "دراما بدوية", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/NfZXGXwB/20260216-144848.jpg", desc: "ملحمة بدوية درامية تحكي قصة الفارس الشجاع كحيلان، وصراعات القبائل على النفوذ والثأر في قلب الصحراء." },
    { name: "يوميات رجل متزوج", cat: "كوميديا", year: "2026", genre: "كوميديا لايت", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/gjYCZr94/ca44856a-bf4d-4ac9-8014-85e9e2e35a12.jpg", desc: "كوميديا خفيفة ترصد المعاناة اليومية لزوج يحاول الموازنة بين طلبات زوجته وضغوطات الحياة بأسلوب فكاهي." },
    { name: "الأم المتوحشة", cat: "دراما", year: "2026", genre: "دراما وتشويق", img: "https://i.postimg.cc/NMzv5RKn/medium-1770800302871-ji-Ht-Y.jpg", desc: "دراما اجتماعية قوية تسلط الضوء على تضحيات أم تضطر لاتخاذ قرارات قاسية وصعبة لحماية أبنائها من قسوة المجتمع." },
    { name: "رامز ليڤل", cat: "كوميديا", year: "2026", genre: "برامج مقالب", img: "https://i.postimg.cc/7Pj7wR7y/Picsart-26-02-16-15-20-13-051.jpg", desc: "مقالب رامز جلال تصل لمستوى جديد من الرعب والجنون، مع ضحايا جدد من نجوم الفن والرياضة." },
    { name: "عايله مايله", cat: "كوميديا", year: "2026", genre: "كوميديا", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/bwx16RsB/20260216-152905.jpg", desc: "عائلة غريبة الأطوار تواجه مشاكل الحياة بطرق غير تقليدية ومضحكة جداً." },
    { name: "حي الجراديه", cat: "دراما", year: "2026", genre: "دراما اجتماعية", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/sDRsS9nH/4b996360-453d-4c18-ac83-b7ca05f8c5c1.jpg", desc: "قصص وحكايات من قلب الحي القديم، ترصد التحولات الاجتماعية وصراعات الجيران." },
    { name: "غلط بنات", cat: "دراما", year: "2026", genre: "دراما شبابية", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/sxWJ3CgW/20260216-153050.jpg", desc: "قصص اجتماعية واقعية تناقش الأخطاء والتحديات التي تواجه الفتيات في مقتبل العمر." },
    { name: "بنات عبدالغني", cat: "دراما", year: "2026", genre: "دراما عائلية", img: "https://i.postimg.cc/x8FXbCjh/20260216-165829.jpg", desc: "صراع الإرث والسلطة بين شقيقات بعد وفاة والدهن الثري، لتنفتح أبواب الخلافات والأطماع." },
    { name: "الغميضه", cat: "دراما", year: "2026", genre: "جريمة وغموض", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/CL7WVqPm/images-2.jpg", desc: "جريمة غامضة تقلب حياة قرية هادئة رأساً على عقب، ويبدأ البحث عن الجاني بين الجميع." },
    { name: "عرس الجن", cat: "دراما", year: "2026", genre: "رعب وإثارة", img: "https://i.postimg.cc/BZ7nK1rw/medium-1770800624050-p-Dil-Z.jpg", desc: "غموض وتشويق يحيط بحفل زفاف يتحول إلى كابوس مرعب تتدخل فيه قوى خفية." },
    { name: "الحصة الأخيرة", cat: "كوميديا", year: "2026", genre: "برامج حوارية", badge: "🇸🇦 إنتاج محلي", img: "https://i.postimg.cc/2ySvhftX/20260222-125854.jpg", desc: "انضموا إلى هذا الفصل مع نجومكم المفضلين الذين يشاركون تجاربهم المدرسية لأول مرة ويأخذونكم في رحلة مليئة بالحنين إلى أيام الدراسة." }
  ],

  episodes: {
    "شارع الأعشى 2": { 1: "//ok.ru/videoembed/11875516092673?nochat=1", 2: "//ok.ru/videoembed/11875531297025?nochat=1", 3: "//ok.ru/videoembed/11946725675265?nochat=1", 4: "//ok.ru/videoembed/11946738258177?nochat=1", 5: "//ok.ru/videoembed/11971203698945?nochat=1", 6: "//ok.ru/videoembed/11989770440961?nochat=1", 7: "https://ok.ru/videoembed/12022189134081?nochat=1" },
    "شباب البومب 14": { 1: "//ok.ru/videoembed/11876854206721?nochat=1", 2: "//ok.ru/videoembed/11946814673153?nochat=1", 3: "//ok.ru/videoembed/11921735815425?nochat=1", 4: "//ok.ru/videoembed/11970378338561?nochat=1", 5: "//ok.ru/videoembed/11984369094913?nochat=1", 6: "https://ok.ru/videoembed/12022187626753?nochat=1" },
    "جاك العلم 3": { 1: "//ok.ru/videoembed/11876881666305?nochat=1", 2: "//ok.ru/videoembed/11973935173889?nochat=1", 3: "//ok.ru/videoembed/11946770305281?nochat=1", 4: "//ok.ru/videoembed/11970340262145?nochat=1", 5: "https://ok.ru/videoembed/12011138978049?nochat=1", 6: "https://ok.ru/videoembed/12022190051585?nochat=1" },
    "كحيلان": { 1: "//ok.ru/videoembed/11877259874561?nochat=1", 2: "//ok.ru/videoembed/11877271867649?nochat=1", 3: "//ok.ru/videoembed/11970915406081?nochat=1", 4: "//ok.ru/videoembed/11970925170945?nochat=1", 5: "//ok.ru/videoembed/11970940965121?nochat=1", 6: "//ok.ru/videoembed/11987720016129?nochat=1", 7: "https://ok.ru/videoembed/12022192673025?nochat=1" },
    "يوميات رجل متزوج": { 1: "//ok.ru/videoembed/11974492033281?nochat=1", 2: "//ok.ru/videoembed/11974505730305?nochat=1", 3: "//ok.ru/videoembed/11946786492673?nochat=1", 4: "//ok.ru/videoembed/11974558290177?nochat=1", 5: "//ok.ru/videoembed/11984286322945?nochat=1", 6: "https://ok.ru/videoembed/12017835249921?nochat=1" },
    "رامز ليڤل": { 1: "//ok.ru/videoembed/11971267989761?nochat=1", 2: "//ok.ru/videoembed/11971283194113?nochat=1", 3: "//ok.ru/videoembed/11971299053825?nochat=1", 4: "https://ok.ru/videoembed/12011033071873?nochat=1" },
    "عايله مايله": { 1: "//ok.ru/videoembed/11979021422849?nochat=1", 2: "//ok.ru/videoembed/11979031253249?nochat=1", 3: "//ok.ru/videoembed/11979041804545?nochat=1", 4: "//ok.ru/videoembed/11979051503873?nochat=1", 5: "//ok.ru/videoembed/11979064217857?nochat=1", 6: "https://ok.ru/videoembed/12011125805313?nochat=1" },
    "غلط بنات": { 1: "//ok.ru/videoembed/11877199253761?nochat=1", 2: "//ok.ru/videoembed/11877224485121?nochat=1", 3: "//ok.ru/videoembed/11946871099649?nochat=1", 4: "//ok.ru/videoembed/11970809237761?nochat=1", 5: "//ok.ru/videoembed/11970820575489?nochat=1", 6: "//ok.ru/videoembed/11978952544513?nochat=1", 7: "https://ok.ru/videoembed/12017848881409?nochat=1" },
    "بنات عبدالغني": { 1: "//ok.ru/videoembed/11877298606337?nochat=1", 2: "//ok.ru/videoembed/11877316169985?nochat=1", 3: "//ok.ru/videoembed/11971058536705?nochat=1", 4: "//ok.ru/videoembed/11971076493569?nochat=1", 5: "//ok.ru/videoembed/11971094909185?nochat=1", 6: "https://ok.ru/videoembed/12011148546305?nochat=1" },
    "الغميضه": { 1: "//ok.ru/videoembed/11877036003585?nochat=1", 2: "//ok.ru/videoembed/11877046817025?nochat=1", 3: "//ok.ru/videoembed/11946930475265?nochat=1", 4: "//ok.ru/videoembed/11970507247873?nochat=1", 5: "//ok.ru/videoembed/11973971480833?nochat=1", 6: "https://ok.ru/videoembed/12011156738305?nochat=1" },
    "الأم المتوحشة": { 1: "//ok.ru/videoembed/11877332291841?nochat=1", 2: "//ok.ru/videoembed/11877351166209?nochat=1" },
    "عرس الجن": { 1: "//ok.ru/videoembed/11877366698241?nochat=1", 2: "//ok.ru/videoembed/11877380395265?nochat=1" },
    "حي الجراديه": { 1: "//ok.ru/videoembed/11877090857217?nochat=1", 2: "//ok.ru/videoembed/11877113729281?nochat=1", 3: "//ok.ru/videoembed/11946884993281?nochat=1", 4: "//ok.ru/videoembed/11970692780289?nochat=1", 5: "//ok.ru/videoembed/11970709033217?nochat=1", 6: "//ok.ru/videoembed/11978994684161?nochat=1", 7: "https://ok.ru/videoembed/12017863233793?nochat=1" },
    "الحصة الأخيرة": { 1: "//ok.ru/videoembed/11877062807809?nochat=1", 2: "//ok.ru/videoembed/11970553516289?nochat=1", 3: "//ok.ru/videoembed/11970582679809?nochat=1", 4: "//ok.ru/videoembed/11970597818625?nochat=1", 5: "//ok.ru/videoembed/11984614199553?nochat=1", 6: "https://ok.ru/videoembed/12022191296769?nochat=1" }
  }
};
