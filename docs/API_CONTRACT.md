# Meowchi Research API — Contract v1

This is the contract between the Meowchi iOS app and the research backend. The client side is
built and merged; the server side is not built yet. Everything below is what the app already
sends and expects, so a server implementing this contract will work without further app changes
(with one exception, flagged under [Open decision: auth](#open-decision-auth)).

Client implementation lives in `lib/research/`. If you change this document, change that code in
the same commit.

---

## 1. Design principles

These are deliberate and worth preserving.

1. **The app works fully offline.** If no backend URL is configured, the app behaves exactly as it
   does today: nothing is uploaded, no consent is requested, and Call Kitty responses are still
   logged locally for analysis. The backend is an addition, never a dependency.
2. **Opt-in, and only forward in time.** Nothing is uploaded until the owner explicitly opts in.
   Data recorded *before* opt-in is never backfilled — opting in shares what happens next.
3. **No PII, ever.** Participants are identified by a random per-install UUID. There are no
   accounts, emails, or device identifiers. Journal notes and folder names are deliberately
   excluded from every payload, because they are free text where people write personal things.
4. **Erasure must actually work.** Withdrawing consent deletes the local record *and* sends a
   delete request for everything already uploaded. This is a hard requirement, not a nice-to-have.
5. **Idempotency.** The client retries on failure. Every write must be safe to receive twice.

---

## 2. Configuration

The app reads its base URL from `extra.researchApiBaseUrl` in `app.json`:

```json
{
  "expo": {
    "extra": {
      "researchApiBaseUrl": "https://api.example.com"
    }
  }
}
```

Absent, empty, or null means offline mode. Trailing slashes are stripped. All paths below are
appended to this base.

---

## 3. Endpoints

All request and response bodies are JSON (`Content-Type: application/json`) except the recording
upload, which is `multipart/form-data`. All endpoints should return `2xx` on success; the client
treats any non-2xx as a retryable failure.

### 3.1 `POST /v1/participants`

Registers a new anonymous participant at the moment they opt in.

```json
{
  "participantId": "9f1c0f3e-5b6a-4a21-9d7c-2f8b1e4a6c30",
  "grantedAt": 1764547200000,
  "consentVersion": 1
}
```

| Field | Type | Notes |
|---|---|---|
| `participantId` | string (UUID v4) | Client-generated. Treat as the primary key. |
| `grantedAt` | number | Unix epoch **milliseconds**. |
| `consentVersion` | number | Which consent text they agreed to. Currently `1`. |

**Must be idempotent** — a repeat call with the same `participantId` should succeed, not conflict.

### 3.2 `POST /v1/recordings`

Uploads one meow recording and its mood result. Sent as `multipart/form-data` by
`expo-file-system`'s `uploadAsync`.

- File part: field name `audio`, MIME type `audio/m4a`.
- Text parts (all sent as **strings**, including the numeric ones — parse accordingly):

| Field | Type as sent | Notes |
|---|---|---|
| `participantId` | string | UUID v4. |
| `recordingId` | string | Client-generated, unique per recording. Dedupe on this. |
| `recordedAt` | string | Unix epoch milliseconds. |
| `durationMs` | string | Recording length. |
| `moodId` | string | One of: `quick-chirp`, `repeated-meows`, `long-yowl`, `soft-chatter`, `chirrup-trill`, `mystery-meow`. |
| `moodConfidence` | string | Integer 0–100. Heuristic output, flavour text — not a calibrated probability. |

Note there is no `note` field, by design (see principle 3).

Audio files are short (typically 1–10s, well under 1 MB). A size cap of 10 MB is a reasonable
guard.

### 3.3 `POST /v1/call-responses`

Records whether the cat responded to a Call Kitty sound. This is the soundboard-validation data —
the scientifically interesting part.

```json
{
  "participantId": "9f1c0f3e-5b6a-4a21-9d7c-2f8b1e4a6c30",
  "responses": [
    {
      "id": "3a7d2c91-8e44-4f0b-bb13-5c90a2d7e881",
      "soundId": "come-here",
      "playedAt": 1764547200000,
      "answeredAt": 1764547206000,
      "cameToYou": true,
      "latencyMs": 6000
    }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID v4) | Unique per response. Dedupe on this. |
| `soundId` | string | One of: `come-here`, `cuddle-time`, `playtime`, `sweet-greeting`. |
| `playedAt` | number | When the sound **finished** playing, epoch ms. |
| `answeredAt` | number | When the owner answered the prompt, epoch ms. |
| `cameToYou` | boolean | The answer. |
| `latencyMs` | number | `answeredAt - playedAt`. Not the cat's reaction time — an upper bound on it. |

`responses` is an array because the shape anticipates batching, but the client currently sends
exactly one per request. Accept any length ≥ 1.

**Skipped prompts are not sent.** If the owner dismisses the prompt, nothing is recorded. This
keeps the data clean but means response counts are not a complete record of sounds played — worth
knowing when analysing.

### 3.4 `DELETE /v1/participants/{participantId}`

Right to erasure. Must delete the participant record, all their recordings (including the audio
objects in S3), and all their call responses.

Returns `2xx` on success. **Must be idempotent** — deleting an unknown or already-deleted
participant should return success, not 404, or the client will retry it forever.

This arrives *after* the client has already discarded the participant ID locally, so it is the
only remaining link to that data. It cannot be reissued if it fails permanently.

---

## 4. Client retry behaviour

Worth knowing so the server doesn't fight it:

- Writes are queued durably on-device (`lib/research/uploadQueue.ts`) and survive app restarts.
- The queue flushes after each new recording, each answered call prompt, and on consent change.
- Failures retry up to **5 attempts**, then the item is kept but no longer retried automatically.
- There is **no backoff schedule** — retries happen on the next flush trigger, not on a timer.
- Request timeout is **20 seconds**.
- There is no partial-success handling: any non-2xx means the whole item is retried, so a
  duplicate delivery is likely. Idempotency is what makes this safe.

---

## 5. Open decision: auth

**The client currently sends no authentication of any kind.** This is the main thing to resolve
before anything is deployed publicly, since an open upload endpoint is both a spam vector and a
way to run up an S3 bill.

Options, roughly in order of effort:

1. **Static API key** in `app.json` extra, sent as a header. Weak — extractable from the app
   bundle — but raises the bar and lets you revoke. Client change: small.
2. **Presigned S3 upload URLs.** The app asks the API for a short-lived presigned PUT, then uploads
   the audio straight to S3. Keeps large uploads off API Gateway and lets you authorise per-upload.
   **Client change: this one alters the recording flow from one step to two**, so flag it early if
   you want it — it needs app work, not just server work.
3. **App Attest / DeviceCheck.** Strongest, most work, probably overkill at pilot scale.

A recommendation for the pilot: option 1 plus a per-IP rate limit and an S3 lifecycle policy, then
revisit if it ever goes public. Whatever you pick, say so and the client side can be updated to
match.

---

## 6. Suggested AWS mapping

Not prescriptive — you own this layer — but this is the shape the contract assumes:

| Concern | Service | Notes |
|---|---|---|
| Audio objects | S3 | Key by `participantId/recordingId`. Lifecycle policy for retention. |
| Participants, recordings metadata, responses | DynamoDB | Partition key `participantId` makes erasure a single-partition delete. |
| Endpoints | Lambda + API Gateway | Four handlers, one per endpoint above. |
| Cost safety | AWS Budgets alert | Set this **before** the first deploy. |

The DynamoDB partition-key choice above is worth keeping whatever else changes: it makes §3.4
cheap and reliable, and erasure is the requirement most likely to be painful if retrofitted.

---

## 7. Out of scope for v1

Explicitly not in this contract, to keep the surface small:

- Reading data back into the app (no sync, no multi-device, no cloud backup).
- User accounts or login.
- Server-side mood analysis or ML inference.
- Any upload of journal notes, folder names, or user-authored text.
