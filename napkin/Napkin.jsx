import React, { useEffect, useRef } from "react";

/* ============================================================================
   NAPKIN — build the mining model in your head.
   This is the self-contained vanilla game wrapped as a single React component:
   the styles + shell render declaratively, and the (verified) game logic runs
   once on mount. Drop <Napkin/> anywhere, or open as a React artifact.
   ========================================================================== */

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
:root{
  --bg:#0e0d0b;--panel:#17150f;--panel2:#211d15;--panel3:#2b2519;
  --ink:#ede6d6;--mut:#988e76;--faint:#6b6250;
  --gold:#e6a92f;--gold2:#f4c869;--grn:#5bbd8a;--grn2:#7fe0ac;--red:#e0664b;--blue:#6fb1d6;
  --line:rgba(237,230,214,.10);--line2:rgba(237,230,214,.06);
  --safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px);
}
html,body{height:100%;overflow:hidden;overscroll-behavior:none}
body{font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ink);background:var(--bg);
  background-image:radial-gradient(125% 65% at 50% -8%, rgba(230,169,47,.17), transparent 60%);
  touch-action:manipulation;position:fixed;inset:0}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.4;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")}
#app{position:fixed;inset:0;display:flex;justify-content:center}
.scene{width:100%;max-width:480px;height:100%;position:relative;display:none;flex-direction:column;
  padding:calc(16px + var(--safe-t)) 16px calc(14px + var(--safe-b));z-index:1}
.scene.on{display:flex}
.mono{font-family:'JetBrains Mono',monospace}
.scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;
  mask-image:linear-gradient(180deg,transparent 0,#000 12px,#000 calc(100% - 16px),transparent 100%)}

.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.32em;color:var(--gold);text-transform:uppercase}
.title{font-family:'Fraunces',serif;font-weight:600;font-size:44px;line-height:.92;letter-spacing:-.015em;margin-top:6px}
.title em{font-style:italic;color:var(--gold2)}
.sub{color:var(--mut);font-size:14px;line-height:1.5;margin-top:12px;max-width:32em}

.btn{display:flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:14px;cursor:pointer;
  font-family:'Fraunces',serif;font-weight:600;font-size:17px;padding:15px 18px;transition:transform .08s,opacity .15s;color:#1a1407;width:100%}
.btn:active{transform:translateY(1px) scale(.99)}
.btn.p{background:linear-gradient(180deg,var(--gold2),var(--gold));box-shadow:0 12px 30px -12px rgba(230,169,47,.7)}
.btn.g{background:linear-gradient(180deg,var(--grn2),var(--grn));box-shadow:0 12px 30px -12px rgba(91,189,138,.6)}
.btn.s{background:transparent;border:1px solid var(--line);color:var(--mut)}
.btn:disabled{opacity:.4;pointer-events:none}
.iconbtn{background:transparent;border:1px solid var(--line);color:var(--ink);border-radius:11px;width:42px;height:42px;
  display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;flex:0 0 auto}
.iconbtn:active{border-color:var(--gold);color:var(--gold)}
.top{display:flex;justify-content:space-between;align-items:flex-start}

/* MAP */
.maplbl{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.28em;color:var(--mut);text-transform:uppercase;margin:22px 2px 12px}
.world{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:18px;background:var(--panel);
  padding:16px;margin-bottom:12px;position:relative;overflow:hidden;transition:transform .08s,border-color .2s}
.world:not(.locked){cursor:pointer}
.world:not(.locked):active{transform:scale(.985);border-color:var(--gold)}
.world.locked{opacity:.5}
.world.done{border-color:rgba(91,189,138,.4)}
.world .idx{flex:0 0 50px;height:50px;border-radius:13px;background:var(--panel2);display:flex;align-items:center;justify-content:center;
  font-family:'Fraunces',serif;font-weight:700;font-size:22px;color:var(--gold)}
.world.done .idx{background:rgba(91,189,138,.14);color:var(--grn2)}
.world .info{flex:1;min-width:0}
.world .tag{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.18em;color:var(--gold);text-transform:uppercase}
.world.locked .tag{color:var(--faint)}
.world .nm{font-family:'Fraunces',serif;font-size:18px;line-height:1.15;margin-top:3px}
.world .ds{font-size:12px;color:var(--mut);margin-top:3px;line-height:1.35}
.world .rt{flex:0 0 auto;font-size:20px;color:var(--gold)}
.world.locked .rt{color:var(--faint)}
.stars{font-size:13px;letter-spacing:1px;color:var(--faint);margin-top:4px}
.stars b{color:var(--gold2);font-weight:400}

/* BRIEF */
.dossier{border:1px solid var(--line);border-radius:16px;background:var(--panel);padding:16px;margin-bottom:12px}
.dossier h3{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.2em;color:var(--gold);text-transform:uppercase;margin-bottom:12px;
  display:flex;align-items:center;gap:8px}
.dossier h3::after{content:"";flex:1;height:1px;background:var(--line)}
.kv{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--line2);font-size:14px}
.kv:last-child{border-bottom:none}
.kv .k{color:var(--mut)}
.kv .v{font-family:'JetBrains Mono',monospace;font-weight:500;color:var(--ink);text-align:right}
.brief-note{font-size:11.5px;color:var(--faint);line-height:1.5;margin:2px 2px 14px;font-style:italic}

/* PLAY */
.gtop{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.gtop .ttl{flex:1;min-width:0}
.gtop .tag{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.2em;color:var(--gold);text-transform:uppercase}
.gtop .nm{font-family:'Fraunces',serif;font-size:17px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbar{height:4px;border-radius:3px;background:var(--panel2);margin-bottom:10px;overflow:hidden}
.pbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),var(--gold2));transition:width .4s cubic-bezier(.2,.8,.2,1)}

/* model strip */
.strip{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:6px;margin-bottom:12px;scrollbar-width:none}
.strip::-webkit-scrollbar{display:none}
.chipm{flex:0 0 auto;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:7px 10px;min-width:62px;text-align:center}
.chipm.set{border-color:rgba(91,189,138,.4);background:linear-gradient(180deg,rgba(91,189,138,.10),var(--panel))}
.chipm .k{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.12em;color:var(--mut);text-transform:uppercase}
.chipm .v{font-family:'Fraunces',serif;font-weight:700;font-size:14px;margin-top:2px;color:var(--faint);font-variant-numeric:tabular-nums}
.chipm.set .v{color:var(--grn2)}

.event{border:1px solid rgba(224,102,75,.5);border-radius:14px;background:linear-gradient(180deg,rgba(224,102,75,.12),var(--panel));
  padding:14px;margin-bottom:14px;animation:rise .35s cubic-bezier(.18,1.2,.4,1)}
.event .et{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.22em;color:var(--red);text-transform:uppercase;margin-bottom:7px}
.event .eb{font-size:14px;line-height:1.5;color:var(--ink)}

.node{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;color:var(--gold);text-transform:uppercase;margin-bottom:8px}
.q{font-family:'Fraunces',serif;font-size:21px;line-height:1.28;margin-bottom:14px}
.givens{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}
.given{font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid var(--line);border-radius:9px;background:var(--panel);padding:8px 11px;color:var(--mut)}
.given b{color:var(--gold2);font-weight:500}

.inputrow{display:flex;gap:9px;align-items:stretch;margin-bottom:6px}
.field{flex:1;display:flex;align-items:center;border:1px solid var(--line);border-radius:13px;background:var(--panel);padding:0 14px;transition:border-color .15s}
.field.ok{border-color:var(--grn)} .field.no{border-color:var(--red)}
.field .pre{font-family:'JetBrains Mono',monospace;color:var(--mut);font-size:17px;margin-right:6px}
.field input{flex:1;background:transparent;border:none;outline:none;color:var(--ink);font-family:'JetBrains Mono',monospace;font-weight:700;
  font-size:21px;padding:15px 0;width:100%;-webkit-user-select:text;user-select:text}
.field .unit{font-family:'JetBrains Mono',monospace;color:var(--mut);font-size:13px;margin-left:6px}
.submit{flex:0 0 auto;border:none;border-radius:13px;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#1a1407;
  font-family:'Fraunces',serif;font-weight:700;font-size:16px;padding:0 20px;cursor:pointer}
.submit:active{transform:translateY(1px)}

.fb{border-left:2px solid var(--gold);background:var(--panel);border-radius:0 12px 12px 0;padding:13px 14px;margin-top:12px;
  font-size:13.5px;line-height:1.55;animation:rise .25s ease}
.fb.good{border-color:var(--grn)} .fb.bad{border-color:var(--red)}
.fb .lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;display:block;margin-bottom:6px;color:var(--gold)}
.fb.good .lbl{color:var(--grn2)} .fb.bad .lbl{color:var(--red)}
.fb .work{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--gold2);margin:2px 0 8px}
.mini{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mut);text-align:center;margin-top:8px;cursor:pointer}
.mini:active{color:var(--gold)}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* choices */
.opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid var(--line);border-radius:13px;
  background:var(--panel);color:var(--ink);padding:15px 14px;margin-bottom:10px;cursor:pointer;font-size:14.5px;line-height:1.4;transition:.15s}
.opt:not(.done):active{border-color:var(--gold);background:var(--panel2)}
.opt .k{flex:0 0 24px;height:24px;border:1px solid var(--line);border-radius:7px;display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mut)}
.opt.good{border-color:var(--grn);background:rgba(91,189,138,.12)} .opt.good .k{border-color:var(--grn);color:var(--grn2)}
.opt.bad{border-color:var(--red);background:rgba(224,102,75,.12)} .opt.bad .k{border-color:var(--red);color:var(--red)}
.opt.dim{opacity:.4}

/* overlay / debrief */
.overlay{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;
  background:rgba(7,6,4,.75);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.overlay.show{display:flex;animation:fade .25s ease}
@keyframes fade{from{opacity:0}to{opacity:1}}
.sheet{width:100%;max-width:430px;max-height:92vh;overflow-y:auto;border:1px solid var(--line);border-radius:22px;
  background:linear-gradient(180deg,var(--panel2),var(--panel));padding:24px 20px 20px;text-align:center;
  animation:risebig .35s cubic-bezier(.18,1.2,.4,1);box-shadow:0 30px 80px -20px rgba(0,0,0,.85)}
@keyframes risebig{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}
.sheet .crown{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.3em;color:var(--grn2);text-transform:uppercase}
.sheet h2{font-family:'Fraunces',serif;font-weight:600;font-size:27px;margin-top:6px;line-height:1.05}
.bigstars{font-size:38px;letter-spacing:7px;margin:12px 0 4px;color:rgba(237,230,214,.16)}
.bigstars .s{color:var(--gold2);text-shadow:0 0 18px rgba(244,200,105,.7)}
.dbrow{display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:13px;padding:9px 2px;border-bottom:1px solid var(--line2)}
.dbrow .k{color:var(--mut)} .dbrow .v{color:var(--gold2);font-weight:700}
.callout{border-left:2px solid var(--blue);background:rgba(111,177,214,.07);border-radius:0 12px 12px 0;padding:12px 13px;margin:8px 0;font-size:13px;line-height:1.5;text-align:left;color:#cfe4f0}
.callout b{color:#9fcde6}
.note{border-left:2px solid var(--grn);background:rgba(91,189,138,.06);border-radius:0 12px 12px 0;padding:13px 14px;margin:10px 0 16px;font-size:13.5px;line-height:1.55;text-align:left;color:#d8efe0}
.note .lbl{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--grn2);display:block;margin-bottom:6px}

.toast{position:fixed;left:50%;bottom:calc(20px + var(--safe-b));transform:translateX(-50%) translateY(20px);z-index:90;
  background:var(--panel2);border:1px solid var(--line);border-radius:11px;padding:10px 16px;font-size:13px;color:var(--ink);
  opacity:0;transition:.25s;pointer-events:none;font-family:'JetBrains Mono',monospace}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}

/* ===== live valuation waterfall ===== */
#waterfall{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
#waterfall:empty{display:none}
.wf-row{display:flex;align-items:center;gap:8px}
.wf-row.in{animation:rise .35s cubic-bezier(.18,1.2,.4,1)}
.wf-row .wl{flex:0 0 86px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.04em;color:var(--mut);text-transform:uppercase;line-height:1.15}
.wf-track{flex:1;height:20px;display:flex;align-items:center;background:linear-gradient(90deg,var(--line2),transparent);border-radius:5px}
.wf-bar{height:16px;border-radius:5px;min-width:3px;transition:width .35s cubic-bezier(.2,.8,.2,1)}
.wf-bar.pos{background:linear-gradient(90deg,var(--grn),var(--grn2))}
.wf-bar.neg{background:linear-gradient(90deg,#ef8a73,var(--red))}
.wf-bar.sub{background:linear-gradient(90deg,var(--gold),var(--gold2))}
.wf-row .wv{flex:0 0 auto;min-width:56px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700}
.wf-row .wv.pos{color:var(--grn2)} .wf-row .wv.neg{color:#ef8a73} .wf-row .wv.sub{color:var(--gold2)}
.wf-tail{display:flex;flex-direction:column;gap:4px;margin-top:6px;padding-top:7px;border-top:1px dashed var(--line)}
.wf-tail .ts{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--mut)}
.wf-tail .ts.in{animation:rise .35s ease}
.wf-tail .ts b{color:var(--gold2);font-weight:700}
.wf-tail .ts .res{margin-left:auto;color:var(--grn2);font-weight:700}

/* ===== sensitivity lab ===== */
.sens-readout{display:flex;gap:10px;margin:4px 0 16px}
.sens-readout .cell{flex:1;border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:11px 8px;text-align:center}
.sens-readout .k{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.16em;color:var(--mut);text-transform:uppercase}
.sens-readout .v{font-family:'Fraunces',serif;font-weight:700;font-size:26px;line-height:1.05;margin-top:3px;color:var(--gold2);font-variant-numeric:tabular-nums;transition:color .15s}
.sens-readout .d{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mut);margin-top:3px}
.slider{margin-bottom:13px}
.slider .top{display:flex;justify-content:space-between;align-items:baseline}
.slider .top .nm{font-size:13px;color:var(--ink)}
.slider .top .vl{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--gold2)}
.slider input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:4px;margin-top:9px;background:var(--panel3);outline:none}
.slider input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:30px;height:30px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,var(--gold2),var(--gold));border:2px solid var(--bg);box-shadow:0 4px 12px rgba(0,0,0,.45);cursor:pointer}
.slider input[type=range]::-moz-range-thumb{width:30px;height:30px;border-radius:50%;background:var(--gold);border:2px solid var(--bg);box-shadow:0 4px 12px rgba(0,0,0,.45);cursor:pointer}
.sens-sep{height:1px;background:var(--line);margin:16px 0 2px}
.lever-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.lever{display:flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:12px;background:var(--panel);
  padding:11px 14px 11px 11px;font-size:14px;cursor:pointer;transition:transform .12s,border-color .15s,background .15s}
.lever:active{transform:scale(.97)}
.lever.picked{border-color:var(--gold);background:var(--panel2)}
.lever .rank{flex:0 0 auto;width:24px;height:24px;border-radius:8px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--mut)}
.lever.picked .rank{background:var(--gold);color:#1a1407;border-color:var(--gold);font-weight:700}
.tornado{display:flex;flex-direction:column;gap:8px;margin:12px 0 4px}
.tor-row{display:flex;align-items:center;gap:8px;animation:rise .35s ease both}
.tor-row .nm{flex:0 0 74px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink)}
.tor-track{flex:1;display:flex;height:22px}
.tor-half{flex:1;display:flex;align-items:center}
.tor-half.l{justify-content:flex-end;border-right:2px solid var(--line)}
.tor-half.r{justify-content:flex-start}
.tor-half .b{height:18px;transition:width .4s cubic-bezier(.2,.8,.2,1)}
.tor-half.l .b{background:linear-gradient(90deg,#ef8a73,var(--red));border-radius:5px 0 0 5px}
.tor-half.r .b{background:linear-gradient(90deg,var(--grn),var(--grn2));border-radius:0 5px 5px 0}
.tor-row .sw{flex:0 0 auto;min-width:62px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--gold2)}

/* ===== new recall exercise types ===== */
@keyframes shk{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(5px)}50%{transform:translateX(-7px)}}
.shk{animation:shk .4s}
.subq{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:var(--mut);text-transform:uppercase;margin:14px 2px 9px}
/* forage chips */
.pick-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.pchip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:11px 13px;font-size:13.5px;cursor:pointer;transition:transform .12s,border-color .15s,background .15s}
.pchip:active{transform:scale(.96)}
.pchip.sel{border-color:var(--gold);background:var(--panel2)}
.pchip .pv{font-family:'JetBrains Mono',monospace;color:var(--gold2);font-weight:700}
.pchip.hit{border-color:var(--grn);background:rgba(91,189,138,.14)}
.pchip.miss{border-color:var(--red);background:rgba(224,102,75,.14)}
/* cascade node grid */
.ngrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.ncell{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:13px 12px;text-align:center;cursor:pointer;transition:transform .12s,border-color .15s,background .15s}
.ncell:active{transform:scale(.97)}
.ncell .nk{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:var(--mut);text-transform:uppercase}
.ncell .nm{font-family:'Fraunces',serif;font-size:15px;margin-top:3px;color:var(--ink)}
.ncell.sel{border-color:var(--gold);background:var(--panel2)}
.ncell.hit{border-color:var(--grn);background:rgba(91,189,138,.14)} .ncell.hit .nm{color:var(--grn2)}
.ncell.missed{border-color:var(--red);background:rgba(224,102,75,.14)}
.ncell.falsep{border-color:var(--gold2);background:rgba(230,169,47,.13)}
/* direction beat */
.dirrow{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.dirrow .dn{flex:1;font-size:14px}
.dirbtn{width:46px;height:42px;border:1px solid var(--line);border-radius:11px;background:var(--panel);color:var(--mut);font-size:18px;cursor:pointer;flex:0 0 auto}
.dirbtn:active{transform:translateY(1px)}
.dirbtn.on.up{border-color:var(--grn);color:var(--grn2);background:rgba(91,189,138,.12)}
.dirbtn.on.dn{border-color:var(--red);color:var(--red);background:rgba(224,102,75,.12)}
.dirbtn.correct{box-shadow:0 0 0 1.5px var(--grn);color:var(--grn2)}
/* predict big buttons */
.predrow{display:flex;gap:10px;margin:8px 0 12px}
.predbtn{flex:1;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--ink);padding:18px 12px;cursor:pointer;font-family:'Fraunces',serif;font-size:17px;transition:transform .1s,border-color .15s,background .15s}
.predbtn:active{transform:translateY(1px)}
.predbtn .ar{font-size:24px;display:block;margin-bottom:3px}
.predbtn.right{border-color:var(--grn);background:rgba(91,189,138,.13)}
.predbtn.wrong{border-color:var(--red);background:rgba(224,102,75,.13)}
.predbtn.dim{opacity:.45}
/* audit lines */
.auditline{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:13px 14px;margin-bottom:9px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.4;cursor:pointer;transition:transform .1s,border-color .15s,background .15s}
.auditline:active{transform:scale(.99);border-color:var(--gold)}
.auditline.bad{border-color:var(--red);background:rgba(224,102,75,.13)}
.auditline.good{border-color:var(--grn);background:rgba(91,189,138,.13)}
.auditline.dim{opacity:.5}
/* blank napkin recap */
.napkin{border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:6px 14px;margin-top:4px}
.napkin .nr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line2);font-family:'JetBrains Mono',monospace;font-size:13px}
.napkin .nr:last-child{border-bottom:none}
.napkin .nr .k{color:var(--mut)} .napkin .nr .v{color:var(--gold2);font-weight:700}
`;

const SHELL = `<div id="app">

  <!-- MAP -->
  <div class="scene on" id="map">
    <div class="top">
      <div><div class="eyebrow">Resources Desk · Valuation</div><div class="title"><em>Napkin</em></div></div>
    </div>
    <div class="sub">Build the mining model in your head. No spreadsheet — read the briefing, then construct it line by line, type the numbers, and survive what the market throws at you.</div>
    <div class="maplbl">The Worlds</div>
    <div class="scroll" id="worldList"></div>
    <button class="btn s" style="margin-top:10px" id="resetBtn">Reset progress</button>
  </div>

  <!-- BRIEF -->
  <div class="scene" id="brief">
    <div class="gtop">
      <button class="iconbtn" id="briefBack">‹</button>
      <div class="ttl"><div class="tag" id="bTag">WORLD</div><div class="nm" id="bName">Project</div></div>
    </div>
    <div class="scroll" id="briefBody"></div>
    <button class="btn p" style="margin-top:10px" id="beginBtn">Begin the build →</button>
  </div>

  <!-- PLAY -->
  <div class="scene" id="play">
    <div class="gtop">
      <button class="iconbtn" id="playBack">‹</button>
      <div class="ttl"><div class="tag" id="pTag">WORLD</div><div class="nm" id="pName">Project</div></div>
    </div>
    <div class="pbar"><i id="pbarFill"></i></div>
    <div class="strip" id="strip"></div>
    <div id="waterfall"></div>
    <div class="scroll" id="stepBody"></div>
  </div>

</div>

<div class="overlay" id="ov"><div class="sheet" id="ovSheet"></div></div>
<div class="toast" id="toast"></div>`;

export default function Napkin() {
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;   // run the game exactly once (StrictMode-safe)
    booted.current = true;
    boot();
  }, []);
  return (
    <>
      <style>{CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: SHELL }} />
    </>
  );
}

/* ---- the game (unchanged logic from the standalone build) ---- */
function boot() {
/* ============================ DATA ============================ */
/* Illustrative TRAINING assumptions — simplified, not company guidance. */
const WORLDS = [
{
  id:"develop", n:1, name:"Develop Global", project:"Woodlawn", tag:"World 1 · Base-metals producer",
  ds:"A producing copper-equivalent mine with a growth option. Build the ore-to-equity chain from memory, then trace shocks through it.",
  brief:[
    {h:"The setup", kv:[
      ["Company","Develop Global (ASX:DVP)"],
      ["Asset","Woodlawn — producing"],
      ["You are","The covering analyst"],
    ]},
    {h:"Production", kv:[
      ["Throughput", IN=>IN.throughput.toFixed(2)+" Mt ore / yr"],
      ["Head grade", IN=>IN.grade.toFixed(1)+"% copper-equiv"],
      ["Recovery", IN=>IN.recovery+"%"],
    ]},
    {h:"Market & costs", kv:[
      ["Realised price", IN=>"A$"+IN.price.toLocaleString()+" / t metal"],
      ["Operating cost", IN=>"A$"+IN.opexPerTonne+" / t ore"],
      ["Sustaining capex", IN=>"A$"+IN.sustainingCapex+"m / yr"],
    ]},
    {h:"Capital & life", kv:[
      ["Mine life", IN=>IN.life+" years"],
      ["Discount rate", (IN,base)=>IN.discountRate+"%  (annuity factor "+base.annuity.toFixed(2)+")"],
      ["Tax","30% — early years shielded by carried-forward losses"],
      ["Net debt", IN=>"A$"+IN.netDebt+"m"],
      ["Shares on issue", IN=>IN.shares+"m"],
    ]},
  ],
  steps:[
    {type:"forage", node:"Payable metal", ansKey:"metal", unit:"t/yr", pre:"",
      q:"How much metal do you actually get paid for? First, grab only the inputs that matter.",
      need:["throughput","grade","recovery"], decoys:["price","netDebt","shares"],
      work:(IN,base)=>IN.throughput.toFixed(2)+"Mt × "+IN.grade.toFixed(1)+"% × "+IN.recovery+"% = "+Math.round(base.metal).toLocaleString()+" t",
      why:"Only recovered, payable metal earns money. Price, debt and the share count matter later — never to the tonnes in the ground."},
    {type:"calc", node:"Revenue", key:"revenue", ansKey:"revenue", unit:"A$m", pre:"A$",
      q:"What's annual revenue?",
      givens:(IN,base)=>[["Payable metal",fmtKey("metal",base.metal)],["Price",fmtKey("price",IN.price)]],
      work:(IN,base)=>Math.round(base.metal).toLocaleString()+" t × "+fmtKey("price",IN.price)+" = A$"+Math.round(base.revenue)+"m",
      why:"Revenue = payable metal × realised price."},
    {type:"calc", node:"Operating cost", key:"opex", ansKey:"opex", unit:"A$m", pre:"A$",
      q:"What's the annual operating cost?",
      givens:(IN,base)=>[["Cost",fmtKey("opexPerTonne",IN.opexPerTonne)+" ore"],["Throughput",fmtKey("throughput",IN.throughput)]],
      work:(IN,base)=>fmtKey("opexPerTonne",IN.opexPerTonne)+" × "+IN.throughput.toFixed(2)+"Mt = A$"+Math.round(base.opex)+"m",
      why:"Base-metal costs are quoted per tonne of ore milled — multiply by throughput for total cash costs."},
    {type:"calc", node:"Operating margin", key:"margin", ansKey:"margin", unit:"A$m", pre:"A$",
      q:"What's the operating cash margin?",
      givens:(IN,base)=>[["Revenue",fmtKey("revenue",base.revenue)],["Opex",fmtKey("opex",base.opex)]],
      work:(IN,base)=>Math.round(base.revenue)+" − "+Math.round(base.opex)+" = A$"+Math.round(base.margin)+"m",
      why:"Margin = revenue − cash costs. The project's heartbeat: everything below flexes with it."},
    {type:"calc", node:"Free cash flow", key:"fcf", ansKey:"fcf", unit:"A$m", pre:"A$",
      q:"What's annual free cash flow?",
      givens:(IN,base)=>[["Margin",fmtKey("margin",base.margin)],["Sustaining capex",fmtKey("sustainingCapex",IN.sustainingCapex)],["Tax","shielded (yr 1)"]],
      work:(IN,base)=>Math.round(base.margin)+" − "+IN.sustainingCapex+" capex = A$"+Math.round(base.fcf)+"m (tax shielded early)",
      why:"FCF = margin − sustaining capex − cash tax. Carried-forward losses mean little tax early, flattering cash flow and NPV."},
    {type:"calc", node:"NPV of operations", key:"npv", ansKey:"npv", unit:"A$m", pre:"A$",
      q:"Discount the stream — what's the NPV of operations?",
      givens:(IN,base)=>[["FCF/yr",fmtKey("fcf",base.fcf)],["Life",IN.life+" yrs"],["Annuity @"+IN.discountRate+"%",base.annuity.toFixed(2)]],
      work:(IN,base)=>Math.round(base.fcf)+" × "+base.annuity.toFixed(2)+" = A$"+Math.round(base.npv)+"m",
      why:"A level cash flow for n years is FCF × the annuity factor. Memorise a few factors and you can value a mine in your head."},
    {type:"calc", node:"Equity value", key:"equity", ansKey:"equity", unit:"A$m", pre:"A$",
      q:"Bridge to equity value.",
      givens:(IN,base)=>[["EV (NPV)",fmtKey("npv",base.npv)],["Net debt",fmtKey("netDebt",IN.netDebt)]],
      work:(IN,base)=>Math.round(base.npv)+" − "+IN.netDebt+" net debt = A$"+Math.round(base.equity)+"m",
      why:"Enterprise value belongs to all capital providers; subtract net debt for what's left to equity."},
    {type:"calc", node:"Value per share", key:"perShare", ansKey:"perShare", unit:"A$", pre:"A$", tol:.03, abs:.06,
      q:"And per share?",
      givens:(IN,base)=>[["Equity",fmtKey("equity",base.equity)],["Shares",IN.shares+"m"]],
      work:(IN,base)=>Math.round(base.equity)+" ÷ "+IN.shares+" = A$"+base.perShare.toFixed(2),
      why:"Always divide by DILUTED shares. Ore to a per-share number — that's the whole napkin."},

    {type:"sensitivity", node:"Sensitivity lab",
      q:"You've built the base case. Now feel which lever actually moves it — then back your judgement."},

    {type:"cascade", node:"Reconciliation", affected:["metal","revenue","margin","fcf","npv","equity","perShare"],
      dirs:{metal:"down",revenue:"down",margin:"down",fcf:"down",npv:"down",equity:"down",perShare:"down"},
      event:{t:"Grade reconciles low", b:"The mined grade comes in ~10% below the resource model. Throughput and unit costs are unchanged."},
      q:"Which nodes move — and which way?",
      why:"Grade flows through metal → revenue → everything downstream. But OPEX is per tonne of ORE, not per tonne of metal — you still mill the same rock, so cash costs don't move. That's the classic reconciliation trap: the margin is squeezed from the top, not the bottom."},

    {type:"predict", node:"Currency", dir:"down", ofWhat:"revenue",
      event:{t:"The Aussie firms up", b:"The AUD strengthens, cutting the realised A$ metal price ~8%. Volumes are unchanged."},
      q:"Before you compute — which way does A$ revenue move?",
      why:"You sell in USD but report in AUD. A stronger AUD means fewer Aussie dollars per tonne — realised A$ revenue falls even though nothing changed underground."},
    {type:"calc", node:"Revenue · stronger AUD", unit:"A$m", pre:"A$",
      compute:(IN,base)=> base.metal*(IN.price*0.92)/1e6,
      q:"Recompute revenue at the new price (~8% lower).",
      givens:(IN,base)=>[["Metal",fmtKey("metal",base.metal)],["New price","~A$"+Math.round(IN.price*0.92).toLocaleString()+"/t"]],
      work:(IN,base)=>Math.round(base.metal).toLocaleString()+" t × A$"+Math.round(IN.price*0.92).toLocaleString()+" = A$"+Math.round(base.metal*IN.price*0.92/1e6)+"m",
      why:"FX hits the top line one-for-one with price. With sticky A$ costs, the margin hit is proportionally bigger — the same operating leverage as a price move."},
    {type:"choice", node:"The response",
      q:"The currency move just took a real bite out of cash flow. Best immediate response?",
      opts:[
        {t:"Hedge a slice of near-term production / FX to protect cash and covenants",good:true,
          fb:"Right. You're a price- and rate-taker; lock in enough to defend liquidity and the balance sheet while you reassess."},
        {t:"Accelerate growth capex to grow out of it",good:false,
          fb:"Spending into a downturn on compressed cash flow is how juniors blow up. Growth capex is the first thing you defer."},
        {t:"Do nothing — it'll mean-revert",good:false,
          fb:"Maybe — but covenants and creditors don't wait for the thesis. Hope isn't a treasury policy."}]},

    {type:"calc", node:"Margin · cost inflation", unit:"A$m", pre:"A$",
      compute:(IN,base)=> base.revenue - base.opex*1.3,
      event:{t:"Costs run hot", b:"Diesel, labour and reagents push unit operating cost up 30%. Price and volumes hold."},
      q:"Recompute the operating margin.",
      givens:(IN,base)=>[["Revenue",fmtKey("revenue",base.revenue)],["New opex","A$"+Math.round(base.opex*1.3)+"m (+30%)"]],
      work:(IN,base)=>Math.round(base.revenue)+" − "+Math.round(base.opex*1.3)+" = A$"+Math.round(base.revenue-base.opex*1.3)+"m",
      why:"Cost inflation hits from the bottom. Revenue is untouched, but the margin — and everything below it — compresses."},
    {type:"cascade", node:"Cost cascade", affected:["opex","margin","fcf","npv","equity","perShare"],
      dirs:{opex:"up",margin:"down",fcf:"down",npv:"down",equity:"down",perShare:"down"},
      q:"With unit costs up 30%, which nodes move — and which way?",
      why:"Mirror image of the grade shock: opex itself rises, metal and revenue don't move at all, and the squeeze travels down from the margin. Knowing WHICH lever you're pulling tells you where the cascade starts."},

    {type:"calc", node:"NPV · rates up", unit:"A$m", pre:"A$",
      compute:(IN,base)=>{ var r=(IN.discountRate+3)/100, ann=(1-Math.pow(1+r,-IN.life))/r; return base.fcf*ann; },
      event:{t:"Rates jump", b:"The discount rate rises 3 percentage points as the cost of capital climbs. Cash flows are unchanged."},
      q:"Recompute the NPV of operations at the higher discount rate.",
      givens:(IN,base)=>{ var r=(IN.discountRate+3)/100, ann=(1-Math.pow(1+r,-IN.life))/r; return [["FCF/yr",fmtKey("fcf",base.fcf)],["New rate",(IN.discountRate+3)+"%"],["New annuity",ann.toFixed(2)]]; },
      work:(IN,base)=>{ var r=(IN.discountRate+3)/100, ann=(1-Math.pow(1+r,-IN.life))/r; return Math.round(base.fcf)+" × "+ann.toFixed(2)+" = A$"+Math.round(base.fcf*ann)+"m"; },
      why:"Same cash, worth less today. A higher discount rate shrinks the annuity factor — long-dated cash flows feel it most."},

    {type:"inverse", node:"Back-solve", solveFor:"price", target:2.00, unit:"A$/t", pre:"A$",
      q:"What realised price would the model need to justify A$2.00 per share?",
      why:"Run the chain backwards: per share → equity → +net debt → NPV → ÷annuity → FCF → +costs → revenue → ÷metal → price. Analysts do this constantly to sanity-check what the market is implying."},

    {type:"choice", node:"The trade-off",
      event:(IN)=>({t:"Steel hits the crusher", b:"A mill liner fails — throughput drops ~15% for the year. ~80% of operating cost is FIXED, so cash costs barely move."}),
      q:"Fix it now (lost production + cost) or defer to the next shutdown — what governs the call?",
      opts:[
        {t:"Compare the value of metal recovered sooner against the cost and risk of fixing now",good:true,
          fb:"Exactly — an NPV decision: bring-forward value vs the cost of intervention and the risk of a bigger failure."},
        {t:"Always defer maintenance to protect this year's cash",good:false,
          fb:"Deferring can turn a liner swap into a catastrophic failure. Cheap now can be ruinous later."},
        {t:"Always fix immediately regardless of cost",good:false,
          fb:"Not if the deferred option preserves more value. Reflexes aren't analysis."}]},

    {type:"choice", node:"The FID",
      event:{t:"Sulphur Springs — decision time", b:"You can build Sulphur Springs for A$330m. It would add ~A$60m/yr of FCF for 10 years (PV ≈ A$400m), so ≈ +A$70m of NPV after the build. You believe in it. How do you fund the A$330m?"},
      q:"Pick the structure that best protects existing holders' per-share value:",
      opts:[
        {t:"Offtake prepayment + project debt (the Trafigura/Woodlawn playbook)",good:true,
          fb:"Right. Non-dilutive capital keeps the +A$70m of NPV with existing shareholders — exactly how Beament funded Woodlawn."},
        {t:"A large equity placement at a discount to market",good:false,
          fb:"Fast and certain, but you hand upside to new money at a discount and dilute the holders you're trying to reward."},
        {t:"Don't build it — too risky",good:false,
          fb:"If you genuinely back it, walking away leaves A$70m of NPV on the table. The question was how to fund it."}],
      why:"Financing choice IS value creation. The same NPV accrues very differently under dilutive equity vs structured, non-dilutive capital."},

    {type:"audit", node:"Audit the model", q:"A junior sent you this model. One line is wrong — find it.",
      lines:(IN,base)=>[
        {t:"Revenue = metal × price = A$"+Math.round(base.revenue)+"m", ok:true},
        {t:"Margin = revenue − opex = A$"+Math.round(base.margin)+"m", ok:true},
        {t:"FCF = margin + sustaining capex = A$"+Math.round(base.margin+IN.sustainingCapex)+"m", ok:false,
          fix:"FCF = margin − capex, not +. Sustaining capex is cash going OUT; adding it overstates FCF by 2× the capex and inflates the whole valuation."},
        {t:"NPV = FCF × annuity factor = A$"+Math.round(base.npv)+"m", ok:true},
        {t:"Equity = NPV − net debt = A$"+Math.round(base.equity)+"m", ok:true},
      ],
      why:"Sign errors on cash-out lines are the most common — and most dangerous — modelling mistake. Pressure-test the direction of every term."},

    {type:"blank", node:"Build it blind", chain:["metal","revenue","opex","margin","fcf","npv","equity","perShare"],
      q:"No chips, no prompts beyond the line name. Rebuild the whole napkin from the brief you memorised.",
      why:"If you can run ore-in-the-ground to a per-share number with nothing on the page, you own the model — not the spreadsheet."},
  ],
  debrief:{
    note:"You foraged the right inputs, ran the chain to a per-share number, traced how a grade miss, an FX move, cost inflation and a rate hike each ripple differently, back-solved a price, caught a sign error, and rebuilt it blind. Recall, not recognition — that's the napkin.",
    sens:(IN,base)=>[
      ["Base case","A$"+Math.round(base.fcf)+"m FCF · NPV A$"+Math.round(base.npv)+"m · A$"+base.perShare.toFixed(2)+"/sh"],
      ["Grade −10%","Top-line squeeze — opex unmoved"],
      ["Opex +30%","Margin −A$"+Math.round(base.opex*0.3)+"m straight to the bottom line"],
    ]
  }
},
{ id:"westgold", n:2, name:"Westgold Resources", project:"Murchison gold", tag:"World 2 · Multi-mine producer",
  ds:"A gold producer running several mines into one mill. Adds: ounces & grade per source, AISC, FX (USD gold vs AUD costs), and a hedge book.", locked:true },
{ id:"kalkaroo", n:3, name:"Kalkaroo", project:"SA copper-gold", tag:"World 3 · Pre-FID developer",
  ds:"Pre-production. Here financing dominates: capex, the funding gap, dilution maths, and a debt covenant that can break if the price slips before first production.", locked:true },
];

/* ============================ STATE ============================ */
const SAVE="napkin.v1";
let save=load();
function load(){ try{ const s=JSON.parse(localStorage.getItem(SAVE)); if(s&&s.stars) return s; }catch(e){} return {stars:{}}; }
function persist(){ try{ localStorage.setItem(SAVE,JSON.stringify(save)); }catch(e){} }

const $=s=>document.querySelector(s);
let W=null, M={}, ptr=0, run={misses:0,goodCh:0,totCh:0};
let wfShown=new Set();   // waterfall rows already animated in

const STRIP=[["metal","Metal"],["revenue","Rev"],["opex","Opex"],["margin","Margin"],["fcf","FCF"],["npv","NPV"],["perShare","/sh"]];
const fmt=(k,v)=> k==="perShare" ? "A$"+v.toFixed(2) : k==="metal" ? (v/1000)+"kt" : "A$"+Math.round(v)+"m";

/* ============================ MODEL ENGINE ============================ */
/* Single source of truth for the chain math. The waterfall reads the locked
   values in M; the sensitivity lab reads computeModel() — they must agree. */
function computeModel(i){
  const metal = i.throughput*1e6 * (i.grade/100) * (i.recovery/100);   // t/yr
  const revenue = metal * i.price / 1e6;                              // A$m
  const opex = i.opexPerTonne * i.throughput;                         // A$m
  const margin = revenue - opex;
  const fcf = margin - i.sustainingCapex;          // early-year, tax shielded
  const r = i.discountRate/100;
  const annuity = (1 - Math.pow(1+r,-i.life)) / r;
  const npv = fcf * annuity;                                          // A$m
  const equity = npv - i.netDebt;
  const perShare = equity / i.shares;                                // A$
  return {metal,revenue,opex,margin,fcf,annuity,npv,equity,perShare};
}
const BASE_INPUTS = { throughput:1.0, grade:3.0, recovery:90, price:10000,
  opexPerTonne:150, sustainingCapex:20, life:8, discountRate:8, netDebt:80, shares:280 };
const LEVERS = [
  {key:"price",        nm:"Price",      kind:"pct"},
  {key:"grade",        nm:"Grade",      kind:"pct"},
  {key:"throughput",   nm:"Throughput", kind:"pct"},
  {key:"opexPerTonne", nm:"Opex",       kind:"pct"},
  {key:"discountRate", nm:"Discount",   kind:"pp"},   // ±2 percentage points
];

/* ---- per-play randomisation: draw IN around the canonical base ---- */
const rnd=(lo,hi)=>lo+Math.random()*(hi-lo);
const snap=(v,step)=>Math.round(v/step)*step;
function drawIN(){
  return {
    throughput:      +rnd(0.85,1.15).toFixed(2),
    grade:           +rnd(2.6,3.4).toFixed(1),
    recovery:        Math.round(rnd(88,92)),
    price:           snap(rnd(8500,11500),100),
    opexPerTonne:    snap(rnd(130,170),5),
    sustainingCapex: Math.round(rnd(15,25)),
    life:            Math.round(rnd(7,9)),
    discountRate:    snap(rnd(7,9),0.5),
    netDebt:         snap(rnd(60,100),5),
    shares:          snap(rnd(260,300),10),
  };
}
let IN=null, base=null;          // active randomised inputs + derived model (set in showBrief/startWorld)

/* human names + per-key formatters, shared by the new exercises */
const INPUT_NAMES={ throughput:"Throughput", grade:"Head grade", recovery:"Recovery", price:"Realised price",
  opexPerTonne:"Unit opex", sustainingCapex:"Sustaining capex", life:"Mine life", discountRate:"Discount rate",
  netDebt:"Net debt", shares:"Shares on issue",
  metal:"Payable metal", revenue:"Revenue", opex:"Operating cost", margin:"Margin", fcf:"Free cash flow",
  npv:"NPV", equity:"Equity", perShare:"Per share" };
const NODE_NAMES={ metal:"Metal", revenue:"Revenue", opex:"Opex", margin:"Margin", fcf:"FCF", npv:"NPV", equity:"Equity", perShare:"/share" };
const CHAIN_META={
  metal:{label:"Payable metal", unit:"t/yr", pre:""},
  revenue:{label:"Revenue", unit:"A$m", pre:"A$"},
  opex:{label:"Operating cost", unit:"A$m", pre:"A$"},
  margin:{label:"Operating margin", unit:"A$m", pre:"A$"},
  fcf:{label:"Free cash flow", unit:"A$m", pre:"A$"},
  npv:{label:"NPV of ops", unit:"A$m", pre:"A$"},
  equity:{label:"Equity value", unit:"A$m", pre:"A$"},
  perShare:{label:"Value / share", unit:"A$", pre:"A$"},
};
/* value of a key, drawing from IN (an input) or base (a model node) */
function keyVal(k){ return (IN && k in IN) ? IN[k] : (base ? base[k] : null); }
function fmtKey(k,v){
  if(v==null) v=keyVal(k);
  switch(k){
    case "price": case "opexPerTonne": return "A$"+Math.round(v).toLocaleString()+"/t";
    case "throughput": return v.toFixed(2)+" Mt";
    case "grade": return v.toFixed(1)+"%";
    case "recovery": case "discountRate": return v+"%";
    case "life": return v+" yrs";
    case "sustainingCapex": case "netDebt": return "A$"+Math.round(v)+"m";
    case "shares": return Math.round(v)+"m";
    case "metal": return Math.round(v).toLocaleString()+" t";
    case "perShare": return "A$"+v.toFixed(2);
    default: return "A$"+Math.round(v)+"m";   // revenue/opex/margin/fcf/npv/equity
  }
}
/* resolve a step field that may be a function of (IN, base) */
const val=(x)=> typeof x==="function" ? x(IN,base) : x;

/* ============================ AUDIO ============================ */
let actx=null;
function ac(){ if(!actx){try{actx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}} if(actx&&actx.state==="suspended")actx.resume(); return actx;}
function tone(f,d,t="sine",v=.16,s=null){ const c=ac(); if(!c)return; const n=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=t;o.frequency.setValueAtTime(f,n); if(s)o.frequency.exponentialRampToValueAtTime(s,n+d);
  g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(v,n+.012);g.gain.exponentialRampToValueAtTime(.0001,n+d);
  o.connect(g);g.connect(c.destination);o.start(n);o.stop(n+d+.02);}
const sfx={good(){tone(560,.13,"triangle",.16,840);},bad(){tone(150,.2,"sawtooth",.15,90);},
  win(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.3,"triangle",.15),i*90));}};
function buzz(m){ if(navigator.vibrate)try{navigator.vibrate(m);}catch(e){} }

/* ============================ MAP ============================ */
function showMap(){
  swap("map");
  const L=$("#worldList"); L.innerHTML="";
  WORLDS.forEach((w,i)=>{
    const st=save.stars[w.id]||0;
    const el=document.createElement("div");
    el.className="world"+(w.locked?" locked":"")+(st>0?" done":"");
    el.innerHTML=`<div class="idx">${w.n}</div>
      <div class="info"><div class="tag">${w.tag}</div><div class="nm">${w.name} · ${w.project}</div>
        <div class="ds">${w.ds}</div>${st>0?`<div class="stars">${"★".repeat(st)+"☆".repeat(3-st)}</div>`:""}</div>
      <div class="rt">${w.locked?"🔒":"▶"}</div>`;
    if(!w.locked) el.onclick=()=>{ac();showBrief(i);};
    else el.onclick=()=>toast("Locked — finish "+WORLDS[0].name+" first");
    L.appendChild(el);
  });
}

/* ============================ BRIEF ============================ */
function showBrief(i){
  W=WORLDS[i]; swap("brief");
  IN=drawIN(); base=computeModel(IN);     // fresh draw each visit — the brief is the figures to memorise
  $("#bTag").textContent=W.tag.toUpperCase();
  $("#bName").textContent=W.name+" · "+W.project;
  const b=$("#briefBody"); b.innerHTML="";
  W.brief.forEach(sec=>{
    const d=document.createElement("div"); d.className="dossier";
    d.innerHTML=`<h3>${sec.h}</h3>`+sec.kv.map(([k,v])=>`<div class="kv"><span class="k">${k}</span><span class="v">${typeof v==="function"?v(IN,base):v}</span></div>`).join("");
    b.appendChild(d);
  });
  const note=document.createElement("div"); note.className="brief-note";
  note.textContent="Illustrative training assumptions, drawn fresh each run — so the numbers can't be memorised between plays. Read them now; you'll rebuild the model from them. Not company guidance.";
  b.appendChild(note);
}

/* ============================ PLAY ============================ */
function startWorld(){
  if(!IN){ IN=drawIN(); base=computeModel(IN); }   // defensive: brief normally draws these
  M={}; ptr=0; run={misses:0,goodCh:0,totCh:0,IN,base}; wfShown=new Set();
  swap("play");
  $("#pTag").textContent=W.tag.toUpperCase();
  $("#pName").textContent=W.name+" · "+W.project;
  renderStrip(); renderStep();
}
function renderStrip(){
  const s=$("#strip"); s.innerHTML="";
  STRIP.forEach(([k,lbl])=>{
    const set=M[k]!=null;
    const c=document.createElement("div"); c.className="chipm"+(set?" set":"");
    c.innerHTML=`<div class="k">${lbl}</div><div class="v">${set?fmt(k,M[k]):"—"}</div>`;
    s.appendChild(c);
  });
  renderWaterfall();
}

/* ---- FEATURE 1: live valuation waterfall (reads M) ---- */
function renderWaterfall(){
  const wf=$("#waterfall"); if(!wf) return;
  const scale = M.revenue!=null ? M.revenue : 1;   // bar widths ∝ |value|, scaled to revenue
  const rows=[];
  if(M.revenue!=null) rows.push(["revenue","Revenue", M.revenue,"pos"]);
  if(M.opex!=null)    rows.push(["opex","− Opex", -M.opex,"neg"]);
  if(M.margin!=null)  rows.push(["margin","= Margin", M.margin,"sub"]);
  if(M.fcf!=null){
    const capex = (M.margin!=null) ? (M.margin - M.fcf) : IN.sustainingCapex;
    rows.push(["capex","− Sust. capex", -capex,"neg"]);
    rows.push(["fcf","= Free cash flow", M.fcf,"sub"]);
  }
  let html="";
  rows.forEach(([k,lbl,val,cls])=>{
    const isNew=!wfShown.has(k); if(isNew) wfShown.add(k);
    const w=Math.max(3, Math.abs(val)/scale*100);
    const signed = cls==="sub" ? "A$"+Math.round(val)+"m"
                 : (val<0?"−":"+")+"A$"+Math.round(Math.abs(val))+"m";
    html+=`<div class="wf-row${isNew?" in":""}"><span class="wl">${lbl}</span>`
        + `<div class="wf-track"><div class="wf-bar ${cls}" style="width:${w}%"></div></div>`
        + `<span class="wv ${cls}">${signed}</span></div>`;
  });
  if(M.npv!=null || M.equity!=null || M.perShare!=null){
    const ann = M.fcf ? (M.npv/M.fcf) : base.annuity;
    let tail="";
    const ts=(key,inner,res)=>{ const nw=!wfShown.has(key); if(nw)wfShown.add(key);
      return `<div class="ts${nw?" in":""}"><span>${inner}</span><span class="res">${res}</span></div>`; };
    if(M.npv!=null)      tail+=ts("t_npv",`FCF <b>×${ann.toFixed(2)}</b> annuity = NPV`, "A$"+Math.round(M.npv)+"m");
    if(M.equity!=null)   tail+=ts("t_eq", `− net debt <b>A$${IN.netDebt}m</b> = Equity`, "A$"+Math.round(M.equity)+"m");
    if(M.perShare!=null) tail+=ts("t_ps", `÷ <b>${IN.shares}m</b> shares = per share`, "A$"+M.perShare.toFixed(2));
    html+=`<div class="wf-tail">${tail}</div>`;
  }
  wf.innerHTML=html;
}
function progress(){ $("#pbarFill").style.width=(ptr/W.steps.length*100)+"%"; }

function renderStep(){
  progress();
  const step=W.steps[ptr]; const body=$("#stepBody"); body.innerHTML=""; body.scrollTop=0;
  const ev=val(step.event);
  if(ev){
    const e=document.createElement("div"); e.className="event";
    e.innerHTML=`<div class="et">⚡ ${ev.t}</div><div class="eb">${ev.b}</div>`;
    body.appendChild(e);
  }
  if(step.type==="calc") renderCalc(step,body);
  else if(step.type==="choice") renderChoice(step,body);
  else if(step.type==="sensitivity") renderSensitivity(step,body);
  else if(step.type==="forage") renderForage(step,body);
  else if(step.type==="cascade") renderCascade(step,body);
  else if(step.type==="inverse") renderInverse(step,body);
  else if(step.type==="audit") renderAudit(step,body);
  else if(step.type==="blank") renderBlank(step,body);
  else if(step.type==="predict") renderPredict(step,body);
}
const nextStep=()=>{ ptr++; renderStep(); };

function renderCalc(step,body){
  const ans   = step.compute ? step.compute(IN,base) : (step.ansKey ? base[step.ansKey] : step.ans);
  const givens= val(step.givens) || [];
  const work  = val(step.work) || "";
  const why   = val(step.why)  || "";
  const tolPct= step.tol!=null ? step.tol : 0.02;
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="givens">${givens.map(([k,v])=>`<div class="given">${k} <b>${v}</b></div>`).join("")}</div>
    <div class="inputrow">
      <div class="field" id="fld"><span class="pre">${step.pre||""}</span>
        <input id="inp" inputmode="decimal" autocomplete="off" placeholder="?" />
        <span class="unit">${step.unit||""}</span></div>
      <button class="submit" id="go">Lock</button>
    </div>
    <div class="mini" id="reveal">show working</div>
    <div id="fbslot"></div>`;
  body.appendChild(wrap);
  const inp=$("#inp"); setTimeout(()=>inp.focus(),120);
  let misses=0, solved=false;
  const fmtAns=()=> step.unit==="A$" ? ans.toFixed(2) : Math.round(ans);
  const showFB=()=>{
    $("#fld").classList.add("ok");
    const fb=document.createElement("div"); fb.className="fb good";
    fb.innerHTML=`<span class="lbl">✓ ${step.node}</span>${work?`<div class="work">${work}</div>`:""}${why}`;
    $("#fbslot").innerHTML=""; $("#fbslot").appendChild(fb);
    if(step.key){ M[step.key]=ans; renderStrip(); }
    sfx.good(); buzz(20);
    const c=document.createElement("button"); c.className="btn g"; c.style.marginTop="12px"; c.textContent="Continue →";
    c.onclick=nextStep;
    fb.appendChild(c);
    $("#go").disabled=true; inp.disabled=true; $("#go").textContent="✓";
  };
  const submit=()=>{
    if(solved) return;
    const raw=inp.value.replace(/[, $aA-zZ]/g,"").trim();
    const num=parseFloat(raw);
    if(isNaN(num)){ inp.focus(); return; }
    const tol=step.abs ? Math.max(step.abs, Math.abs(ans)*tolPct) : Math.abs(ans)*tolPct;
    if(Math.abs(num-ans)<=tol){ solved=true; showFB(); }
    else {
      misses++; run.misses++; sfx.bad(); buzz([40,40,40]);
      $("#fld").classList.add("no"); setTimeout(()=>{const _f=$("#fld");if(_f)_f.classList.remove("no");},420);
      if(misses>=2){
        const r=$("#reveal"); r.textContent="stuck? reveal the answer"; r.onclick=()=>{ inp.value=fmtAns(); showFB(); solved=true; };
        toast(work ? "Hint: "+String(work).split("=")[0].trim()+"…" : "Reveal available below");
      } else toast("Not quite — check the units");
      inp.select();
    }
  };
  $("#go").onclick=submit;
  inp.addEventListener("keydown",e=>{ if(e.key==="Enter") submit(); });
  $("#reveal").onclick=()=>{ if(solved) return; toast(work||"Work it from the chain"); };
}

function renderChoice(step,body){
  run.totCh++;
  const why=val(step.why);
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div><div id="opts"></div><div id="fbslot"></div>`;
  body.appendChild(wrap);
  const O=$("#opts"); const letters=["A","B","C","D"]; let done=false;
  step.opts.forEach((o,i)=>{
    const b=document.createElement("button"); b.className="opt";
    b.innerHTML=`<span class="k">${letters[i]}</span><span>${o.t}</span>`;
    b.onclick=()=>{
      if(done) return; done=true;
      if(o.good) run.goodCh++;
      [...O.children].forEach((c,j)=>{ c.classList.add("done");
        if(step.opts[j].good) c.classList.add("good"); else if(j===i) c.classList.add("bad"); else c.classList.add("dim"); });
      const fb=document.createElement("div"); fb.className="fb "+(o.good?"good":"bad");
      fb.innerHTML=`<span class="lbl">${o.good?"✓ Good call":"✗ Think again"}</span>${o.fb}${why?`<div style="margin-top:9px;color:var(--mut)">${why}</div>`:""}`;
      $("#fbslot").appendChild(fb);
      o.good?sfx.good():sfx.bad(); buzz(o.good?20:[40,40,40]);
      const c=document.createElement("button"); c.className="btn "+(o.good?"g":"p"); c.style.marginTop="12px"; c.textContent="Continue →";
      c.onclick=nextStep;
      fb.appendChild(c);
    };
    O.appendChild(b);
  });
}

/* ---- shared helpers for the new exercises ---- */
function shuffle(a){ a=[...a]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function shake(el){ if(!el)return; el.classList.remove("shk"); void el.offsetWidth; el.classList.add("shk"); setTimeout(()=>el&&el.classList.remove("shk"),440); }
function contBtn(parent,label){ const c=document.createElement("button"); c.className="btn g"; c.style.marginTop="12px"; c.textContent=label||"Continue →"; c.onclick=nextStep; parent.appendChild(c); return c; }
function numFrom(inp){ return parseFloat(String(inp.value).replace(/[, $aA-zZ]/g,"").trim()); }

/* a) FORAGE — pick the right inputs, then compute */
function renderForage(step,body){
  const ans=base[step.ansKey], why=val(step.why)||"", need=step.need, all=shuffle([...need,...(step.decoys||[])]);
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="subq">Tap the inputs this number needs — leave out the rest</div>
    <div class="pick-wrap" id="picks"></div>
    <button class="btn p" id="useBtn">Use these →</button><div id="forageSlot"></div>`;
  body.appendChild(wrap);
  const PW=$("#picks"), sel=new Set(); let checked=false;
  all.forEach(k=>{ const c=document.createElement("div"); c.className="pchip"; c.dataset.k=k;
    c.innerHTML=`<span>${INPUT_NAMES[k]||k}</span><span class="pv">${fmtKey(k)}</span>`;
    c.onclick=()=>{ if(checked)return; if(sel.has(k)){sel.delete(k);c.classList.remove("sel");}else{sel.add(k);c.classList.add("sel");} };
    PW.appendChild(c); });
  $("#useBtn").onclick=()=>{
    if(checked)return;
    const same=sel.size===need.length && need.every(k=>sel.has(k));
    if(!same){ sfx.bad(); buzz([40,40,40]); shake(PW);
      const extra=[...sel].find(k=>!need.includes(k)), missing=need.find(k=>!sel.has(k));
      toast(extra?"You don't need "+(INPUT_NAMES[extra]||extra)+" for this":missing?"You're missing an input":"Not the right set"); return; }
    checked=true; PW.querySelectorAll(".pchip").forEach(c=>{ c.classList.remove("sel"); c.classList.add(need.includes(c.dataset.k)?"hit":"miss"); });
    $("#useBtn").style.display="none"; sfx.good(); buzz(20);
    const slot=$("#forageSlot");
    slot.innerHTML=`<div class="subq">Now compute it</div>
      <div class="inputrow"><div class="field" id="fld"><span class="pre">${step.pre||""}</span>
        <input id="inp" inputmode="decimal" autocomplete="off" placeholder="?" /><span class="unit">${step.unit||""}</span></div>
        <button class="submit" id="go">Lock</button></div><div class="mini" id="reveal">show working</div><div id="fbslot"></div>`;
    const inp=$("#inp"); setTimeout(()=>inp.focus(),120); let solved=false, miss=0;
    const showFB=()=>{ $("#fld").classList.add("ok"); solved=true;
      const fb=document.createElement("div"); fb.className="fb good";
      fb.innerHTML=`<span class="lbl">✓ ${step.node}</span>${step.work?`<div class="work">${val(step.work)}</div>`:""}${why}`;
      $("#fbslot").innerHTML=""; $("#fbslot").appendChild(fb); M[step.ansKey]=ans; renderStrip(); sfx.good(); buzz(20); contBtn(fb);
      $("#go").disabled=true; inp.disabled=true; $("#go").textContent="✓"; };
    const submit=()=>{ if(solved)return; const n=numFrom(inp); if(isNaN(n)){inp.focus();return;}
      if(Math.abs(n-ans)<=Math.abs(ans)*0.02){ showFB(); }
      else { miss++; run.misses++; sfx.bad(); buzz([40,40,40]); $("#fld").classList.add("no"); setTimeout(()=>{const _f=$("#fld");if(_f)_f.classList.remove("no");},420);
        if(miss>=2){ const r=$("#reveal"); r.textContent="stuck? reveal the answer"; r.onclick=()=>{ inp.value=Math.round(ans); showFB(); }; }
        toast("Not quite — check the units"); inp.select(); } };
    $("#go").onclick=submit; inp.addEventListener("keydown",e=>{if(e.key==="Enter")submit();});
    $("#reveal").onclick=()=>{ if(!solved) toast(val(step.work)||"Apply each input in turn"); };
  };
}

/* b) PREDICT — tap the direction (learning beat, unscored) */
function renderPredict(step,body){
  const why=val(step.why)||"";
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="predrow">
      <button class="predbtn up" data-d="up"><span class="ar">▲</span>Higher</button>
      <button class="predbtn dn" data-d="down"><span class="ar">▼</span>Lower</button>
    </div><div id="fbslot"></div>`;
  body.appendChild(wrap);
  let done=false;
  wrap.querySelectorAll(".predbtn").forEach(b=>{ b.onclick=()=>{ if(done)return; done=true;
    const correct=b.dataset.d===step.dir;
    wrap.querySelectorAll(".predbtn").forEach(x=>{ if(x.dataset.d===step.dir)x.classList.add("right"); else{ x.classList.add("dim"); if(x===b)x.classList.add("wrong"); } });
    const fb=document.createElement("div"); fb.className="fb "+(correct?"good":"bad");
    fb.innerHTML=`<span class="lbl">${correct?"✓ Right direction":"✗ Other way"}</span>${why}`;
    $("#fbslot").appendChild(fb); correct?sfx.good():sfx.bad(); buzz(correct?20:[40,40,40]); contBtn(fb); }; });
}

/* c) CASCADE — tap the nodes that move, then their directions (judgement-scored on the set) */
function renderCascade(step,body){
  run.totCh++;
  const why=val(step.why)||"", affected=step.affected, dirs=step.dirs||{};
  const nodes=["metal","revenue","opex","margin","fcf","npv","equity","perShare"];
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="subq">Tap every node that moves</div><div class="ngrid" id="ngrid"></div>
    <button class="btn p" id="cascCheck">Check the cascade →</button><div id="cascSlot"></div>`;
  body.appendChild(wrap);
  const Gr=$("#ngrid"), sel=new Set(); let checked=false;
  nodes.forEach(k=>{ const c=document.createElement("div"); c.className="ncell"; c.dataset.k=k;
    c.innerHTML=`<div class="nk">node</div><div class="nm">${NODE_NAMES[k]}</div>`;
    c.onclick=()=>{ if(checked)return; if(sel.has(k)){sel.delete(k);c.classList.remove("sel");}else{sel.add(k);c.classList.add("sel");} };
    Gr.appendChild(c); });
  $("#cascCheck").onclick=()=>{
    if(checked)return; checked=true;
    const exact=sel.size===affected.length && affected.every(k=>sel.has(k));
    if(exact) run.goodCh++;
    Gr.querySelectorAll(".ncell").forEach(c=>{ const k=c.dataset.k; c.classList.remove("sel"); const a=affected.includes(k), p=sel.has(k);
      c.classList.add(a&&p?"hit":a&&!p?"missed":!a&&p?"falsep":"dimx"); });
    $("#cascCheck").style.display="none"; exact?sfx.good():sfx.bad(); buzz(exact?20:[40,40,40]);
    const slot=$("#cascSlot");
    slot.innerHTML=`<div class="subq">Which way does each move?</div><div id="dirs"></div><div id="cascFb"></div>`;
    const D=$("#dirs"), state={};
    affected.forEach(k=>{ const row=document.createElement("div"); row.className="dirrow";
      row.innerHTML=`<span class="dn">${NODE_NAMES[k]}</span>
        <button class="dirbtn up" data-k="${k}" data-d="up">▲</button>
        <button class="dirbtn dn" data-k="${k}" data-d="down">▼</button>`; D.appendChild(row); });
    let dn=0;
    D.querySelectorAll(".dirbtn").forEach(b=>{ b.onclick=()=>{ const k=b.dataset.k; if(state[k]!==undefined)return; state[k]=b.dataset.d;
      D.querySelectorAll('.dirbtn[data-k="'+k+'"]').forEach(x=>{ x.disabled=true; if(x.dataset.d===dirs[k])x.classList.add("correct"); }); b.classList.add("on");
      if(++dn===affected.length){ const fb=document.createElement("div"); fb.className="fb "+(exact?"good":"bad");
        fb.innerHTML=`<span class="lbl">${exact?"✓ Exact cascade":"Close — green shows the real cascade"}</span>${why}`; $("#cascFb").appendChild(fb); contBtn(fb); } }; });
  };
}

/* d) INVERSE — back-solve an input from a target */
function inverseSolve(step){
  if(step.solveFor==="price") return ((step.target*IN.shares + IN.netDebt)/base.annuity + IN.sustainingCapex + base.opex)*1e6/base.metal;
  return base[step.solveFor];
}
function inverseWork(step,ans){
  if(step.solveFor==="price"){ const eq=step.target*IN.shares, npv=eq+IN.netDebt, fcf=npv/base.annuity, rev=fcf+IN.sustainingCapex+base.opex;
    return "A$"+step.target.toFixed(2)+"/sh × "+IN.shares+"m = A$"+Math.round(eq)+"m equity → +A$"+IN.netDebt+"m debt = A$"+Math.round(npv)+"m NPV → ÷"+base.annuity.toFixed(2)+" = A$"+Math.round(fcf)+"m FCF → +capex +opex = A$"+Math.round(rev)+"m rev → ÷"+Math.round(base.metal).toLocaleString()+"t = A$"+Math.round(ans).toLocaleString()+"/t"; }
  return "";
}
function renderInverse(step,body){
  const why=val(step.why)||"", ans=inverseSolve(step), workStr=inverseWork(step,ans);
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="inputrow"><div class="field" id="fld"><span class="pre">${step.pre||""}</span>
      <input id="inp" inputmode="decimal" autocomplete="off" placeholder="?" /><span class="unit">${step.unit||""}</span></div>
      <button class="submit" id="go">Solve</button></div><div class="mini" id="reveal">show the back-solve</div><div id="fbslot"></div>`;
  body.appendChild(wrap);
  const inp=$("#inp"); setTimeout(()=>inp.focus(),120); let solved=false, miss=0;
  const showFB=()=>{ $("#fld").classList.add("ok"); solved=true;
    const fb=document.createElement("div"); fb.className="fb good"; fb.innerHTML=`<span class="lbl">✓ ${step.node}</span><div class="work">${workStr}</div>${why}`;
    $("#fbslot").innerHTML=""; $("#fbslot").appendChild(fb); sfx.good(); buzz(20); contBtn(fb);
    $("#go").disabled=true; inp.disabled=true; $("#go").textContent="✓"; };
  const submit=()=>{ if(solved)return; const n=numFrom(inp); if(isNaN(n)){inp.focus();return;}
    if(Math.abs(n-ans)<=Math.abs(ans)*0.03){ showFB(); }
    else { miss++; run.misses++; sfx.bad(); buzz([40,40,40]); $("#fld").classList.add("no"); setTimeout(()=>{const _f=$("#fld");if(_f)_f.classList.remove("no");},420);
      if(miss>=2){ const r=$("#reveal"); r.textContent="stuck? reveal the answer"; r.onclick=()=>{ inp.value=Math.round(ans); showFB(); }; }
      toast("Work backwards from the target"); inp.select(); } };
  $("#go").onclick=submit; inp.addEventListener("keydown",e=>{if(e.key==="Enter")submit();});
  $("#reveal").onclick=()=>{ if(!solved) toast("Back-solve from the per-share target"); };
}

/* e) AUDIT — find the one wrong line */
function renderAudit(step,body){
  const why=val(step.why)||"", lines=val(step.lines);
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="subq">Tap the line with the error</div><div id="alines"></div><div id="auditFb"></div>`;
  body.appendChild(wrap);
  const A=$("#alines"); let done=false;
  lines.forEach((ln,i)=>{ const el=document.createElement("div"); el.className="auditline"; el.textContent=ln.t;
    el.onclick=()=>{ if(done)return;
      if(ln.ok){ run.misses++; sfx.bad(); buzz([40,40,40]); shake(el); toast("That line checks out — look again"); return; }
      done=true; A.querySelectorAll(".auditline").forEach((x,j)=>{ x.classList.add(lines[j].ok?"dim":"bad"); }); el.classList.remove("dim");
      const fb=document.createElement("div"); fb.className="fb good"; fb.innerHTML=`<span class="lbl">✓ Found it</span><div class="work">${ln.fix}</div>${why}`;
      $("#auditFb").appendChild(fb); sfx.good(); buzz(20); contBtn(fb); };
    A.appendChild(el); });
}

/* f) BLANK — sequential recall capstone, no chips */
function renderBlank(step,body){
  const why=val(step.why)||"", chain=step.chain;
  const wrap=document.createElement("div");
  wrap.innerHTML=`<div class="node">${step.node}</div><div class="q">${val(step.q)}</div>
    <div class="subq">No chips. Rebuild it from memory.</div><div id="blankSlot"></div>`;
  body.appendChild(wrap);
  const slot=$("#blankSlot"); let idx=0;
  function ask(){
    if(idx>=chain.length){ return finishBlank(); }
    const k=chain[idx], meta=CHAIN_META[k], ans=base[k];
    slot.innerHTML=`<div class="node" style="margin-top:6px">${idx+1} / ${chain.length}</div>
      <div class="q" style="font-size:19px">${meta.label} <span style="color:var(--mut);font-size:14px">(${meta.unit})</span>?</div>
      <div class="inputrow"><div class="field" id="fld"><span class="pre">${meta.pre}</span>
        <input id="inp" inputmode="decimal" autocomplete="off" placeholder="?" /><span class="unit">${meta.unit}</span></div>
        <button class="submit" id="go">Lock</button></div><div class="mini" id="reveal">stuck?</div>`;
    const inp=$("#inp"); setTimeout(()=>inp.focus(),100); let miss=0, solved=false;
    const ok=()=>{ if(solved)return; solved=true; M[k]=ans; renderStrip(); sfx.good(); buzz(20); idx++; setTimeout(ask,200); };
    const submit=()=>{ if(solved)return; const n=numFrom(inp); if(isNaN(n)){inp.focus();return;}
      if(Math.abs(n-ans)<=Math.abs(ans)*0.03){ $("#fld").classList.add("ok"); ok(); }
      else { miss++; run.misses++; sfx.bad(); buzz([40,40,40]); $("#fld").classList.add("no"); setTimeout(()=>{const _f=$("#fld");if(_f)_f.classList.remove("no");},420);
        if(miss>=2){ const r=$("#reveal"); r.textContent="reveal the answer"; r.onclick=()=>{ inp.value=(meta.unit==="A$"?ans.toFixed(2):Math.round(ans)); $("#fld").classList.add("ok"); ok(); }; }
        toast("Not quite — recall the inputs"); inp.select(); } };
    $("#go").onclick=submit; inp.addEventListener("keydown",e=>{if(e.key==="Enter")submit();});
    $("#reveal").onclick=()=>toast("Recall it from the brief you read");
  }
  function finishBlank(){
    slot.innerHTML=`<div class="subq">The whole napkin — from memory</div><div class="napkin" id="napkin"></div><div id="blankFb"></div>`;
    const N=$("#napkin");
    chain.forEach(k=>{ const r=document.createElement("div"); r.className="nr";
      r.innerHTML=`<span class="k">${CHAIN_META[k].label}</span><span class="v">${fmtKey(k,base[k])}</span>`; N.appendChild(r); });
    const fb=document.createElement("div"); fb.className="fb good"; fb.innerHTML=`<span class="lbl">✓ Rebuilt from memory</span>${why}`;
    $("#blankFb").appendChild(fb); sfx.win(); buzz([20,60,20]); contBtn(fb,"Finish →");
  }
  ask();
}

/* ---- FEATURE 2: sensitivity sliders + predict-the-tornado ---- */
function renderSensitivity(step,body){
  const IN=run.IN, base=run.base;     // randomised run is the single source of truth
  const inputs = {...IN};
  const SLIDERS = [
    {key:"price",        nm:"Price",         min:6000, max:14000, step:100},
    {key:"grade",        nm:"Grade",         min:1.5,  max:4.5,   step:0.1},
    {key:"throughput",   nm:"Throughput",    min:0.6,  max:1.4,   step:0.05},
    {key:"opexPerTonne", nm:"Opex",          min:100,  max:220,   step:5},
    {key:"discountRate", nm:"Discount rate", min:5,    max:14,    step:0.5},
  ];
  const label=(key,v)=>
      key==="price"        ? "A$"+Math.round(v)+"/t"
    : key==="opexPerTonne" ? "A$"+Math.round(v)+"/t"
    : key==="grade"        ? v.toFixed(1)+"%"
    : key==="throughput"   ? v.toFixed(2)+" Mt"
    : key==="discountRate" ? v.toFixed(1)+"%" : v;

  const wrap=document.createElement("div");
  wrap.innerHTML=`
    <div class="node">${step.node}</div>
    <div class="q">${step.q}</div>
    <div class="sens-readout">
      <div class="cell"><div class="k">NPV of ops</div><div class="v" id="snNpv">—</div><div class="d" id="snNpvD">base</div></div>
      <div class="cell"><div class="k">Value / share</div><div class="v" id="snPs">—</div><div class="d" id="snPsD">base</div></div>
    </div>
    <div id="sliders"></div>
    <button class="btn s" id="snReset" style="margin:2px 0 4px">↺ Reset to base</button>
    <div class="sens-sep"></div>
    <div class="node" style="margin-top:14px">Predict the tornado</div>
    <div class="q" style="font-size:16px;line-height:1.35">Before the reveal — rank the levers by how much a 20% move swings NPV. Tap to add, tap again to remove.</div>
    <div class="lever-chips" id="levers"></div>
    <button class="btn p" id="snReveal" disabled>Reveal the tornado →</button>
    <div id="snResult"></div>`;
  body.appendChild(wrap);

  /* ---- Beat 1: explore ---- */
  const SL=$("#sliders");
  SLIDERS.forEach(s=>{
    const row=document.createElement("div"); row.className="slider";
    row.innerHTML=`<div class="top"><span class="nm">${s.nm}</span><span class="vl" id="vl_${s.key}"></span></div>
      <input type="range" id="sl_${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${IN[s.key]}">`;
    SL.appendChild(row);
    const inp=row.querySelector("input");
    $("#vl_"+s.key).textContent=label(s.key, IN[s.key]);
    inp.addEventListener("input",()=>{ inputs[s.key]=+inp.value; $("#vl_"+s.key).textContent=label(s.key,+inp.value); recompute(); });
  });
  function paint(vEl,dEl,val,baseVal,f){
    const diff=val-baseVal, near=Math.abs(diff)<Math.abs(baseVal)*0.005;
    const col = near ? "var(--gold2)" : diff>0 ? "var(--grn2)" : "var(--red)";
    vEl.textContent=f(val); vEl.style.color=col;
    dEl.textContent = near ? "base" : (diff>0?"+":"−")+f(Math.abs(diff))+" vs base";
    dEl.style.color=col;
  }
  function recompute(){
    const m=computeModel(inputs);
    paint($("#snNpv"),$("#snNpvD"), m.npv, base.npv, v=>"A$"+Math.round(v)+"m");
    paint($("#snPs"), $("#snPsD"),  m.perShare, base.perShare, v=>"A$"+v.toFixed(2));
  }
  $("#snReset").onclick=()=>{
    Object.assign(inputs,IN);
    SLIDERS.forEach(s=>{ $("#sl_"+s.key).value=IN[s.key]; $("#vl_"+s.key).textContent=label(s.key,IN[s.key]); });
    recompute(); sfx.good();
  };
  recompute();

  /* ---- Beat 2: predict ---- */
  const picked=[]; let revealed=false;
  const LV=$("#levers");
  LEVERS.forEach(L=>{
    const c=document.createElement("div"); c.className="lever"; c.dataset.key=L.key;
    c.innerHTML=`<span class="rank"></span><span>${L.nm}</span>`;
    c.onclick=()=>{ if(revealed) return;
      const i=picked.indexOf(L.key); if(i>=0) picked.splice(i,1); else picked.push(L.key);
      paintPicks(); };
    LV.appendChild(c);
  });
  function paintPicks(){
    [...LV.children].forEach(c=>{ const i=picked.indexOf(c.dataset.key);
      c.classList.toggle("picked", i>=0); c.querySelector(".rank").textContent = i>=0 ? i+1 : ""; });
    $("#snReveal").disabled = picked.length<2;
  }
  paintPicks();

  /* ---- Beat 3: reveal ---- */
  $("#snReveal").onclick=()=>{
    if(revealed || picked.length<2) return; revealed=true;
    $("#snReveal").style.display="none";
    run.totCh++;
    const top2=picked.slice(0,2);
    const good = top2.includes("price") && top2.includes("grade");
    if(good) run.goodCh++;

    const rows=LEVERS.map(L=>{
      const hi={...IN}, lo={...IN};
      if(L.kind==="pp"){ hi[L.key]=IN[L.key]+2; lo[L.key]=IN[L.key]-2; }
      else { hi[L.key]=IN[L.key]*1.2; lo[L.key]=IN[L.key]*0.8; }
      const a=computeModel(hi).npv, b=computeModel(lo).npv;
      return {nm:L.nm, up:Math.max(a,b)-base.npv, down:base.npv-Math.min(a,b), swing:Math.max(a,b)-Math.min(a,b)};
    }).sort((x,y)=>y.swing-x.swing);
    const maxHalf=Math.max(...rows.map(r=>Math.max(r.up,r.down)));

    const res=$("#snResult");
    let html=`<div class="node" style="margin-top:18px">The tornado · |Δ NPV| from a 20% move</div><div class="tornado">`;
    rows.forEach((r,i)=>{
      html+=`<div class="tor-row" style="animation-delay:${i*0.06}s"><span class="nm">${r.nm}</span>`
          + `<div class="tor-track">`
          + `<div class="tor-half l"><div class="b" style="width:${r.down/maxHalf*100}%"></div></div>`
          + `<div class="tor-half r"><div class="b" style="width:${r.up/maxHalf*100}%"></div></div>`
          + `</div><span class="sw">±A$${Math.round(r.swing/2)}m</span></div>`;
    });
    html+=`</div>`;
    res.innerHTML=html;
    const take=document.createElement("div"); take.className="fb "+(good?"good":"bad");
    take.innerHTML=`<span class="lbl">${good?"✓ Nailed the top two":"✗ Not the top two"}</span>`
      + `<b style="color:var(--gold2)">Price and grade are the same lever.</b> Both scale revenue one-for-one, so a 20% grade beat is worth exactly as much as a 20% price rally — ±A$${Math.round(rows[0].swing/2)}m each. `
      + `Opex bites less, throughput less again (its cost base scales with it), and over just 8 years the discount rate barely registers.`;
    res.appendChild(take);
    const cont=document.createElement("button"); cont.className="btn g"; cont.style.marginTop="12px"; cont.textContent="Continue →";
    cont.onclick=()=>{ ptr++; renderStep(); };
    res.appendChild(cont);
    sfx.good(); buzz(20);
    res.scrollIntoView({behavior:"smooth",block:"nearest"});
  };
}

/* ============================ DEBRIEF ============================ */
function showDebrief(){
  progress();
  let stars=1;
  if(run.misses<=1 && run.goodCh===run.totCh) stars=3;
  else if(run.misses<=4 && run.goodCh>=run.totCh-1) stars=2;
  if(stars>(save.stars[W.id]||0)){ save.stars[W.id]=stars; persist(); }
  sfx.win(); buzz([20,60,20,60,120]);
  const d=W.debrief;
  const sheet=$("#ovSheet");
  sheet.innerHTML=`
    <div class="crown">${stars===3?"★ Flawless model":"✓ Model built"}</div>
    <h2>${W.project}</h2>
    <div class="bigstars">${[0,1,2].map(i=>i<stars?'<span class="s">★</span>':'☆').join("")}</div>
    <div style="margin:6px 0 14px">
      <div class="dbrow"><span class="k">Per-share value built</span><span class="v">${M.perShare?"A$"+M.perShare.toFixed(2):"—"}</span></div>
      <div class="dbrow"><span class="k">Calc misses</span><span class="v">${run.misses}</span></div>
      <div class="dbrow"><span class="k">Judgement calls</span><span class="v">${run.goodCh}/${run.totCh}</span></div>
    </div>
    <div class="callout"><b>What moved the model</b><br>${(val(d.sens)).map(([a,b])=>`${a} — ${b}`).join("<br>")}</div>
    <div class="note"><span class="lbl">The intuition</span>${d.note}</div>
    <button class="btn p" id="ovNext">Back to the worlds →</button>`;
  $("#ov").classList.add("show");
  $("#ovNext").onclick=()=>{ $("#ov").classList.remove("show"); showMap(); };
}

/* ============================ NAV / WIRING ============================ */
function swap(id){ document.querySelectorAll(".scene").forEach(s=>s.classList.remove("on")); $("#"+id).classList.add("on"); }
$("#briefBack").onclick=showMap;
$("#playBack").onclick=()=>{ if(confirm("Leave the build? Progress on this world is lost.")) showMap(); };
$("#beginBtn").onclick=()=>{ ac(); startWorld(); };
$("#resetBtn").onclick=()=>{ if(confirm("Reset all stars?")){ save={stars:{}}; persist(); showMap(); } };

let toastT=null;
function toast(m){ const t=$("#toast"); t.textContent=m; t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),1600); }

/* advance hook: when ptr passes the end, debrief */
const _renderStep=renderStep;
renderStep=function(){ if(ptr>=W.steps.length){ showDebrief(); return; } _renderStep(); };

showMap();
}
