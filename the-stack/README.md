# The Stack — Build the Chain

A mobile-first valuation game. Each level is a real finance calculation
(FCF build, DCF, EV bridge, SOTP/NAV, dilution, accretion, mine FCF) whose
steps are shuffled. You **stack them in calculation order** — but instead of
arranging-then-checking like a flashcard, you tap the line you think comes
**next** and get an instant verdict.

## How to play

- Open `index.html` in any mobile browser (no build step, no network needed).
  Add to Home Screen for a full-screen, app-like experience.
- Tap the line that comes next. Right → it snaps into the stack with a glow.
  Wrong → it shakes and you lose a life.
- Beat the **speed clock**, chain correct taps for a **combo multiplier**,
  and keep your **3 lives**. Run out (or out of time) and the stack collapses.
- Clear a chain to earn **1–3 stars** (3 = flawless and fast) and unlock the
  next one. Progress, stars and best streak are saved on-device.

## What makes it a game (not flashcards)

| Flashcard original | This version |
|---|---|
| Reorder everything, press *Check* | Immediate per-tap feedback, no check button |
| No stakes | Lives, speed clock, score, combo multiplier |
| Same screen every time | Star ratings, locked chains, progression map |
| Static | Confetti, haptics (`navigator.vibrate`), synth SFX (WebAudio), animations |
| Nothing saved | `localStorage` progress, stars, best streak |

The educational payoff (the "why it works" note) is kept — it's now the
reward you unlock by clearing the chain.

## Tech

Single self-contained `index.html`: vanilla JS + CSS, zero dependencies, zero
build. Fonts load from Google Fonts when online; everything else works offline.
