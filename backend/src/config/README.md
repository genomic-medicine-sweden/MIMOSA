# Outbreak Rules Configuration

`outbreak-rules.json` controls how MIMOSA detects outbreaks and which clusters trigger alerts.

---

## Structure

```json
{
  "default": { ... },
  "profiles": {
    "profile_name": { ... }
  }
}
```

The `default` block applies to every analysis profile. Values in a named `profiles` entry override the default for that profile only. Any field omitted from a profile entry falls back to the `default` value.

---

## Fields

### `detectionThreshold` — `number`

Minimum number of samples in a cluster for it to be considered an outbreak.

```json
"detectionThreshold": 2
```

### `requireCountyResolution` — `boolean`

If `true`, samples without a resolvable county (via postcode or hospital location) are excluded from cluster counts. Clusters where no sample can be resolved to a county are not reported as outbreaks.

```json
"requireCountyResolution": true
```

### `alertVisibilityDays` — `number | null`

Number of days without meaningful growth after which an outbreak alert is collapsed in the dashboard banner. The alert is not deleted — it remains visible on the notifications page and can be expanded in the banner by clicking "Show older alerts".

Set to `null` to disable collapsing entirely — alerts stay expanded indefinitely regardless of inactivity.

```json
"alertVisibilityDays": 14
```

```json
"alertVisibilityDays": null
```

Growth is evaluated cumulatively against `alertMinGrowthForRefresh`. If the cluster grows by at least that amount, the visibility timer resets.

### `alertMinGrowthForRefresh` — `number`

Minimum cumulative increase in cluster total required to reset the `alertVisibilityDays` timer. Growth is measured from the cluster total at the last meaningful refresh, not the most recently observed total.

Example with `alertMinGrowthForRefresh: 2`:

```
cluster: 5 → 6  (growth = 1, below threshold → timer not reset)
cluster: 6 → 7  (cumulative growth = 2, meets threshold → timer reset)
```

```json
"alertMinGrowthForRefresh": 2
```

---

## Adding a new analysis profile

Add an entry under `profiles` with the profile's exact `analysis_profile` string value. Only include fields that should differ from the default — omitted fields are inherited automatically.

```json
{
  "default": {
    "detectionThreshold": 2,
    "requireCountyResolution": true,
    "alertVisibilityDays": 14,
    "alertMinGrowthForRefresh": 2
  },
  "profiles": {
    "staphylococcus_aureus": {
      "detectionThreshold": 2,
      "requireCountyResolution": true,
      "alertVisibilityDays": 14,
      "alertMinGrowthForRefresh": 2
    },
    "example_profile": {
      "detectionThreshold": 3,
      "alertVisibilityDays": 30
    },
    "example_never_collapse": {
      "alertVisibilityDays": null
    }
  }
}
```

In `example_profile` above, `requireCountyResolution` and `alertMinGrowthForRefresh` are inherited from `default`.

In `example_never_collapse`, setting `alertVisibilityDays` to `null` disables alert collapsing entirely for that profile — outbreak alerts will remain expanded in the banner indefinitely. `alertMinGrowthForRefresh` is irrelevant when `alertVisibilityDays` is `null`.

