# Al-Ma’thurat Web App

Project author and contributor: **orewoleabdullah**.

A mobile-first static reader for the morning and evening Al-Ma’thurat. It uses plain HTML, CSS, and vanilla JavaScript; there is no backend or framework.

## Content status

`data/mathurat.json` contains 32 morning/evening records covering the 27-item sequence from [mathurat.com](https://mathurat.com/). The sequence and repetition counts follow that list. Every record has `needsReview: false` and `transliterationReviewed: true`, as finalized for this edition. Specific hadith references and gradings are included only when confirmed on Sunnah.com or Hisn al-Muslim; otherwise the reference is `Al-Ma'thurat (Imam Hasan al-Banna)`. Quran references remain specific. See [REVIEW.md](./REVIEW.md) for the source and context of each entry.

Qur’anic Arabic is reproduced from the Tanzil Project’s Uthmani text. Qur’anic English meaning is Sahih International via Tanzil. Other English dua translations are original app translations and are not copied from mathurat.com.

## Interface colors

The interface uses warm paper and ink tones for morning, deep indigo and pale text for evening, and a separate warm sepia theme. `Auto` follows the selected session.

| Theme | Page | Surface | Raised surface | Main text | Secondary text | Accent | Soft accent | Divider |
|---|---|---|---|---|---|---|---|---|
| Morning / Light | `#f3efe6` | `#faf8f3` | `#ece7dc` | `#292821` | `#625f56` | `#8d5d27` | `#e8dcc7` | `#d7d0c3` |
| Evening / Dark | `#171827` | `#202238` | `#292b42` | `#f1eff7` | `#c1bfd0` | `#d4c8f1` | `#39354d` | `#3a3b51` |
| Sepia | `#eee5d6` | `#f7f0e4` | `#e8dcc8` | `#30291f` | `#65594b` | `#79532d` | `#e5d4b8` | `#d3c3a9` |

The session tiles have their own subtle tones: morning uses `#f1ebdf` with text `#29251f`, secondary text `#62594d`, border `#d8cbb8`, and accent `#926331`; evening uses `#1d2036` with text `#f1eff7`, secondary text `#c9c6d7`, border `#3e4058`, and accent `#d4c8f1`.

## Features

- Separate Morning (Sabah) and Evening (Masa’) sessions with a time-of-day suggestion.
- Session tiles show progress and resume at the next unfinished remembrance.
- Independent Arabic, transliteration, and translation visibility controls.
- Open-page reading layout, per-dhikr repetition counters, session progress, previous/next and swipe navigation, and a completion-marked jump sheet.
- Daily progress saved separately for each session in local storage.
- A custom reset confirmation and a quiet completion screen.
- Light, dark, sepia, and automatic themes; adjustable Arabic and translation sizes.
- Optional haptic feedback and share/copy action.
- Service worker and web manifest cache the app, content, icons, and self-hosted fonts for offline use after the first visit.
- Responsive layout, keyboard navigation, reduced-motion support, and semantic controls.

## Run locally

ES modules and the service worker require a web server; opening `index.html` directly as a `file://` URL is not supported.

From the project directory, start a static HTTP server, for example:

```sh
npx serve .
```

Open the local URL printed by the server. On a first visit, load the app while online to cache its files for offline use.

## Deploy

Deploy this folder as a static site on GitHub Pages, Netlify, Vercel, or another static host. Serve over HTTPS for service-worker support. No environment variables or build step are needed.

## Edit or add content

Keep all remembrance text in `data/mathurat.json`. Each record uses the following fields:

```json
{
  "id": "stable-kebab-case-id",
  "order": 1,
  "title": "Display title",
  "time": "morning",
  "arabic": "Arabic text",
  "transliteration": "Transliteration",
  "translation": "English meaning",
  "repeat": 1,
  "reference": "Quran 1:1–7 or verified source",
  "sourceUrl": "https://example.org/source",
  "note": "Optional verified context or repetition-count note",
  "grading": "Optional grade with a verified grading source",
  "needsReview": false,
  "transliterationReviewed": true
}
```

Allowed `time` values are `morning`, `evening`, and `both`. Preserve the existing schema, stable IDs, order, and established repetition counts. Verify Qur’anic Arabic against Tanzil and hadith wording/grades against the cited source page before adding a specific hadith reference or grading. If a hadith citation is not confirmed, use `Al-Ma'thurat (Imam Hasan al-Banna)` rather than guessing. Keep explanatory notes factual and tied to a source. Run `node scripts/verify-quran.mjs` after editing to check Qur’anic passages, record flags, and session totals.

## Sources and licensing

- **List, order, and repetition counts:** [mathurat.com](https://mathurat.com/). Its English translations are not reproduced.
- **Qur’anic Uthmani text:** [Tanzil Project](https://tanzil.net/), © 2007–2021, CC BY 3.0; text reproduced verbatim.
- **Qur’anic English translation:** Sahih International via [Tanzil translations](https://tanzil.net/trans/). The Sahih International translation is for **non-commercial use only**; obtain permission or use a properly licensed alternative before commercial use.
- **Hadith references and displayed gradings:** [Sunnah.com](https://sunnah.com/), including its Hisn al-Muslim collection where cited.
- **Self-hosted fonts:** Amiri Arabic, Inter Latin, and Newsreader Latin subsets are bundled under `fonts/`; no remote font request is made. The font families are distributed under the SIL Open Font License.

The suggested session uses a local-clock heuristic (evening from 3 p.m. through 4:59 a.m.; morning otherwise), not calculated prayer times. Switch sessions manually as needed; the app does not request location or claim to determine prayer times.

Content follows Al-Ma’thurat as compiled by Imam Hasan al-Banna. Please verify it with a trusted printed edition or a qualified scholar.
