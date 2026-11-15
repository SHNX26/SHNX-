/* ============================================================
   SHNX — منطق الموقع
   ------------------------------------------------------------
   البيانات تنسحب من Google Sheets عن طريق opensheet.elk.sh:
     - ورقة المسلسلات (Series): name, cat, year, genre, img, desc
       أعمدة اختيارية: cover, badge, quality, total_eps, top, featured
     - ورقة الحلقات (Sheet1): series, episode, link
       أعمدة اختيارية: season, title, added_at
   التفاصيل الكاملة في README.md
   ============================================================ */
(function () {
  'use strict';

  const CFG = window.SHNX_CONFIG;
  const FALLBACK = window.SHNX_FALLBACK || { series: [], episodes: {} };
  const $ = (id) => document.getElementById(id);
  const DAY = 24 * 60 * 60 * 1000;

  /* ---------------- التخزين المحلي ---------------- */
  const KEYS = {
    mylist: 'shnx_mylist',
    progress: 'shnx_progress',
    watched: 'shnx_watched',
    cache: 'shnx_cache_v2',
    oldContinue: 'shnx_continue'
  };
  const store = {
    get(key, def) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* التخزين ممتلئ أو مقفل */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };

  /* ---------------- أدوات مساعدة ---------------- */
  const normName = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const normKey = (k) => String(k).toLowerCase().replace(/[\s_\-]/g, '');

  // توحيد الحروف العربية للبحث: "عايلة" تلقى "عايله"، و"ليفل" تلقى "ليڤل"
  const normSearch = (s) => String(s || '').toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ڤ/g, 'ف').replace(/گ/g, 'ك')
    .replace(/\s+/g, ' ').trim();

  // نقبل روابط http/https فقط (يمنع روابط javascript: وغيرها)
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (u.startsWith('//')) u = 'https:' + u;
    try {
      const p = new URL(u);
      if (p.protocol === 'http:') p.protocol = 'https:';
      return p.protocol === 'https:' ? p.href : '';
    } catch (e) { return ''; }
  }
  const bg = (u) => (u ? `url("${u}")` : 'none');

  function rowGetter(row) {
    const map = {};
    for (const k in row) map[normKey(k)] = row[k];
    return (...keys) => {
      for (const k of keys) {
        const v = map[normKey(k)];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };
  }

  // يفهم: 2026-11-15 10:30 ، 15/11/2026 10:30:00 ، 11/15/2026
  function parseDate(s) {
    if (!s) return null;
    s = String(s).trim();
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const a = +m[1], b = +m[2];
      const day = a > 12 ? a : (b > 12 ? b : a);
      const mon = a > 12 ? b : (b > 12 ? a : b);
      const t = new Date(+m[3], mon - 1, day, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
      return isNaN(t) ? null : t;
    }
    let t = Date.parse(s.replace(' ', 'T'));
    if (isNaN(t)) t = Date.parse(s);
    return isNaN(t) ? null : t;
  }

  function epsLabel(n) {
    if (n === 1) return 'حلقة واحدة';
    if (n === 2) return 'حلقتان';
    if (n >= 3 && n <= 10) return `${n} حلقات`;
    return `${n} حلقة`;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------------- قاعدة البيانات ---------------- */
  let DB = { list: [], byName: new Map(), eps: new Map(), latest: [] };

  const truthy = (v) => /^(1|yes|y|true|نعم|✓|✔|x)$/i.test(String(v || '').trim());

  function buildDB(seriesRows, epRows) {
    const byName = new Map();
    const list = [];
    const fbByName = new Map(FALLBACK.series.map((s) => [normName(s.name), s]));

    const finalize = (raw, fb) => {
      fb = fb || {};
      const pick = (k) => raw[k] || fb[k] || '';
      const rawCat = pick('cat');
      return {
        name: raw.name,
        cat: CFG.categoryMap[String(rawCat).toLowerCase()] || rawCat || 'عام',
        year: pick('year'),
        genre: pick('genre'),
        img: safeUrl(pick('img')),
        cover: safeUrl(pick('cover')),
        desc: pick('desc') || 'تفاصيل المسلسل غير متوفرة حالياً.',
        badge: pick('badge'),
        quality: pick('quality') || CFG.defaultQuality,
        total: parseInt(pick('total'), 10) || 0,
        top: parseInt(pick('top'), 10) || 0,
        featured: truthy(pick('featured'))
      };
    };

    // من الشيت: آخر صف = الأحدث، فنعكس الترتيب
    (seriesRows || []).slice().reverse().forEach((row) => {
      const g = rowGetter(row);
      const name = normName(g('name', 'الاسم', 'series'));
      if (!name || byName.has(name)) return;
      const s = finalize({
        name,
        cat: g('cat', 'category', 'التصنيف'),
        year: g('year', 'السنة'),
        genre: g('genre', 'النوع'),
        img: g('img', 'image', 'poster', 'الصورة'),
        cover: g('cover', 'backdrop', 'banner', 'الغلاف'),
        desc: g('desc', 'description', 'الوصف'),
        badge: g('badge', 'الشارة'),
        quality: g('quality', 'الجودة'),
        total: g('total_eps', 'total', 'episodes_count', 'عدد الحلقات'),
        top: g('top', 'rank', 'الترتيب'),
        featured: g('featured', 'مميز')
      }, fbByName.get(name));
      byName.set(name, s);
      list.push(s);
    });

    FALLBACK.series.forEach((fb) => {
      const name = normName(fb.name);
      if (byName.has(name)) return;
      const s = finalize(Object.assign({}, fb, { name }), null);
      byName.set(name, s);
      list.push(s);
    });

    // الحلقات: name -> { bySeason: Map(season -> Map(ep -> info)) }
    const eps = new Map();
    const put = (name, season, ep, link, extra) => {
      if (!eps.has(name)) eps.set(name, { bySeason: new Map() });
      const info = eps.get(name);
      if (!info.bySeason.has(season)) info.bySeason.set(season, new Map());
      info.bySeason.get(season).set(ep, Object.assign({ season, ep, link }, extra));
    };

    Object.keys(FALLBACK.episodes).forEach((n) => {
      const obj = FALLBACK.episodes[n];
      Object.keys(obj).forEach((ep) => {
        const link = safeUrl(obj[ep]);
        if (link) put(normName(n), 1, parseInt(ep, 10), link, { title: '', addedAt: null });
      });
    });

    const sheetEps = [];
    (epRows || []).forEach((row) => {
      const g = rowGetter(row);
      const name = normName(g('series', 'name', 'المسلسل'));
      const ep = parseInt(g('episode', 'ep', 'الحلقة'), 10);
      const link = safeUrl(g('link', 'url', 'الرابط'));
      if (!name || !ep || !link) return;
      const season = parseInt(g('season', 'الموسم'), 10) || 1;
      put(name, season, ep, link, {
        title: g('title', 'عنوان', 'اسم الحلقة'),
        addedAt: parseDate(g('added_at', 'date', 'timestamp', 'التاريخ'))
      });
      sheetEps.push({ name, season, ep });
    });

    // ترتيب المواسم + آخر تاريخ إضافة لكل مسلسل
    eps.forEach((info) => {
      info.seasons = [...info.bySeason.keys()].sort((a, b) => a - b);
      info.lastSeason = info.seasons[info.seasons.length - 1];
      info.ordered = [];
      info.latestAt = null;
      info.seasons.forEach((ss) => {
        [...info.bySeason.get(ss).keys()].sort((a, b) => a - b).forEach((e) => {
          const x = info.bySeason.get(ss).get(e);
          info.ordered.push(x);
          if (x.addedAt && (!info.latestAt || x.addedAt > info.latestAt)) info.latestAt = x.addedAt;
        });
      });
      info.count = info.ordered.length;
    });

    // أحدث الحلقات = آخر الصفوف في ورقة الحلقات
    const latest = [];
    const seen = new Set();
    for (let i = sheetEps.length - 1; i >= 0 && latest.length < 15; i--) {
      const x = sheetEps[i];
      if (seen.has(x.name) || !byName.has(x.name)) continue;
      seen.add(x.name);
      latest.push(x);
    }

    return { list, byName, eps, latest };
  }

  const getEps = (name) => DB.eps.get(name) || null;
  const epInfo = (name, season, ep) => {
    const info = getEps(name);
    const m = info && info.bySeason.get(season);
    return (m && m.get(ep)) || null;
  };
  const isNew = (s) => {
    const info = getEps(s.name);
    return !!(info && info.latestAt && Date.now() - info.latestAt < CFG.newBadgeDays * DAY);
  };
  const isNewEp = (e) => !!(e && e.addedAt && Date.now() - e.addedAt < CFG.newBadgeDays * DAY);

  /* ---------------- قائمتي / التقدم / المشاهدة ---------------- */
  const getMyList = () => { const v = store.get(KEYS.mylist, []); return Array.isArray(v) ? v : []; };
  const inMyList = (name) => getMyList().includes(name);
  function toggleMyList(name) {
    const list = getMyList();
    const i = list.indexOf(name);
    if (i === -1) { list.push(name); toast('انضاف لقائمتك ✓'); }
    else { list.splice(i, 1); toast('انحذف من قائمتك'); }
    store.set(KEYS.mylist, list);
    refreshMyListButtons();
    if (state.view === 'home') renderHomeRows();
    if (state.view === 'mylist') renderMyList();
  }

  function getProgress() {
    const p = store.get(KEYS.progress, null);
    if (p && typeof p === 'object') return p;
    // نقل "أكمل المشاهدة" من النسخة القديمة
    const fresh = {};
    const old = store.get(KEYS.oldContinue, null);
    if (old && old.name && old.ep) fresh[normName(old.name)] = { season: 1, ep: +old.ep, ts: Date.now() };
    store.set(KEYS.progress, fresh);
    store.del(KEYS.oldContinue);
    return fresh;
  }
  function saveProgress(name, season, ep) {
    const p = getProgress();
    p[name] = { season, ep, ts: Date.now() };
    store.set(KEYS.progress, p);
    const w = store.get(KEYS.watched, {});
    const k = `${season}-${ep}`;
    w[name] = Array.isArray(w[name]) ? w[name] : [];
    if (!w[name].includes(k)) w[name].push(k);
    store.set(KEYS.watched, w);
  }
  function removeProgress(name) {
    const p = getProgress();
    delete p[name];
    store.set(KEYS.progress, p);
    renderHomeRows();
  }
  const getWatched = (name) => {
    const w = store.get(KEYS.watched, {});
    return new Set(Array.isArray(w[name]) ? w[name] : []);
  };

  /* ---------------- الحالة والتنقل ---------------- */
  const state = {
    view: 'home',
    query: '',
    chip: '',
    details: null // { series, season, playing: {season, ep} | null }
  };

  function viewParams() {
    const p = new URLSearchParams();
    if (state.view !== 'home') p.set('v', state.view);
    if (state.view === 'browse' && state.query) p.set('q', state.query);
    if (state.view === 'browse' && state.chip) p.set('c', state.chip);
    return p;
  }
  function urlFor(p) {
    const qs = p.toString();
    return location.pathname + (qs ? `?${qs}` : '');
  }
  function detailsParams() {
    const p = viewParams();
    const d = state.details;
    if (d) {
      p.set('s', d.series.name);
      if (d.playing) {
        if (d.playing.season !== 1) p.set('ss', d.playing.season);
        p.set('e', d.playing.ep);
      }
    }
    return p;
  }
  const replaceURL = () => {
    try { history.replaceState(history.state, '', urlFor(state.details ? detailsParams() : viewParams())); } catch (e) { /* file:// */ }
  };

  function setView(view, opts) {
    opts = opts || {};
    if (!['home', 'browse', 'mylist'].includes(view)) view = 'home';
    state.view = view;
    $('view-home').hidden = view !== 'home';
    $('view-browse').hidden = view !== 'browse';
    $('view-mylist').hidden = view !== 'mylist';
    document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
    if (view === 'home') renderHome();
    if (view === 'browse') renderBrowse();
    if (view === 'mylist') renderMyList();
    if (!opts.keepScroll) window.scrollTo(0, 0);
    updateTopbar();
    if (!opts.noUrl) replaceURL();
  }

  function updateTopbar() {
    $('topbar').classList.toggle('solid', state.view !== 'home' || window.scrollY > 40);
  }

  /* ---------------- الكروت ---------------- */
  function posterEl(s, wide) {
    const p = el('div', 'poster');
    const src = wide ? (s.cover || s.img) : s.img;
    if (src) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.addEventListener('error', () => p.classList.add('noimg'));
      img.src = src;
      p.append(img);
    } else {
      p.classList.add('noimg');
    }
    p.append(el('div', 'poster-fallback', s.name));
    return p;
  }

  function cardEl(s, opts) {
    opts = opts || {};
    const b = el('button', 'card');
    b.type = 'button';
    b.setAttribute('aria-label', s.name);
    const p = posterEl(s, false);
    if (isNew(s)) p.append(el('span', 'badge badge-new', 'حلقة جديدة'));
    if (opts.epBadge) p.append(el('span', 'badge badge-ep', opts.epBadge));
    b.append(p, el('div', 'card-title', s.name));
    b.addEventListener('click', () => openDetails(s.name, opts.play ? { season: opts.play.season, ep: opts.play.ep } : {}));
    return b;
  }

  function topCardEl(s, rank) {
    const b = el('button', 'card top');
    b.type = 'button';
    b.setAttribute('aria-label', `${rank}. ${s.name}`);
    const body = el('div', 'top-body');
    const p = posterEl(s, false);
    if (isNew(s)) p.append(el('span', 'badge badge-new', 'حلقة جديدة'));
    body.append(p, el('div', 'card-title', s.name));
    b.append(el('span', 'rank', String(rank)), body);
    b.addEventListener('click', () => openDetails(s.name));
    return b;
  }

  function continueCardEl(s, prog, multiSeason) {
    const wrap = el('div', 'card wide');
    const hit = el('button', 'card-hit');
    hit.type = 'button';
    hit.style.cssText = 'display:block;width:100%;text-align:start;';
    hit.setAttribute('aria-label', `أكمل ${s.name} الحلقة ${prog.ep}`);
    const p = posterEl(s, true);
    const dot = el('div', 'play-dot');
    dot.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
    const info = el('div', 'wide-info');
    info.append(
      el('span', 'badge badge-new', (multiSeason ? `م${prog.season} • ` : '') + `الحلقة ${prog.ep}`),
      el('div', 'card-title', s.name)
    );
    info.firstChild.style.position = 'static';
    p.append(dot, info);
    hit.append(p);
    hit.addEventListener('click', () => openDetails(s.name, { season: prog.season, ep: prog.ep }));

    const rm = el('button', 'card-remove', '✕');
    rm.type = 'button';
    rm.setAttribute('aria-label', `إزالة ${s.name} من أكمل المشاهدة`);
    rm.addEventListener('click', (ev) => { ev.stopPropagation(); removeProgress(s.name); });

    wrap.append(hit, rm);
    return wrap;
  }

  function rowEl(title, cards) {
    const r = el('section', 'row');
    r.append(el('h2', 'row-title', title));
    const list = el('div', 'scroll-list');
    cards.forEach((c) => list.append(c));
    r.append(list);
    return r;
  }

  /* ---------------- الهيرو ---------------- */
  const hero = { items: [], idx: 0, timer: null };

  function pickHero() {
    const featured = DB.list.filter((s) => s.featured);
    if (featured.length) return featured.slice(0, 6);
    const withEps = DB.list.filter((s) => getEps(s.name));
    return (withEps.length ? withEps : DB.list).slice(0, 5);
  }

  function resumeTarget(s) {
    const info = getEps(s.name);
    if (!info || !info.count) return null;
    const prog = getProgress()[s.name];
    if (prog && epInfo(s.name, prog.season, prog.ep)) return { season: prog.season, ep: prog.ep, resume: true };
    const first = info.ordered[0];
    return { season: first.season, ep: first.ep, resume: false };
  }

  function renderHero() {
    const box = $('hero');
    box.innerHTML = '';
    clearInterval(hero.timer);
    hero.items = pickHero();
    hero.idx = 0;
    if (!hero.items.length) { box.hidden = true; return; }
    box.hidden = false;

    hero.items.forEach((s, i) => {
      const slide = el('div', 'hero-slide' + (i === 0 ? ' active' : ''));
      slide.style.backgroundImage = bg(s.cover || s.img);
      slide.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      const c = el('div', 'hero-content');
      if (isNew(s)) c.append(el('span', 'hero-badge', '🔴 حلقة جديدة'));
      c.append(el('h1', 'hero-title', s.name));
      const info = getEps(s.name);
      const meta = [s.genre, s.year, info && info.count ? epsLabel(info.count) : 'قريباً'].filter(Boolean).join(' • ');
      c.append(el('p', 'hero-meta', meta));
      if (s.desc) c.append(el('p', 'hero-desc', s.desc));

      const actions = el('div', 'hero-actions');
      const play = el('button', 'btn btn-primary');
      play.type = 'button';
      const target = resumeTarget(s);
      play.textContent = target ? (target.resume ? `▶ أكمل الحلقة ${target.ep}` : '▶ مشاهدة الآن') : 'ℹ التفاصيل';
      play.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openDetails(s.name, target ? { season: target.season, ep: target.ep } : {});
      });
      const my = el('button', 'btn btn-ghost');
      my.type = 'button';
      my.dataset.mylist = s.name;
      my.addEventListener('click', (ev) => { ev.stopPropagation(); toggleMyList(s.name); });
      actions.append(play, my);
      c.append(actions);
      slide.append(c);
      slide.addEventListener('click', () => openDetails(s.name));
      box.append(slide);
    });

    if (hero.items.length > 1) {
      const dots = el('div', 'hero-dots');
      hero.items.forEach((s, i) => {
        const d = el('button', i === 0 ? 'active' : '');
        d.type = 'button';
        d.setAttribute('aria-label', `عرض ${s.name}`);
        d.addEventListener('click', (ev) => { ev.stopPropagation(); showHero(i); restartHeroTimer(); });
        dots.append(d);
      });
      box.append(dots);
      restartHeroTimer();
    }
    refreshMyListButtons();
  }

  function showHero(i) {
    const n = hero.items.length;
    if (!n) return;
    hero.idx = (i + n) % n;
    const box = $('hero');
    box.querySelectorAll('.hero-slide').forEach((sl, j) => {
      sl.classList.toggle('active', j === hero.idx);
      sl.setAttribute('aria-hidden', j === hero.idx ? 'false' : 'true');
    });
    box.querySelectorAll('.hero-dots button').forEach((d, j) => d.classList.toggle('active', j === hero.idx));
  }
  function restartHeroTimer() {
    clearInterval(hero.timer);
    if (hero.items.length < 2) return;
    hero.timer = setInterval(() => {
      if (document.hidden || state.view !== 'home' || state.details) return;
      showHero(hero.idx + 1);
    }, 7000);
  }

  // السحب يمين/يسار على الهيرو
  (function heroSwipe() {
    const box = $('hero');
    let x0 = null, y0 = null;
    box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        // الاتجاه من اليمين لليسار: السحب لليمين = التالي
        showHero(hero.idx + (dx > 0 ? 1 : -1));
        restartHeroTimer();
      }
    }, { passive: true });
  })();

  /* ---------------- الرئيسية ---------------- */
  function renderHome() {
    renderHero();
    renderHomeRows();
  }

  function renderHomeRows() {
    const box = $('home-rows');
    box.innerHTML = '';

    // أكمل المشاهدة
    const prog = getProgress();
    const cont = Object.keys(prog)
      .filter((n) => DB.byName.has(n) && epInfo(n, prog[n].season, prog[n].ep))
      .sort((a, b) => (prog[b].ts || 0) - (prog[a].ts || 0))
      .slice(0, 12);
    if (cont.length) {
      box.append(rowEl('أكمل المشاهدة 🕒', cont.map((n) => {
        const info = getEps(n);
        return continueCardEl(DB.byName.get(n), prog[n], info && info.seasons.length > 1);
      })));
    }

    // أحدث الحلقات
    if (DB.latest.length) {
      box.append(rowEl('أحدث الحلقات 🔥', DB.latest.map((x) => {
        const info = getEps(x.name);
        const label = (info && info.seasons.length > 1 ? `م${x.season} • ` : '') + `الحلقة ${x.ep}`;
        return cardEl(DB.byName.get(x.name), { epBadge: label, play: x });
      })));
    }

    // الأكثر مشاهدة (عمود top في الشيت)
    const top = DB.list.filter((s) => s.top > 0).sort((a, b) => a.top - b.top).slice(0, 10);
    if (top.length) box.append(rowEl('الأكثر مشاهدة 🏆', top.map((s, i) => topCardEl(s, i + 1))));

    // قائمتي
    const my = getMyList().slice().reverse().map((n) => DB.byName.get(n)).filter(Boolean);
    if (my.length) box.append(rowEl('قائمتي 📌', my.map((s) => cardEl(s))));

    // التصنيفات
    const cats = [...new Set(DB.list.map((s) => s.cat))];
    cats.forEach((c) => {
      const items = DB.list.filter((s) => s.cat === c);
      box.append(rowEl(c, items.map((s) => cardEl(s))));
    });
  }

  /* ---------------- التصفح والبحث ---------------- */
  function renderBrowse() {
    const cats = [...new Set(DB.list.map((s) => s.cat))];
    if (state.chip && !cats.includes(state.chip)) state.chip = '';

    const chips = $('chips');
    chips.innerHTML = '';
    ['', ...cats].forEach((c) => {
      const b = el('button', 'chip' + (state.chip === c ? ' active' : ''), c || 'الكل');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', state.chip === c ? 'true' : 'false');
      b.addEventListener('click', () => { state.chip = c; renderBrowse(); replaceURL(); });
      chips.append(b);
    });

    const q = normSearch(state.query);
    const results = DB.list.filter((s) => {
      if (state.chip && s.cat !== state.chip) return false;
      if (!q) return true;
      return normSearch(`${s.name} ${s.genre} ${s.cat}`).includes(q);
    });

    $('browse-title').textContent = state.query ? `نتائج البحث عن "${state.query}"` : 'تصفّح';
    const grid = $('browse-grid');
    grid.innerHTML = '';
    results.forEach((s) => grid.append(cardEl(s)));
    $('browse-empty').hidden = results.length > 0;
  }

  function renderMyList() {
    const items = getMyList().slice().reverse().map((n) => DB.byName.get(n)).filter(Boolean);
    const grid = $('mylist-grid');
    grid.innerHTML = '';
    items.forEach((s) => grid.append(cardEl(s)));
    $('mylist-empty').hidden = items.length > 0;
  }

  function refreshMyListButtons() {
    document.querySelectorAll('[data-mylist]').forEach((b) => {
      const added = inMyList(b.dataset.mylist);
      b.textContent = added ? '✓ في قائمتي' : '＋ قائمتي';
      b.classList.toggle('added', added);
    });
  }

  /* ---------------- صفحة التفاصيل ---------------- */
  function openDetails(name, opts) {
    opts = opts || {};
    const s = DB.byName.get(normName(name));
    if (!s) { toast('المسلسل غير موجود'); return; }

    const wasOpen = !!state.details;
    const info = getEps(s.name);
    let season = opts.season && info && info.bySeason.has(opts.season) ? opts.season : null;
    if (!season) {
      const prog = getProgress()[s.name];
      season = prog && info && info.bySeason.has(prog.season) ? prog.season : (info ? info.lastSeason : 1);
    }
    state.details = { series: s, season, playing: null };

    stopVideo();
    const page = $('details');
    page.hidden = false;
    page.classList.remove('playing');
    page.scrollTop = 0;
    $('player').hidden = true;
    $('d-hero').hidden = false;
    document.body.classList.add('no-scroll', 'details-open');

    $('d-title').textContent = s.name;
    $('d-topbar-title').textContent = s.name;
    $('d-desc').textContent = s.desc;
    $('d-hero').style.backgroundImage = bg(s.cover || s.img);
    $('d-mylist').dataset.mylist = s.name;
    refreshMyListButtons();
    renderMeta();
    renderSeasonTabs();
    renderEpisodes();
    updatePlayButton();
    updateDetailsTopbar();
    document.title = `${s.name} | ${CFG.siteName}`;

    if (opts.push !== false) {
      try {
        if (wasOpen) history.replaceState({ shnx: 'details' }, '', urlFor(detailsParams()));
        else history.pushState({ shnx: 'details' }, '', urlFor(detailsParams()));
      } catch (e) { /* file:// */ }
    }

    if (opts.ep && epInfo(s.name, season, opts.ep)) {
      playEpisode(season, opts.ep);
    } else {
      // التمرير لآخر حلقة شاهدها المستخدم (مرة وحدة)
      const prog = getProgress()[s.name];
      if (prog && prog.season === season) {
        setTimeout(() => {
          const item = $(`ep-${season}-${prog.ep}`);
          if (item && state.details && !state.details.playing) item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      }
    }
    setTimeout(() => $('back-btn').focus({ preventScroll: true }), 50);
  }

  function renderMeta() {
    const s = state.details.series;
    const info = getEps(s.name);
    const meta = $('d-meta');
    meta.innerHTML = '';
    if (s.year) meta.append(el('span', 'meta-year', s.year));
    if (s.badge) meta.append(el('span', 'meta-tag gold', s.badge));
    if (s.genre) meta.append(el('span', 'meta-tag', s.genre));
    if (info && info.seasons.length > 1) meta.append(el('span', 'meta-tag', `${info.seasons.length} مواسم`));
    if (info && info.count) meta.append(el('span', 'meta-tag', epsLabel(info.count)));
    if (s.quality) meta.append(el('span', 'meta-tag outline', s.quality));
  }

  function renderSeasonTabs() {
    const d = state.details;
    const info = getEps(d.series.name);
    const box = $('season-tabs');
    box.innerHTML = '';
    if (!info || info.seasons.length < 2) return;
    info.seasons.forEach((ss) => {
      const b = el('button', 'chip' + (ss === d.season ? ' active' : ''), `الموسم ${ss}`);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', ss === d.season ? 'true' : 'false');
      b.addEventListener('click', () => { d.season = ss; renderSeasonTabs(); renderEpisodes(); });
      box.append(b);
    });
  }

  function renderEpisodes() {
    const d = state.details;
    const s = d.series;
    const info = getEps(s.name);
    const map = (info && info.bySeason.get(d.season)) || new Map();
    const nums = [...map.keys()];
    let maxEp = nums.length ? Math.max(...nums) : 0;
    if (s.total && (!info || d.season === info.lastSeason) && s.total > maxEp) maxEp = s.total;

    const box = $('d-episodes');
    box.innerHTML = '';
    if (!maxEp) {
      box.append(el('p', 'ep-empty', 'الحلقات قريباً... تابع قناتنا عشان يوصلك التنبيه 🔔'));
      return;
    }
    const watched = getWatched(s.name);
    for (let i = 1; i <= maxEp; i++) {
      const e = map.get(i);
      const b = el('button', 'ep-item');
      b.type = 'button';
      b.id = `ep-${d.season}-${i}`;
      b.disabled = !e;
      const isActive = d.playing && d.playing.season === d.season && d.playing.ep === i;
      const isWatched = watched.has(`${d.season}-${i}`);
      if (isActive) b.classList.add('active');
      if (isWatched && !isActive) b.classList.add('watched');

      const num = el('div', 'ep-number', String(i));
      const text = el('div', 'ep-text');
      const nm = el('div', 'ep-name', e && e.title ? `الحلقة ${i} — ${e.title}` : `الحلقة ${i}`);
      if (isNewEp(e)) nm.append(el('span', 'ep-new', 'جديد'));
      const status = !e ? 'قريباً' : (isActive ? '▶ يعرض الآن' : (isWatched ? '✓ شوهدت' : 'شاهد الآن'));
      text.append(nm, el('div', 'ep-status', status));
      b.append(num, text);
      if (e) b.addEventListener('click', () => playEpisode(d.season, i));
      box.append(b);
    }
  }

  function updatePlayButton() {
    const d = state.details;
    const btn = $('d-play');
    const target = resumeTarget(d.series);
    if (!target) {
      btn.textContent = 'الحلقات قريباً';
      btn.disabled = true;
      btn.onclick = null;
      return;
    }
    const info = getEps(d.series.name);
    const ss = info.seasons.length > 1 ? `م${target.season} • ` : '';
    btn.disabled = false;
    btn.textContent = target.resume ? `▶ أكمل ${ss}الحلقة ${target.ep}` : `▶ تشغيل ${ss}الحلقة ${target.ep}`;
    btn.onclick = () => playEpisode(target.season, target.ep);
  }

  function neighbors(name, season, ep) {
    const info = getEps(name);
    if (!info) return { prev: null, next: null };
    const i = info.ordered.findIndex((x) => x.season === season && x.ep === ep);
    return { prev: i > 0 ? info.ordered[i - 1] : null, next: i >= 0 && i < info.ordered.length - 1 ? info.ordered[i + 1] : null };
  }

  function playEpisode(season, ep) {
    const d = state.details;
    if (!d) return;
    const e = epInfo(d.series.name, season, ep);
    if (!e) return;
    const info = getEps(d.series.name);
    d.playing = { season, ep };
    if (d.season !== season) { d.season = season; renderSeasonTabs(); }

    $('d-hero').hidden = true;
    $('player').hidden = false;
    $('details').classList.add('playing');
    setFrame(e.link);

    const multi = info.seasons.length > 1;
    $('now-playing').textContent = `${multi ? `الموسم ${season} • ` : ''}الحلقة ${ep}`;
    const nb = neighbors(d.series.name, season, ep);
    $('prev-ep-btn').disabled = !nb.prev;
    $('next-ep-btn').disabled = !nb.next;

    saveProgress(d.series.name, season, ep);
    renderEpisodes();
    updatePlayButton();
    updateDetailsTopbar();
    $('details').scrollTo({ top: 0, behavior: 'smooth' });
    document.title = `${d.series.name} - الحلقة ${ep} | ${CFG.siteName}`;
    replaceURL();
  }

  function playNeighbor(dir) {
    const d = state.details;
    if (!d || !d.playing) return;
    const nb = neighbors(d.series.name, d.playing.season, d.playing.ep);
    const t = dir > 0 ? nb.next : nb.prev;
    if (t) playEpisode(t.season, t.ep);
  }

  // نبدّل الـ iframe بنسخة جديدة بدل تغيير src، عشان تغيير src يضيف خطوات
  // لسجل المتصفح ويخرب زر الرجوع في الجوال
  function setFrame(src) {
    const old = $('video-frame');
    if (old.getAttribute('src') === src) return;
    const f = old.cloneNode(false);
    f.setAttribute('src', src);
    old.replaceWith(f);
  }
  const stopVideo = () => setFrame('about:blank');

  function hideDetails() {
    if (!state.details) return;
    stopVideo();
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    state.details = null;
    $('details').hidden = true;
    document.body.classList.remove('no-scroll', 'details-open');
    document.title = `${CFG.siteName} | منصة المشاهدة الأولى`;
    if (state.view === 'home') renderHomeRows();
    if (state.view === 'mylist') renderMyList();
  }

  // زر الرجوع داخل الموقع: نرجع خطوة في المتصفح لو فتحنا الصفحة بأنفسنا
  function closeDetails() {
    if (!state.details) return;
    if (history.state && history.state.shnx === 'details') {
      history.back(); // popstate يكمل الإغلاق
    } else {
      hideDetails();
      replaceURL();
    }
  }

  function updateDetailsTopbar() {
    const page = $('details');
    const solid = page.classList.contains('playing') || page.scrollTop > Math.max(120, $('d-hero').offsetHeight - 90);
    $('d-topbar').classList.toggle('solid', solid);
  }

  async function shareCurrent() {
    const d = state.details;
    if (!d) return;
    const p = new URLSearchParams();
    p.set('s', d.series.name);
    if (d.playing) {
      if (d.playing.season !== 1) p.set('ss', d.playing.season);
      p.set('e', d.playing.ep);
    }
    const url = `${location.origin}${location.pathname}?${p.toString()}`;
    const text = d.playing ? `شاهد ${d.series.name} - الحلقة ${d.playing.ep} على SHNX` : `شاهد ${d.series.name} على SHNX`;
    if (navigator.share) {
      try { await navigator.share({ title: d.series.name, text, url }); } catch (e) { /* أُلغيت */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('تم نسخ الرابط ✓');
    } catch (e) {
      window.prompt('انسخ الرابط:', url);
    }
  }

  function toggleFullscreen() {
    const iframe = $('video-frame');
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFs) {
      const req = iframe.requestFullscreen || iframe.webkitRequestFullscreen;
      if (!req) return;
      const r = req.call(iframe);
      if (r && r.catch) r.catch(() => {});
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { const r = exit.call(document); if (r && r.catch) r.catch(() => {}); }
      if (screen.orientation && screen.orientation.unlock) { try { screen.orientation.unlock(); } catch (e) { /* ignore */ } }
    }
  }

  /* ---------------- التوجيه (الروابط وزر الرجوع) ---------------- */
  function readURL() {
    const p = new URLSearchParams(location.search);
    return {
      v: p.get('v') || 'home',
      q: p.get('q') || '',
      c: p.get('c') || '',
      s: p.get('s'),
      e: parseInt(p.get('e'), 10) || null,
      ss: parseInt(p.get('ss'), 10) || null
    };
  }

  function applyRoute(initial) {
    const r = readURL();
    state.query = r.q;
    state.chip = r.c;
    $('search-input').value = r.q;
    if (r.s) {
      if (initial) {
        // رابط مباشر (من تيليجرام مثلاً): نحط الرئيسية تحت صفحة المسلسل عشان زر الرجوع يرجع للموقع
        setView(r.v, { noUrl: true });
        try { history.replaceState(null, '', urlFor(viewParams())); } catch (e) { /* ignore */ }
        openDetails(r.s, { season: r.ss || (r.e ? 1 : null), ep: r.e });
      } else {
        if (state.view !== r.v) setView(r.v, { noUrl: true });
        if (!state.details || state.details.series.name !== normName(r.s)) {
          openDetails(r.s, { push: false, season: r.ss || (r.e ? 1 : null), ep: r.e });
        }
      }
    } else {
      hideDetails();
      setView(r.v, { noUrl: true, keepScroll: !initial });
    }
  }

  window.addEventListener('popstate', () => { if (dataReady) applyRoute(false); });

  /* ---------------- تحميل البيانات ---------------- */
  let dataReady = false;

  async function fetchJSON(url) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), CFG.fetchTimeoutMs);
    try {
      const r = await fetch(url, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!Array.isArray(j)) throw new Error('bad data');
      return j;
    } finally {
      clearTimeout(t);
    }
  }

  function applyData(seriesRows, epRows) {
    DB = buildDB(seriesRows, epRows);
    if (!dataReady) {
      dataReady = true;
      applyRoute(true);
      return;
    }
    // تحديث بدون ما نوقف الفيديو أو نغير الصفحة
    if (state.view === 'home') renderHome();
    if (state.view === 'browse') renderBrowse();
    if (state.view === 'mylist') renderMyList();
    if (state.details) {
      const fresh = DB.byName.get(state.details.series.name);
      if (fresh) {
        state.details.series = fresh;
        renderMeta();
        renderSeasonTabs();
        renderEpisodes();
        updatePlayButton();
        if (state.details.playing) {
          const nb = neighbors(fresh.name, state.details.playing.season, state.details.playing.ep);
          $('prev-ep-btn').disabled = !nb.prev;
          $('next-ep-btn').disabled = !nb.next;
        }
      }
    }
  }

  async function loadData() {
    const cache = store.get(KEYS.cache, null);
    if (cache && Array.isArray(cache.series) && Array.isArray(cache.eps)) {
      applyData(cache.series, cache.eps); // عرض فوري من آخر نسخة
    }

    const base = `https://opensheet.elk.sh/${CFG.sheetID}/`;
    const [sr, er] = await Promise.allSettled([
      fetchJSON(base + encodeURIComponent(CFG.seriesSheet)),
      fetchJSON(base + encodeURIComponent(CFG.episodesSheet))
    ]);
    const okS = sr.status === 'fulfilled';
    const okE = er.status === 'fulfilled';

    if (okS || okE) {
      const series = okS ? sr.value : ((cache && cache.series) || []);
      const eps = okE ? er.value : ((cache && cache.eps) || []);
      const changed = !cache || JSON.stringify(cache.series) !== JSON.stringify(series) || JSON.stringify(cache.eps) !== JSON.stringify(eps);
      store.set(KEYS.cache, { series, eps, ts: Date.now() });
      if (changed || !dataReady) applyData(series, eps);
    } else {
      console.error('❌ فشل سحب البيانات', sr.reason, er.reason);
      if (!dataReady) applyData([], []);
      toast(cache ? 'تعذّر التحديث، نعرض آخر نسخة محفوظة' : 'تعذّر الاتصال بالشيت، نعرض المحتوى الأساسي');
    }
  }

  /* ---------------- الأحداث ---------------- */
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.details) hideDetails();
      if (b.dataset.nav !== 'browse') { state.query = ''; $('search-input').value = ''; }
      setView(b.dataset.nav);
      if (b.dataset.focusSearch) $('search-input').focus();
    });
  });

  $('logo-btn').addEventListener('click', () => {
    if (state.details) hideDetails();
    state.query = '';
    state.chip = '';
    $('search-input').value = '';
    setView('home');
  });

  $('search-input').addEventListener('input', (e) => {
    const prev = state.query;
    state.query = e.target.value.trim();
    if (!prev && state.query) state.chip = ''; // بحث جديد يبحث في كل التصنيفات
    if (state.view !== 'browse') setView('browse', { keepScroll: false });
    else { renderBrowse(); replaceURL(); }
  });
  $('search-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

  $('back-btn').addEventListener('click', closeDetails);
  $('d-mylist').addEventListener('click', () => state.details && toggleMyList(state.details.series.name));
  $('d-share').addEventListener('click', shareCurrent);
  $('prev-ep-btn').addEventListener('click', () => playNeighbor(-1));
  $('next-ep-btn').addEventListener('click', () => playNeighbor(1));
  $('fs-btn').addEventListener('click', toggleFullscreen);
  $('details').addEventListener('scroll', updateDetailsTopbar, { passive: true });
  window.addEventListener('scroll', updateTopbar, { passive: true });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.details) closeDetails(); });

  // نخفي زر التكبير لو المتصفح ما يدعمه (مثل آيفون)، ومشغل الفيديو فيه زر تكبير خاص فيه
  (function () {
    const f = $('video-frame');
    if (!(f.requestFullscreen || f.webkitRequestFullscreen)) $('fs-btn').hidden = true;
  })();

  $('tg-fab').href = CFG.telegramUrl;

  /* ---------------- PWA ---------------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  loadData();
})();
