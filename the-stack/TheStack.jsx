import React, { useState, useRef, useEffect, useReducer } from "react";

/* =============================== data =============================== */
const PUZZLES = [
  {
    goal: "From EBIT to unlevered free cash flow",
    tag: "FCF build",
    lines: [
      "EBIT (operating profit)",
      "× (1 − tax rate)  →  NOPAT",
      "+ D&A  (non-cash, added back)",
      "− Capital expenditure",
      "− Increase in working capital  =  Unlevered FCF",
    ],
    note: "Unlevered FCF is pre-financing — it ignores interest — which is exactly why you discount it at the WACC to get enterprise value.",
  },
  {
    goal: "From yearly cash flows to value per share",
    tag: "DCF flow",
    lines: [
      "Forecast unlevered FCF for each year of the plan",
      "Discount each year back at the WACC",
      "Sum the present values  →  enterprise value",
      "− Net debt (and minorities)",
      "=  Equity value",
      "÷ diluted shares  =  value per share",
    ],
    note: "EV → equity value → per share. Botching that bridge — or using basic instead of diluted shares — is where per-share valuations quietly go wrong.",
  },
  {
    goal: "Bridge from market cap to enterprise value",
    tag: "EV bridge",
    lines: [
      "Equity value (market capitalisation)",
      "+ Net debt  (debt − cash)",
      "+ Minority interests",
      "− Investments in associates / JVs",
      "=  Enterprise value",
    ],
    note: "EV is the cost of the whole operating business, capital-structure-neutral: add what others have claims on, strip out non-core stakes.",
  },
  {
    goal: "Sum-of-the-parts NAV per share",
    tag: "SOTP / NAV",
    lines: [
      "Value each project on its own NPV",
      "Sum the project NPVs",
      "+ Cash and listed investments",
      "− Net debt",
      "− Capitalised corporate / G&A costs",
      "=  NAV   →  ÷ shares = NAV per share",
    ],
    note: "SOTP is the natural lens for a multi-asset name like Develop — value producer, developments and the cash-generating services arm separately, then net off debt and head office.",
  },
  {
    goal: "Diluted shares via the treasury-stock method",
    tag: "Dilution",
    lines: [
      "Start with the in-the-money options",
      "Assume exercise  →  company receives the strike proceeds",
      "Use the proceeds to buy back shares at the current price",
      "Net new shares = options − shares bought back",
      "+ basic shares  =  diluted share count",
    ],
    note: "Only the NET new shares dilute, because the strike money buys stock back. Adding every option is the rookie error that overstates the count.",
  },
  {
    goal: "Test an all-scrip deal for accretion",
    tag: "Accretion",
    lines: [
      "Value the target; convert to acquirer shares issued",
      "Combine the two net incomes (+ run-rate synergies)",
      "Combined earnings ÷ combined shares = pro-forma EPS",
      "Compare pro-forma EPS to acquirer's standalone EPS",
      "Higher = accretive;  lower = dilutive",
    ],
    note: "Accretion is just a pro-forma EPS comparison. Shortcut for all-scrip: acquirer P/E above target P/E → accretive.",
  },
  {
    goal: "From ounces in the ground to project free cash flow",
    tag: "Mine FCF",
    lines: [
      "Gold produced (oz)  ×  gold price  =  revenue",
      "− AISC × ounces  =  operating cash margin",
      "− Tax  (mind any tax-loss shield)",
      "− Growth / development capex",
      "=  Project free cash flow",
    ],
    note: "Price and AISC set the margin; FX (USD revenue vs AUD costs) and carried-forward tax losses swing what actually lands as cash.",
  },
];

const MAX_STARS = PUZZLES.length * 3;
const START_LIVES = 3;
const SECS_PER_LINE = 7; // speed-clock budget per line
const BASE = 100; // base points per correct placement
const SAVE_KEY = "thestack.v2";

const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.stars)) return s;
  } catch (e) {}
  return { stars: Array(PUZZLES.length).fill(0), bestStreak: 0 };
}

/* =============================== audio =============================== */
let actx = null;
function ac() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  if (actx && actx.state === "suspended") actx.resume();
  return actx;
}
function tone(freq, dur, type = "sine", vol = 0.16, slideTo = null) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  good(combo) { const base = 520 + Math.min(combo, 8) * 55; tone(base, 0.14, "triangle", 0.18, base * 1.5); },
  lock() { tone(330, 0.1, "sine", 0.12, 660); },
  wrong() { tone(150, 0.22, "sawtooth", 0.16, 90); },
  win() { [0, 90, 180, 300].forEach((d, i) => setTimeout(() => tone([523, 659, 784, 1047][i], 0.32, "triangle", 0.16), d)); },
  fail() { [0, 120].forEach((d, i) => setTimeout(() => tone([220, 165][i], 0.3, "sawtooth", 0.16, [110, 80][i]), d)); },
  tick() { tone(880, 0.05, "square", 0.05); },
};
function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

/* =============================== component =============================== */
export default function TheStack() {
  const [screen, setScreen] = useState("home"); // "home" | "game"
  const [save, setSave] = useState(loadSave);
  const [win, setWin] = useState(null);
  const [failText, setFailText] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [, force] = useReducer((x) => x + 1, 0);

  // mutable game runtime — fast-changing values that drive imperative bits
  const R = useRef({
    idx: 0, p: null, placed: 0, total: 0, order: [],
    score: 0, combo: 0, misses: 0, lives: START_LIVES, streak: 0, streakMax: 0,
    budget: 0, timeLeft: 0, busy: false, done: true,
  }).current;

  const rootRef = useRef(null);
  const cardRefs = useRef({});
  const comboRef = useRef(null);
  const cvRef = useRef(null);
  const toastTimer = useRef(null);

  /* persist progress */
  useEffect(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }, [save]);

  const unlocked = (() => {
    let n = 1;
    for (let i = 0; i < PUZZLES.length; i++) if (save.stars[i] > 0) n = Math.max(n, i + 2);
    return Math.min(n, PUZZLES.length);
  })();

  /* ----------------------------- speed clock ----------------------------- */
  useEffect(() => {
    if (screen !== "game" || win || failText) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      R.timeLeft = Math.max(0, R.timeLeft - dt);
      if (R.timeLeft <= 0) { R.timeLeft = 0; force(); finishFail(true); return; }
      if (R.timeLeft < R.budget * 0.25 && Math.random() < 0.04) sfx.tick();
      force();
    }, 90);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, win, failText, R.idx]);

  /* ----------------------------- game control ----------------------------- */
  function startGame(i) {
    const p = PUZZLES[i];
    R.idx = i; R.p = p; R.placed = 0; R.total = p.lines.length;
    R.score = 0; R.combo = 0; R.misses = 0; R.lives = START_LIVES;
    R.streak = 0; R.streakMax = 0;
    R.budget = R.total * SECS_PER_LINE; R.timeLeft = R.budget;
    R.busy = false; R.done = false;
    R.order = shuffle(p.lines.map((_, k) => k));
    cardRefs.current = {};
    setWin(null); setFailText(null); setScreen("game"); force();
  }

  function tapCard(li, e) {
    if (R.busy || R.done) return;
    if (li === R.placed) correctPlace(li, e); // correct order is identity → next li === placed
    else wrongPlace(li, e);
  }

  function correctPlace(li, e) {
    R.busy = true;
    R.combo += 1; R.streak += 1; R.streakMax = Math.max(R.streakMax, R.combo);
    const mult = Math.max(1, R.combo);
    const tb = Math.round(BASE * 0.5 * (R.timeLeft / R.budget));
    const gained = BASE * mult + tb;
    R.score += gained;
    sfx.good(R.combo); sfx.lock(); buzz(18);
    flyPoints(e, "+" + gained, false);
    popCombo();
    if (R.combo >= 3) toast("Combo ×" + R.combo + "  🔥");
    flashCard(li, "right");
    force(); // snappy score/combo update
    setTimeout(() => {
      R.placed += 1;
      R.order = R.order.filter((x) => x !== li);
      R.busy = false; force();
      if (R.placed >= R.total) finishWin();
    }, 150);
  }

  function wrongPlace(li, e) {
    R.misses += 1; R.combo = 0; R.streak = 0; R.lives -= 1;
    R.score = Math.max(0, R.score - 40);
    R.timeLeft = Math.max(2, R.timeLeft - 3);
    sfx.wrong(); buzz([40, 40, 40]);
    flashCard(li, "wrong", 450);
    flyPoints(e, "−40", true);
    force();
    if (R.lives <= 0) finishFail(false);
  }

  function useHint() {
    if (R.busy || R.done) return;
    const need = R.placed; // li of the correct next line
    R.combo = 0; R.score = Math.max(0, R.score - 15); R.timeLeft = Math.max(2, R.timeLeft - 2);
    const el = cardRefs.current[need];
    if (el) {
      el.classList.add("hintglow");
      if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setTimeout(() => el && el.classList.remove("hintglow"), 1100);
    }
    sfx.tick(); force();
  }

  function finishWin() {
    R.done = true;
    let stars = 1;
    if (R.misses === 0 && R.timeLeft > R.budget * 0.4) stars = 3;
    else if (R.misses <= 1) stars = 2;
    R.score += Math.round(R.timeLeft * 5); // completion bonus
    const timeUsed = Math.round(R.budget - R.timeLeft);
    const idx = R.idx;
    setSave((s) => {
      const stars2 = [...s.stars];
      if (stars > (stars2[idx] || 0)) stars2[idx] = stars;
      const bestStreak = Math.max(s.bestStreak || 0, R.streakMax, R.combo);
      return { stars: stars2, bestStreak };
    });
    sfx.win(); buzz([20, 60, 20, 60, 120]);
    setWin({ stars, score: R.score, timeUsed, misses: R.misses, idx, isLast: idx >= PUZZLES.length - 1, note: PUZZLES[idx].note, goal: PUZZLES[idx].goal });
    fireConfetti();
    force();
  }

  function finishFail(timeout) {
    // already won, or a collapse is already in progress
    if (R.busyFail || (R.done && R.placed >= R.total)) return;
    R.busyFail = true; R.done = true;
    sfx.fail(); buzz([80, 60, 80, 60, 200]);
    setFailText(timeout ? "Time's up" : "Stack collapsed");
    const idx = R.idx;
    setTimeout(() => { R.busyFail = false; setFailText(null); startGame(idx); }, 1150);
    force();
  }

  /* ----------------------------- effects / fx ----------------------------- */
  function flashCard(li, cls, removeAfter) {
    const el = cardRefs.current[li];
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    if (removeAfter) setTimeout(() => el && el.classList.remove(cls), removeAfter);
  }
  function popCombo() {
    const c = comboRef.current; if (!c) return;
    c.classList.remove("combo-pop"); void c.offsetWidth; c.classList.add("combo-pop");
    setTimeout(() => c && c.classList.remove("combo-pop"), 250);
  }
  function flyPoints(e, txt, bad) {
    const host = rootRef.current; if (!host) return;
    const el = document.createElement("div");
    el.className = "fly"; el.textContent = txt;
    if (bad) el.style.color = "var(--red)";
    let x = window.innerWidth / 2, y = window.innerHeight * 0.4;
    if (e && e.clientX) { x = e.clientX; y = e.clientY; }
    el.style.left = x + "px"; el.style.top = y + "px";
    host.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
  function toast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 1300);
  }
  function fireConfetti() {
    const cv = cvRef.current; if (!cv) return;
    const cx = cv.getContext("2d"); if (!cx) return;
    cv.style.display = "block"; cv.width = window.innerWidth; cv.height = window.innerHeight;
    const cols = ["#e6a92f", "#f4c869", "#5bbd8a", "#7fe0ac", "#ede6d6"];
    const parts = [];
    for (let i = 0; i < 140; i++) parts.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120, y: window.innerHeight * 0.32,
      vx: (Math.random() - 0.5) * 11, vy: Math.random() * -13 - 4, g: 0.32 + Math.random() * 0.2,
      w: 5 + Math.random() * 7, h: 7 + Math.random() * 9, rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.4, col: cols[(Math.random() * cols.length) | 0],
    });
    let frames = 0;
    const step = () => {
      cx.clearRect(0, 0, cv.width, cv.height); frames++;
      let alive = false;
      for (const p of parts) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y < window.innerHeight + 30) alive = true;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.globalAlpha = Math.max(0, 1 - frames / 150); cx.fillStyle = p.col;
        cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
      }
      if (alive && frames < 160) requestAnimationFrame(step);
      else { cx.clearRect(0, 0, cv.width, cv.height); cv.style.display = "none"; }
    };
    requestAnimationFrame(step);
  }

  function resetProgress() {
    if (window.confirm("Reset all stars and progress?"))
      setSave({ stars: Array(PUZZLES.length).fill(0), bestStreak: 0 });
  }

  /* =============================== render =============================== */
  const totalStars = save.stars.reduce((a, b) => a + b, 0);
  const p = R.p;
  const timePct = R.budget ? Math.max(0, R.timeLeft / R.budget) * 100 : 100;

  return (
    <div className="stk" ref={rootRef}>
      <style>{CSS}</style>

      {/* ----------------------------- HOME ----------------------------- */}
      {screen === "home" && (
        <div className="scene home">
          <div className="top">
            <div>
              <div className="eyebrow">Resources Desk · Build</div>
              <div className="title">The <em>Stack</em></div>
            </div>
            <div className="statpill">
              STARS<br /><b>{totalStars}</b> / {MAX_STARS}<br />
              <span style={{ opacity: 0.7 }}>BEST STREAK</span><br />
              <b style={{ fontSize: 13 }}>{save.bestStreak || 0}</b>
            </div>
          </div>
          <div className="sub">
            Stack each valuation chain in the right calculation order — fastest, flawless runs earn three stars.
            Tap the line you think comes <b style={{ color: "var(--gold2)" }}>next</b>; no checking, no second-guessing.
          </div>

          <div className="maplbl">
            <span>The Chains</span>
            <span>{unlocked} / {PUZZLES.length} unlocked</span>
          </div>

          <div className="map">
            {PUZZLES.map((pz, i) => {
              const locked = i >= unlocked;
              const stars = save.stars[i] || 0;
              return (
                <div
                  key={i}
                  className={"lvl" + (locked ? " locked" : "") + (stars > 0 ? " done" : "")}
                  onClick={locked ? undefined : () => { ac(); startGame(i); }}
                >
                  <div className="idx">{locked ? "" : i + 1}</div>
                  <div className="info">
                    <div className="tag">{pz.tag}</div>
                    <div className="nm">{pz.goal}</div>
                  </div>
                  <div className="rt">
                    {locked ? <div className="lock">🔒</div>
                      : stars > 0
                        ? <div className="stars">{[0, 1, 2].map((k) => <span key={k}>{k < stars ? <b>★</b> : "☆"}</span>)}</div>
                        : <div className="play">▶</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn s" style={{ marginTop: 10 }} onClick={resetProgress}>Reset progress</button>
        </div>
      )}

      {/* ----------------------------- GAME ----------------------------- */}
      {screen === "game" && p && (
        <div className="scene game">
          <div className="gtop">
            <button className="iconbtn" onClick={() => { R.done = true; setScreen("home"); force(); }}>‹</button>
            <div className="ttl">
              <div className="tag">{p.tag.toUpperCase()}</div>
              <div className="nm">{p.goal}</div>
            </div>
            <button className="iconbtn" title="Hint" onClick={useHint}>💡</button>
          </div>

          <div className="hud">
            <div className="cell"><div className="k">Score</div><div className="v gold">{R.score}</div></div>
            <div className="cell"><div className="k">Combo</div><div className="v combo" ref={comboRef}>×{Math.max(1, R.combo)}</div></div>
            <div className="cell">
              <div className="k">Lives</div>
              <div className="lives">
                {Array.from({ length: START_LIVES }).map((_, i) => (
                  <span key={i} style={{ color: i < R.lives ? "var(--gold2)" : "rgba(237,230,214,.15)" }}>◆</span>
                ))}
              </div>
            </div>
          </div>

          <div className="pbar"><i style={{ width: (R.placed / R.total) * 100 + "%" }} /></div>
          <div className="timebar">
            <i style={{
              width: timePct + "%",
              background: timePct < 25 ? "linear-gradient(90deg,var(--red),var(--gold))" : "linear-gradient(90deg,var(--grn),var(--gold))",
            }} />
          </div>

          <div className="goal">{p.goal}</div>
          <div className="prompt">tap the line that comes <b>next</b> in the calculation</div>

          <div className="stack">
            {p.lines.slice(0, R.placed).map((txt, i) => (
              <div key={i} className="slot"><div className="n">{i + 1}</div><div className="t">{txt}</div><div className="chk">✓</div></div>
            ))}
          </div>

          <div className="trayhdr"><span>Remaining</span><span>{R.order.length} left</span></div>
          <div className="tray">
            {R.order.map((li) => (
              <div
                key={li}
                ref={(el) => { if (el) cardRefs.current[li] = el; }}
                className="card"
                onClick={(e) => tapCard(li, e)}
              >
                <div className="dot" /><div className="t">{p.lines[li]}</div><div className="ar">↑</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------- WIN ----------------------------- */}
      {win && (
        <div className="overlay show">
          <div className="sheet">
            <div className="crown">{win.stars === 3 ? "★ Flawless build" : "✓ Stacked correctly"}</div>
            <h2>{win.goal}</h2>
            <div className="bigstars">
              {[0, 1, 2].map((i) => i < win.stars
                ? <span key={i} className="s" style={{ animationDelay: 0.15 + i * 0.18 + "s" }}>★</span>
                : <span key={i}>☆</span>)}
            </div>
            <div className="winstats">
              <div><b>{win.score}</b>SCORE</div>
              <div><b>{win.timeUsed}s</b>TIME</div>
              <div><b>{win.misses}</b>MISSES</div>
            </div>
            <div className="note"><span className="lbl">Why it works</span>{win.note}</div>
            <div className="row">
              <button className="btn s" style={{ flex: "0 0 42%" }} onClick={() => { setWin(null); setScreen("home"); }}>Chains</button>
              <button className="btn g" style={{ flex: 1 }} onClick={() => { if (win.isLast) { setWin(null); setScreen("home"); } else startGame(win.idx + 1); }}>
                {win.isLast ? "All chains ✓" : "Next chain →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {failText && <div className="failmsg show">{failText}</div>}
      <canvas className="confetti" ref={cvRef} />
      <div className={"toast" + (toastMsg ? " show" : "")}>{toastMsg}</div>
    </div>
  );
}

/* =============================== styles =============================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
.stk *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.stk{--bg:#0e0d0b;--panel:#17150f;--panel2:#211d15;--panel3:#2b2519;--ink:#ede6d6;--mut:#988e76;--faint:#6b6250;
  --gold:#e6a92f;--gold2:#f4c869;--grn:#5bbd8a;--grn2:#7fe0ac;--red:#e0664b;--line:rgba(237,230,214,.10);--line2:rgba(237,230,214,.06);
  --safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px);
  position:relative;height:100vh;width:100%;overflow:hidden;touch-action:manipulation;
  font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ink);background:var(--bg);
  background-image:radial-gradient(125% 65% at 50% -8%, rgba(230,169,47,.17), transparent 60%);
  display:flex;justify-content:center}
.stk::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:9999;opacity:.45;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")}
.stk .scene{width:100%;max-width:480px;height:100%;position:relative;display:flex;flex-direction:column;
  padding:calc(16px + var(--safe-t)) 16px calc(14px + var(--safe-b));z-index:1}

.stk .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.32em;color:var(--gold);text-transform:uppercase}
.stk .title{font-family:'Fraunces',serif;font-weight:600;font-size:46px;line-height:.92;letter-spacing:-.015em;margin-top:6px}
.stk .title em{font-style:italic;color:var(--gold2)}
.stk .sub{color:var(--mut);font-size:14.5px;line-height:1.5;margin-top:14px;max-width:30em}

.stk .btn{display:flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:14px;cursor:pointer;
  font-family:'Fraunces',serif;font-weight:600;font-size:17px;padding:15px 18px;transition:transform .08s ease,opacity .15s;color:#1a1407}
.stk .btn:active{transform:translateY(1px) scale(.99)}
.stk .btn.p{background:linear-gradient(180deg,var(--gold2),var(--gold));box-shadow:0 12px 30px -12px rgba(230,169,47,.7)}
.stk .btn.s{background:transparent;border:1px solid var(--line);color:var(--mut)}
.stk .btn.g{background:linear-gradient(180deg,var(--grn2),var(--grn));box-shadow:0 12px 30px -12px rgba(91,189,138,.6)}
.stk .iconbtn{background:transparent;border:1px solid var(--line);color:var(--ink);border-radius:11px;width:42px;height:42px;
  display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;flex:0 0 auto}
.stk .iconbtn:active{border-color:var(--gold);color:var(--gold)}

.stk .home .top{display:flex;justify-content:space-between;align-items:flex-start}
.stk .statpill{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;color:var(--mut);text-align:right;line-height:1.7}
.stk .statpill b{color:var(--gold);font-size:15px}
.stk .maplbl{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.28em;color:var(--mut);text-transform:uppercase;margin:22px 2px 12px;display:flex;justify-content:space-between}
.stk .map{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:11px;padding-bottom:10px;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 14px,#000 calc(100% - 18px),transparent 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 14px,#000 calc(100% - 18px),transparent 100%)}
.stk .lvl{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:16px;background:var(--panel);
  padding:14px 16px;position:relative;overflow:hidden;transition:transform .08s,border-color .2s}
.stk .lvl:not(.locked){cursor:pointer}
.stk .lvl:not(.locked):active{transform:scale(.985);border-color:var(--gold)}
.stk .lvl.locked{opacity:.5}
.stk .lvl.done{border-color:rgba(91,189,138,.4)}
.stk .lvl::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(230,169,47,.10),transparent 55%);opacity:0;transition:opacity .2s}
.stk .lvl.done::after{background:linear-gradient(90deg,rgba(91,189,138,.10),transparent 55%);opacity:1}
.stk .lvl .idx{flex:0 0 44px;height:44px;border-radius:12px;background:var(--panel2);display:flex;align-items:center;justify-content:center;
  font-family:'Fraunces',serif;font-weight:700;font-size:20px;color:var(--gold)}
.stk .lvl.done .idx{background:rgba(91,189,138,.14);color:var(--grn2)}
.stk .lvl.locked .idx{color:var(--faint)}
.stk .lvl .info{flex:1;min-width:0}
.stk .lvl .tag{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.18em;color:var(--gold);text-transform:uppercase}
.stk .lvl.locked .tag{color:var(--faint)}
.stk .lvl .nm{font-family:'Fraunces',serif;font-size:16.5px;line-height:1.2;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stk .lvl .rt{flex:0 0 auto;text-align:right}
.stk .stars{font-size:13px;letter-spacing:1px;color:var(--faint)}
.stk .stars b{color:var(--gold2);font-weight:400}
.stk .lvl .lock{font-size:18px;color:var(--faint)}
.stk .lvl .play{font-size:22px;color:var(--gold)}

.stk .gtop{display:flex;align-items:center;gap:10px}
.stk .gtop .ttl{flex:1;min-width:0}
.stk .gtop .tag{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.2em;color:var(--gold);text-transform:uppercase}
.stk .gtop .nm{font-family:'Fraunces',serif;font-size:18px;line-height:1.15;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.stk .hud{display:flex;align-items:stretch;gap:8px;margin-top:13px}
.stk .hud .cell{flex:1;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:8px 10px;text-align:center}
.stk .hud .k{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.18em;color:var(--mut);text-transform:uppercase}
.stk .hud .v{font-family:'Fraunces',serif;font-weight:700;font-size:21px;line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums}
.stk .hud .v.gold{color:var(--gold2)}
.stk .v.combo{transition:transform .12s}
.stk .combo-pop{transform:scale(1.35)!important;color:var(--grn2)!important}
.stk .lives{display:flex;gap:4px;justify-content:center;font-size:16px;margin-top:3px;line-height:1}

.stk .pbar{height:5px;border-radius:3px;background:var(--panel2);margin:13px 0 4px;overflow:hidden}
.stk .pbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:3px;transition:width .4s cubic-bezier(.2,.8,.2,1)}
.stk .timebar{height:3px;border-radius:2px;background:var(--panel2);margin-bottom:10px;overflow:hidden}
.stk .timebar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,var(--grn),var(--gold))}

.stk .goal{font-family:'Fraunces',serif;font-size:18px;line-height:1.25;margin:8px 2px 2px;color:var(--ink)}
.stk .prompt{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:var(--mut);text-transform:uppercase;margin:4px 2px 10px}
.stk .prompt b{color:var(--gold)}

.stk .stack{display:flex;flex-direction:column;gap:7px;margin-bottom:8px}
.stk .slot{display:flex;align-items:center;gap:10px;border:1px solid rgba(91,189,138,.45);border-radius:13px;
  background:linear-gradient(90deg,rgba(91,189,138,.13),rgba(91,189,138,.04));padding:0 12px;min-height:50px;
  animation:stk-lockin .4s cubic-bezier(.18,1.3,.4,1)}
@keyframes stk-lockin{0%{transform:scale(.7) translateY(-14px);opacity:0}60%{transform:scale(1.04)}100%{transform:none;opacity:1}}
.stk .slot .n{flex:0 0 22px;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;color:var(--grn2)}
.stk .slot .t{flex:1;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;line-height:1.3;padding:9px 0}
.stk .slot .chk{flex:0 0 auto;color:var(--grn2);font-size:15px}

.stk .trayhdr{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.2em;color:var(--mut);text-transform:uppercase;margin:6px 2px 8px;display:flex;justify-content:space-between}
.stk .tray{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:9px;padding-bottom:6px;
  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 16px),transparent 100%);
  mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 16px),transparent 100%)}
.stk .card{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:14px;background:var(--panel);
  padding:0 14px;min-height:56px;cursor:pointer;position:relative;overflow:hidden;transition:transform .1s ease,border-color .15s,background .15s}
.stk .card:active{transform:scale(.98)}
.stk .card .dot{flex:0 0 8px;height:8px;border-radius:50%;background:var(--panel3);box-shadow:inset 0 0 0 1px var(--line)}
.stk .card .t{flex:1;font-family:'JetBrains Mono',monospace;font-size:13.5px;font-weight:500;line-height:1.32;padding:12px 0}
.stk .card .ar{flex:0 0 auto;color:var(--faint);font-size:17px;transition:color .15s,transform .15s}
.stk .card:active .ar{color:var(--gold);transform:translateX(2px)}
.stk .card.hintglow{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 0 22px -4px rgba(230,169,47,.8);background:linear-gradient(90deg,rgba(230,169,47,.12),var(--panel))}
.stk .card.hintglow .dot{background:var(--gold);box-shadow:0 0 8px var(--gold)}
.stk .card.wrong{animation:stk-wrong .42s cubic-bezier(.36,.07,.19,.97);border-color:var(--red)!important;background:rgba(224,102,75,.1)!important}
@keyframes stk-wrong{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}
.stk .card.right{animation:stk-rightflash .3s ease}
@keyframes stk-rightflash{0%{background:rgba(91,189,138,.3);border-color:var(--grn)}100%{background:var(--panel)}}

.stk .fly{position:fixed;z-index:60;pointer-events:none;font-family:'Fraunces',serif;font-weight:700;font-size:24px;color:var(--gold2);
  text-shadow:0 2px 12px rgba(0,0,0,.6);animation:stk-fly 1s ease forwards}
@keyframes stk-fly{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-14px) scale(1.1)}100%{opacity:0;transform:translate(-50%,-64px) scale(.9)}}

.stk .overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:22px;
  background:rgba(7,6,4,.72);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);animation:stk-fade .25s ease}
@keyframes stk-fade{from{opacity:0}to{opacity:1}}
.stk .sheet{width:100%;max-width:420px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(180deg,var(--panel2),var(--panel));
  padding:26px 22px 22px;text-align:center;position:relative;animation:stk-rise .35s cubic-bezier(.18,1.2,.4,1);box-shadow:0 30px 80px -20px rgba(0,0,0,.85)}
@keyframes stk-rise{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}
.stk .sheet .crown{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.3em;color:var(--grn2);text-transform:uppercase}
.stk .sheet h2{font-family:'Fraunces',serif;font-weight:600;font-size:30px;margin-top:6px;line-height:1.05}
.stk .bigstars{font-size:42px;letter-spacing:8px;margin:14px 0 6px;color:rgba(237,230,214,.16);height:46px}
.stk .bigstars .s{display:inline-block;color:var(--gold2);text-shadow:0 0 18px rgba(244,200,105,.7);animation:stk-starpop .5s cubic-bezier(.18,1.5,.4,1) backwards}
@keyframes stk-starpop{from{opacity:0;transform:scale(0) rotate(-40deg)}to{opacity:1;transform:none}}
.stk .winstats{display:flex;justify-content:center;gap:22px;margin:8px 0 14px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mut)}
.stk .winstats b{display:block;font-family:'Fraunces',serif;font-size:22px;color:var(--gold2);font-weight:700;margin-bottom:2px}
.stk .note{border-left:2px solid var(--grn);background:rgba(91,189,138,.06);border-radius:0 12px 12px 0;padding:13px 14px;margin:6px 0 18px;font-size:13.5px;line-height:1.55;color:#d8efe0;text-align:left}
.stk .note .lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--grn2);display:block;margin-bottom:6px}
.stk .sheet .row{display:flex;gap:9px}

.stk .failmsg{position:fixed;left:50%;top:30%;transform:translateX(-50%);z-index:70;font-family:'Fraunces',serif;font-size:32px;
  color:var(--red);text-shadow:0 4px 24px rgba(0,0,0,.7);pointer-events:none}
.stk .failmsg.show{animation:stk-failp 1.1s ease}
@keyframes stk-failp{0%{opacity:0;transform:translateX(-50%) scale(.5)}25%{opacity:1;transform:translateX(-50%) scale(1.1)}75%{opacity:1}100%{opacity:0;transform:translateX(-50%) scale(1)}}

.stk .confetti{position:fixed;inset:0;z-index:100;pointer-events:none;display:none}

.stk .toast{position:fixed;left:50%;bottom:calc(20px + var(--safe-b));transform:translateX(-50%) translateY(20px);z-index:90;
  background:var(--panel2);border:1px solid var(--line);border-radius:11px;padding:10px 16px;font-size:13px;color:var(--ink);
  opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;font-family:'JetBrains Mono',monospace;letter-spacing:.04em}
.stk .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
`;
