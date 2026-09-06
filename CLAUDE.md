# Screen To Street — working conventions

- **Always open a pull request** after pushing a batch of changes to the handover branch, without waiting to be asked. Don't leave commits sitting on the branch unreviewed.
- `firestore.rules` is a reference file only — never auto-deployed (no Firebase CLI/CI here). Any change to it needs a note in the PR body reminding the user to copy-paste it into the Firebase Console (Firestore → Rules → Publish) manually.
- The user dislikes emojis. Never use them in UI copy, icons, or labels on this site — use an SVG icon or plain text instead. (This is a standing site-wide preference, not specific to any one feature.)
