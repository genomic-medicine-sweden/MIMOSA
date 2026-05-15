# Changing the Active Map


1. Open `backend/src/config/map-config.ts`
2. Change `ACTIVE_MAP` to the desired country:
   ```ts
   const ACTIVE_MAP = 'uk' as const;
   ```
3. Redeploy the backend.



## Adding a new country

### 1. Add the map config entry

In `backend/src/config/map-config.ts`, add an entry to `configs` and set `ACTIVE_MAP`:

```ts
const ACTIVE_MAP = 'norway' as const;

const configs = {
  // ...existing entries...
  norway: {
    activeMap: 'norway',
    bounds: [[57.0, 4.0], [71.5, 31.5]],
    center: [65.0, 15.0],
    regionNameKey: 'name',
    zoom: { mobile: 4, small: 4.5, large: 5.5, default: 5 },
  },
};
```

### 2. Add geographical files to `geodata/`

All geographical data lives in `geodata/` at the repository root. Add files following this naming convention:

```
geodata/norway-with-regions.json        ← required
geodata/norway-postcode-coordinates.js  ← optional
geodata/norway-hospital-coordinates.js  ← optional
```

If coordinate files are absent, the map loads but sample markers will not be shown and a warning is logged on startup.

**Boundaries file** must be a GeoJSON `FeatureCollection` where each feature's `properties` contains the region name field matching `regionNameKey`:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { ... },
      "properties": { "name": "Oslo" }
    }
  ]
}
```

**Coordinate files** must use this format:
```js
// norway-postcode-coordinates.js
const postcodeCoordinates = {
  "NO-0001": {
    coordinates: [59.9139, 10.7522],  // [lat, lng]
    postaltown: "Oslo",
    County: "Oslo",
  },
};
module.exports = postcodeCoordinates;

// norway-hospital-coordinates.js
const hospitalCoordinates = {
  "Oslo University Hospital": {
    PostCode: "NO-0424",
  },
};
module.exports = hospitalCoordinates;
```

### 3. Redeploy the backend

## File locations

| File | Location |
|------|----------|
| Map config (bounds, zoom, etc.) | `backend/src/config/map-config.ts` |
| Boundaries GeoJSON | `geodata/<country>-with-regions.json` |
| Postcode coordinates | `geodata/<country>-postcode-coordinates.js` |
| Hospital coordinates | `geodata/<country>-hospital-coordinates.js` |

