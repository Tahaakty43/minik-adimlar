(function () {
  const { fmt, ageLabel, pctText, NAMES, UNITS } = window.Charts;
  const G = window.GC, L = window.GROWTH_LMS, STAGES = window.STAGES;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const view = $("#view"), app = $("#app");

  // ---------- Depolama ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yoksay */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* yoksay */ } },
  };
  let profile = store.get("cg_profile", null);
  let measures = store.get("cg_measures", []);
  let checks = store.get("cg_checks", {});

  // ---------- Tarih ----------
  const DAY = 864e5, MONTH_DAYS = 30.4375;
  const parseDate = s => { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const monthsBetween = (a, b) => (b - a) / DAY / MONTH_DAYS;
  const addMonths = (d, m) => new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
  const dateTR = d => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const dateShort = d => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // ---------- Yardımcılar ----------
  const PC = p => `var(${window.PERIODS[p].renk})`;
  const CLOTH = { bebek: ["#7fb2ee", "#5b97df"], yurume: ["#3cc495", "#24a77a"], okuloncesi: ["#f08a5d", "#d96a3a"], okul: ["#8a7fe0", "#6a5dc8"], gebelik: ["#e87ba4", "#d55181"] };
  const stageById = id => STAGES.find(s => s.id === id);
  const doseName = d => d === "R" ? "rapel" : d === "Ek" ? "ek doz" : `${d}. doz`;
  const sleepFor = age => window.SLEEP.find(s => age >= s.from && age < s.to);
  const efwAt = w => (window.FETAL_EFW.find(e => e[0] === w) || [])[1];
  const fmtG = g => g >= 1000 ? `${fmt(g / 1000, 2)} kg` : `${g} g`;
  const list = arr => `<ul class="check-list">${arr.map(t => `<li>${t}</li>`).join("")}</ul>`;
  const ICON = {
    moon: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>',
    syringe: '<path d="M17 3l4 4m-2-2l-9 9m-3 0l3 3m-6 3l3-3m1-7l6 6"/>',
    ruler: '<path d="M4 20V4m0 16h16M7 16c3-1 5-5 7-8s4-3 6-3"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    alert: '<path d="M12 4l9 16H3zM12 10v4m0 3h.01"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16"/>',
    grow: '<path d="M12 21V9m0 0c0-3 2-6 6-6 0 4-3 6-6 6zm0 4c0-3-2-5-6-5 0 3 3 5 6 5z"/>',
    baby: '<circle cx="12" cy="8" r="4"/><path d="M5 21c1-4 3.5-6 7-6s6 2 7 6"/>',
    tooth: '<path d="M7 3c-2.5 0-4 2-3.5 5S5 14 6 18c.5 2 2 2.5 2.5.5L10 13h4l1.5 5.5c.5 2 2 1.5 2.5-.5 1-4 2-7 2.5-10S19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>',
    calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4"/>',
  };
  const icon = (k, c) => `<span class="ic" style="--cc:${c || "var(--accent)"}"><svg viewBox="0 0 24 24">${ICON[k]}</svg></span>`;

  function currentInfo() {
    if (!profile) return null;
    if (profile.status === "born" && profile.birth) {
      const age = monthsBetween(parseDate(profile.birth), today());
      if (age < 0) return null;
      const born = STAGES.filter(s => s.period !== "gebelik");
      const stage = born.find(s => age >= s.start && age < s.end) || born[born.length - 1];
      return { kind: "born", age, stage, over: age >= 120 };
    }
    if (profile.status === "preg" && profile.due) {
      const daysLeft = (parseDate(profile.due) - today()) / DAY;
      const week = 40 - daysLeft / 7;
      if (week < 0 || week > 43) return null;
      const w = Math.floor(week);
      const stage = STAGES.find(s => s.period === "gebelik" && w >= s.weekStart && w <= s.weekEnd) || STAGES[w < 14 ? 0 : 2];
      return { kind: "preg", week, daysLeft, stage };
    }
    return null;
  }
  const childName = info => esc(profile && profile.name ? profile.name : info && info.kind === "preg" ? "Bebeğiniz" : "Çocuğunuz");
  function illuOpts(stage, extra = {}) {
    const [shirt, shirtD] = CLOTH[stage.period];
    return { sex: profile ? profile.sex : "f", skin: profile ? profile.skin : "b", shirt, shirtD, ...extra };
  }

  // ---------- Tema ----------
  const savedTheme = store.get("cg_theme", null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("cg_theme", next);
    render();
  });
  function setAccent(period) {
    const v = period ? PC(period) : "var(--c1)";
    app.style.setProperty("--accent", v);
    const hex = getComputedStyle(app).getPropertyValue(window.PERIODS[period || "bebek"].renk).trim();
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta && hex) meta.content = hex;
  }

  // ---------- Yönlendirme ----------
  const TITLES = { home: "Merhaba!", stages: "Gelişim evreleri", growth: "Büyüme", vaccines: "Aşı takvimi", more: "Daha fazla", pregnancy: "Gebelik", life: "Uyku · ekran · hareket", teeth: "Dişler", sources: "Kaynaklar" };
  function route() {
    const [name, sub] = (location.hash.slice(1) || "home").split("/");
    return { name: TITLES[name] ? name : "home", sub };
  }
  const go = h => { if (location.hash !== "#" + h) location.hash = h; else render(); };
  window.addEventListener("hashchange", () => { render(); window.scrollTo({ top: 0 }); });
  document.querySelectorAll(".bottomnav button").forEach(b => b.addEventListener("click", () => go(b.dataset.route)));
  $("#backBtn").addEventListener("click", () => history.length > 1 ? history.back() : go("more"));
  $("#profileBtn").addEventListener("click", openProfileSheet);

  function render() {
    hideTip();
    const r = route();
    const info = currentInfo();
    const navName = ["pregnancy", "life", "teeth", "sources"].includes(r.name) ? "more" : r.name;
    document.querySelectorAll(".bottomnav button").forEach(b => b.classList.toggle("on", b.dataset.route === navName));
    $("#backBtn").hidden = !["pregnancy", "life", "teeth", "sources"].includes(r.name);
    $("#appTitle").textContent = r.name === "home" && profile && profile.name ? `Merhaba, ${profile.name}!` : TITLES[r.name];
    $("#appKicker").textContent = info ? info.stage.title : "Minik Adımlar";
    renderAvatar(info);
    setAccent(info ? info.stage.period : null);
    view.innerHTML = "";
    ({ home: renderHome, stages: () => renderStages(r.sub), growth: renderGrowth, vaccines: renderVaccines, more: renderMore, pregnancy: renderPregnancy, life: renderLife, teeth: renderTeeth, sources: renderSources })[r.name]();
  }
  function renderAvatar(info) {
    const b = $("#profileBtn");
    if (!info) { b.innerHTML = `<svg viewBox="0 0 24 24" style="padding:9px;fill:none;stroke:var(--accent);stroke-width:2.4;stroke-linecap:round">${ICON.plus}</svg>`; return; }
    const ch = (profile.name || "").trim().charAt(0).toLocaleUpperCase("tr-TR");
    if (!ch) { b.innerHTML = `<svg viewBox="0 0 24 24" style="padding:8px;fill:none;stroke:var(--accent);stroke-width:2.2;stroke-linecap:round">${ICON.baby}</svg>`; return; }
    b.innerHTML = `<svg viewBox="0 0 40 40"><text x="20" y="27" text-anchor="middle" font-size="18" font-weight="900" fill="var(--text)" font-family="Nunito, sans-serif">${esc(ch)}</text></svg>`;
  }

  // ---------- Alt sayfa ----------
  function openSheet(html, mount) {
    $("#sheetBody").innerHTML = html;
    $("#sheet").hidden = false; $("#sheetBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    if (mount) mount($("#sheetBody"));
  }
  function closeSheet() { $("#sheet").hidden = true; $("#sheetBackdrop").hidden = true; document.body.style.overflow = ""; }
  $("#sheetBackdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

  function openProfileSheet() {
    const p = profile || { status: "born", sex: "f", skin: "b" };
    const skins = [["a", "#f6d5b8"], ["b", "#e9b98f"], ["c", "#c98e62"], ["d", "#8d5a3b"]];
    openSheet(`<form id="pf">
      <h2>${profile ? "Profili düzenle" : "Hadi başlayalım"}</h2>
      <p class="muted small">Bilgiler yalnızca bu cihazda saklanır, hiçbir yere gönderilmez.</p>
      <label class="field">Çocuğun adı<input name="name" maxlength="30" placeholder="ör. Deniz" value="${esc(p.name || "")}"></label>
      <div class="field" style="margin:12px 0"><span class="small" style="font-weight:700;color:var(--text-2)">Durum</span>
        <div class="seg-pick"><label><input type="radio" name="status" value="born" ${p.status !== "preg" ? "checked" : ""}>Doğdu</label><label><input type="radio" name="status" value="preg" ${p.status === "preg" ? "checked" : ""}>Gebelik sürüyor</label></div></div>
      <label class="field" id="fBirth">Doğum tarihi<input type="date" name="birth" value="${p.birth || ""}" max="${isoDate(today())}"></label>
      <label class="field" id="fDue" hidden>Tahmini doğum tarihi<input type="date" name="due" value="${p.due || ""}"></label>
      <div class="field" style="margin:12px 0"><span class="small" style="font-weight:700;color:var(--text-2)">Cinsiyet (büyüme eğrileri için)</span>
        <div class="seg-pick"><label><input type="radio" name="sex" value="f" ${p.sex !== "m" ? "checked" : ""}>Kız</label><label><input type="radio" name="sex" value="m" ${p.sex === "m" ? "checked" : ""}>Erkek</label></div></div>
      <div class="field" style="margin:12px 0"><span class="small" style="font-weight:700;color:var(--text-2)">Karakter ten rengi</span>
        <div class="skin-pick">${skins.map(([k, c]) => `<label><input type="radio" name="skin" value="${k}" ${(p.skin || "b") === k ? "checked" : ""}><span style="background:${c}"></span></label>`).join("")}</div></div>
      <p class="form-msg" id="pfMsg"></p>
      <button class="btn block" type="submit">Kaydet</button>
      ${profile ? '<button class="btn ghost block" type="button" id="pfReset" style="margin-top:10px">Tüm verileri sil</button>' : ""}
    </form>`, root => {
      const f = root.querySelector("#pf");
      const sync = () => { const preg = f.status.value === "preg"; root.querySelector("#fBirth").hidden = preg; root.querySelector("#fDue").hidden = !preg; };
      f.querySelectorAll("input[name=status]").forEach(r => r.addEventListener("change", sync)); sync();
      f.addEventListener("submit", e => {
        e.preventDefault();
        const np = { name: f.name.value.trim(), status: f.status.value, sex: f.sex.value, skin: f.skin.value, birth: f.birth.value, due: f.due.value };
        if (np.status === "born" && !np.birth) { root.querySelector("#pfMsg").textContent = "Doğum tarihini girin."; return; }
        if (np.status === "preg" && !np.due) { root.querySelector("#pfMsg").textContent = "Tahmini doğum tarihini girin."; return; }
        if (np.status === "preg") { const wk = 40 - (parseDate(np.due) - today()) / DAY / 7; if (wk < 0 || wk > 43) { root.querySelector("#pfMsg").textContent = "Tahmini doğum tarihi bugünden en fazla 40 hafta sonra olmalı."; return; } }
        profile = np; store.set("cg_profile", profile); growthState.sex = profile.sex;
        closeSheet(); render();
      });
      const rs = root.querySelector("#pfReset");
      if (rs) rs.addEventListener("click", () => {
        if (!confirm("Profil, ölçümler ve işaretlenen kilometre taşları silinsin mi?")) return;
        ["cg_profile", "cg_measures", "cg_checks"].forEach(store.del);
        profile = null; measures = []; checks = {}; closeSheet(); go("home");
      });
    });
  }

  // ---------- ANA SAYFA ----------
  function journeyBar(info) {
    if (info.kind === "preg") {
      const segs = STAGES.filter(s => s.period === "gebelik");
      return `<div class="journey"><div class="journey-track">${segs.map(s => `<i style="--w:${s.weekEnd - s.weekStart + 1};--pc:${PC(s.period)}" class="${info.week >= s.weekStart ? "done" : ""}"></i>`).join("")}</div>
        <div class="journey-labels"><span>1. hafta</span><span>20</span><span>40. hafta</span></div></div>`;
    }
    const segs = STAGES.filter(s => s.period !== "gebelik");
    return `<div class="journey"><div class="journey-track">${segs.map(s => `<i style="--w:${s.end - s.start};--pc:${PC(s.period)}" class="${info.age >= s.start ? "done" : ""}"></i>`).join("")}</div>
      <div class="journey-labels"><span>Doğum</span><span>5 yaş</span><span>10 yaş</span></div></div>`;
  }

  function renderHome() {
    const info = currentInfo();
    let html = "";
    if (!info) {
      html += `<div class="hero"><div class="illu-wrap" id="heroIllu"></div>
        <h2>Minik Adımlar</h2>
        <p class="sub">Anne karnından 10 yaşına kadar büyüme, gelişim, aşılar ve dikkat edilmesi gerekenler — hepsi bilimsel kaynaklarla.</p>
        <button class="btn block" id="startBtn">Profil oluştur</button></div>`;
    } else {
      const s = info.stage;
      if (info.kind === "preg") {
        const w = Math.max(0, info.week), wi = Math.floor(w), d = Math.floor((w - wi) * 7);
        html += `<div class="hero"><span class="pill">${s.title}</span><div class="illu-wrap" id="heroIllu"></div>
          <h2>${childName(info)} · ${wi}. hafta${d ? ` ${d}. gün` : ""}</h2><p class="sub">${s.ozet}</p>${journeyBar(info)}</div>`;
      } else {
        html += `<div class="hero"><span class="pill">${window.PERIODS[s.period].ad}</span><div class="illu-wrap" id="heroIllu"></div>
          <h2>${childName(info)} · ${ageLabel(info.age < 24 ? Math.floor(info.age) : info.age)}</h2>
          <p class="sub">${info.over ? "Rehber 10 yaşa kadar olan dönemi kapsar. " : ""}${s.ozet}</p>${journeyBar(info)}</div>`;
      }
      html += `<div class="chips">${homeChips(info)}</div>`;
      html += parentCards(s);
      if (s.gelisim && !["s6", "s8"].includes(s.id)) {
        const { done, total } = msProgress(s);
        html += `<div class="section-title"><h2>Neler yapabiliyor?</h2><a href="#stages/${s.id}">İşaretle</a></div>
          <div class="card"><div style="display:flex;justify-content:space-between;font-weight:800"><span>${s.milestoneAge || s.range}</span><span>${done}/${total}</span></div>
          <div class="progress"><div style="width:${(done / total) * 100}%"></div></div>
          <p class="muted small" style="margin:6px 0 0">Bu yaştaki çoğu çocuğun yapabildikleri. Her çocuk kendi hızında gelişir.</p></div>`;
      }
      if (info.kind === "born") {
        const vx = nextVaccines(parseDate(profile.birth), info.age, 3);
        if (vx.length) html += `<div class="section-title"><h2>Sıradaki aşılar</h2><a href="#vaccines">Takvim</a></div>
          <div class="card"><ul class="tip-list">${vx.map(o => `<li><span><b>${o.v.k}</b> · ${doseName(o.dose)}<br><span class="muted small">${o.label} · ${dateTR(o.date)}</span></span></li>`).join("")}</ul></div>`;
      }
    }
    html += `<div class="section-title"><h2>Büyüme animasyonu</h2></div>${growCardHtml()}`;
    html += `<p class="disclaimer">Bilgilendirme amaçlıdır; tanı ve tedavinin yerini tutmaz. Her çocuk kendi hızında gelişir — endişeniz olduğunda hekiminize danışın.</p>`;
    view.innerHTML = html;

    const hero = $("#heroIllu");
    if (!info) Illust.mountStage(hero, "y1", { ...illuOpts(stageById("y1")), w: 300, h: 210 });
    else if (info.kind === "preg") Illust.mountStage(hero, info.stage.id, { week: Math.max(6, Math.min(40, Math.floor(info.week))), w: 210, h: 210 });
    else Illust.mountStage(hero, info.stage.id, { ...illuOpts(info.stage), age: Math.min(120, info.age), w: 300, h: 210 });
    if (!info) $("#startBtn").addEventListener("click", openProfileSheet);
    mountGrowCard(info);
  }

  function parentCards(s) {
    const card = (title, ic, color, arr, n) => arr && arr.length ? `<div class="card parent-card" style="--cc:${color}"><div class="pc-head">${icon(ic, color)}<h3>${title}</h3></div>
      <ul class="tip-list">${arr.slice(0, n).map(t => `<li><span>${t}</span></li>`).join("")}</ul></div>` : "";
    return `<div class="section-title"><h2>Bu dönemde neler yapmalısınız?</h2><a href="#stages/${s.id}">Tümü</a></div>` +
      card("Anne için", "heart", "var(--c5)", s.anne, 3) +
      card("Anne ve baba için", "list", "var(--c3)", s.yapilacaklar, 3) +
      card("Baba için", "user", "var(--c1)", s.baba, 3);
  }
  function statusOf(ind, z, age) {
    if (ind === "bmi" && age > 60) return z > 2 || z < -2 ? ["Doktora danışın", true] : z > 1 ? ["Biraz fazla", true] : ["Normal", false];
    return Math.abs(z) > 2 ? ["Doktora danışın", true] : ["Normal", false];
  }

  function homeChips(info) {
    const c = [];
    if (info.kind === "preg") {
      const wi = Math.floor(info.week), e = efwAt(Math.min(40, wi));
      c.push(`<div class="chip">${icon("calendar", "var(--c5)")}<div class="v">${Math.max(0, Math.ceil(info.daysLeft))} gün</div><div class="k">doğuma kalan</div></div>`);
      c.push(`<div class="chip">${icon("heart", "var(--c2)")}<div class="v">${e ? fmtG(e) : "—"}</div><div class="k">bebeğin ağırlığı (ort.)</div></div>`);
      c.push(`<div class="chip">${icon("star", "var(--c4)")}<div class="v">${wi < 14 ? "1." : wi < 28 ? "2." : "3."} trimester</div><div class="k">${info.stage.range}</div></div>`);
      return c.join("");
    }
    const sl = sleepFor(info.age);
    if (sl) c.push(`<div class="chip">${icon("moon", "var(--c7)")}<div class="v">${sl.min}-${sl.max} sa</div><div class="k">günlük uyku</div></div>`);
    const vx = nextVaccines(parseDate(profile.birth), info.age, 1)[0];
    if (vx) c.push(`<div class="chip">${icon("syringe", "var(--c1)")}<div class="v">${vx.label}</div><div class="k">sıradaki aşı · ${dateShort(vx.date)}</div></div>`);
    const last = measures.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    if (last) {
      const a = monthsBetween(parseDate(profile.birth), parseDate(last.date));
      const k = last.height ? "height" : "weight", lms = G.lmsAt(L[profile.sex][k], a);
      if (lms && last[k]) c.push(`<a class="chip" href="#growth" style="text-decoration:none;color:inherit">${icon("ruler", "var(--c3)")}<div class="v">${statusOf(k, G.valueToZ(lms, last[k], k === "weight"), a)[0]}</div><div class="k">son ${k === "height" ? "boy" : "kilo"} ölçümü</div></a>`);
    } else c.push(`<a class="chip" href="#growth" style="text-decoration:none;color:inherit">${icon("ruler", "var(--c3)")}<div class="v">Ölçüm ekle</div><div class="k">boy ve kilo takibi</div></a>`);
    const s = info.stage;
    if (s.gelisim && !["s6", "s8"].includes(s.id)) { const p = msProgress(s); c.push(`<div class="chip">${icon("star", "var(--c4)")}<div class="v">${p.done}/${p.total}</div><div class="k">beceri</div></div>`); }
    return c.join("");
  }

  function nextVaccines(birth, ageM, count) {
    const out = [];
    window.VACCINE_AGES.forEach(a => {
      if (a.m + 0.5 < ageM) return;
      window.VACCINES.forEach(v => { if (v.doses[a.m]) out.push({ m: a.m, label: a.l, v, dose: v.doses[a.m] }); });
    });
    return out.slice(0, count).map(o => ({ ...o, date: addMonths(birth, o.m) }));
  }

  // Büyüme animasyonu kartı
  const growAnim = { age: 0, sex: null, playing: false, timer: null };
  function growCardHtml() {
    return `<div class="card grow-card">
      <p class="muted small" style="margin-top:0">Oynat'a basın: çocuğun doğumdan 10 yaşına kadar nasıl büyüdüğünü görün. Değerler sağlıklı çocukların ortalamasıdır.</p>
      <div class="illu-wrap" id="growIllu"></div>
      <div class="grow-stats"><div><b id="gAge">—</b><span>yaş</span></div><div><b id="gH">—</b><span>ortalama boy</span></div><div><b id="gW">—</b><span>ortalama kilo</span></div></div>
      <div class="slider-row"><button class="play" id="gPlay" aria-label="Oynat"><svg viewBox="0 0 24 24">${ICON.play}</svg></button>
        <input type="range" id="gRange" min="0" max="120" step="1" aria-label="Yaş (ay)"></div>
      <div class="seg-pick" style="margin-top:10px" id="gSex"><label><input type="radio" name="gsex" value="f">Kız</label><label><input type="radio" name="gsex" value="m">Erkek</label></div>
      <p class="muted small" style="margin:8px 0 0">Bu yaşta baş, boyun yaklaşık <b id="gHead">—</b>'i kadardır; çocuk büyüdükçe bu oran küçülür. Kaynak: Dünya Sağlık Örgütü.</p>
    </div>`;
  }
  function mountGrowCard(info) {
    const el = $("#growIllu"); if (!el) return;
    growAnim.sex = growAnim.sex || (profile ? profile.sex : "f");
    growAnim.age = info && info.kind === "born" ? Math.min(120, Math.round(info.age)) : growAnim.age;
    const range = $("#gRange"); range.value = growAnim.age;
    $("#gSex").querySelector(`input[value=${growAnim.sex}]`).checked = true;
    $("#gSex").addEventListener("change", e => { growAnim.sex = e.target.value; update(); });
    const stageFor = a => STAGES.filter(s => s.period !== "gebelik").find(s => a >= s.start && a < s.end) || STAGES[STAGES.length - 1];
    function update() {
      const a = growAnim.age, sx = growAnim.sex;
      const h = G.lmsAt(L[sx].height, a)[1], w = G.lmsAt(L[sx].weight, a)[1];
      $("#gAge").textContent = a < 24 ? `${a} ay` : ageLabel(a);
      $("#gH").textContent = `${fmt(h, 1)} cm`; $("#gW").textContent = `${fmt(w, 1)} kg`;
      $("#gHead").textContent = `1/${fmt(1 / Illust.interpHead(a), 0)}`;
    }
    range.addEventListener("input", () => { growAnim.age = +range.value; update(); });
    const btn = $("#gPlay");
    const setBtn = () => btn.innerHTML = `<svg viewBox="0 0 24 24">${growAnim.playing ? ICON.pause : ICON.play}</svg>`;
    btn.addEventListener("click", () => {
      growAnim.playing = !growAnim.playing; setBtn();
      clearInterval(growAnim.timer);
      if (growAnim.playing) {
        if (growAnim.age >= 120) growAnim.age = 0;
        growAnim.timer = setInterval(() => {
          if (!el.isConnected) { clearInterval(growAnim.timer); growAnim.playing = false; return; }
          growAnim.age = Math.min(120, growAnim.age + 1); range.value = growAnim.age; update();
          if (growAnim.age >= 120) { growAnim.playing = false; clearInterval(growAnim.timer); setBtn(); }
        }, 90);
      }
    });
    setBtn(); update();
    Illust.register({ el, draw: t => {
      const a = growAnim.age, st = stageFor(a);
      el.innerHTML = Illust.growScene(a, growAnim.sex, G.lmsAt(L[growAnim.sex].height, a)[1], t, illuOpts(st));
    } }, true);
  }

  // ---------- EVRELER ----------
  const DOMAINS = [
    { k: "sosyal", ad: "Sosyal-duygusal", c: "var(--c5)" },
    { k: "dil", ad: "Dil", c: "var(--c1)" },
    { k: "bilissel", ad: "Bilişsel", c: "var(--c3)" },
    { k: "hareket", ad: "Hareket", c: "var(--c2)" },
  ];
  function msKeys(s) { const k = []; DOMAINS.forEach(d => (s.gelisim[d.k] || []).forEach((t, i) => k.push(`${d.k}${i}`))); return k; }
  function msProgress(s) { const k = msKeys(s); return { done: k.filter(x => checks[s.id] && checks[s.id][x]).length, total: k.length }; }
  function whoMedians(ageM) {
    const row = sx => ({ w: G.lmsAt(L[sx].weight, ageM)[1], h: G.lmsAt(L[sx].height, ageM)[1], hc: ageM <= 60 ? G.lmsAt(L[sx].head, ageM)[1] : null });
    return { f: row("f"), m: row("m") };
  }
  let domainFilter = "all";

  function renderStages(id) {
    const info = currentInfo();
    const s = stageById(id) || (info ? info.stage : STAGES[3]);
    setAccent(s.period);
    const idx = STAGES.indexOf(s);
    const isPreg = s.period === "gebelik";
    let html = `<div class="carousel" id="carousel">${STAGES.map(x => `<button class="stage-card ${x.id === s.id ? "sel" : ""}" data-id="${x.id}" style="--pc:${PC(x.period)}">
      ${info && info.stage.id === x.id ? '<span class="now">Şu an</span>' : ""}<div class="illu-wrap" data-illu="${x.id}"></div><b>${x.title}</b><small>${x.range}</small></button>`).join("")}</div>`;

    html += `<div class="hero" id="stageHero"><span class="pill">${window.PERIODS[s.period].ad}</span>
      <div class="illu-wrap" id="stageIllu"></div>
      <h2>${s.title}</h2><p class="sub">${s.range !== s.title ? s.range + " · " : ""}${s.ozet}</p>
      <div class="nav-row">${idx > 0 ? `<a class="btn ghost sm" href="#stages/${STAGES[idx - 1].id}">← ${STAGES[idx - 1].title}</a>` : "<span></span>"}
      ${idx < STAGES.length - 1 ? `<a class="btn ghost sm" href="#stages/${STAGES[idx + 1].id}">${STAGES[idx + 1].title} →</a>` : ""}</div></div>`;

    const acc = (key, ic, color, title, body, open, extra = "", cls = "") =>
      `<details class="acc ${cls}" data-acc="${key}" ${open ? "open" : ""}><summary>${icon(ic, color)}<span>${title}</span>${extra ? `<span class="cnt">${extra}</span>` : ""}</summary><div class="acc-body">${body}</div></details>`;

    if (s.bebek) html += acc("bebek", "baby", "var(--c3)", "Bebeğiniz bu dönemde", list(s.bebek), true);
    if (s.anne) html += acc("anne", "heart", "var(--c5)", "Anne için yapılacaklar", list(s.anne), true, s.anne.length);
    if (s.yapilacaklar) html += acc("yap", "list", "var(--c3)", "Anne ve baba için yapılacaklar", list(s.yapilacaklar), true, s.yapilacaklar.length);
    if (s.baba) html += acc("baba", "user", "var(--c1)", "Baba için", list(s.baba), true, s.baba.length);

    if (s.gelisim) {
      const checkable = !["s6", "s8"].includes(s.id);
      const doms = DOMAINS.filter(d => s.gelisim[d.k]);
      const { done, total } = msProgress(s);
      const items = doms.filter(d => domainFilter === "all" || domainFilter === d.k).flatMap(d => s.gelisim[d.k].map((t, i) => {
        const k = `${d.k}${i}`, on = checks[s.id] && checks[s.id][k];
        return checkable
          ? `<label class="ms ${on ? "done" : ""}" style="--dc:${d.c}"><input type="checkbox" data-k="${k}" ${on ? "checked" : ""}><span>${t}</span></label>`
          : `<div class="ms static" style="--dc:${d.c}"><span class="dom"></span><span>${t}</span></div>`;
      })).join("");
      html += acc("gelisim", "star", "var(--c4)", "Neler yapabiliyor?",
        `<p class="muted small" style="margin-top:0">${checkable ? "Bu yaştaki çoğu çocuğun yapabildikleri. Çocuğunuzun yapabildiklerini işaretleyin." : "Bu yaştaki çocuklarda sık görülen özellikler."}</p>
         ${checkable ? `<div class="progress"><div style="width:${(done / total) * 100}%"></div></div><p class="small" style="font-weight:800;margin:2px 0 10px">${done} / ${total}</p>` : ""}
         ${doms.length > 1 ? `<div class="domain-tabs"><button data-dom="all" class="${domainFilter === "all" ? "on" : ""}" style="--dc:var(--text)">Tümü</button>${doms.map(d => `<button data-dom="${d.k}" class="${domainFilter === d.k ? "on" : ""}" style="--dc:${d.c}">${d.ad}</button>`).join("")}</div>` : ""}
         ${items}`, false, checkable ? `${done}/${total}` : "");
    }
    html += acc("dikkat", "alert", "var(--c4)", "Dikkat", list(s.dikkat), false, s.dikkat.length);
    if (!isPreg) {
      const lo = s.id === "m0" ? -0.1 : s.start, vx = [];
      window.VACCINE_AGES.filter(a => a.m > lo && a.m <= s.end).forEach(a => window.VACCINES.forEach(v => v.doses[a.m] && vx.push(`<li><b>${a.l}:</b> ${v.ad}</li>`)));
      const sl = sleepFor((s.start + s.end) / 2);
      html += acc("asi", "syringe", "var(--c1)", "Aşılar", vx.length ? `<ul class="check-list">${vx.join("")}</ul>` : '<p class="muted" style="margin:0">Bu dönemde aşı yok.</p>', false, vx.length || "");
      if (sl) html += acc("uyku", "moon", "var(--c7)", "Uyku", `<p style="margin:0"><b style="font-size:1.4rem">${sl.min}-${sl.max} saat</b></p><p class="muted small" style="margin-bottom:0">Gündüz uykuları dahil, günde toplam.</p>`, false, `${sl.min}-${sl.max} sa`);
    }
    html += acc("uyari", "alert", "var(--warn-ink)", isPreg || s.id === "m0" ? "Hemen doktora başvurun" : "Doktorunuza danışın", list(s.uyari) +
      `<p class="small" style="margin-bottom:0">${isPreg ? "Bunlardan biri olursa beklemeden doktorunuza veya acile gidin." : "Bunlardan birini fark ederseniz ya da içinize bir şüphe düşerse beklemeyin, doktorunuzla konuşun."}</p>`, true, "", "alert");
    if (!isPreg) {
      const age = Math.min(120, s.end), med = whoMedians(age);
      const st = (m, sx) => `<div class="stat"><div class="v">${fmt(m.w, 1)} kg · ${fmt(m.h, 0)} cm</div><div class="k">${sx}</div></div>`;
      html += acc("buyume", "grow", "var(--c3)", "Ortalama boy ve kilo",
        `<p class="muted small" style="margin-top:0">${ageLabel(age)} için sağlıklı çocukların ortalaması:</p><div class="stat-row">${st(med.f, "Kız")}${st(med.m, "Erkek")}</div>${s.buyume ? list(s.buyume) : ""}
         <a class="link-btn" href="#growth">Kendi çocuğunuzunkini görün →</a>`, false);
    }
    html += acc("src", "book", "var(--muted)", "Kaynaklar", `<ol class="srcs">${s.src.map(k => { const r = window.SOURCES[k]; return `<li>${esc(r.t)} ${r.u ? `<a href="${r.u}" target="_blank" rel="noopener">bağlantı</a>` : ""}</li>`; }).join("")}</ol>`, false, s.src.length);
    view.innerHTML = html;

    // çizimler
    view.querySelectorAll("[data-illu]").forEach(el => {
      const st = stageById(el.dataset.illu);
      Illust.mountStage(el, st.id, { ...illuOpts(st), w: 120, h: 86, animate: false });
    });
    Illust.mountStage($("#stageIllu"), s.id, isPreg ? { w: 210, h: 210 } : { ...illuOpts(s), w: 300, h: 210 });
    const car = $("#carousel"), sel = car.querySelector(".sel");
    car.scrollLeft = sel.offsetLeft - car.clientWidth / 2 + sel.offsetWidth / 2;
    car.querySelectorAll(".stage-card").forEach(b => b.addEventListener("click", () => go("stages/" + b.dataset.id)));

    // kaydırma ile evre değiştirme
    const hero = $("#stageHero"); let sx = null;
    hero.addEventListener("pointerdown", e => { sx = e.clientX; });
    hero.addEventListener("pointerup", e => {
      if (sx == null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 60) { const n = STAGES[idx + (dx < 0 ? 1 : -1)]; if (n) go("stages/" + n.id); }
    });

    view.querySelectorAll(".domain-tabs button").forEach(b => b.addEventListener("click", () => { domainFilter = b.dataset.dom; keepScroll(() => renderStages(s.id)); }));
    view.querySelectorAll("input[type=checkbox][data-k]").forEach(cb => cb.addEventListener("change", () => {
      checks[s.id] = checks[s.id] || {}; checks[s.id][cb.dataset.k] = cb.checked; store.set("cg_checks", checks);
      cb.closest(".ms").classList.toggle("done", cb.checked);
      const p = msProgress(s), acc = view.querySelector('[data-acc="gelisim"]');
      acc.querySelector(".progress > div").style.width = (p.done / p.total) * 100 + "%";
      acc.querySelector(".cnt").textContent = `${p.done}/${p.total}`;
      acc.querySelector(".progress + p").textContent = `${p.done} / ${p.total} beceri`;
    }));
  }
  function keepScroll(fn) {
    const y = window.scrollY, open = [...view.querySelectorAll("details[open]")].map(d => d.dataset.acc);
    fn();
    view.querySelectorAll("details.acc").forEach(d => d.open = open.includes(d.dataset.acc));
    window.scrollTo({ top: y });
  }

  // ---------- BÜYÜME ----------
  const growthState = { ind: "weight", sex: profile ? profile.sex : "f", range: null };
  function measurePoints(ind) {
    if (!profile || !profile.birth) return [];
    const birth = parseDate(profile.birth);
    return measures.map(m => {
      const age = monthsBetween(birth, parseDate(m.date));
      let v = m[ind];
      if (ind === "bmi") v = m.weight && m.height ? m.weight / Math.pow(m.height / 100, 2) : null;
      return { age, v: v || null };
    });
  }
  function renderGrowth() {
    const g = growthState;
    if (g.range == null) { const i = currentInfo(); g.range = i && i.kind === "born" ? (i.age < 22 ? 24 : i.age < 55 ? 60 : 120) : 120; }
    if (g.ind === "head" && g.range > 60) g.range = 60;
    const b = (k, v, t, dis) => `<button data-${k}="${v}" class="${g[k] == v ? "on" : ""}" ${dis ? "disabled" : ""}>${t}</button>`;
    view.innerHTML = `
      <div class="seg-scroll" id="gctl">${b("ind", "weight", "Kilo")}${b("ind", "height", "Boy")}${b("ind", "head", "Baş çevresi")}${b("ind", "bmi", "VKİ")}<span class="sep"></span>${b("sex", "f", "Kız")}${b("sex", "m", "Erkek")}<span class="sep"></span>${b("range", 24, "0-2 yaş")}${b("range", 60, "0-5 yaş")}${b("range", 120, "0-10 yaş", g.ind === "head")}</div>
      <div class="card"><h2>${NAMES[g.ind]} · ${g.sex === "f" ? "kız" : "erkek"}</h2>
        <p class="muted small" style="margin-top:2px">${profile && profile.birth ? "Turuncu noktalar sizin ölçümleriniz. Ayrıntı için grafiğe dokunun." : "Kendi ölçümlerinizi görmek için profilde doğum tarihini girin."}</p>
        <div class="chart" id="growthChart"></div>
        <div class="legend" style="margin:8px 0 0"><span><i style="background:var(--curve-mid);height:3px"></i>Ortalama</span><span><i style="background:var(--band-inner)"></i>Normal aralık</span><span><i style="background:var(--point);border-radius:50%;width:10px"></i>Sizin ölçümünüz</span></div>
        <p class="muted small" style="margin-bottom:0">Kaynak: Dünya Sağlık Örgütü büyüme eğrileri.</p></div>
      <div class="section-title"><h2>Ölçümler</h2></div>
      <div class="card" id="mList"></div>
      <div class="card" style="background:var(--surface-2);box-shadow:none"><h3>Grafik nasıl okunur?</h3>
        <p class="small" style="margin-bottom:0">Mavi alan, sağlıklı çocukların çoğunun bulunduğu aralıktır. Çocuğunuzun ölçümleri bu alanın içindeyse ve kendi çizgisini takip ediyorsa büyümesi yolundadır. Ölçüm mavi alanın dışına çıkarsa ya da çizgi aniden yön değiştirirse doktorunuza danışın.</p></div>
      <button class="fab" id="addM"><svg viewBox="0 0 24 24">${ICON.plus}</svg>Ölçüm</button>`;
    $("#gctl").addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.ind) g.ind = t.dataset.ind; if (t.dataset.sex) g.sex = t.dataset.sex; if (t.dataset.range) g.range = +t.dataset.range;
      keepX(renderGrowth);
    });
    window.Charts.growth($("#growthChart"), { ind: g.ind, sex: g.sex, range: g.ind === "head" ? Math.min(60, g.range) : g.range, points: measurePoints(g.ind) });
    renderMeasureList();
    $("#addM").addEventListener("click", openMeasureSheet);
  }
  function keepX(fn) { const sc = $("#gctl").scrollLeft, y = window.scrollY; fn(); $("#gctl").scrollLeft = sc; window.scrollTo({ top: y }); }

  function renderMeasureList() {
    const wrap = $("#mList");
    if (!measures.length) { wrap.innerHTML = '<p class="muted" style="margin:0">Henüz ölçüm yok. Sağ alttaki “Ölçüm” düğmesiyle ekleyin.</p>'; return; }
    if (!profile || !profile.birth) { wrap.innerHTML = '<p class="muted" style="margin:0">Persentil hesaplamak için profilde doğum tarihi gerekli.</p>'; return; }
    const birth = parseDate(profile.birth), sex = profile.sex;
    const val = (ind, v, age, d, lbl) => {
      if (v == null) return "";
      const lms = G.lmsAt(L[sex][ind], age);
      if (!lms) return `<span class="m-val">${lbl} ${fmt(v, d)}</span>`;
      const z = G.valueToZ(lms, v, ind === "weight" || ind === "bmi");
      const [txt, flag] = statusOf(ind, z, age);
      return `<span class="m-val ${flag ? "flag" : ""}">${lbl} ${fmt(v, d)}<i>${txt}</i></span>`;
    };
    wrap.innerHTML = measures.slice().sort((a, b) => b.date.localeCompare(a.date)).map(m => {
      const dt = parseDate(m.date), age = monthsBetween(birth, dt);
      const bmi = m.weight && m.height ? m.weight / Math.pow(m.height / 100, 2) : null;
      return `<div class="m-item"><div class="m-date"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString("tr-TR", { month: "short" })} ${String(dt.getFullYear()).slice(2)}</span></div>
        <div><div class="small" style="font-weight:800;margin-bottom:4px">${ageLabel(age < 24 ? Math.floor(age * 10) / 10 : age)}</div><div class="m-vals">
        ${val("weight", m.weight, age, 2, "Kilo")}${val("height", m.height, age, 1, "Boy")}${val("head", m.head, age, 1, "Baş")}${val("bmi", bmi, age, 1, "VKİ")}</div></div>
        <button class="icon-del" data-del="${m.id}" aria-label="Sil"><svg viewBox="0 0 24 24">${ICON.trash}</svg></button></div>`;
    }).join("") + `<p class="muted small" style="margin:10px 0 0">Kilo kg, boy ve baş çevresi cm olarak. VKİ: boya göre kilo. “Doktora danışın” görürseniz paniğe gerek yok; bir sonraki kontrolde sorun.</p>`;
    wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      if (!confirm("Bu ölçüm silinsin mi?")) return;
      measures = measures.filter(m => m.id != b.dataset.del); store.set("cg_measures", measures); renderGrowth();
    }));
  }
  function openMeasureSheet() {
    if (!profile || !profile.birth) { openProfileSheet(); return; }
    openSheet(`<form id="mf"><h2>Yeni ölçüm</h2>
      <label class="field">Ölçüm tarihi<input type="date" name="date" value="${isoDate(today())}" max="${isoDate(today())}" required></label>
      <div class="row3"><label class="field">Kilo (kg)<input name="weight" type="number" inputmode="decimal" step="0.01" min="0.5" max="80"></label>
      <label class="field">Boy (cm)<input name="height" type="number" inputmode="decimal" step="0.1" min="30" max="180"></label>
      <label class="field">Baş (cm)<input name="head" type="number" inputmode="decimal" step="0.1" min="20" max="60"></label></div>
      <p class="form-msg" id="mfMsg"></p><button class="btn block">Kaydet</button></form>`, root => {
      const f = root.querySelector("#mf");
      f.addEventListener("submit", e => {
        e.preventDefault();
        const n = k => f[k].value ? +f[k].value : null;
        const rec = { id: Date.now(), date: f.date.value, weight: n("weight"), height: n("height"), head: n("head") };
        const msg = root.querySelector("#mfMsg");
        if (!rec.weight && !rec.height && !rec.head) { msg.textContent = "En az bir ölçüm girin."; return; }
        if (parseDate(rec.date) < parseDate(profile.birth)) { msg.textContent = "Ölçüm tarihi doğum tarihinden önce olamaz."; return; }
        measures.push(rec); store.set("cg_measures", measures); closeSheet(); renderGrowth();
      });
    });
  }

  // ---------- AŞILAR ----------
  function renderVaccines() {
    const info = currentInfo();
    const born = info && info.kind === "born";
    const birth = born ? parseDate(profile.birth) : null;
    const A = window.VACCINE_AGES;
    const nextIdx = born ? A.findIndex(a => a.m + 0.5 >= info.age) : -1;
    view.innerHTML = `<div class="card"><h2>Ulusal Aşı Takvimi 2025</h2>
      <p class="small muted" style="margin-bottom:0">T.C. Sağlık Bakanlığı. 14 Nisan 2025'ten itibaren hepatit B'yi de içeren altılı karma aşı uygulanır. Güncel takvim: <a href="https://asi.saglik.gov.tr/" target="_blank" rel="noopener">asi.saglik.gov.tr</a>${born ? ". Tarihler çocuğunuzun doğum tarihine göre hesaplandı; yapılan aşıları e-Nabız'dan kontrol edin." : "."}</p></div>
      <div class="vtl">${A.map((a, i) => {
        const st = !born ? "" : i < nextIdx || nextIdx === -1 ? "past" : i === nextIdx ? "next" : "";
        const doses = window.VACCINES.filter(v => v.doses[a.m]).map(v => { const d = v.doses[a.m]; return `<span class="vdose ${d === "R" ? "r" : d === "Ek" ? "ek" : ""}" title="${esc(v.ad)}">${v.k}<small>${d === "R" ? "rapel" : d === "Ek" ? "ek doz" : d}</small></span>`; }).join("");
        return `<div class="vnode ${st}"><span class="dot"></span><div class="card"><div class="vhead"><b>${a.l}</b><span>${born ? (st === "next" ? "Sıradaki · " : "") + dateTR(addMonths(birth, a.m)) : ""}</span></div><div class="vdoses">${doses}</div></div></div>`;
      }).join("")}</div>
      <div class="card"><h3>Kısaltmalar</h3>${window.VACCINES.map(v => `<p class="small" style="margin:.3em 0"><b>${v.k}</b>: ${v.ad}</p>`).join("")}
      <p class="small muted" style="margin-bottom:0">I, II, III: doz · Rapel: pekiştirme · Ek doz (KKK, 9. ay): Bakanlık kartında yer alır; kızamık vakalarının arttığı dönemlerde uygulanır.</p></div>`;
  }

  // ---------- DAHA FAZLA ----------
  function renderMore() {
    const t = (h, ic, c, b, s) => `<button class="tile" data-go="${h}">${icon(ic, c)}<div><b>${b}</b><small>${s}</small></div></button>`;
    view.innerHTML = `<div class="tiles">
      ${t("pregnancy", "baby", "var(--c5)", "Gebelik", "Hafta hafta bebek")}
      ${t("life", "moon", "var(--c7)", "Uyku · ekran", "Günlük öneriler")}
      ${t("teeth", "tooth", "var(--c1)", "Dişler", "Çıkma zamanları")}
      ${t("profile", "user", "var(--c3)", "Profil", profile ? "Bilgileri düzenle" : "Profil oluştur")}
      ${t("sources", "book", "var(--c4)", "Kaynaklar", `${Object.keys(window.SOURCES).length} bilimsel kaynak`)}
      ${t("stages", "star", "var(--c2)", "Tüm evreler", "Gebelikten 10 yaşa")}</div>
      <p class="disclaimer">Bu uygulama yalnızca DSÖ, CDC, AAP, ACOG, AASM, ADA, T.C. Sağlık Bakanlığı ve hakemli bilimsel yayınlara dayanır. Bilgilendirme amaçlıdır; tanı veya tedavi yerine geçmez.</p>`;
    view.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => b.dataset.go === "profile" ? openProfileSheet() : go(b.dataset.go)));
  }

  // ---------- GEBELİK ----------
  let fetusWeek = null;
  function renderPregnancy() {
    setAccent("gebelik");
    const info = currentInfo();
    if (fetusWeek == null) fetusWeek = info && info.kind === "preg" ? Math.max(6, Math.min(40, Math.floor(info.week))) : 20;
    view.innerHTML = `<div class="hero fetus-card"><span class="pill">Gebelik haftası</span><div class="illu-wrap" id="fetusIllu"></div>
      <div class="fetus-stats"><div><b id="fW">—</b><span>hafta</span></div><div><b id="fG">—</b><span>bebeğin ağırlığı</span></div><div><b id="fT">—</b><span>dönem</span></div></div>
      <div class="slider-row"><input type="range" id="fRange" min="6" max="40" step="1" value="${fetusWeek}" aria-label="Gebelik haftası"></div>
      <p class="sub small" id="fNote" style="margin-bottom:0"></p></div>
      <div class="card"><h2>Bebeğin hafta hafta ağırlığı</h2><p class="muted small" style="margin-top:2px">Ortalama değerler. Kaynak: Hadlock, Radiology 1991.</p><div class="chart" id="fetalChart"></div></div>
      <div class="section-title"><h2>Anne ve baba için dönem dönem</h2></div>
      <div class="chips">${STAGES.filter(s => s.period === "gebelik").map(s => `<a class="chip" href="#stages/${s.id}" style="text-decoration:none;color:inherit;min-width:150px">${icon("baby", "var(--c5)")}<div class="v">${s.title.replace("Gebeliğin ", "").replace(/^./, c => c.toLocaleUpperCase("tr-TR"))}</div><div class="k">${s.range}</div></a>`).join("")}</div>
      <div class="card"><h2>Önemli haftalar</h2>${window.FETAL_MILESTONES.map(f => `<div class="fms"><div class="w">${f.w}. hf</div><div>${f.t}</div></div>`).join("")}</div>
      <div class="card"><h2>Gebelikte ne kadar kilo almalı?</h2><p class="muted small" style="margin-top:2px">Gebelikten önceki kilonuza göre, tüm gebelik boyunca önerilen toplam artış (tek bebek).</p><div class="chart" id="iomChart"></div></div>`;
    const el = $("#fetusIllu"), r = $("#fRange");
    const upd = () => {
      const w = fetusWeek, e = efwAt(w);
      $("#fW").textContent = w; $("#fG").textContent = e ? fmtG(e) : "< 35 g";
      $("#fT").textContent = w < 14 ? "1. trimester" : w < 28 ? "2. trimester" : "3. trimester";
      const ms = window.FETAL_MILESTONES.filter(m => m.w <= w).pop();
      $("#fNote").textContent = ms ? `${ms.w}. hafta: ${ms.t}` : "";
    };
    r.addEventListener("input", () => { fetusWeek = +r.value; upd(); });
    upd();
    Illust.register({ el, draw: t => { el.innerHTML = `<svg viewBox="0 0 210 210" class="illu" role="img" aria-label="${fetusWeek}. haftada bebek">${Illust.fetusSvg(fetusWeek, t, 210)}</svg>`; } }, true);
    window.Charts.line($("#fetalChart"), {
      data: window.FETAL_EFW, xLabel: "Gebelik haftası", yLabel: "gram",
      xFmt: v => v, yFmt: v => v.toLocaleString("tr-TR"), xTicks: [10, 16, 22, 28, 34, 40],
      tipFmt: d => `<b>${d[0]}. hafta</b><br>Ortalama ağırlık: ${d[1].toLocaleString("tr-TR")} g`,
      markX: [{ from: 10, to: 13.9, fill: "var(--c5)", label: "1." }, { from: 14, to: 27.9, fill: "transparent", label: "2. trimester" }, { from: 28, to: 40, fill: "var(--c5)", label: "3. trimester" }],
    });
    window.Charts.ranges($("#iomChart"), {
      rows: window.IOM.map((x, i) => ({ label: ["Zayıf", "Normal", "Kilolu", "Obez"][i], sub: x.ad, from: x.min, to: x.max, color: "var(--c5)", text: `${fmt(x.min, x.min % 1 ? 1 : 0)}-${fmt(x.max, x.max % 1 ? 1 : 0)} kg` })),
      min: 0, max: 20, axisLabel: "Toplam kilo alımı (kg)", labelW: 96, rowH: 40, ticks: [0, 5, 10, 15, 20],
      tipFmt: x => `<b>${x.sub}</b><br>Önerilen: ${fmt(x.from, 1)} – ${fmt(x.to, 1)} kg`,
    });
  }

  // ---------- UYKU · EKRAN ----------
  function renderLife() {
    setAccent("okul");
    const info = currentInfo();
    const age = info && info.kind === "born" ? info.age : null;
    const colors = ["var(--c5)", "var(--c1)", "var(--c3)", "var(--c2)"];
    view.innerHTML = `<div class="card"><h2>Günlük uyku ihtiyacı</h2><p class="muted small" style="margin-top:2px">Gündüz uykuları dahil, günde toplam.</p><div class="chart" id="sleepChart"></div></div>
      <div class="section-title"><h2>Ekran ve hareket</h2></div>
      ${window.SCREEN.map((r, i) => `<div class="card screen-card" style="--cc:${colors[i]}"><h3>${r.ad}</h3><dl><dt>Ekran</dt><dd>${r.ekran}</dd><dt>Hareket</dt><dd>${r.hareket}</dd></dl></div>`).join("")}
      <div class="card"><h2>Güvenli uyku (bebeklik)</h2><ul class="tip-list">
        <li><span>Her uykuda <b>sırtüstü</b> yatırın.</span></li>
        <li><span><b>Düz ve sert</b> yatak; yastık, yorgan, kenar koruması ve oyuncak yok.</span></li>
        <li><span><b>Aynı odada, ayrı yatakta</b> (ideal olarak ilk 6 ay).</span></li>
        <li><span>Anne sütü ve uykuda emzik ani bebek ölümü riskini azaltır.</span></li>
        <li><span>Sigara dumanı ve aşırı ısınmadan kaçının; başı örtmeyin.</span></li></ul></div>`;
    window.Charts.ranges($("#sleepChart"), {
      rows: window.SLEEP.map(s => ({ label: s.ad, from: s.min, to: s.max, color: "var(--c7)", text: `${s.min}-${s.max} sa`, s })),
      min: 0, max: 18, axisLabel: "Saat / 24 saat", labelW: 72, rowH: 42, ticks: [0, 3, 6, 9, 12, 15, 18],
      highlight: r => age != null && age >= r.s.from && age < r.s.to,
      tipFmt: r => `<b>${r.label}</b><br>${r.from}-${r.to} saat<br><span style="opacity:.75">${r.s.src === "nsf" ? "NSF 2015" : "AASM 2016"}</span>`,
    });
  }

  // ---------- DİŞLER ----------
  function renderTeeth() {
    setAccent("bebek");
    const info = currentInfo();
    const ageY = info && info.kind === "born" ? info.age / 12 : null;
    view.innerHTML = `<div class="card"><h2>Diş çıkarma zamanları</h2><p class="muted small" style="margin-top:2px">Dişlerin genellikle çıktığı yaşlar. Birkaç aylık farklar normaldir.</p>
      <div class="legend"><span><i style="background:var(--c1)"></i>Süt dişleri (20)</span><span><i style="background:var(--c2)"></i>Kalıcı dişler</span></div><div class="chart" id="teethChart"></div></div>
      <div class="card"><h2>Ağız-diş bakımı</h2><ul class="tip-list">
        <li><span>İlk dişten itibaren günde 2 kez fırçalama: 3 yaşına kadar <b>pirinç tanesi</b>, 3-6 yaş <b>bezelye tanesi</b> kadar florürlü macun.</span></li>
        <li><span>İlk diş hekimi ziyareti ilk diş çıktıktan sonra, en geç 1 yaşında.</span></li>
        <li><span>Biberonla uyutmaktan ve şekerli içeceklerden kaçının.</span></li></ul></div>`;
    const short = s => s.replace("Üst ", "Ü. ").replace("Alt ", "A. ").replace(" (alt-üst)", "");
    const rows = [
      ...window.TEETH.primary.map(t => ({ label: short(t.ad), full: "Süt · " + t.ad, from: t.from / 12, to: t.to / 12, color: "var(--c1)", tip: `${t.from}-${t.to}. aylar` })),
      ...window.TEETH.permanent.map(t => ({ label: short(t.ad), full: "Kalıcı · " + t.ad, from: t.from, to: t.to, color: "var(--c2)", tip: `${t.from}-${t.to} yaş` })),
    ];
    window.Charts.ranges($("#teethChart"), {
      rows, min: 0, max: 13, axisLabel: "Yaş (yıl)", labelW: 110, rowH: 24, ticks: [0, 2, 4, 6, 8, 10, 12],
      highlight: r => ageY != null && ageY >= r.from && ageY <= r.to,
      tipFmt: r => `<b>${r.full}</b><br>Çıkma zamanı: ${r.tip}`,
    });
  }

  // ---------- KAYNAKLAR ----------
  function renderSources() {
    view.innerHTML = `<div class="card"><p class="small muted" style="margin-top:0">Uygulamadaki bilgiler yalnızca uluslararası sağlık kuruluşları (DSÖ, CDC), meslek kuruluşları (AAP, ACOG, AASM, AAPD, ADA), T.C. Sağlık Bakanlığı ve hakemli bilimsel yayınlardan alınmıştır.</p>
      <ol class="sources">${Object.values(window.SOURCES).map(r => `<li>${esc(r.t)} ${r.u ? `<a href="${r.u}" target="_blank" rel="noopener">${esc(r.u.replace(/^https?:\/\//, ""))}</a>` : ""}</li>`).join("")}</ol></div>`;
  }

  // ---------- Genel ----------
  function hideTip() { const t = $("#tooltip"); if (t) t.hidden = true; }
  document.addEventListener("pointerdown", e => { if (!e.target.closest(".chart")) hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });
  let rt, lastW = innerWidth;
  window.addEventListener("resize", () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(render, 150); });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  render();
})();
