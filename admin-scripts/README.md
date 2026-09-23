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
a location by writing a `locationSubmissions` doc. `example-ai-submission.js` is
the actual running agent: it calls Gemini (`@google/generative-ai`) to propose 20
new BTS locations per run, filters out anything too close to a known location (see
"Anti-duplicate check" below), and writes the rest to `locationSubmissions` using
the Admin SDK (a service account key, same as `migrate-location-content.js` —
because this script also *reads* Firestore before it can decide what's new, and
`locationContent`/`newLocations` reads are otherwise either restricted or would
need a second, client-SDK connection). Writing a `locationSubmissions` doc is
public by rule (`create: if true`) if you'd rather build a lighter agent with just
the client SDK — only reading/approving submissions requires being an admin.

Review pending submissions and approve or reject them at `/admin.html` (requires
being signed in AND having an `admins/{your-uid}` document — see the rule comment
in `firebase-init.js` for how to add yourself as one, from the Firebase console).

### Agenda events queue (`liveEventSubmissions` collection)

Since 15/09/2026, the same script also runs `runLiveEventAgent()` after
`runAgent()` finishes: it asks Gemini for real, verifiable upcoming BTS
group/member public events (tour dates, festivals, award shows, fan meetings)
not already known, and writes each one to `liveEventSubmissions` (status
`pending`) — the exact same queue the manual "Agenda" form in admin.html
writes to (see `wireLiveEventForm()`). Nothing reaches the public `liveEvents`
collection (and therefore the site's Agenda panel) without being approved by
hand on admin.html, same as location submissions. This was added because the
original agent only ever proposed locations — real upcoming events (like the
2026 iHeartRadio Music Festival) had no agent watching for them at all and
depended entirely on someone noticing and typing them in manually.

### Running it automatically (GitHub Actions)

`.github/workflows/ai-agent.yml` runs `example-ai-submission.js` on a schedule
(4 times a day by default, every 6 hours — edit the `cron` line to change that)
using GitHub's own servers, so it works even when your Mac is off. At 20
location proposals per run × 4 runs/day, expect up to ~80 raw location
proposals a day before anti-duplicate filtering — comfortably enough to build
and maintain a 50-100 item backlog on `/admin.html`. Each run also checks for
new Agenda events (see above). You can also trigger it by hand any time from
the repo's **Actions** tab → "Agent IA — propositions de lieux BTS + Agenda" →
**Run workflow**.

One-time setup — the script needs the same two secrets it needs locally
(`GEMINI_API_KEY` and your service account), but neither can be committed to the
repo, so they're stored as encrypted GitHub secrets instead:

1. Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Add `GEMINI_API_KEY`: paste your Google AI Studio key (same value as in your local `.env`).
3. Add `FIREBASE_SERVICE_ACCOUNT`: paste the **entire contents** of your
   `serviceAccountKey.json` file (open it in a text editor, copy everything, paste
   it as the secret's value — it's JSON, GitHub stores the whole blob as one secret).
4. Push (or merge) the workflow file — it starts running on its schedule immediately,
   no further action needed.

`example-ai-submission.js` picks up `FIREBASE_SERVICE_ACCOUNT` automatically
whenever `serviceAccountKey.json` isn't present on disk (see `loadServiceAccount()`
near the top of the file), so the exact same script file runs locally and in CI.

Check results under the **Actions** tab → click a run → see its logs (same
`console.log` output you'd see running it locally). Anything the agent adds still
needs your manual approval at `/admin.html` — this only automates the "search
and propose" step, never publishing.

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

## "Recreate the Photo" with Mei (`generate-mei-recreation.js`)

Automates the admin's manual workflow (previously done by hand via ChatGPT): take a real
photo of a BTS location + a fixed reference image of the admin's custom avatar "Mei", and
generate a recreation where Mei replaces every BTS member visible in the photo, for the
"Recreate the Photo" section on that location's page.

```
cd admin-scripts
npm install
# place Mei's reference screenshot here (never committed, see .gitignore):
#   admin-scripts/mei-reference.jpg
node generate-mei-recreation.js <locationId> <path-to-bts-location-photo>
```

Rules (as specified by the admin, applied via the prompt — the model detects the member
count itself, no manual flag needed):
- **One member visible** → Mei replaces them, in the EXACT same pose, wearing HER OWN
  original outfit (from the reference image).
- **Multiple members visible** → Mei appears once per member (same respective poses): one
  occurrence in her original outfit, the others in alternative outfits within the same art
  direction (pastel colors, feminine cuts, adapted to the photo's visible season/context).

Writes the result into `locationContent/{locationId}.recreatedPhoto` — the exact same field
and format (base64 data URL) that `admin.html`'s manual "Recreate the Photo" upload already
writes to (see `adminUpdateLocationContent()`). No new infrastructure: the existing
base64-extraction step already in `export-locations.js` turns it into a real static
`images/admin-upload-*-recreated.*` file on the next catalog export, exactly like a manual
upload would. A local `mei-preview-<locationId>.<ext>` copy is also saved next to the script
for a quick visual check before that next export runs.

Uses the same service-account/`GEMINI_API_KEY` setup as `example-ai-submission.js` above —
no new secrets or dependencies needed if that script is already configured. The image-capable
model id in the script (`gemini-3.6-flash-image`) may need adjusting to whatever
image-generation model is actually available on your Google AI Studio account when you run
this — model ids change over time.

## Audit the pending queue for duplicates (`check-submission-duplicates.js`)

One-off audit of everything currently sitting in `locationSubmissions` (status `pending`) —
useful after a long pause of the AI agent, or a big manual batch import — against every
already-published location, using the exact same distance/name check the agent uses before
proposing (see "Anti-duplicate check" below). Only checks brand-new-location proposals (no
`matchedLocId`); a submission with `matchedLocId` is a deliberate correction to an existing
location, never a duplicate.

```
cd admin-scripts
npm install
node check-submission-duplicates.js            # report only, changes nothing
node check-submission-duplicates.js --reject    # also rejects every duplicate found
```

Same service-account setup as the other scripts here (`serviceAccountKey.json` or
`FIREBASE_SERVICE_ACCOUNT`).

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

`duplicate-check.js` combines both into one list. Two ways to fetch the "approved"
half depending on which Firebase SDK your script already uses:

```js
// Client SDK (no service account) — one call does everything:
const { loadAllExistingLocations, findNearbyDuplicate } = require('./duplicate-check');
const existing = await loadAllExistingLocations(pathToScriptJs, firebaseConfig);

// Admin SDK (you already have a `db` from a service account, e.g. an agent that
// also writes to Firestore) — reuse it instead of opening a second connection:
const { combineExistingLocations, locationsFromSnapshot, findNearbyDuplicate } = require('./duplicate-check');
const snapshot = await db.collection('newLocations').get();
const existing = combineExistingLocations(pathToScriptJs, locationsFromSnapshot(snapshot));

// Either way:
const dup = findNearbyDuplicate(candidateLat, candidateLng, existing); // 50m default threshold
if (dup) {
    console.log(`Skip — already known: "${dup.location.name}" (${dup.distanceMeters}m away)`);
}
```

Run `node duplicate-check.js` directly for a self-test (uses the client-SDK path).
`example-ai-submission.js` uses the Admin SDK path above before submitting each
of the AI's 5 proposals — check for a nearby duplicate right after the AI
proposes coordinates, and skip that one proposal (don't even bother formatting
it further) when one is found. Comparing **names** doesn't work here, and it's
not just an LLM-phrasing problem: `locationContent` (the collection an earlier
version of this script read for its duplicate list) never stores a location's
name at all, only its rich text — so a name-based filter built on it silently
matches nothing, ever.

**A note on API keys**: if your AI agent script calls an external API (Gemini,
etc.), never hardcode that key in a file you intend to commit. Put it in a local
`.env` file (already covered by this folder's `.gitignore`) and read it with
`process.env.YOUR_KEY_NAME` (add `require('dotenv').config()` at the top, or pass
it via `GEMINI_API_KEY=... node your-script.js`) — the same way `serviceAccountKey.json`
is kept out of git.
