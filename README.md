# 🎓 The University Quest: Mission Admission

A story-driven 2D RPG for Grade 11 EFL students (ages 16–17). The player explores an imaginary university campus in Kuwait (**Pearl Bay University**), talks to characters, collects word cards and documents, and completes five missions. By the end, they have written their own formal application letter.

Built with **React 18 + TypeScript + Vite + Phaser 3**. There is no login, no paid API and no external image or audio file. All graphics are drawn in code as pixel art, and all music and sound effects are made with the Web Audio API.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open the address that Vite prints (usually http://localhost:5173).

To make a production build you can copy to any web server or a USB stick:

```bash
npm run build
```

```bash
npm run preview
```

The `dist/` folder is fully static and uses relative paths. Once it is built, the game needs no internet connection. The fonts are bundled.

## Character voices (ElevenLabs)

Each character can speak with a natural ElevenLabs voice: dialogue (🔊 button, or **Settings → Read dialogue aloud automatically**) and the word cards (🔊 Listen). The voices are made **once** and saved as MP3 files in `public/tts/`. The game never contains your API key and never calls ElevenLabs while students play, so there is no cost per student and the voices work offline.

1. In ElevenLabs, open your profile → **API Keys** and create a key that has **Text to Speech** access.
2. On GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**. Name it `ELEVENLABS_API_KEY` and paste the key.
3. Open the **Actions** tab → **Generate voices (ElevenLabs)** → **Run workflow**. It creates about 130 lines (around 10,000 characters) and saves them to the repository. The site then redeploys automatically.
4. After you edit dialogue, run the workflow again. Only new or changed lines use credits, and files for deleted lines are removed.

To change a voice, edit `scripts/voices.json` (copy a voice ID from your ElevenLabs Voice Library) and run the workflow again. Which character uses which voice is set in `src/game/voices.ts`. To see the lines and the character count without using any credits, run `npm run voices:check`.

Lines that include the player's name, and other text built while the game runs, use the device's built-in voice. So does everything if no voice files have been generated.

## Play on iPhone / iPad

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that publishes the game to GitHub Pages every time `main` changes.

1. On GitHub, open the repository's **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
2. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to finish. If it ran before Pages was turned on, click **Run workflow**.
3. On the iPhone or iPad, open `https://<your-username>.github.io/<repository-name>/` in **Safari**.
4. Tap **Share → Add to Home Screen**. The game then opens full-screen in landscape, like an app.

Notes for iOS: turn the phone sideways (landscape). Sound only starts after the first tap, and the silent switch mutes it. Progress is saved separately on each device.

## Controls

| Action | Keyboard | Mouse / touch |
|---|---|---|
| Move | WASD or arrow keys (Shift = run) | On-screen arrow pad (appears on touch screens, or turn it on in Settings) |
| Talk / interact | E, Space or Enter | Click the person or object, or tap the **E** button |
| Backpack / Journal / Hint | B / J / H | HUD buttons |
| Pause | Esc | ⏸ button |
| Mute music | M | Settings |

Every drag-and-drop activity also works with **tap a card → tap a target**, so it suits interactive whiteboards.

## The five missions

| # | Location | Activities |
|---|---|---|
| 1 | Entrance plaza & gate | Watch 5 conversations, then **walk** onto the GOOD/POOR LISTENER pad · "I'm fine" body-language challenge · proverb *"Listen or your tongue will keep you deaf"* + wisdom scrolls → gate-opening animation |
| 2 | Library | Find 7 glowing vocabulary records in the world (each opens a word card with picture, example, 🔊 audio and an optional Arabic hint) · connection-line matching · drag word cards into sentence gaps |
| 3 | Career Centre | Put Dr Faisal's letter paragraphs in order · drag expressions into a recycling bin or the letter · Reading Detective evidence board |
| 4 | Admissions Office | Validated application form with a course catalogue · find 5 documents (plus decoys) in the office and file them in a folder · find 7 problems in Khaled's application |
| 5 | Writing Hall | Sort sentences into paragraphs · choose formal sentences · letter editor (Guided mode with sentence frames, or Free writing; starters, word bank, formal phrases, example letter, live word count, save, optional 170–200 word challenge) · review checklist |
| 🎓 | Admissions Office | The Dean appears → acceptance letter unfolds → stats, achievements, final letter, printable certificate |

**Assessment honesty:** the final checklist only runs simple checks on structure and key words, such as a "Dear…" greeting, "apply" in paragraph 1, "enclose" plus a document name in paragraph 4, and so on. It also flags informal words and contractions. It says on screen that it **cannot** check grammar or meaning. Weaker students can finish with the short guided version, which needs at least 5 words per paragraph.

## RPG systems

- XP, coins, and 1–3 stars per challenge. Mistakes and hints lower the bonus, but never block progress. A wrong answer always gives an explanation and another try.
- Levels: Beginner Applicant → Skilled Communicator (400 XP) → Application Expert (1000) → University Champion (1600).
- Backpack (badges, items, word cards, documents), quest journal (objectives, stars, **replay** buttons, achievements) and 14 achievements.
- Doors lock and unlock as missions progress. A bouncing yellow arrow and the top banner always show the next goal.
- Progress saves automatically to `localStorage`. Choose **Continue Game** on the menu to carry on.

## Classroom / Team mode

From the main menu choose **Team Challenge** and enter 2–6 team names. You can also turn on a timer per challenge (1–5 minutes). The timer never blocks play. The active team's name shows in every challenge, and that team earns its XP and stars. Press **Next team ▶** in the HUD to pass the turn. A leaderboard is in the Pause menu and on the final screen.

**Teacher tools** (Pause → 🧑‍🏫) let you jump straight to any mission, change timer and team settings, or reset progress.

## Editing the content

All the teaching content is in **`src/game/content.ts`**: vocabulary, example sentences, Arabic hints, listening scenarios, Dr Faisal's letter, detective questions, courses, documents, checklist items, sentence banks, guided sentence frames, formal phrases and the example letter. Change the text there and the game updates.

> Dr Faisal's letter is an original adaptation written to match the unit (purpose → qualifications → reasons → enclosed documents → thanks). The textbook pages were not available when this was built, so compare it with your coursebook and paste in the exact wording if you want it to match.

## Project structure

```
src/
  game/      content.ts (curriculum) · state.ts (save, XP, achievements) · logic.ts (story & quests)
             art.ts (procedural pixel art) · looks.ts (characters) · audio.ts (synth music/SFX) · letterCheck.ts
  phaser/    maps.ts (campus + 4 interiors) · WorldScene.ts (movement, collisions, doors, NPCs, effects)
  ui/        hud.tsx · menus.tsx · panels.tsx · final.tsx · common.tsx (drag & drop, mini-game shell)
  ui/minigames/  m1.tsx … m5.tsx
```
