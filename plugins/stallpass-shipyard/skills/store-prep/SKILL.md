---
name: store-prep
description: Prepare StallPass Google Play submission materials, listing copy, policy requirements, and missing asset checklists from the current repo state.
---

# Store Prep

## Use this skill when

- the user needs Google Play listing materials
- the release needs policy, asset, or submission-gap analysis
- the app is approaching store submission and the repo must be mapped to Play requirements

## Required references

- `LAUNCH_CHECKLIST.md`
- `app.json`
- `app.config.ts`
- `StallPass_App_Store_Assets/`
- `LAUNCH_MANIFEST.md`

## Workflow

1. Inspect the existing app metadata, release docs, and store asset folders.
2. Identify what already exists and what is still missing for Google Play:
   - app name and package ID alignment
   - short and full descriptions
   - phone and tablet screenshots
   - feature graphic and icon assets
   - privacy policy and support URLs
   - data safety and content rating inputs
   - production environment and signing prerequisites
3. Do not invent live URLs, completed forms, or assets that are not present in the repo.
4. Produce a concrete submission pack:
   - current evidence from the repo
   - missing items
   - recommended listing copy
   - policy and compliance gaps
   - final pre-submission checklist

## Optional companion step

If the user also wants technical ship-readiness, route to `../launch-audit/SKILL.md` after the store-prep pass.
