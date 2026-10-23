# Google Play release checklist: HungryKatz

Work top to bottom. Copy-paste answers are in **bold**; the listing text is in `listing.md` next to this file.
Google changes the Play Console from time to time, so if a screen looks different, follow what the console shows.

## 0. Test on a real phone first (about 20 minutes)
- [ ] In the `app` folder: `npx eas-cli@latest build --platform android --profile preview`
- [ ] Install the APK from the link or QR code it gives you.
- [ ] Play a few rounds: tap-to-walk, serving, sounds, rush hour.
- [ ] Close the app completely, reopen it: your coins and level are still there.
- [ ] Photo mode: **Save** (allow the permission, then check your gallery) and **Share**.
- [ ] Settings → Privacy policy opens in the browser.

## 1. Developer account (one-off)
- [ ] Sign up at play.google.com/console: **Personal** account, US$25, identity check with ID.
- [ ] Developer contact email: **contact@solutioncloud.tech** (shown publicly; matches the privacy policy).
- [ ] Website: **https://hungrykatz.solutioncloud.tech/**

## 2. Create the app
- [ ] App name: **HungryKatz: Cosy Cat Café**
- [ ] Default language: **English (United Kingdom)** (or US)
- [ ] App or game: **Game**. Free or paid: **Free**.
- [ ] Accept the declarations (developer policies, US export laws).

## 3. Build the release file
- [ ] In the `app` folder: `npx eas-cli@latest build --platform android --profile production`
  This makes an **.aab** file (what Google wants). Download it from the link when the build finishes.
- [ ] App ID inside it: **tech.solutioncloud.hungrykatz** (can never change after the first upload).
- [ ] Signing: when Play asks, keep **Play App Signing** on. EAS holds your upload key; Google holds the app key.

## 4. App content (Policy → App content)
- [ ] **Privacy policy:** **https://hungrykatz.solutioncloud.tech/privacy.html**
- [ ] **Ads:** **No, my app does not contain ads**
- [ ] **App access:** **All functionality is available without special access** (no login)
- [ ] **Content rating** (questionnaire): category **Game**; violence, fear, sex, language, drugs, gambling: **No** to all; users interact / share location / buy digital goods: **No**. Expected result: Everyone / PEGI 3.
- [ ] **Target audience and content:** tick the age groups you want (for example **5–8, 9–12, 13–15, 16–17, 18+**). Picking under-13 groups puts the app under the **Families policy**; HungryKatz already fits it: no ads, no data collection, no accounts, no in-app purchases, no links out except the privacy policy.
- [ ] **Data safety:**
  - Does the app collect or share any required user data types? **No**
  - (If asked about encryption in transit: there is no data in transit; the app makes no network requests.)
  - Photos: saving a picture to the gallery is not "collection" (it never leaves the phone), so it is not declared here.
- [ ] **Government app / Financial features / Health / News / COVID-19:** **No** / **None** to all.
- [ ] **Photo and video permissions** (only if the console asks): the app asks to *add* one picture to the gallery when the player taps Save in Photo mode. Purpose: **"Saves a picture of the player's own café to their gallery when they tap Save. The app never reads other photos."**
  If Google rejects this, tell Claude: the app can switch to saving without that permission.

## 5. Store listing (Grow → Store presence → Main store listing)
- [ ] Name, short and full description: copy from `listing.md`.
- [ ] App icon: **store/icon-512.png**
- [ ] Feature graphic: **store/feature-graphic.png**
- [ ] Phone screenshots (landscape, 1920×1080): **store/screenshot-1-home.png** to **screenshot-6-photo.png**
- [ ] Category: **Games → Casual**. Tags: Casual, Cute, Cats, Cooking, Restaurant, Kids.
- [ ] Contact details: **contact@solutioncloud.tech**, website as above.

## 6. Closed test (needed before you can publish)
New personal developer accounts must run a **closed test with at least 12 testers for 14 days in a row**
before Google allows a public (production) release. Start this as early as you can.
- [ ] Testing → Closed testing → create a track (for example "Friends and family").
- [ ] Add testers: an email list of **12 or more** people with Android phones (family and friends are fine).
- [ ] Upload the **.aab** from step 3, write release notes ("First test of HungryKatz!"), roll out.
- [ ] Send testers the **opt-in link**; each one taps it, accepts, then installs from the Play Store.
- [ ] Keep at least 12 testers opted in for **14 days**. Ask them to play a little and send feedback.

## 7. Go live
- [ ] After the 14 days: Dashboard → **Apply for production** (a short questionnaire about the test).
- [ ] When approved: Production → create release → use the same (or a newer) .aab → roll out.
- [ ] Google reviews it (usually a few days). Then HungryKatz is on the Play Store!

## Later
- New version: tell Claude what changed; it repacks the game (`npm run bundle-game`) and you run the production build again. EAS raises the version number for you.
- iPhone: same app; needs the Apple Developer Program (US$99/year). EAS builds it in the cloud, no Mac needed.
