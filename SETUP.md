# Going live: HITAM-mail sign-in (about 15 minutes)

HITAM email runs on Google Workspace, so students sign in with **Google, restricted to @hitam.org**. Passwords never touch this app. Firebase (free tier) handles sign-in and stores each student's profile/applications plus the shared campus board.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project** → name it `hitam-opportunities` (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Set the support email.
3. **Build → Firestore Database → Create database** → production mode → region `asia-south1` (Mumbai).
4. **Project settings → General → Your apps → Web (</>)** → register the app → copy the `firebaseConfig` object.

## 2. Connect it to the app
Create `config/firebase.json` with the values you copied:
```json
{
  "apiKey": "…",
  "authDomain": "hitam-opportunities.firebaseapp.com",
  "projectId": "hitam-opportunities",
  "storageBucket": "hitam-opportunities.appspot.com",
  "messagingSenderId": "…",
  "appId": "…"
}
```
These values are public by design (they identify the project; they are not secrets). Access is controlled by the security rules in step 3.

Then rebuild: `node build.js`

## 3. Lock it to HITAM accounts
Install the Firebase CLI once (`npm install -g firebase-tools`), then from the `firebase/` folder:
```bash
firebase login
firebase use --add            # pick hitam-opportunities
firebase deploy --only firestore:rules
```
The rules (`firebase/firestore.rules`) allow only verified `@hitam.org` accounts, keep each student's data private to them, and let students post to — and only delete their own posts from — the shared campus board.

The app also refuses non-HITAM accounts at sign-in, but the rules are what actually protect the data.

## 4. Publish the site
Either:
- **Firebase Hosting:** `firebase deploy --only hosting` (serves `site/`), or
- **GitHub Pages:** push this folder to GitHub; `.github/workflows/daily-jobs.yml` collects data at 07:00 IST every day and publishes `site/`.

Add the final web address under **Authentication → Settings → Authorized domains**, or Google sign-in will be blocked there.

## 5. Daily CDC update (admin)

One personal Google account is the admin. Only a SHA-256 hash of its email is in the code (`config/admin.json`); the real check is in the Firestore rules.

1. In `firebase/firestore.rules`, replace `ADMIN_EMAIL_HERE` with the admin email, and publish the rules in the Firebase console (Firestore → Rules). Do not commit the real email.
2. Open the site at `#/admin` and choose **Admin: sign in with the admin Google account**.
3. In CDC Explorer, open Opportunities, Multi-Stack projects, Engineering Career Portals or Learning Tracks. Press Ctrl+A, Ctrl+C on each, paste them into the box (several pages in one paste is fine) and press **Read**.
4. Check the preview and press **Publish to every HITAM student**. Each ticked section replaces yesterday's list; closed cards and past deadlines are skipped, cards without a deadline are kept as rolling.

CDC data lives only in Firestore (`cdc/opps`, `cdc/projects`, `cdc/portals`, `cdc/tracks`), readable by signed-in @hitam.org accounts. Never commit CDC pages to this public repository; the `seed/` folder is git-ignored for local copies.

## What students experience
1. Open the site → **Continue with your HITAM account** → pick their `roll@hitam.org` Google account.
2. Branch and year are filled automatically from the roll number (e.g. `26E51A05A1` → CSE, admitted 2026, year 1).
3. Their profile, saved listings and applications sync across devices. Their resume is read and kept only on their own device.
4. Notices they paste on the Campus page are shared with every signed-in HITAM student.

## Local preview (no sign-in)
On `localhost` or when opening the HTML file directly, the sign-in screen offers **Open local preview** with example listings. Add `?preview` to the address to skip the screen while developing. Preview never appears on a real domain.
