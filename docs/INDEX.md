# StallPass Launch — Deliverables Index

All the launch-prep documents produced in this work cycle, grouped by hat. Read the Dossier first; everything else is referenced from it.

## Strategy

- [`LAUNCH_DOSSIER.md`](LAUNCH_DOSSIER.md) — master briefing. Team, scope, audit scorecard, 10-day plan, catapult thesis.

## Growth / Marketing

- [`STORE_LISTING.md`](STORE_LISTING.md) — final Play Store copy (title, short desc, full 2.5k-char desc, ASO keywords, release notes, reviewer-notes paste block).
- [`LAUNCH_DAY_COMMS.md`](LAUNCH_DAY_COMMS.md) — social calendar, Reddit seed posts by community, press pitch, press kit spec.

## Legal

- [`legal/PRIVACY_POLICY.md`](legal/PRIVACY_POLICY.md) — ready to publish at `https://stallpass.app/privacy`.
- [`legal/TERMS_OF_SERVICE.md`](legal/TERMS_OF_SERVICE.md) — ready to publish at `https://stallpass.app/terms`. Fill in entity name, state, and county before launch.
- [`legal/DATA_DELETION.md`](legal/DATA_DELETION.md) — ready to publish at `https://stallpass.app/delete-account`.

## Design / UX

- [`UX_POLISH_CHECKLIST.md`](UX_POLISH_CHECKLIST.md) — on-device polish pass before the production build.

## QA / Release

- [`QA_DEVICE_WALKTHROUGH.md`](QA_DEVICE_WALKTHROUGH.md) — 13-scenario end-to-end device test.
- [`REVIEWER_DEMO_ACCOUNT.md`](REVIEWER_DEMO_ACCOUNT.md) — how to set up the Play reviewer account, with seed SQL.
- [`PLAY_CONSOLE_WALKTHROUGH.md`](PLAY_CONSOLE_WALKTHROUGH.md) — every Play Console field, with the answer or source file.
- [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md) — pre-launch gate, staged rollout, Sentry alerts, rollback procedure, known risks.

## Support / Community

- [`SUPPORT_PLAYBOOK.md`](SUPPORT_PLAYBOOK.md) — moderation defaults, abuse patterns, review response templates, escalation ladder, metrics.

## Code changes this cycle

- `src/constants/config.ts` — added `config.urls` (website, privacy, terms, support, data deletion) so in-app Settings and any Sentry/support flows can reference public URLs from a single source.

## Blockers that still require Daddy

These are the items I cannot do alone. Everything else is complete.

1. **Host the legal docs** at their canonical URLs before submission.
2. **Register the reviewer email mailbox** (`playreviewer@stallpass.app`) and the support mailbox (`support@stallpass.app`).
3. **Register / confirm the domain** (`stallpass.app`) and a basic landing page — even a static one suffices.
4. **Fill in entity name / state / county** in `legal/TERMS_OF_SERVICE.md` (sections 1 and 13).
5. **Complete the QA device walkthrough** on your real Android phone.
6. **Trigger the production EAS build** when QA is clean.
7. **Submit to Play Console** following `PLAY_CONSOLE_WALKTHROUGH.md`.
8. **Configure Sentry alert rules** per `LAUNCH_RUNBOOK.md` §3.
9. **Seed production Supabase** with ≥ 50 bathrooms in the launch city.
10. **Optional:** capture a 30-second "Go Now" screen recording for social + press kit; capture tablet screenshots if aiming for the Top Utility tier.
