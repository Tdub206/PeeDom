# StallPass — Support & Community Playbook

For the Support / Community Manager hat. This is the operational doc for day-to-day response, moderation, and review handling. It is written to be usable by one person in under an hour per day.

---

## 1. Daily routine (≤ 45 min)

- **09:00** — Triage the support inbox (support@stallpass.app). Tag: `bug`, `feature`, `abuse`, `privacy`, `other`.
- **09:15** — Review the Sentry "new issues" feed. Anything with > 10 affected users in 24h → file a ticket and tag Engineer.
- **09:25** — Walk the Play Store reviews page. Respond to all 1–3 star reviews (template in §4). Thank-you reply to 5-star reviews with a specific quote from their text.
- **09:40** — Walk the moderation queue (auto-held submissions + community-flagged). Decisions logged in `moderation_decisions.md` with: listing ID, decision, reason, moderator.

Weekly: close with a 30-minute retro — what are the top 3 themes in reviews and inbox this week? Add to `docs/WEEKLY_PULSE.md`.

---

## 2. Moderation defaults

| Signal | Auto-action | Human review? |
|--------|-------------|----------------|
| New submission from an account < 24h old | Hold until reviewed | Yes, within 24h |
| ≥ 3 distinct users flag the same listing | Auto-hide | Yes, within 12h |
| Submitted coordinate within 50m of a known spam cluster | Auto-reject | Sampled weekly |
| Code submission fails verification ≥ 2x by distinct users | Auto-expire | No, unless appealed |
| "Refused service" report | Keep private to moderators | Yes, always |
| Photo upload flagged by auto-moderation | Hold | Yes, within 24h |

**Non-negotiables:**
- A listing is never removed solely because a business asked. Removal requires a verified policy violation (incorrect data, harassment, doxxing, illegal content).
- "Refused service" reports are never publicly attached to a business's listing without a moderator's manual review and explicit approval. These reports are sensitive and can be retaliatory in both directions.
- Reports that out someone's housing status, medical condition, gender identity, or immigration status are removed immediately and the reporter warned.

---

## 3. Abuse patterns we expect on Day 1

1. **Joke submissions** (e.g., "The White House bathroom, 5 stars"). Hold, reject, no penalty.
2. **Null Island / ocean coordinates**. Auto-reject via a geo-validation check.
3. **Gender-war brigading** on gender-neutral listings. Hide comments, preserve the listing, temp-ban brigaders. Do not engage publicly.
4. **Fake codes to farm reveal-ad rewards**. Codes that fail verification ≥ 2x are auto-expired. Repeat offenders have code submission disabled.
5. **Retaliatory "refused service" reports** from disgruntled former employees or competitors. Moderators treat these as personal, not public. Do not display publicly without ≥ 2 independent, verified reports.
6. **Doxxing in free-text fields**. Scrub and warn. Second occurrence is a ban.

---

## 4. Play Store review response templates

Keep replies under 350 characters. Lead with acknowledgement, end with a path forward. Never argue.

**Template A — bug report (1–3 stars):**
> Thanks for flagging this. We're sorry the app let you down when you needed it most — that's exactly what we're trying to prevent. Would you email support@stallpass.app with your device model and Android version? We'll get you a fix this week.

**Template B — feature request:**
> Appreciate this — it's on our roadmap. We shipped v1.0 with the smallest set we could live with so we could learn from real users. [Feature] is high on the v1.1 list. If you'd like to be notified when it lands, drop us a line at support@stallpass.app.

**Template C — angry but specific:**
> You're right to be frustrated. [Acknowledge the specific thing they said.] We'll fix [specific thing] and we'd love to earn back the star. Email support@stallpass.app with your location so we can verify it's been corrected on our end.

**Template D — 5-star thank-you (personal):**
> [Quote one specific thing they said.] This is why we built it. Thank you. — Daddy

**Template E — review that reveals a privacy misunderstanding:**
> Thanks for the feedback. Quick note: StallPass never sells location or personal data, and core bathroom-finding works without an account or an ad. Our full privacy policy is at stallpass.app/privacy. If something in the app felt different from that, please let us know.

---

## 5. Support inbox response templates

**Data deletion request:**
> Hi [name], confirming we received your request to delete your StallPass account. Your account will be closed today and all personal data removed within 30 days per our privacy policy (stallpass.app/privacy). You'll get a confirmation email when deletion is complete. — StallPass Support

**Bug report acknowledgement:**
> Hi [name], thanks for the report — we've logged this as [issue ID]. Device: [model]. Android: [version]. We'll follow up when the fix ships. In the meantime, [workaround if any]. — StallPass Support

**"My business was listed and I don't want it to be":**
> Hi [name], thanks for reaching out. StallPass lists publicly accessible bathrooms that community members have contributed. If your listing has incorrect information (wrong hours, wrong accessibility info, etc.), we'll update it within 48h. If you'd prefer your business not be listed at all, reply with the business name and address and we'll remove it within 48h. We ask for your patience while we verify the request. — StallPass Support

**"Someone reported my business for refusing service":**
> Hi [name], thanks for reaching out. StallPass's "refused service" reports are kept private to our moderators by default and are not attached to business listings publicly. We'd like to understand what happened. Could you share more detail? — StallPass Support

**Press / podcast inquiry:**
> Thanks for reaching out. We'd be glad to chat — please share the publication/show, format, and rough timing. The founder is happy to do interviews focused on access, dignity, and the technical architecture of a free utility. — StallPass

---

## 6. Escalation ladder

- **L1 — auto-rules**: geo-validation, flag thresholds, stale-code expiry. No human touch.
- **L2 — Community Manager** (you): everything else, within 24h.
- **L3 — Founder** (Daddy): legal threats, press, public-safety issues, any takedown that feels political.
- **L4 — Counsel** (TBD): subpoenas, DMCA claims, regulator letters. Do not reply without counsel review.

---

## 7. Metrics to watch

- Moderation queue depth (target: < 50 at end of day)
- Median response time on support email (target: < 24h)
- % of 1-star reviews responded to within 48h (target: 100%)
- Takedown-to-misuse ratio: # legitimate takedowns / # total removal requests. If it drops below 70%, the takedown policy is being gamed.
- "Refused service" report volume and verification rate — trend line published quarterly as part of the transparency note.
