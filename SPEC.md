# Audiobook Marker — Project Spec

## What this is
A browser-based audiobook player focused on voice annotation and spatial navigation.
The core idea: listening is passive, but reading is active. This app brings annotation,
reflection, and navigation to the audio format — hands-free.

## Design principles
- Listening experience first. No UI should intrude while audio is playing.
- Voice over touch. Prefer wake-phrase triggers over buttons.
- One component, two zoom levels. The progress bar and book map are the same thing.
- Dark, warm aesthetic. Playfair Display + DM Sans. Amber (#e8a45a) accent on near-black.

---

## Current state (as of Feb 26)
- Single file: `audiobook-player.html`
- Working: audio playback, skip 15s/30s, progress bar
- Working: voice annotation via "hey note" wake phrase (Web Speech API)
- Working: annotations drawer (bottom sheet, swipeable)
- Working: annotation dots on progress bar at timestamp positions
- Working: chapter ticks on progress bar
- Working: LibriVox sample library (hardcoded, 4 books)
- Working: light/dark mode toggle
- Working: API key modal (OpenAI Whisper + Anthropic)
- NOT YET: expanded progress bar → book map transition
- NOT YET: annotation pins morphing on expand
- NOT YET: "Summarize My Reading" (Claude API, 3+ annotations)

---

## Upcoming sessions

### Session 1 — Refactor (do first, no feature changes)
Split monolith into separate files. No functionality changes.
Output: index.html, styles.css, player.js, annotations.js, map.js

### Session 2 — Expanded book map
The progress bar expands on click into a full book map view.
Chapters as proportional sections, annotation pins, playhead line.
Collapses on click-outside or on seek.

### Session 3 — Morph transition
The expand/collapse animates: dots grow into pins, ticks grow into chapter dividers.
Spring curve, 400ms. No layout shift on rest of page.

### Session 4 — Summarize My Reading
Claude API call (claude-sonnet-4-6). Appears in drawer when 3+ annotations exist.
Returns: key themes, questions raised, synthesis paragraph.
Displayed as an expandable card below the annotations list.

---

## File structure (after Session 1)
```
audiobook-player/
├── index.html          # Shell, imports, DOM structure only
├── styles.css          # All CSS variables, layout, component styles
├── player.js           # Audio element, playback controls, progress bar
├── annotations.js      # Recording, Whisper API, drawer, annotation CRUD
└── map.js              # Progress bar markers, expanded book map, chapter data
```

## Key variables (shared across files)
- `window.APP.audio` — the HTMLAudioElement
- `window.APP.annotations` — array of { id, ts, text }
- `window.APP.chapters` — array of { title, startTime, endTime }
- `window.APP.duration` — total audio duration in seconds
