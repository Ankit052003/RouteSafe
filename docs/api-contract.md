# Route analysis API contract

## `GET /api/v1/health/`

Returns `200` without calling an external provider:

```json
{"status":"ok","service":"routesafe-api"}
```

## `POST /api/v1/route-analyses/`

```json
{
  "origin": "Denver, Colorado",
  "destination": "Salt Lake City, Utah",
  "departure_time": "2026-10-15T08:00:00-06:00",
  "departure_timezone": "America/Denver",
  "load_weight_lb": 35000,
  "checkpoint_interval_miles": 25
}
```

`departure_time` must have an explicit offset, `departure_timezone` must be an IANA name, load must be non-negative, and the checkpoint interval must be 10, 25, or 50.

A `201` response contains:

- `generated_at`, `units`, normalized `request`, `attribution`, and `warnings`.
- `places.origin` and `places.destination`, each with canonical label and coordinate.
- exactly three `routes` in the normal success case. Each has GeoJSON geometry, distance, duration, arrival, checkpoints, conservative endpoint-based segments, risk miles, average risk, completeness, and eligibility.
- `recommendation.route_id`, policy, and human-readable explanation. The route ID is null for all-No-Travel or all-incomplete analyses.
- `heatmap.timestamps`, containing departure +0 through +48 hours, and compact points in `[longitude, latitude, riskScores]` form.

Errors use `{ "error": { "code", "message", "details"? } }`:

- `400` invalid fields or time handling.
- `422` a valid request cannot produce three routes or an analyzable forecast.
- `429` application throttle reached.
- `502` upstream rejection or server provider configuration problem.
- `504` upstream timeout after bounded retries.
