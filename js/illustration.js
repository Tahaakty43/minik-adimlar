// Animasyonlu çocuk/fetüs çizimleri (bağımlılıksız SVG).
// Vücut oranları yaşa göre değişir: baş boyu yenidoğanda boyun ~1/4'ü, 2 yaşta ~1/5'i,
// 6 yaşta ~1/6'sı, 10 yaşta ~1/6,5'i; bacaklar giderek uzar. Figür, bulunduğu evrenin
// tipik becerisini (dönme, emekleme, yürüme, zıplama...) canlandırır.
(function () {
  const rad = d => (d * Math.PI) / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function interp(tbl, x) {
    if (x <= tbl[0][0]) return tbl[0][1];
    for (let i = 1; i < tbl.length; i++) if (x <= tbl[i][0]) {
      const [x0, y0] = tbl[i - 1], [x1, y1] = tbl[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
    return tbl[tbl.length - 1][1];
  }
  const HEAD = [[0, 0.25], [24, 0.2], [72, 0.167], [120, 0.153]];
  const LEG = [[0, 0.32], [24, 0.37], [72, 0.43], [120, 0.46]];
  const ARM = [[0, 0.33], [24, 0.36], [72, 0.4], [120, 0.42]];
  const THICK = [[0, 0.1], [24, 0.088], [72, 0.072], [120, 0.064]];
  const TORSOW = [[0, 0.22], [24, 0.19], [72, 0.15], [120, 0.14]];

  function props(age, H) {
    const head = interp(HEAD, age) * H, leg = interp(LEG, age) * H, neck = (age < 12 ? 0.01 : 0.025) * H;
    return { H, age, r: head / 2, leg, neck, torso: H - head - leg - neck, arm: interp(ARM, age) * H, th: interp(THICK, age) * H, tw: interp(TORSOW, age) * H };
  }
  const dL = a => [Math.sin(rad(a)), Math.cos(rad(a))];      // uzuv: 0 = aşağı, 90 = ileri
  const dT = a => [Math.sin(rad(a)), -Math.cos(rad(a))];     // gövde: 0 = yukarı, 90 = ileri
  const add = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k];
  const f = n => n.toFixed(2);

  // ---------- Pozlar ----------
  const S = Math.sin, C = Math.cos, TAU = Math.PI * 2;
  const POSES = {
    stand: (t) => ({ a: 0, ht: 0, aF: [8 + 3 * S(t * 2), 8], aB: [-6, 8], lF: [4, 0], lB: [-4, 0], breathe: 1 }),
    swaddle: (t) => ({ a: 90, ht: 0, aF: [-90, 0], aB: [-90, 0], lF: [-90, 0], lB: [-90, 0], swaddle: true, sleep: true, breathe: 1 + 0.035 * S(t * 2.2) }),
    tummy: (t) => {
      const s = S(t * 1.6);
      return { a: 86, ht: -52 + 14 * s, aF: [12, 78], aB: [6, 82], lF: [-86 + 7 * S(t * 3), -12], lB: [-92 - 7 * S(t * 3), -18] };
    },
    sit: (t) => ({ a: 6 + 2 * S(t), ht: -4, aF: [62 + 16 * S(t * 7), 55], aB: [22, 8], lF: [86, 8], lB: [80, 12], rattle: true }),
    crawl: (t, P) => {
      const ph = t * TAU * 0.9, sw = S(ph);
      const a = 90 - (Math.asin(clamp((P.arm * 0.95 - P.leg * 0.5) / P.torso, -0.9, 0.9)) * 180) / Math.PI;
      return { a, ht: -(a - 25), aF: [16 * sw, 8], aB: [-16 * sw, 8], lF: [-14 * sw, -92], lB: [14 * sw, -92], shift: 0.5 };
    },
    cruise: (t) => {
      const s = S(t * TAU * 0.6);
      return { a: 8, ht: -4, aF: [78, 12], aB: [72, 18], lF: [9 + 5 * s, -4], lB: [-7 + 5 * s, -6], sofa: true };
    },
    walk: (t) => {
      const ph = t * TAU * 1.3, s = S(ph);
      return { a: 3, ht: 0, aF: [118 + 8 * s, 28], aB: [104 - 8 * s, 28], lF: [24 * s, -8 - 22 * Math.max(0, C(ph))], lB: [-24 * s, -8 - 22 * Math.max(0, -C(ph))] };
    },
    kick: (t) => {
      const p = (t % 1.8) / 1.8;
      let th, bend;
      if (p < 0.4) { th = lerp(0, -38, p / 0.4); bend = -55 * (p / 0.4); }
      else if (p < 0.58) { const q = (p - 0.4) / 0.18; th = lerp(-38, 70, q); bend = lerp(-55, -2, q); }
      else { const q = (p - 0.58) / 0.42; th = lerp(70, 0, q); bend = -2 * (1 - q); }
      return { a: -4 + (th > 20 ? -6 : 0), ht: 0, aF: [-35, 20], aB: [45, 25], lF: [th, bend], lB: [-6, 0], ball: { mode: "kick", p } };
    },
    jump: (t, P) => {
      const p = (t % 1.2) / 1.2;
      let lift = 0, c = 0;
      if (p < 0.3) c = S((p / 0.3) * Math.PI);
      else if (p < 0.78) lift = S(((p - 0.3) / 0.48) * Math.PI) * 0.2 * P.H;
      else c = S(((p - 0.78) / 0.22) * Math.PI) * 0.6;
      const up = lift / (0.2 * P.H);
      return { a: 6 + 18 * c, ht: -6 * c, aF: [lerp(-25, 155, up) - 20 * c, 15], aB: [lerp(-35, 140, up) - 20 * c, 15], lF: [40 * c + 6, -80 * c], lB: [36 * c - 4, -76 * c], lift };
    },
    catch: (t) => {
      const p = (t % 2.2) / 2.2;
      const ready = p < 0.62 ? 0 : 1;
      return { a: 3, ht: -3, aF: [82 - ready * 8, 18 + ready * 30], aB: [76 - ready * 8, 24 + ready * 30], lF: [10, -6], lB: [-9, -3], ball: { mode: "catch", p } };
    },
    hop: (t, P) => {
      const ph = t * TAU * 1.4;
      return { a: 6, ht: 0, aF: [72 + 14 * S(ph), 18], aB: [-55 - 14 * S(ph), 18], lF: [4, -10 + 10 * Math.abs(S(ph))], lB: [-18, -105], lift: Math.abs(S(ph)) * 0.09 * P.H };
    },
    school: (t) => {
      const ph = t * TAU * 1.0, s = S(ph);
      return { a: 4, ht: 0, aF: [-20 * s, 22], aB: [20 * s, 22], lF: [22 * s, -6 - 22 * Math.max(0, C(ph))], lB: [-22 * s, -6 - 22 * Math.max(0, -C(ph))], backpack: true };
    },
    run: (t, P) => {
      const ph = t * TAU * 1.6, s = S(ph);
      return { a: 14, ht: -8, aF: [-38 * s, 95], aB: [38 * s, 95], lF: [38 * s, -20 - 70 * Math.max(0, C(ph))], lB: [-38 * s, -20 - 70 * Math.max(0, -C(ph))], lift: Math.abs(C(ph)) * 0.05 * P.H };
    },
  };

  const STAGE_POSE = { m0: "swaddle", m1: "tummy", m4: "sit", m7: "crawl", m10: "cruise", y1: "walk", y2: "kick", y3: "jump", o4: "catch", o5: "hop", s6: "school", s8: "run" };
  const STAGE_AGE = { m0: 0.5, m1: 2, m4: 5, m7: 8, m10: 11, y1: 15, y2: 21, y3: 30, o4: 42, o5: 60, s6: 84, s8: 108 };
  const SKIN = { a: ["#f6d5b8", "#e3b48f"], b: ["#e9b98f", "#cf9b72"], c: ["#c98e62", "#ad7449"], d: ["#8d5a3b", "#734628"] };
  const HAIR = { a: "#4a3426", b: "#3b2a20", c: "#2a1d16", d: "#1d1410" };

  // ---------- Figür ----------
  function figureParts(spec, t) {
    const P = props(spec.age, spec.H || 100);
    const pose = POSES[spec.pose](t, P);
    const [skin, skinD] = SKIN[spec.skin || "b"], hair = HAIR[spec.skin || "b"];
    const baby = spec.age < 12;
    const shirt = spec.shirt || "#2a78d6", shirtD = spec.shirtD || shirt;
    const pants = baby ? shirt : (spec.pants || "#3b4a6b"), pantsD = baby ? shirtD : (spec.pantsD || "#2c3852");
    const shoe = baby ? skin : "#4b3b35";
    const hip = [0, 0];
    const torsoTop = add(hip, dT(pose.a), P.torso);
    const shoulder = add(hip, dT(pose.a), Math.max(P.torso - P.tw * 0.32, P.torso * 0.6));
    const neckTop = add(torsoTop, dT(pose.a), P.neck);
    const head = add(neckTop, dT(pose.a + pose.ht), P.r * 0.92);
    const limb = (root, [u, l], len) => { const k = add(root, dL(u), len / 2); return [root, k, add(k, dL(u + l), len / 2), u + l]; };
    const legF = limb(hip, pose.lF, P.leg), legB = limb(hip, pose.lB, P.leg);
    const armF = limb(shoulder, pose.aF, P.arm), armB = limb(shoulder, pose.aB, P.arm);

    // zemin: en alçak nokta
    const pts = [hip, torsoTop, ...legF.slice(0, 3), ...legB.slice(0, 3), ...armF.slice(0, 3), ...armB.slice(0, 3)];
    let maxY = Math.max(...pts.map(p => p[1])) + P.th * 0.5;
    maxY = Math.max(maxY, head[1] + P.r, hip[1] + P.tw * 0.5);
    const minY = Math.min(...pts.map(p => p[1]), head[1] - P.r * 1.1);
    const lift = pose.lift || 0;
    const ground = maxY + lift;

    const out = { back: [], body: [], front: [], fx: [] };
    const seg = (a, b, w, c) => `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke="${c}" stroke-width="${f(w)}" stroke-linecap="round" fill="none"/>`;
    const limbSvg = (L, w, c1, c2, endC, foot) => {
      let s = seg(L[0], L[1], w, c1) + seg(L[1], L[2], w * 0.92, c2);
      if (foot) {
        const fd = dL(L[3] + 90);
        s += seg(L[2], add(L[2], fd, w * 0.75), w * 0.95, endC);
      } else s += `<circle cx="${f(L[2][0])}" cy="${f(L[2][1])}" r="${f(w * 0.56)}" fill="${endC}"/>`;
      return s;
    };

    // gölge
    const shW = (Math.abs(Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0]))) * 0.55 + P.r) * (1 - lift / (P.H * 0.5));
    const cx0 = (hip[0] + torsoTop[0]) / 2;
    out.back.push(`<ellipse cx="${f(cx0)}" cy="${f(ground)}" rx="${f(shW)}" ry="${f(P.H * 0.025)}" fill="#000" opacity=".1"/>`);

    if (pose.swaddle) {
      const feetEnd = add(hip, dL(-90), P.leg * 0.85);
      const w = P.tw * 1.25 * pose.breathe;
      out.body.push(seg(feetEnd, torsoTop, w, spec.blanket || "#f4d8e6"));
      out.body.push(`<path d="M${f(hip[0] - P.leg * 0.2)} ${f(hip[1] - w / 2)}q${f(P.leg * 0.25)} ${f(w * 0.5)} ${f(P.leg * 0.5)} ${f(w)}" stroke="#000" stroke-opacity=".12" stroke-width="${f(P.th * 0.25)}" fill="none"/>`);
    } else {
      // sırt çantası (gövdenin arkası)
      if (pose.backpack) {
        const mid = add(hip, dT(pose.a), P.torso * 0.55);
        const back = add(mid, dT(pose.a - 90), P.tw * 0.62);
        out.back.push(`<rect x="${f(back[0] - P.tw * 0.32)}" y="${f(back[1] - P.torso * 0.32)}" width="${f(P.tw * 0.58)}" height="${f(P.torso * 0.62)}" rx="${f(P.tw * 0.18)}" fill="${spec.bag || "#eb6834"}" transform="rotate(${f(pose.a)} ${f(back[0])} ${f(back[1])})"/>`);
      }
      out.back.push(limbSvg(legB, P.th, pantsD, pantsD, baby ? skinD : "#3d302b", true));
      out.back.push(limbSvg(armB, P.th * 0.9, shirtD, skinD, skinD, false));
      out.body.push(seg(add(hip, dT(pose.a), P.tw * 0.18), add(torsoTop, dT(pose.a), -P.tw * 0.3), P.tw, shirt));
      if (!baby) out.body.push(seg(add(hip, dT(pose.a), P.tw * 0.02), add(hip, dT(pose.a), P.tw * 0.28), P.tw * 0.86, pants));
      out.body.push(limbSvg(legF, P.th, pants, pants, shoe, true));
      if (pose.backpack) {
        const s0 = add(shoulder, dT(pose.a - 90), -P.tw * 0.1);
        out.body.push(seg(add(s0, dT(pose.a), P.tw * 0.1), add(hip, dT(pose.a), P.torso * 0.35), P.th * 0.32, spec.bagD || "#c2501f"));
      }
      out.front.push(limbSvg(armF, P.th * 0.9, shirt, skin, skin, false));
    }

    // baş
    const [hx, hy] = head, r = P.r;
    const H = [];
    H.push(`<circle cx="${f(hx - r * 0.93)}" cy="${f(hy + r * 0.08)}" r="${f(r * 0.2)}" fill="${skinD}"/><circle cx="${f(hx + r * 0.93)}" cy="${f(hy + r * 0.08)}" r="${f(r * 0.2)}" fill="${skinD}"/>`);
    const girl = spec.sex === "f";
    if (!baby && girl) {
      if (spec.age < 60) H.push(`<circle cx="${f(hx - r * 1.08)}" cy="${f(hy - r * 0.35)}" r="${f(r * 0.32)}" fill="${hair}"/><circle cx="${f(hx + r * 1.08)}" cy="${f(hy - r * 0.35)}" r="${f(r * 0.32)}" fill="${hair}"/>`);
      else H.push(`<path d="M${f(hx - r * 0.7)} ${f(hy - r * 0.5)}q${f(-r * 0.9)} ${f(r * 0.3)} ${f(-r * 0.75)} ${f(r * 1.5)}q${f(r * 0.4)} ${f(-r * 0.1)} ${f(r * 0.65)} ${f(-r * 0.9)}z" fill="${hair}"/>`);
    }
    H.push(`<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(r)}" fill="${skin}"/>`);
    if (spec.age < 9) {
      H.push(`<path d="M${f(hx - r * 0.1)} ${f(hy - r * 0.96)}q${f(r * 0.32)} ${f(-r * 0.38)} ${f(r * 0.38)} ${f(r * 0.02)}" stroke="${hair}" stroke-width="${f(r * 0.12)}" stroke-linecap="round" fill="none"/>`);
    } else {
      const fr = spec.age < 24 ? 0.55 : 0.4;
      H.push(`<path d="M${f(hx - r * 1.01)} ${f(hy - r * 0.05)}A${f(r)} ${f(r)} 0 0 1 ${f(hx + r * 1.01)} ${f(hy - r * 0.05)}Q${f(hx + r * 0.9)} ${f(hy - r * fr)} ${f(hx + r * 0.35)} ${f(hy - r * (fr + 0.08))}Q${f(hx - r * 0.1)} ${f(hy - r * (fr - 0.08))} ${f(hx - r * 0.45)} ${f(hy - r * (fr + 0.02))}Q${f(hx - r * 0.9)} ${f(hy - r * (fr - 0.1))} ${f(hx - r * 1.01)} ${f(hy - r * 0.05)}Z" fill="${hair}"/>`);
    }
    const ex = hx + r * 0.1, ey = hy + r * 0.05, eo = r * 0.34;
    const blink = (t % 3.7) < 0.13;
    if (pose.sleep || blink) {
      [ex - eo, ex + eo].forEach(x => H.push(`<path d="M${f(x - r * 0.12)} ${f(ey)}q${f(r * 0.12)} ${f(r * 0.1)} ${f(r * 0.24)} 0" stroke="#2b211c" stroke-width="${f(r * 0.06)}" stroke-linecap="round" fill="none"/>`));
    } else {
      [ex - eo, ex + eo].forEach(x => H.push(`<circle cx="${f(x)}" cy="${f(ey)}" r="${f(r * 0.1)}" fill="#2b211c"/><circle cx="${f(x + r * 0.035)}" cy="${f(ey - r * 0.035)}" r="${f(r * 0.03)}" fill="#fff"/>`));
    }
    H.push(`<circle cx="${f(ex - eo - r * 0.06)}" cy="${f(ey + r * 0.28)}" r="${f(r * 0.13)}" fill="#f08a8a" opacity=".45"/><circle cx="${f(ex + eo + r * 0.06)}" cy="${f(ey + r * 0.28)}" r="${f(r * 0.13)}" fill="#f08a8a" opacity=".45"/>`);
    H.push(pose.sleep
      ? `<path d="M${f(ex - r * 0.1)} ${f(ey + r * 0.4)}q${f(r * 0.1)} ${f(r * 0.06)} ${f(r * 0.2)} 0" stroke="#7a4a3a" stroke-width="${f(r * 0.06)}" stroke-linecap="round" fill="none"/>`
      : `<path d="M${f(ex - r * 0.2)} ${f(ey + r * 0.34)}q${f(r * 0.2)} ${f(r * 0.2)} ${f(r * 0.4)} 0" stroke="#7a4a3a" stroke-width="${f(r * 0.07)}" stroke-linecap="round" fill="${pose.lift > 0 || spec.pose === "jump" ? "#c4544f" : "none"}"/>`);
    out.body.push(H.join(""));

    // aksesuarlar
    if (pose.rattle) {
      const h = armF[2], d = dL(pose.aF[0] + pose.aF[1] - 180);
      const top = add(h, d, P.r * 0.9);
      out.front.push(seg(h, top, P.th * 0.25, "#eda100") + `<circle cx="${f(top[0])}" cy="${f(top[1])}" r="${f(P.r * 0.3)}" fill="#e87ba4"/>`);
    }
    if (pose.sofa) {
      const h = armF[2], top = h[1] + P.th * 0.55;
      out.back.unshift(`<rect x="${f(h[0] - P.r * 0.6)}" y="${f(top)}" width="${f(P.H * 0.42)}" height="${f(ground - top)}" rx="${f(P.r * 0.35)}" fill="#c9a37a"/><rect x="${f(h[0] - P.r * 0.6)}" y="${f(top)}" width="${f(P.H * 0.42)}" height="${f(P.r * 0.5)}" rx="${f(P.r * 0.25)}" fill="#ddb98f"/>`);
    }
    if (pose.ball) {
      const br = P.H * 0.075;
      let bx, by, op = 1, rot = 0;
      if (pose.ball.mode === "kick") {
        const p = pose.ball.p, base = hip[0] + P.leg * 0.42 + br;
        const k = Math.max(0, p - 0.53);
        bx = base + k * P.H * 2.2; by = ground - br - Math.sin(Math.min(1, k * 3) * Math.PI) * P.H * 0.12;
        op = p > 0.9 ? (1 - p) / 0.1 : p < 0.08 ? p / 0.08 : 1; rot = k * 900;
      } else {
        const p = pose.ball.p, h = armF[2], q = clamp(p / 0.62, 0, 1);
        bx = lerp(h[0] + P.H * 0.95, h[0] + br * 0.6, q); by = lerp(h[1] - P.H * 0.45, h[1] - br * 0.2, q) - Math.sin(q * Math.PI) * P.H * 0.25;
        op = p > 0.9 ? (1 - p) / 0.1 : p < 0.06 ? p / 0.06 : 1; rot = q * 360;
      }
      out.front.push(`<g opacity="${f(op)}" transform="rotate(${f(rot)} ${f(bx)} ${f(by)})"><circle cx="${f(bx)}" cy="${f(by)}" r="${f(br)}" fill="#fff" stroke="#2b211c" stroke-width="${f(br * 0.1)}"/><path d="M${f(bx - br)} ${f(by)}h${f(br * 2)}M${f(bx)} ${f(by - br)}v${f(br * 2)}" stroke="#e34948" stroke-width="${f(br * 0.18)}"/></g>`);
    }
    if (pose.sleep) {
      const z = (t * 0.6) % 1;
      out.fx.push(`<text x="${f(hx + r * 0.6 + z * r)}" y="${f(hy - r * 1.3 - z * r * 1.6)}" font-size="${f(r * 0.75)}" font-weight="700" fill="#4a3aa7" opacity="${f(1 - z)}">z</text>`);
      out.fx.push(`<text x="${f(hx + r * 1.2 + z * r * 0.6)}" y="${f(hy - r * 2 - z * r)}" font-size="${f(r * 0.5)}" font-weight="700" fill="#4a3aa7" opacity="${f((1 - z) * 0.7)}">z</text>`);
    }
    const xs = pts.map(p => p[0]).concat([hx - r, hx + r]);
    return { P, out, ground, minY: minY - lift, minX: Math.min(...xs), maxX: Math.max(...xs), anchorX: pose.shift ? (hip[0] + shoulder[0]) * pose.shift : cx0 };
  }

  // ---------- Fetüs ----------
  function fetusSvg(week, t, size) {
    const c = size / 2, R = size * 0.44;
    const k = clamp(0.28 + ((week - 6) / 34) * 0.72, 0.28, 1);
    const headDown = week >= 32;
    const beat = 1 + 0.18 * Math.max(0, Math.sin(t * Math.PI * 2 * 2.3)) ** 8;
    const float = Math.sin(t * 0.9) * 4 + (headDown ? 180 : 0);
    const u = R * 0.62 * k;
    const skin = "#f2b8a0", skinD = "#e39d85";
    const g = [];
    g.push(`<defs><radialGradient id="womb" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fde3e9"/><stop offset=".75" stop-color="#f7bfcd"/><stop offset="1" stop-color="#ec9fb4"/></radialGradient></defs>`);
    g.push(`<circle cx="${c}" cy="${c}" r="${R}" fill="url(#womb)"/>`);
    const pr = R * 0.86, pa = a => [c + pr * Math.cos(rad(a)), c + pr * Math.sin(rad(a))];
    const [p1, p2] = [pa(-80), pa(-20)];
    g.push(`<path d="M${f(p1[0])} ${f(p1[1])}A${f(pr)} ${f(pr)} 0 0 1 ${f(p2[0])} ${f(p2[1])}" stroke="#d9768f" stroke-width="${f(R * 0.14)}" stroke-linecap="round" fill="none"/>`);
    for (let i = 0; i < 5; i++) {
      const a = t * 0.3 + i * 1.3, bx = c + Math.cos(a * 1.1 + i) * R * 0.7, by = c + Math.sin(a + i * 2) * R * 0.7;
      g.push(`<circle cx="${f(bx)}" cy="${f(by)}" r="${f(R * 0.025 + i * 0.6)}" fill="#fff" opacity=".45"/>`);
    }
    // göbek kordonu
    const cordEnd = pa(-50);
    g.push(`<g transform="rotate(${f(float)} ${c} ${c})">`);
    const belly = [c + u * 0.2, c + u * 0.25];
    g.push(`<path d="M${f(belly[0])} ${f(belly[1])}C${f(c + u * 1.1)} ${f(c + u * 0.6)} ${f(cordEnd[0] - R * 0.5)} ${f(cordEnd[1] + R * 0.6)} ${f(cordEnd[0])} ${f(cordEnd[1])}" stroke="#c9a0d6" stroke-width="${f(u * 0.12)}" fill="none" stroke-linecap="round" transform="rotate(${f(-float)} ${c} ${c})"/>`);
    // gövde (kıvrık)
    g.push(`<ellipse cx="${f(c - u * 0.1)}" cy="${f(c + u * 0.32)}" rx="${f(u * 0.55)}" ry="${f(u * 0.5)}" fill="${skin}" transform="rotate(-25 ${f(c)} ${f(c)})"/>`);
    // bacak (karına çekik)
    g.push(`<path d="M${f(c - u * 0.45)} ${f(c + u * 0.62)}Q${f(c + u * 0.4)} ${f(c + u * 0.95)} ${f(c + u * 0.38)} ${f(c + u * 0.45)}" stroke="${skinD}" stroke-width="${f(u * 0.28)}" stroke-linecap="round" fill="none"/>`);
    // baş
    const hr = u * (0.5 - (k - 0.28) * 0.12);
    g.push(`<circle cx="${f(c + u * 0.05)}" cy="${f(c - u * 0.42)}" r="${f(hr)}" fill="${skin}"/>`);
    g.push(`<path d="M${f(c + u * 0.2)} ${f(c - u * 0.4)}q${f(u * 0.08)} ${f(u * 0.06)} ${f(u * 0.16)} 0" stroke="#7a4a3a" stroke-width="${f(u * 0.04)}" fill="none" stroke-linecap="round"/>`);
    // kol
    g.push(`<path d="M${f(c - u * 0.05)} ${f(c - u * 0.02)}Q${f(c + u * 0.35)} ${f(c + u * 0.05)} ${f(c + u * 0.32)} ${f(c - u * 0.22)}" stroke="${skinD}" stroke-width="${f(u * 0.18)}" stroke-linecap="round" fill="none"/>`);
    // kalp
    g.push(`<path transform="translate(${f(c - u * 0.05)} ${f(c + u * 0.15)}) scale(${f(u * 0.006 * beat)})" d="M0 6C-10-4-8-12 0-6C8-12 10-4 0 6Z" fill="#e34948"/>`);
    g.push(`</g>`);
    return g.join("");
  }

  // ---------- Montaj ve döngü ----------
  const live = new Set();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rafOn = false, lastT = 0;
  function loop(ts) {
    if (ts - lastT > 33) {
      lastT = ts;
      live.forEach(m => {
        if (!m.el.isConnected) { live.delete(m); return; }
        if (m.el.offsetParent === null) return;
        m.draw(ts / 1000);
      });
    }
    if (live.size) requestAnimationFrame(loop); else rafOn = false;
  }
  function register(m, animate) {
    m.draw(0.4);
    if (animate && !reduce) { live.add(m); if (!rafOn) { rafOn = true; requestAnimationFrame(loop); } }
  }

  // Evre karakteri (kutuya sığdırılmış)
  function mountStage(el, stageId, opts = {}) {
    const W = opts.w || 240, Hh = opts.h || 200;
    const isFetus = /^t[123]$/.test(stageId);
    if (isFetus) {
      const week = opts.week || { t1: 11, t2: 22, t3: 35 }[stageId];
      register({ el, draw: t => { el.innerHTML = `<svg viewBox="0 0 ${Hh} ${Hh}" class="illu" role="img" aria-label="${week}. haftada bebek">${fetusSvg(week, t, Hh)}</svg>`; } }, opts.animate !== false);
      return;
    }
    const spec = { age: opts.age != null ? opts.age : STAGE_AGE[stageId], pose: STAGE_POSE[stageId], H: 100, sex: opts.sex, skin: opts.skin, shirt: opts.shirt, shirtD: opts.shirtD };
    const probe = figureParts(spec, 0.4);
    const fitH = (probe.ground - probe.minY), fitW = (probe.maxX - probe.minX) + 40;
    const small = Hh < 120;
    const s = Math.min((Hh - (small ? 10 : 26)) / (fitH * (spec.pose === "jump" ? 1.25 : 1.05)), (W - (small ? 4 : 20)) / (fitW - (small ? 30 : 0)));
    const groundY = Hh - (small ? 5 : 14);
    register({
      el, draw: t => {
        const fp = figureParts(spec, t);
        const tx = W / 2 - s * fp.anchorX, ty = groundY - s * fp.ground;
        el.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" class="illu" role="img" aria-label="Evreye uygun animasyonlu çocuk çizimi"><g transform="translate(${f(tx)} ${f(ty)}) scale(${f(s)})">${fp.out.back.join("")}${fp.out.body.join("")}${fp.out.front.join("")}${fp.out.fx.join("")}</g></svg>`;
      },
    }, opts.animate !== false);
  }

  // Gerçek boy ölçekli büyüme sahnesi (1 birim = 1 cm)
  function growScene(age, sex, heightCm, t, opts = {}) {
    const pose = age < 4 ? "tummy" : age < 9 ? "sit" : "stand";
    const spec = { age, pose, H: heightCm, sex, skin: opts.skin, shirt: opts.shirt, shirtD: opts.shirtD };
    const fp = figureParts(spec, t);
    const VW = 150, VH = 175, groundY = 162, x0 = 92;
    const s = 1;
    const tx = x0 - s * fp.anchorX, ty = groundY - s * fp.ground;
    const ticks = [];
    for (let cm = 0; cm <= 150; cm += 10) {
      const y = groundY - cm;
      ticks.push(`<line x1="22" x2="${cm % 50 ? 27 : 31}" y1="${y}" y2="${y}" stroke="var(--muted)" stroke-width=".6"/>`);
      if (cm % 50 === 0) ticks.push(`<text x="18" y="${y + 2}" text-anchor="end" font-size="6" fill="var(--muted)">${cm}</text>`);
    }
    const topY = groundY - fp.ground + fp.minY;
    return `<svg viewBox="0 0 ${VW} ${VH}" class="illu grow" role="img" aria-label="Büyüme animasyonu">
      <line x1="22" x2="22" y1="${groundY - 150}" y2="${groundY}" stroke="var(--muted)" stroke-width=".6"/>${ticks.join("")}
      <line x1="10" x2="${VW - 4}" y1="${groundY}" y2="${groundY}" stroke="var(--border)" stroke-width="1"/>
      ${pose === "stand" ? `<line x1="24" x2="${x0 + 20}" y1="${f(groundY - heightCm)}" y2="${f(groundY - heightCm)}" stroke="var(--accent)" stroke-dasharray="2 2" stroke-width=".7"/>` : ""}
      <g transform="translate(${f(tx)} ${f(ty)})">${fp.out.back.join("")}${fp.out.body.join("")}${fp.out.front.join("")}</g></svg>`;
  }

  window.Illust = { mountStage, growScene, fetusSvg, register, STAGE_AGE, interpHead: a => interp(HEAD, a) };
})();
