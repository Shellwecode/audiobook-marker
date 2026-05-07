# Claude Code Session Prompts

---

## SESSION 1 — Refactor
**Goal:** Split the monolith. No feature changes, no visual changes.
**Time estimate:** Short session, low token cost.

```
Read SPEC.md first.

Refactor `audiobook-player.html` into the following files:

- `index.html` — HTML shell only: DOCTYPE, head tags, font imports, DOM structure, script/link tags
- `styles.css` — all CSS, CSS variables, animations, media queries
- `player.js` — audio element logic, playback controls, skip, progress bar scrubbing, time formatting
- `annotations.js` — wake phrase detection, MediaRecorder, Whisper API call, annotation CRUD, localStorage, drawer open/close
- `map.js` — chapter data, progress bar markers (dots + ticks), any existing map/overview code

Expose shared state as a single global object:
  window.APP = { audio, annotations, chapters, duration }

All files must share this object — no duplicated state.

Do not change any functionality, styles, or visual design.
Do not combine steps — just refactor.
Verify by listing what each file is responsible for before writing any code.
```

---

## SESSION 2 — Expanded Book Map
**Goal:** Click the progress bar → it expands into the full book map.
**Edit only:** `map.js`, `styles.css`

```
Read SPEC.md first. Edit only map.js and styles.css.

Remove all chapter-related code from map.js — chapter ticks on the 
progress bar, chapter data structures, chapter labels. Remove cleanly, 
don't leave dead code.

The progress bar has one job: scrubbing. Clicking it seeks. Nothing else.

**Add a map icon button** centered below the progress bar, between the 
time labels and the playback controls.
- 28px tap target, icon only, no label
- Muted color matching the time labels, brightens on hover
- Toggles the annotation map open/closed

**The annotation map panel** pushes the cover and book info upward when 
open — not an overlay, not a modal. The player expands.

Inside the panel:
- Full-width horizontal timeline from 0 to total duration
- Each annotation as an upward pin at its proportional timestamp position
- Pin shows a dot at the baseline and the first 8 words of text above it
- Current playhead as a vertical amber line
- Listened-through section (track the furthest seek point) subtly brighter 
  than unheard
- Clicking a pin jumps to that timestamp and closes the panel
- Clicking anywhere else on the timeline seeks and closes
- Clicking the map icon again closes without seeking

No chapter data. No close button. No extra chrome.
Panel height animates open and closed, cubic-bezier(0.32, 0.72, 0, 1), 350ms.

Do not touch index.html, player.js, or annotations.js.
```

---

## SESSION 3 — Morph Transition
**Goal:** The expand/collapse feels like one continuous component, not a swap.
**Edit only:** `map.js`, `styles.css`

```
Read SPEC.md first. Edit only map.js and styles.css.

The expanded book map works but the transition is abrupt.
Improve the animation so collapsed and expanded states feel like the same component morphing:

- Height: spring easing, cubic-bezier(0.32, 0.72, 0, 1), 400ms
- Annotation dots: scale up from center and translate upward into pin position
  Use CSS transform, not position changes. Stagger by 30ms per pin.
- Chapter ticks: grow downward from the bar baseline into full-height dividers,
  chapter labels fade in with opacity 0→1 at 200ms into the transition
- Playhead line: draws downward from the bar — clip-path height 0→100%, 250ms delay
- On collapse: reverse all of the above

No layout shift on surrounding elements during expand.
No JavaScript animation libraries — CSS transitions and transforms only.

Do not touch index.html, player.js, or annotations.js.
```

---

## SESSION 4 — Summarize My Reading
**Goal:** Claude synthesizes your annotations into a structured reading summary.
**Edit only:** `annotations.js`, `styles.css`

```
Read SPEC.md first. Edit only annotations.js and styles.css.

Add a "Summarize My Reading" feature to the annotations drawer:

Trigger:
- A "Summarize" button appears at the bottom of the annotations list when there are 3 or more annotations
- The Anthropic API key is already stored in localStorage as `anthropic_api_key`

API call:
- Model: claude-sonnet-4-6
- Send all annotations formatted as: [MM:SS] annotation text
- System prompt: "You are helping a reader reflect on an audiobook they just listened to.
  Given their voice annotations with timestamps, return a JSON object with three fields:
  themes (array of strings), questions (array of strings), synthesis (one paragraph string).
  Return only valid JSON, no markdown."
- Parse the response and render it as a card

Output card (inside the drawer, below annotations list):
- Section: "Themes" — pill tags for each theme
- Section: "Questions you raised" — simple list
- Section: "Synthesis" — the paragraph, in Playfair Display italic
- The card is collapsed by default, expands on click
- A "Regenerate" button re-runs the call

Loading state: replace button text with "thinking…" and disable it during the API call.
Error state: show "Couldn't generate summary — check your API key" inline.

Do not touch index.html, player.js, or map.js.
```
