# Pending Samples

Allows admins to pre-register geographical metadata for samples that have not yet arrived in MIMOSA. When a sample with the matching ID is uploaded, the metadata is applied automatically.

## How it works

1. An admin creates a pending sample entry with an expected sample ID and at least one geographical field (post code, hospital, or coordinates).
2. When a new sample is inserted into the database, the system checks for a matching pending entry.
3. If found, the metadata (post code, hospital, coordinates) is applied to the sample and the pending entry is deleted.
4. Unmatched entries expire automatically after a configurable number of days (see [Configuration](#configuration)).

The matching is driven by a MongoDB change stream on the `features` collection, so it triggers immediately when a sample arrives — no polling required.

## Configuration

Edit `backend/src/config/pending-samples.ts`:

```typescript
export const pendingSamplesConfig = {
  expiryDays: 30, // days before an unmatched entry is automatically removed
};
```

The expiry is enforced by a MongoDB TTL index on the `expiresAt` field. MongoDB's TTL monitor runs every ~60 seconds, so deletion may be slightly delayed after expiry.

## Bulk upload

The admin UI supports bulk upload via Excel (`.xlsx`). Download the template from the Pending Samples page, fill in your entries, and drag-and-drop the file. The required column is `SampleID`; at least one of `PostCode`, `Hospital`, or `Latitude` + `Longitude` must be present per row. Rows with validation errors are skipped and flagged in the preview.


