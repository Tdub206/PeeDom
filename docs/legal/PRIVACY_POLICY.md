# StallPass Privacy Policy

**Effective date:** April 24, 2026
**Last updated:** April 15, 2026
**Contact:** support@stallpass.app

StallPass ("we," "our," "us") is a crowd-sourced bathroom finder. This policy explains what we collect, why we collect it, how we protect it, and the rights you have over it.

---

## 1. Our promise

You should not have to trade your data for basic access to a bathroom. Finding a bathroom in StallPass works without an account, does not require signing in, and does not require cross-app tracking.

If you create an account, contribute submissions, or use optional features, we collect only the information needed to make those features work.

---

## 2. What we collect

We collect information in three categories.

**2.1 Device location (precise and approximate)**
- What: Your device's GPS or network-derived coordinates while the app is in the foreground.
- Why: To center the map on you and calculate distance to nearby bathrooms.
- Retained: Not retained on our servers unless you explicitly save a favorite or submit a new bathroom.
- Opt-out: You can deny location permission. Discovery still works by city-name search.

**2.2 Account information (only if you sign in)**
- What: Email address and a hashed password managed by Supabase Auth. Optional display name.
- Why: Account recovery, attributing your submissions, syncing favorites across devices.
- Retained: Until you delete your account.

**2.3 App usage and diagnostics**
- What: Crash reports, performance traces, push registration data, and limited operational telemetry.
- Why: To find bugs, deliver notifications, and keep the service reliable.
- Who processes it: Sentry for crash reports and performance. Our own backend for operational state.
- Retained: Sentry data is retained under the Sentry project retention policy. Operational data is retained only as needed to run the service.

---

## 3. What we do not collect

- Your contacts.
- Your microphone recordings.
- Your camera stream, unless you explicitly attach a photo to a submission.
- IDFA for cross-app tracking.
- Health, financial, or government identifier data.

---

## 4. Who we share it with

We do not sell personal information. We do not share it for cross-app behavioral advertising.

We share limited data with these categories of recipients:

1. **Infrastructure providers**
   - Supabase for database and authentication.
   - Sentry for crash and performance monitoring.
   - Apple App Store and Google Play for app distribution.
   - Apple Maps on iOS, Google Maps on Android, and Google Places for address and business lookup. Location or search data is shared only as needed to render maps or resolve the place you searched for, under those providers' terms.
2. **Other StallPass users**
   - Crowd-sourced submissions, ratings, codes, and similar community content may be visible to other users.
3. **Legal compliance**
   - We may disclose information when required by valid legal process or when necessary to protect users, the public, or StallPass.

---

## 5. Advertising

StallPass may show optional rewarded video ads to unlock community-submitted bathroom codes. These ads are served by Google AdMob.

- Ads are never required to find a bathroom, view a listing, or read an accessibility note.
- The rewarded ad is the only ad format.
- If a future release enables rewarded ads in regions that require consent, StallPass will present the required consent flow before showing ads.

---

## 6. Children

StallPass is not directed at children under 13. We do not knowingly collect personal information from children under 13.

---

## 7. Your rights

You may have the right to:

- Access your data.
- Correct inaccurate data.
- Delete your account and personal data.
- Export your data in a portable format.
- Disable optional permissions such as location and notifications.

You can exercise these rights from the app or by contacting support@stallpass.app.

---

## 8. Security

- All network traffic uses TLS.
- Passwords are handled by Supabase Auth; we do not store plaintext passwords.
- Database access is gated by Row Level Security policies.
- Secrets that bypass RLS exist only in server-side functions and are not shipped in the app binary.

No system is perfect, but we take reasonable precautions to protect your data.

---

## 9. International transfers

Our primary infrastructure is hosted in the United States. If you use StallPass from outside the United States, your data may be transferred there.

---

## 10. Retention

| Data | Retention |
|------|-----------|
| Account email and profile | Until you delete your account |
| Favorites | Until you delete the favorite or account |
| Submissions (bathrooms, ratings, codes) | Retained for map integrity; anonymized on account deletion where applicable |
| Device location | Processed in-session; not retained on our servers unless you submit related content |
| Crash and performance telemetry | Retained per configured vendor retention policy |

---

## 11. Changes to this policy

If we change this policy materially, we will update the effective date and notify users through reasonable channels when required.

---

## 12. Contact

- Questions: support@stallpass.app
- Data requests: privacy@stallpass.app
- Postal mail: StallPass, c/o [Company address to be added before submission]

