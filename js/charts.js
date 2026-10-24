// Hafif, bağımlılıksız SVG grafik yardımcıları + DSÖ LMS hesaplamaları.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const fmt = (v, d = 1) => v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- Tooltip ----------
  const tip = () => document.getElementById("tooltip");
  function showTip(html, evt) {
    const t = tip();
    t.innerHTML = html; t.hidden = false;
    const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    t.style.left = Math.max(8, x) + "px"; t.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { tip().hidden = true; }
  // dokunmatik ekranlar: dokunuş da ipucunu açsın
  const touch = h => h.addEventListener("pointerdown", ev => { h.dispatchEvent(new PointerEvent("pointermove", ev)); });

  // ---------- LMS ----------
  const GC = {
    lmsAt(table, age) {
      if (age < 0 || age > table.length - 1) return null;
      const a = Math.floor(age), b = Math.min(a + 1, table.length - 1), f = age - a;
      return table[a].map((v, i) => v + (table[b][i] - v) * f);
    },
    zToValue([L, M, S], z) {
      return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
    },
    // DSÖ yöntemi: kilo ve VKİ için |z| > 3 olduğunda düzeltilmiş hesaplama
    valueToZ(lms, y, restricted) {
      const [L, M, S] = lms;
      let z = L === 0 ? Math.log(y / M) / S : (Math.pow(y / M, L) - 1) / (L * S);
      if (restricted && Math.abs(z) > 3) {
        const sd = k => GC.zToValue(lms, k);
        if (z > 3) z = 3 + (y - sd(3)) / (sd(3) - sd(2));
        else z = -3 + (y - sd(-3)) / (sd(-2) - sd(-3));
      }
      return z;
    },
    normCdf(z) {
      // Abramowitz-Stegun 7.1.26
      const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
      const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
      return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
    },
  };

  function niceTicks(min, max, count = 6, cover = false) {
    const span = max - min, raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= count) || 10 * mag;
    const out = [];
    const end = cover ? Math.ceil(max / step - 1e-9) * step : max;
    for (let v = Math.ceil(min / step) * step; v <= end + 1e-9; v += step) out.push(+v.toFixed(6));
    return { ticks: out, step };
  }

  function frame(container, height, margin) {
    container.innerHTML = "";
    const W = Math.max(320, container.clientWidth || 700);
    const svg = el("svg", { viewBox: `0 0 ${W} ${height}`, role: "img" }, container);
    const iw = W - margin.l - margin.r, ih = height - margin.t - margin.b;
    const g = el("g", { transform: `translate(${margin.l},${margin.t})` }, svg);
    return { svg, g, W, iw, ih };
  }

  // ---------- Büyüme grafiği ----------
  const PCTS = [
    { z: -1.881, l: "P3" }, { z: -1.036, l: "P15" }, { z: 0, l: "P50" }, { z: 1.036, l: "P85" }, { z: 1.881, l: "P97" },
  ];
  const UNITS = { weight: "kg", height: "cm", head: "cm", bmi: "kg/m²" };
  const NAMES = { weight: "Kilo", height: "Boy", head: "Baş çevresi", bmi: "VKİ" };

  function ageLabel(m) {
    if (m < 24) return `${fmt(m, m % 1 ? 1 : 0)} ay`;
    const y = Math.floor(m / 12), r = Math.floor(m - y * 12 + 1e-6);
    return r ? `${y} yaş ${r} ay` : `${y} yaş`;
  }

  function growth(container, { ind, sex, range, points }) {
    const table = window.GROWTH_LMS[sex][ind];
    const maxAge = Math.min(range, table.length - 1);
    const narrow = (container.clientWidth || 700) < 560;
    const m = { t: 24, r: narrow ? 34 : 44, b: 40, l: 46 };
    const { svg, g, iw, ih } = frame(container, narrow ? 340 : 430, m);
    svg.setAttribute("aria-label", `${NAMES[ind]} için DSÖ persentil eğrileri`);

    const step = maxAge <= 24 ? 0.25 : 0.5;
    const ages = []; for (let a = 0; a <= maxAge + 1e-9; a += step) ages.push(+a.toFixed(2));
    const curves = PCTS.map(p => ages.map(a => [a, GC.zToValue(GC.lmsAt(table, a), p.z)]));
    const pts = (points || []).filter(p => p.age >= 0 && p.age <= maxAge && p.v != null);
    let yMin = Math.min(...curves[0].map(d => d[1]), ...pts.map(p => p.v));
    let yMax = Math.max(...curves[4].map(d => d[1]), ...pts.map(p => p.v));
    const pad = (yMax - yMin) * 0.04; yMin -= pad; yMax += pad;
    const yt = niceTicks(yMin, yMax, narrow ? 5 : 7);
    yMin = Math.min(yMin, yt.ticks[0]);
    const x = a => (a / maxAge) * iw;
    const y = v => ih - ((v - yMin) / (yMax - yMin)) * ih;

    // grid
    yt.ticks.forEach(t => {
      el("line", { x1: 0, x2: iw, y1: y(t), y2: y(t), class: "gridline" }, g);
      el("text", { x: -8, y: y(t) + 4, "text-anchor": "end" }, g).textContent = fmt(t, t % 1 ? 1 : 0);
    });
    const xStep = maxAge <= 24 ? 3 : 12;
    for (let a = 0; a <= maxAge; a += xStep) {
      el("line", { x1: x(a), x2: x(a), y1: 0, y2: ih, class: "gridline" }, g);
      const lbl = maxAge <= 24 ? `${a}` : `${a / 12}`;
      el("text", { x: x(a), y: ih + 16, "text-anchor": "middle" }, g).textContent = lbl;
    }
    el("text", { x: iw / 2, y: ih + 34, "text-anchor": "middle", class: "axis-label" }, g).textContent = maxAge <= 24 ? "Yaş (ay)" : "Yaş (yıl)";
    el("text", { x: -m.l + 2, y: -12, class: "axis-label" }, g).textContent = UNITS[ind];

    // bands
    const area = (lo, hi) => "M" + lo.map(d => `${x(d[0])},${y(d[1])}`).join("L") + "L" + hi.slice().reverse().map(d => `${x(d[0])},${y(d[1])}`).join("L") + "Z";
    el("path", { d: area(curves[0], curves[4]), fill: "var(--band-outer)" }, g);
    el("path", { d: area(curves[1], curves[3]), fill: "var(--band-inner)", opacity: 0.75 }, g);
    const line = c => "M" + c.map(d => `${x(d[0]).toFixed(1)},${y(d[1]).toFixed(1)}`).join("L");
    curves.forEach((c, i) => {
      el("path", { d: line(c), fill: "none", stroke: i === 2 ? "var(--curve-mid)" : "var(--curve)", "stroke-width": i === 2 ? 2 : 1.2 }, g);
      const last = c[c.length - 1];
      el("text", { x: iw + 5, y: y(last[1]) + 4, class: i === 2 ? "label-strong" : "" }, g).textContent = PCTS[i].l;
    });
    if (ind === "height" && maxAge >= 24) {
      el("line", { x1: x(24), x2: x(24), y1: 0, y2: ih, stroke: "var(--muted)", "stroke-dasharray": "3 4" }, g);
      el("text", { x: x(24) + 4, y: 12 }, g).textContent = "yatarak → ayakta";
    }
    if (maxAge > 60 && ind !== "head") {
      el("line", { x1: x(60), x2: x(60), y1: 0, y2: ih, stroke: "var(--muted)", "stroke-dasharray": "3 4" }, g);
      el("text", { x: x(60) + 4, y: ih - 6 }, g).textContent = "Standart (2006) → Referans (2007)";
    }

    // child's points
    if (pts.length) {
      const sorted = pts.slice().sort((a, b) => a.age - b.age);
      if (sorted.length > 1) el("path", { d: "M" + sorted.map(p => `${x(p.age)},${y(p.v)}`).join("L"), fill: "none", stroke: "var(--point)", "stroke-width": 2 }, g);
      sorted.forEach(p => {
        el("circle", { cx: x(p.age), cy: y(p.v), r: 5.5, fill: "var(--point)", stroke: "var(--surface)", "stroke-width": 2 }, g);
      });
    }

    // crosshair
    const cross = el("line", { y1: 0, y2: ih, stroke: "var(--text-2)", "stroke-width": 1, visibility: "hidden" }, g);
    const hit = el("rect", { x: 0, y: 0, width: iw, height: ih, fill: "transparent" }, g);
    hit.addEventListener("pointermove", e => {
      const r = hit.getBoundingClientRect();
      const a = Math.max(0, Math.min(maxAge, ((e.clientX - r.left) / r.width) * maxAge));
      const near = pts.find(p => Math.abs(x(p.age) - x(a)) < 8);
      const age = near ? near.age : a;
      cross.setAttribute("x1", x(age)); cross.setAttribute("x2", x(age)); cross.setAttribute("visibility", "visible");
      const lms = GC.lmsAt(table, age);
      const lo = GC.zToValue(lms, PCTS[0].z), mid = GC.zToValue(lms, 0), hi = GC.zToValue(lms, PCTS[4].z);
      let html = `<b>${ageLabel(age)}</b><br>Ortalama: ${fmt(mid, 1)} ${UNITS[ind]}<br>Normal aralık: ${fmt(lo, 1)} – ${fmt(hi, 1)} ${UNITS[ind]}`;
      if (near) {
        const z = GC.valueToZ(lms, near.v, ind === "weight" || ind === "bmi");
        html = `<b>Sizin ölçümünüz · ${ageLabel(near.age)}</b><br>${NAMES[ind]}: ${fmt(near.v, ind === "weight" ? 2 : 1)} ${UNITS[ind]}<br>Yaşıtlarının yaklaşık %${pctText(z)}'inden büyük<hr style="border:0;border-top:1px solid currentColor;opacity:.2;margin:5px 0">` + html.split("<br>").slice(1).join("<br>");
      }
      showTip(html, e);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); hideTip(); });
    touch(hit);
  }

  function pctText(z) {
    const p = GC.normCdf(z) * 100;
    if (p < 0.1) return "< 0,1";
    if (p > 99.9) return "> 99,9";
    return fmt(p, p < 10 || p > 90 ? 1 : 0);
  }

  // ---------- Basit çizgi grafiği (fetal ağırlık) ----------
  function line(container, { data, xLabel, yLabel, xFmt, yFmt, tipFmt, xTicks, markX }) {
    const narrow = (container.clientWidth || 700) < 560;
    const m = { t: 26, r: 20, b: 40, l: 56 };
    const { g, iw, ih } = frame(container, narrow ? 300 : 360, m);
    const xs = data.map(d => d[0]), ys = data.map(d => d[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const yt = niceTicks(0, Math.max(...ys), 6, true);
    const yMax = yt.ticks[yt.ticks.length - 1];
    const x = v => ((v - x0) / (x1 - x0)) * iw, y = v => ih - (v / yMax) * ih;
    yt.ticks.forEach(t => {
      el("line", { x1: 0, x2: iw, y1: y(t), y2: y(t), class: t === 0 ? "baseline" : "gridline" }, g);
      el("text", { x: -8, y: y(t) + 4, "text-anchor": "end" }, g).textContent = yFmt(t);
    });
    (xTicks || xs).forEach(v => el("text", { x: x(v), y: ih + 16, "text-anchor": "middle" }, g).textContent = xFmt(v));
    el("text", { x: iw / 2, y: ih + 34, "text-anchor": "middle", class: "axis-label" }, g).textContent = xLabel;
    el("text", { x: -m.l + 2, y: -14, class: "axis-label" }, g).textContent = yLabel;
    (markX || []).forEach(mk => {
      el("rect", { x: x(mk.from), y: 0, width: x(mk.to) - x(mk.from), height: ih, fill: mk.fill, opacity: 0.09 }, g);
      el("text", { x: x(mk.from) + 4, y: 12 }, g).textContent = mk.label;
    });
    el("path", { d: `M${x(x0)},${y(0)}L` + data.map(d => `${x(d[0])},${y(d[1])}`).join("L") + `L${x(x1)},${y(0)}Z`, fill: "var(--c5)", opacity: 0.12 }, g);
    el("path", { d: "M" + data.map(d => `${x(d[0])},${y(d[1])}`).join("L"), fill: "none", stroke: "var(--c5)", "stroke-width": 2 }, g);
    const dot = el("circle", { r: 5, fill: "var(--c5)", stroke: "var(--surface)", "stroke-width": 2, visibility: "hidden" }, g);
    const cross = el("line", { y1: 0, y2: ih, stroke: "var(--text-2)", visibility: "hidden" }, g);
    const hit = el("rect", { x: 0, y: 0, width: iw, height: ih, fill: "transparent" }, g);
    hit.addEventListener("pointermove", e => {
      const r = hit.getBoundingClientRect();
      const v = x0 + ((e.clientX - r.left) / r.width) * (x1 - x0);
      const d = data.reduce((a, b) => Math.abs(b[0] - v) < Math.abs(a[0] - v) ? b : a);
      cross.setAttribute("x1", x(d[0])); cross.setAttribute("x2", x(d[0])); cross.setAttribute("visibility", "visible");
      dot.setAttribute("cx", x(d[0])); dot.setAttribute("cy", y(d[1])); dot.setAttribute("visibility", "visible");
      showTip(tipFmt(d), e);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); hideTip(); });
    touch(hit);
  }

  // ---------- Aralık çubukları (uyku, kilo alımı, diş) ----------
  function ranges(container, { rows, min = 0, max, unit, axisLabel, tickFmt, labelW, highlight, rowH = 34, tipFmt, ticks }) {
    const narrow = (container.clientWidth || 700) < 560;
    const lw = narrow ? Math.min(labelW, 120) : labelW;
    const m = { t: 8, r: 24, b: 40, l: lw };
    const { g, iw, ih } = frame(container, rows.length * rowH + 48, m);
    const x = v => ((v - min) / (max - min)) * iw;
    const tk = ticks || niceTicks(min, max, narrow ? 5 : 8).ticks;
    tk.forEach(t => {
      el("line", { x1: x(t), x2: x(t), y1: 0, y2: ih, class: "gridline" }, g);
      el("text", { x: x(t), y: ih + 16, "text-anchor": "middle" }, g).textContent = tickFmt ? tickFmt(t) : t;
    });
    el("text", { x: iw / 2, y: ih + 34, "text-anchor": "middle", class: "axis-label" }, g).textContent = axisLabel;
    rows.forEach((r, i) => {
      const cy = i * rowH + rowH / 2;
      const hl = highlight && highlight(r);
      if (hl) el("rect", { x: -lw, y: i * rowH + 1, width: iw + lw, height: rowH - 2, fill: "var(--c3)", opacity: 0.1, rx: 6 }, g);
      const t = el("text", { x: -10, y: cy + 4, "text-anchor": "end", class: hl ? "label-strong" : "axis-label" }, g);
      t.textContent = r.label;
      const bh = Math.min(16, rowH - 12);
      const bar = el("rect", { x: x(r.from), y: cy - bh / 2, width: Math.max(4, x(r.to) - x(r.from)), height: bh, rx: 4, fill: r.color }, g);
      if (r.text) {
        const inside = x(r.to) - x(r.from) > 70;
        el("text", { x: inside ? x(r.from) + 8 : x(r.to) + 6, y: cy + 4, class: inside ? "" : "axis-label", fill: inside ? "#fff" : null, style: inside ? "fill:#fff;font-weight:600" : "" }, g).textContent = r.text;
      }
      const hit = el("rect", { x: -lw, y: i * rowH, width: iw + lw, height: rowH, fill: "transparent" }, g);
      hit.addEventListener("pointermove", e => { bar.setAttribute("opacity", 0.85); showTip(tipFmt(r), e); });
      hit.addEventListener("pointerleave", () => { bar.removeAttribute("opacity"); hideTip(); });
      touch(hit);
    });
  }

  window.GC = GC;
  window.Charts = { growth, line, ranges, pctText, ageLabel, fmt, NAMES, UNITS };
})();
