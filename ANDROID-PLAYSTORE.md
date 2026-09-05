# NEXORA — Android app & Play Store guide

Your storefront is now wrapped as a real native Android project (via Capacitor),
with your Royal Pink / Emerald / Champagne Gold app icon already wired in at
every required size, plus a PWA manifest + offline shell caching. This file is
everything you need, in order, to get it into the Play Store.

## 0. What's already done for you
- App is configured to **load your live site directly**:
  `https://stratixapp.github.io/Nexora/` — no local copy of the pages is
  bundled inside the app. Any change you push to GitHub shows up in the app
  the next time it's opened, with **no app update or rebuild needed**.
- `manifest.json`, `sw.js` — installable PWA, app shell cached for instant
  loads on the live site too.
- `assets/icons/` — every icon size (mobile home screen + Play Store listing).
- `android/` — a complete, buildable Android Studio project.
  - App name: **NEXORA**
  - Package (application ID): **com.stratix.nexora**
  - Launcher icon: your royal N monogram, adaptive-icon ready (works with round,
    square and squircle icon shapes on different phones).
  - `INTERNET` permission already added (needed for Supabase + WhatsApp).

## ⚠️ Before doing anything else — push these files to GitHub
The app loads `https://stratixapp.github.io/Nexora/` directly, so that live
site needs the **same new files** this update added, or the app will look like
the old version:
- `manifest.json`
- `sw.js`
- `assets/icons/` (whole folder)
- `assets/app-icon.svg`, `assets/app-icon-foreground.svg`, `assets/app-icon-maskable.svg`
- every `.html` file (they now link to `manifest.json`)
- `js/supabaseClient.js` (registers the service worker)

Push these to the `Nexora` repo, wait a minute for GitHub Pages to redeploy,
then open `https://stratixapp.github.io/Nexora/` in a browser once to confirm
it looks right before moving to the Android steps below.

## 1. Install what you need (one-time)
1. **Node.js** (v18+) — you already used this for other Stratix apps.
2. **Android Studio** — https://developer.android.com/studio (this installs the
   Android SDK too — accept the SDK licenses when it asks).

## 2. Open the project
```bash
cd nexora
npm install
npx cap open android
```
This launches Android Studio with your project already loaded. Let Gradle sync
finish (first time takes a few minutes — it's downloading build tools).

## 3. Try it on your phone or an emulator
- Plug in your Android phone (enable **Developer options → USB debugging**), or
  start an emulator from Android Studio's Device Manager.
- Click the green ▶ **Run** button. NEXORA opens as a real app — no browser bar,
  your own icon, your own splash color.

## 4. Before you package for the Play Store
1. **Confirm the live site is fully updated** (see the warning box near the
   top of this file) — the app is a thin shell around
   `https://stratixapp.github.io/Nexora/`, so whatever that URL shows is
   exactly what the app shows.
2. **Privacy Policy URL** — Play Console requires a live, public link. You
   already have it: `https://stratixapp.github.io/Nexora/privacy.html`.
3. **Data safety form** — in Play Console you'll be asked what data the app
   collects. Based on this build: name, phone, address (for delivery, stored in
   Supabase), and email (for sign-in). No payment data is collected (orders go
   through WhatsApp).

## 5. Generate a signed app bundle (.aab) — this is what Play Store wants
In Android Studio:
1. **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. **Create new key store** (first time only) — save this `.jks` file somewhere
   safe and remember the password. You'll reuse the *same* key for every future
   update — losing it means you can never update this app again, only publish
   a new one.
3. Choose **release** build variant → Finish.
4. Your `.aab` file appears under `android/app/release/`.

## 6. Publish
1. Go to https://play.google.com/console → pay the one-time $25 developer
   registration fee if you haven't already.
2. **Create app** → fill in NEXORA's name, description, category (Shopping).
3. Upload your Play Store icon: `assets/icons/play-store-icon-512.png`
   (512×512, already the right size and format).
4. Add at least 2 phone screenshots — open the app or the live site on a phone
   size (or in Chrome DevTools device mode) and screenshot the homepage,
   a product page, and the cart.
5. Fill in the **Data safety** section using the notes in step 4 above.
6. Add your Privacy Policy URL.
7. Upload the `.aab` under **Production → Create new release**.
8. Submit for review. Google typically takes a few hours to a few days for a
   first submission.

## Notes
- This is a **live WebView shell** around your real site — any change you make
  to the website or push to GitHub shows up in the app instantly, with no app
  update needed.
- If you ever want to switch to bundling the app's own copy of the files
  (works offline from first launch, doesn't depend on GitHub Pages staying up),
  remove the `"server"` block from `capacitor.config.json`, keep the `www/`
  folder up to date, and run `npx cap sync android` before rebuilding.
- To change the package name later, you'd need a new Play Store listing —
  `com.stratix.nexora` is meant to be permanent once published.
