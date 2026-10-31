// 吉川柚希 ポートフォリオの動き。どれも JS が無くても読めるように、見た目の初期状態は CSS 側で持っている。
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 方眼のマス：画面の幅を --cols 等分して、マスと作品タイルの大きさをそろえる ──
  const sizeGrid = () => {
    const cols = parseInt(getComputedStyle(root).getPropertyValue("--cols"), 10) || 12;
    root.style.setProperty("--g", `${document.body.clientWidth / cols}px`);
  };
  sizeGrid();
  addEventListener("resize", sizeGrid);

  // ── マウスの下の方眼のマスを黄色にする ──
  if (matchMedia("(hover: hover)").matches && !reduce) {
    const cell = document.createElement("div");
    cell.className = "cursor-cell";
    cell.setAttribute("aria-hidden", "true");
    document.body.prepend(cell);
    addEventListener("pointermove", (e) => {
      const g = parseFloat(getComputedStyle(root).getPropertyValue("--g"));
      const top0 = document.querySelector(".site-nav")?.offsetHeight || 0;
      const x = Math.floor(e.pageX / g) * g, y = Math.floor((e.pageY - top0) / g) * g + top0;
      cell.style.transform = `translate(${x}px, ${y}px)`;
      cell.classList.add("on");
    });
    document.addEventListener("pointerleave", () => cell.classList.remove("on"));
  }

  // ── マーカー：ページの一番上のキャッチだけ、開いたときに左から引く ──
  // スクロールのたびに動かすと、何ページも見るうちに繰り返しになって邪魔になる（NN/g「Scroll-Triggered Text Animations Delay Users」）。
  // ほかのマーカーは最初から引いてある（CSS）。
  setTimeout(() => document.querySelectorAll(".hero .mk, .work-hero .mk").forEach((el) => el.classList.add("on")), 200);

  // ── 読んだ量のバー ──
  const bar = document.querySelector(".progress");
  if (bar) {
    const upd = () => {
      const max = root.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    addEventListener("scroll", upd, { passive: true });
    upd();
  }

  // ── いまの場所に印をつける：作品ページの目次と、トップのメニューで同じ仕組みを使う ──
  const spy = (links, onPick) => {
    const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
    const secs = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (!secs.length) return;
    const pick = () => {
      const line = innerHeight * 0.35;
      let cur = null;
      secs.forEach((s) => { if (s.getBoundingClientRect().top < line) cur = s; });
      links.forEach((a) => a.removeAttribute("aria-current"));
      if (!cur) return;
      const a = byId.get(cur.id);
      a.setAttribute("aria-current", "true");
      if (onPick) onPick(a);
    };
    addEventListener("scroll", pick, { passive: true });
    pick();
  };
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length) {
    spy(tocLinks, (a) => {
      document.querySelectorAll(".sec.is-current").forEach((x) => x.classList.remove("is-current"));
      document.getElementById(a.hash.slice(1))?.classList.add("is-current");
      // スマホの横並びの目次では、印のついた項目を見える位置へ
      const ol = a.closest("ol");
      if (ol.scrollWidth > ol.clientWidth) ol.scrollTo({ left: a.offsetLeft - 24, behavior: reduce ? "auto" : "smooth" });
    });
  }
  const navLinks = [...document.querySelectorAll('.site-nav ul a[href^="#"]')];
  if (navLinks.length) spy(navLinks);

  // ── ページの先頭へ：長いページの右下に、文字つきで置く（NN/g「Back-to-Top Button Design Guidelines」） ──
  if (root.scrollHeight > innerHeight * 4) {
    const top = document.createElement("a");
    top.className = "to-top";
    top.href = "#";
    top.innerHTML = '<span class="ico ico-up" aria-hidden="true"></span>ページの先頭へ';
    top.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); document.querySelector(".site-nav .home")?.focus({ preventScroll: true }); });
    document.body.append(top);
    const show = () => top.classList.toggle("show", scrollY > innerHeight * 1.5);
    addEventListener("scroll", show, { passive: true });
    show();
  }

  // ── YouTube：押したときに初めて読み込む ──
  document.querySelectorAll(".yt[data-id]").forEach((box) => {
    const id = box.dataset.id;
    box.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
    box.querySelector(".play").addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      f.title = box.dataset.title || "YouTube";
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      box.replaceChildren(f);
    });
  });

  // ── ループ動画：見えているあいだだけ再生し、どの動画にも同じ「一時停止」ボタンを付ける ──
  // 自動で始まり 5 秒を超えて動くものには、止める仕組みが要る（WCAG 2.2 SC 2.2.2）。動きを減らす設定のときは最初から止めておく。
  document.querySelectorAll("video[data-loop]").forEach((v) => {
    const wrap = document.createElement("div");
    wrap.className = "vwrap";
    v.replaceWith(wrap);
    wrap.append(v);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vctl";
    wrap.append(btn);
    let paused = reduce;   // 利用者が止めたら、見えても再生しない
    const label = () => {
      btn.innerHTML = paused
        ? '<span class="ico ico-play" aria-hidden="true"></span>再生'
        : '<span class="ico ico-pause" aria-hidden="true"></span>一時停止';
      btn.setAttribute("aria-label", paused ? "動画を再生" : "動画を一時停止");
    };
    btn.addEventListener("click", () => { paused = !paused; paused ? v.pause() : v.play().catch(() => {}); label(); });
    label();
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !paused) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.4 }).observe(v);
  });

  // ── トップの作品カード：マウスを乗せると動画を流す（タッチ端末では見えたら流す） ──
  document.querySelectorAll(".work-card .media video").forEach((v) => {
    const media = v.parentElement, card = v.closest(".work-card");
    const play = () => { if (reduce) return; v.play().then(() => media.classList.add("playing")).catch(() => {}); };
    const stop = () => { v.pause(); media.classList.remove("playing"); };
    if (matchMedia("(hover: hover)").matches) {
      card.addEventListener("pointerenter", play);
      card.addEventListener("pointerleave", stop);
      card.addEventListener("focus", play);
      card.addEventListener("blur", stop);
    } else {
      new IntersectionObserver(([en]) => (en.isIntersecting ? play() : stop()), { threshold: 0.7 }).observe(v);
    }
  });

  // ── 写真をクリックで大きく。ページの中の写真を前後に送れる（← → キーでも） ──
  const zoomables = [...document.querySelectorAll("main img.zoomable, .work-hero img.zoomable")];
  if (zoomables.length) {
    const dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "写真の拡大表示");
    const mkBtn = (cls, label, icon) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = cls; b.setAttribute("aria-label", label);
      if (icon) { const i = document.createElement("span"); i.className = `ico ${icon}`; i.setAttribute("aria-hidden", "true"); b.append(i); }
      else b.textContent = label;
      return b;
    };
    const close = mkBtn("lb-close", "閉じる");
    const prev = mkBtn("lb-nav lb-prev", "前の写真", "ico-left");
    const next = mkBtn("lb-nav lb-next", "次の写真", "ico-right");
    const big = new Image(), cap = document.createElement("p"), count = document.createElement("span");
    count.className = "lb-count";
    dlg.append(close, prev, next, big, cap);
    document.body.append(dlg);
    let idx = 0;
    const show = (i) => {
      idx = (i + zoomables.length) % zoomables.length;
      const img = zoomables[idx];
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      count.textContent = `${idx + 1} / ${zoomables.length}　`;
      cap.replaceChildren(count, document.createTextNode(img.alt));
    };
    prev.addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
    next.addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
    close.addEventListener("click", () => dlg.close());
    big.addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
    dlg.addEventListener("click", () => dlg.close());
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
    });
    zoomables.forEach((img, i) => {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      const open = () => { show(i); dlg.showModal(); };
      img.addEventListener("click", open);
      img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  // ── 表紙のタイルにふれると、その作品の一言を出す ──
  const peek = document.querySelector(".peek");
  if (peek) {
    document.querySelectorAll(".tile[data-desc]").forEach((t) => {
      const on = () => {
        const b = document.createElement("b");
        b.textContent = t.querySelector("span").textContent;
        peek.replaceChildren(b, document.createTextNode(t.dataset.desc));
        peek.classList.add("show");
      };
      const off = () => peek.classList.remove("show");
      t.addEventListener("pointerenter", on); t.addEventListener("focus", on);
      t.addEventListener("pointerleave", off); t.addEventListener("blur", off);
    });
  }

  // ── 作品カード：写真がマウスに少しついてくる ──
  if (!reduce && matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".work-card .media").forEach((m) => {
      m.addEventListener("pointermove", (e) => {
        const r = m.getBoundingClientRect();
        m.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        m.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      m.addEventListener("pointerleave", () => { m.style.setProperty("--mx", 0); m.style.setProperty("--my", 0); });
    });
  }

  // ── ここが好き：ふれるとマーカーをもう一度引く ──
  if (!reduce) {
    document.querySelectorAll(".love-box").forEach((box) => {
      box.addEventListener("pointerenter", () => box.querySelectorAll(".mk").forEach((m) => {
        m.classList.remove("redraw"); void m.offsetWidth; m.classList.add("redraw");
      }));
    });
  }

  // ── 表紙の紺の四角：ふれると隣の空いたマスへ跳ぶ（跳べるマスが無ければ、その場で一回転） ──
  const bindHop = () => {
    if (reduce) return;
    document.querySelectorAll(".sq").forEach((sq) => {
      if (sq.dataset.hop) return;
      sq.dataset.hop = "1";
      sq.classList.add("hop");
      sq.addEventListener("pointerenter", () => {
        const G = parseFloat(getComputedStyle(root).getPropertyValue("--g"));
        const tx = +(sq.dataset.tx || 0), ty = +(sq.dataset.ty || 0);
        const r = sq.getBoundingClientRect();
        const others = [...document.querySelectorAll(".sq, .tile, .logo, .hero-text, .site-nav")]
          .filter((x) => x !== sq).map((x) => x.getBoundingClientRect());
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
          const l = r.left + dx * G, t = r.top + dy * G;
          if (l < 0 || l + r.width > innerWidth) continue;
          const hit = others.some((o) => l < o.right && l + r.width > o.left && t < o.bottom && t + r.height > o.top);
          if (hit) continue;
          sq.dataset.tx = tx + dx; sq.dataset.ty = ty + dy;
          sq.style.transform = `translate(${(tx + dx) * G}px, ${(ty + dy) * G}px)`;
          return;
        }
        sq.animate([{ transform: `translate(${tx * G}px, ${ty * G}px) rotate(0)` }, { transform: `translate(${tx * G}px, ${ty * G}px) rotate(90deg)` }], { duration: 450, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
      });
    });
  };
  bindHop();
  // 画面の幅が変わったら、跳んだ四角を元のマスに戻す
  addEventListener("resize", () => document.querySelectorAll(".sq").forEach((x) => { x.dataset.tx = 0; x.dataset.ty = 0; x.style.transform = ""; }));

  // ── 作品ごとの「遊べる」反応。紙の言葉（撒く・振る・触る・握る・譲る）に合わせる ──
  // どれも見るためには要らない飾りなので、動きを減らす設定のときは付けない（WCAG 2.3.3）
  if (!reduce) {
    const fxOf = (box) => {
      let fx = box.querySelector(":scope > .fx");
      if (!fx) { fx = document.createElement("div"); fx.className = "fx"; fx.setAttribute("aria-hidden", "true"); box.append(fx); }
      return fx;
    };
    const local = (box, e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    // 汲・撒・響：なぞると水跡が残る
    document.querySelectorAll('[data-play="splash"]').forEach((box) => {
      const fx = fxOf(box);
      let last = 0, lx = -99, ly = -99;
      box.addEventListener("pointermove", (e) => {
        const [x, y] = local(box, e);
        const now = performance.now();
        if (now - last < 40 || Math.hypot(x - lx, y - ly) < 30) return;
        last = now; lx = x; ly = y;
        const d = document.createElement("span");
        d.className = "stain";
        d.style.left = `${x}px`; d.style.top = `${y}px`;
        d.style.setProperty("--d", `${44 + Math.random() * 46}px`);
        d.style.setProperty("--rot", `${Math.random() * 180}deg`);
        fx.append(d);
        d.addEventListener("animationend", () => d.remove());
      });
      box.addEventListener("pointerdown", (e) => {
        const [x, y] = local(box, e);
        for (let i = 0; i < 7; i++) {
          const d = document.createElement("span");
          d.className = "stain";
          const a = Math.random() * Math.PI * 2, r = i ? 50 + Math.random() * 90 : 0;
          d.style.left = `${x + Math.cos(a) * r}px`; d.style.top = `${y + Math.sin(a) * r * 0.6}px`;
          d.style.setProperty("--d", `${i ? 30 + Math.random() * 40 : 150}px`);
          d.style.setProperty("--rot", `${Math.random() * 180}deg`);
          fx.append(d);
          d.addEventListener("animationend", () => d.remove());
        }
      });
    });

    // でんでんファイター：左右に振るとパンチ
    document.querySelectorAll('[data-play="punch"]').forEach((box) => {
      const fx = fxOf(box);
      let px = null, dir = 0, turns = [], cool = 0;
      box.addEventListener("pointermove", (e) => {
        const [x, y] = local(box, e);
        if (px !== null) {
          const d = Math.sign(x - px);
          if (d && d !== dir) { turns.push(performance.now()); dir = d; }
        }
        px = x;
        const now = performance.now();
        turns = turns.filter((t) => now - t < 900);
        if (turns.length >= 3 && now > cool) { cool = now + 450; turns = []; punch(x, y); }
      });
      const punch = (x, y) => {
        box.classList.remove("punch"); void box.offsetWidth; box.classList.add("punch");
        const b = document.createElement("span");
        b.className = "burst"; b.style.left = `${x}px`; b.style.top = `${y}px`;
        fx.append(b);
        b.addEventListener("animationend", () => b.remove());
      };
      box.addEventListener("pointerdown", (e) => punch(...local(box, e)));
      box.addEventListener("animationend", () => box.classList.remove("punch"));
    });

    // touch park：指先に生き物がついてくる（入るたびに色が変わる）
    document.querySelectorAll('[data-play="creature"]').forEach((box) => {
      const fx = fxOf(box);
      const c = document.createElement("span");
      c.className = "creature";
      fx.append(c);
      const colors = ["#e83a2f", "#2f55d4", "#f5d300", "#1f9a4a"];
      let n = 0, tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      const step = () => {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        c.style.transform = `translate(${x}px, ${y}px)`;
        raf = Math.hypot(tx - x, ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
      };
      box.addEventListener("pointerenter", (e) => {
        [tx, ty] = local(box, e); x = tx; y = ty;
        c.style.transform = `translate(${x}px, ${y}px)`;
        c.style.setProperty("--c", colors[n++ % colors.length]);
        c.classList.add("on");
      });
      box.addEventListener("pointermove", (e) => { [tx, ty] = local(box, e); if (!raf) raf = requestAnimationFrame(step); });
      box.addEventListener("pointerdown", (e) => {
        [tx, ty] = local(box, e); x = tx; y = ty;
        c.style.transform = `translate(${x}px, ${y}px)`;
        c.style.setProperty("--c", colors[n++ % colors.length]);
        c.classList.add("on");
      });
      box.addEventListener("pointerleave", () => c.classList.remove("on"));
    });

    // ニギ研：「握る」を長押しすると握られ、離すと戻る
    document.querySelectorAll('[data-play="squeeze"]').forEach((el) => {
      el.classList.add("squeeze");
      const grip = (e) => { e.preventDefault(); el.classList.remove("release"); el.classList.add("grip"); };
      const let_go = () => {
        if (!el.classList.contains("grip")) return;
        el.classList.remove("grip"); void el.offsetWidth; el.classList.add("release");
      };
      el.addEventListener("pointerdown", grip);
      addEventListener("pointerup", let_go);
      el.addEventListener("pointerleave", let_go);
      el.addEventListener("animationend", () => el.classList.remove("release"));
    });

    // トリ合い：カードにふれると、ほかのカードが遠慮して身を引く
    document.querySelectorAll(".cards").forEach((row) => {
      const figs = [...row.querySelectorAll("figure")];
      const pick = (f) => {
        const i = figs.indexOf(f);
        row.classList.add("enryo");
        figs.forEach((g, j) => {
          g.classList.toggle("here", g === f);
          const side = Math.sign(j - i);
          g.style.setProperty("--away", `${side * 14}px`);
          g.style.setProperty("--lean", `${side * 4}deg`);
        });
      };
      figs.forEach((f) => { f.addEventListener("pointerenter", () => pick(f)); f.addEventListener("pointerdown", () => pick(f)); });
      row.addEventListener("pointerleave", () => { row.classList.remove("enryo"); figs.forEach((g) => g.classList.remove("here")); });
    });

    // その他の作品：画面がマウスに合わせて傾く
    document.querySelectorAll(".phones-hero").forEach((box) => {
      box.addEventListener("pointermove", (e) => {
        const r = box.getBoundingClientRect();
        box.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        box.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      box.addEventListener("pointerleave", () => { box.style.setProperty("--tx", 0); box.style.setProperty("--ty", 0); });
    });

    // 全ページ：何もないところをクリックすると、波紋が広がる（打ち水）
    document.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest("a, button, img, video, input, textarea, dialog, .tile, .sq, .yt, .squeeze, .cards, .play, .phones-hero, p, h1, h2, h3, h4, li, dd, dt")) return;
      [1, 2].forEach((k) => {
        const r = document.createElement("span");
        r.className = k === 1 ? "ripple" : "ripple r2";
        r.setAttribute("aria-hidden", "true");
        r.style.left = `${e.pageX}px`; r.style.top = `${e.pageY}px`;
        document.body.append(r);
        r.addEventListener("animationend", () => r.remove());
      });
    });
  }

  // ── メールアドレスをコピー ──
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const label = btn.querySelector("span:last-child") || btn;
        const t = label.textContent;
        label.textContent = "コピーしました";
        setTimeout(() => (label.textContent = t), 1600);
      } catch { location.href = `mailto:${btn.dataset.copy}`; }
    });
  });
})();
