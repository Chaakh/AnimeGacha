# AniGacka Agent Guide

## Project Overview
- Build and maintain a Nuxt 4 anime gacha web app.
- Core product flow:
  - Summon page with daily pack opens
  - Collection page for owned characters
  - Battle page for team combat simulation

## Product Rules
- Users get exactly `10` packs per day.
- Each character must have:
  - `rarity`
  - `attack`
  - `defense`
- Collection data should persist for the user (currently local storage).
- UI should feel game-like and modern, inspired by sites like wiki-style gacha trackers.

## Technical Conventions
- Framework: Nuxt 4 + Vue 3 + TypeScript.
- Use composables for game state (`app/composables`).
- Use reusable UI components (`app/components`).
- Keep styles consistent with `app/assets/css/main.css` variables and theme.
- Keep pages mobile responsive and avoid broken layouts below `768px`.

## Development Workflow
1. Implement one feature slice at a time.
2. Run build validation after each feature:
   - `npm run build`
3. If build fails, fix before moving to the next feature.

## Git Workflow (Required)
After each completed feature slice:
1. Bump app version in `package.json` before committing.
2. Stage relevant files.
3. Commit with a clear message describing the feature.
4. Push immediately to the current branch.

Version bump rule:
- Bump **every commit** (no exceptions).
- Use semantic versioning in `package.json`:
  - `patch` for fixes/chore/style/refactor commits
  - `minor` for new user-facing features
  - `major` for breaking changes

Suggested command pattern:
```bash
npm version patch --no-git-tag-version
git add <files>
git commit -m "feat: <short feature description>"
git push
```

Commit message style:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for internal code cleanup
- `style:` for UI-only polish without behavior change

## Quality Checklist
- Daily pack reset logic works correctly.
- Pull rates and rarity rendering are consistent.
- Collection counts update immediately after pulls.
- Battle flow works with selected characters.
- Navigation between Summon, Collection, and Battle is clear.
- Build passes before commit/push.
