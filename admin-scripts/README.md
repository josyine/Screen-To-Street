# Admin scripts

One-off scripts run locally by the site owner — never deployed with the static site,
never run from the browser. Requires a Firebase service account key (see each
script's header comment for how to get one).

## Firestore migration — step 1 (`migrate-location-content.js`)

Moves each location's rich content (Story, practical info, tips, video link) into
its own Firestore document under `locationContent/{id}`. `script.js` still ships
this same content today (nothing was removed from it yet) — it now *also* tries to
read `locationContent/{id}` after first rendering the local copy, and swaps in the
Firestore version if one exists. That's what unlocks:

- fixing or adding a location's content **without touching `script.js`** (edit the
  Firestore doc directly, or run this script again after updating
  `locationContent.seed.json`);
- the `locationSubmissions` review queue (see `add-location-submission.js` and
  `settings.html`'s "Location submissions" tab) writing approved content straight
  into `locationContent` once a submission is approved.

Actually shrinking `script.js` (removing these fields from the ~184 location
objects now that Firestore has a copy) is a separate, later, riskier step — not
done yet, kept deliberately for once the Firestore read path has been confirmed
reliable in production.

### Required Firestore rule (add manually in the Firebase console — this repo has
no way to deploy rules on its own):

```
match /locationContent/{locationId} {
  allow read: if true;
  allow write: if false; // written only via this script's Admin SDK credentials
}
```

### Running it

```
cd admin-scripts
npm install
# download a service account key (Firebase console > Project settings >
# Service accounts > Generate new private key) and save it here as
# serviceAccountKey.json — NEVER commit this file (see .gitignore)
node migrate-location-content.js
```

Safe to re-run: it writes with `{merge: true}`, so running it again after editing
`locationContent.seed.json` just refreshes those fields.

## Location submissions queue (`locationSubmissions` collection)

See the comment block above `window.submitLocationForReview` in `firebase-init.js`
for the full review-before-publish workflow: an AI agent (or anyone else) proposes
a location by writing a `locationSubmissions` doc — `example-ai-submission.js` is
a runnable example of exactly that, using the regular client Firebase SDK (no
service account needed, since `create` is public by rule; only reading and
approving submissions requires being an admin). Review pending submissions and
approve or reject them at `/admin.html` (requires being signed in AND having an
`admins/{your-uid}` document — see the rule comment in `firebase-init.js` for how
to add yourself as one, from the Firebase console).

Approving a submission:
- always writes its content into `locationContent/{id}` (read by every visitor via
  `window.fetchLocationContent`, step 1 of the Firestore migration above);
- for a brand-new location (no `matchedLocId` on the submission) also writes its
  light map fields into `newLocations/{id}`, which `map.html` merges into
  `celebLocations` at load time — so a new location goes live for visitors right
  after approval, without ever editing `script.js`.
- for a correction to an existing location (`matchedLocId` set to that location's
  numeric id), only `locationContent` is touched — the existing map pin, name,
  category etc. (still defined in `script.js`) are unaffected.

## Anti-duplicate check (`duplicate-check.js`)

Checking whether an AI-proposed location already exists **by name** is unreliable:
the same model can phrase, translate or romanize a name differently between runs
("Cafe Camptong" vs "카페 캠프통" vs a slightly different spelling). A physical
location never moves, so comparing **coordinates** is the reliable check.

This is trickier than it sounds because the site's two location sources aren't
symmetric:
- the 184 "historical" locations live **only** in `script.js`'s `celebLocations`
  array — `locationContent/{id}` in Firestore has the rich text but never lat/lng
  or the name;
- locations approved since (via `admin.html`) live in Firestore's `newLocations`
  collection, which **does** have lat/lng (public read, see `firebase-init.js`).

`duplicate-check.js` combines both into one list and exposes:

```js
const { loadAllExistingLocations, findNearbyDuplicate } = require('./duplicate-check');

const existing = await loadAllExistingLocations(pathToScriptJs, firebaseConfig);
const dup = findNearbyDuplicate(candidateLat, candidateLng, existing); // 50m default threshold
if (dup) {
    console.log(`Skip — already known: "${dup.location.name}" (${dup.distanceMeters}m away)`);
}
```

Run `node duplicate-check.js` directly for a self-test. `example-ai-submission.js`
calls this before every `submitLocationForReview` — copy that pattern into your own
AI agent script: check for a nearby duplicate right after the AI proposes
coordinates, and skip the submission entirely (don't even call the AI to describe
it) when one is found.

**A note on API keys**: if your AI agent script calls an external API (Gemini,
etc.), never hardcode that key in a file you intend to commit. Put it in a local
`.env` file (already covered by this folder's `.gitignore`) and read it with
`process.env.YOUR_KEY_NAME` (add `require('dotenv').config()` at the top, or pass
it via `GEMINI_API_KEY=... node your-script.js`) — the same way `serviceAccountKey.json`
is kept out of git.
