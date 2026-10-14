# Implementation Plan: Weather-Aware Truck Routing

## 1. Goal and completion criteria

Build a hosted React + Django application that accepts an origin, destination, departure date/time, load weight, and a checkpoint interval of 10, 25, or 50 miles. It must return three genuine route options, evaluate weather at the estimated arrival time of every checkpoint, calculate route risk using the supplied rules, recommend the safest eligible route, and visualize the results and a 0-48 hour corridor forecast on a map.

The project is complete only when all of the following are available:

- A public GitHub repository with setup, architecture, API, risk-policy, and deployment documentation.
- A hosted React frontend and Django API that work together end to end.
- A 5-10 minute Loom walkthrough linked from the README.
- Three route options for a documented demonstration trip.
- Checkpoints, checkpoint ETAs, weather values, risk levels, route summaries, recommendation reasoning, and a 0-48 hour heatmap visible in the UI.
- Automated verification of the risk boundaries, mileage aggregation, ETAs, and route-ranking policy.

## 2. Requirement traceability

| Assessment requirement | Planned implementation | Acceptance check |
| --- | --- | --- |
| React + Django | React, Vite, and TypeScript frontend; Django REST Framework backend | Both services run locally and in production |
| Origin and destination | Address inputs are geocoded on the backend | Canonical names and coordinates are returned |
| Departure date/time | Time-zone-aware ISO 8601 value; store and calculate in UTC | Checkpoint ETAs are later than departure and display with a zone |
| Load weight | Required non-negative value in pounds | Boundary load rules are tested at 30,000 and 40,000 lb |
| Three route options | TomTom Routing API with `travelMode=truck` and `maxAlternatives=2` | Response contains three distinct route geometries for the demo trip |
| Weather every 10/25/50 miles | Enum selector with 25 miles as the UI default; geometry-based checkpoint generation | Origin, interval checkpoints, and destination have weather and ETAs |
| Weather at checkpoint ETA | Route travel-time interpolation plus hourly forecast lookup | Different checkpoint ETAs select the appropriate forecast hours |
| Risk/load rules | Pure backend risk functions and explicit interval boundaries | Every threshold and load override has a passing test |
| Route recommendation | Safety gate, then the required lexicographic ordering | A faster route cannot beat a route with fewer Severe or High miles |
| Map details | All routes, checkpoint markers, risk colors, popups, and route summaries | Every returned route and checkpoint can be inspected |
| Corridor heatmap | Preloaded risk grid for departure +0 through +48 hours | Slider updates the overlay without issuing one request per movement |
| Hosted app, repository, Loom | Deployment and submission phase | All three links are in the README and work in an incognito browser |

## 3. Scope decisions

### Required for the assessment

- Three genuine alternatives, not duplicated or cosmetically shifted routes.
- Truck routing mode. The supplied **load weight** is used by the assessment risk rules. It must not be passed as a truck's gross vehicle weight because those are different measurements.
- Checkpoints located on the actual route geometry.
- Forecast-based wind, rain, and snow risk at each checkpoint ETA.
- Distance-weighted route summaries and deterministic recommendation logic.
- Smooth comparison UI, map, and forecast heatmap.
- Honest handling of missing routes, missing forecasts, and provider failures.

### Intentionally out of scope

- Authentication, user accounts, payments, admin screens, live navigation, turn-by-turn guidance, and a custom routing engine.
- Persisting trip history. The first version can be stateless; PostgreSQL is not required.
- Rest breaks, fuel stops, driver-hours regulation, vehicle height/width/axle inputs, road closures outside the routing provider, and guarantees of real-world safety.

## 4. Recommended stack and provider decisions

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | React + Vite + TypeScript | Small, typed client application |
| Styling | Tailwind CSS | Fast responsive layout and consistent risk colors |
| Map | MapLibre GL JS | Route lines, markers, popups, and heatmap layers without coupling the app to a routing vendor's renderer |
| Backend | Django + Django REST Framework | Validation, orchestration, provider protection, and domain logic |
| HTTP | `httpx` | Timeouts, retry control, and batched provider requests |
| Routing | TomTom Routing API | Truck mode and up to five alternatives; request two alternatives to obtain three total routes |
| Weather | Open-Meteo Forecast API | Hourly wind/rain/snowfall, requested units, and multiple coordinates per call |
| Geocoding | TomTom Geocoding API | Keeps address resolution and routing in the same coordinate ecosystem |
| Deployment | Vercel for React; Render for Django | Simple assessment deployment; equivalent hosts are acceptable |

Provider documentation to confirm again during the integration spike:

- [TomTom Calculate Route](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route)
- [TomTom Geocode](https://docs.tomtom.com/geocoding-api/documentation/tomtom-maps/v1/geocode)
- [Open-Meteo hourly forecast and multiple-coordinate requests](https://open-meteo.com/en/docs)

Before implementation, run one real request for a representative long-distance trip. Confirm that the selected plan/quota permits production deployment, that three routes are returned, and that required attribution is displayed. Replace the provider only with one proven to support truck routing, at least two alternatives, geometry, distance, duration, and departure-aware timing.

## 5. Application flow

1. The user enters origin, destination, departure date/time, load weight in pounds, and one of 10/25/50 miles.
2. The frontend validates required fields and sends one analysis request. Provider keys never enter the browser.
3. Django validates and normalizes the payload, geocodes both addresses, and requests the optimal route plus two alternatives.
4. The backend decodes each route geometry, removes duplicate alternatives, and calculates origin, interval, and destination checkpoints.
5. It calculates a cumulative travel duration and ETA for every checkpoint.
6. It batches and de-duplicates weather coordinates, retrieves the required hourly forecast window, and selects weather at each checkpoint ETA.
7. It classifies wind, rain, and snow, applies load rules, derives checkpoint and segment risk, and creates distance-weighted route summaries.
8. It applies the safety gate and required ranking policy.
9. It builds the 0-48 hour corridor heatmap dataset and returns one normalized response.
10. React renders route cards and the map, then updates the already-loaded heatmap data as the user moves the slider.

## 6. Risk policy

Keep all risk calculations in a dedicated backend domain module. React displays the results and never reimplements thresholds.

### 6.1 Non-overlapping weather thresholds

The assessment table contains touching endpoints, so use the following explicit intervals. Values are normalized before classification.

| Risk | Wind (mph) | Rain (in/hour) | Snow (in/hour) |
| --- | ---: | ---: | ---: |
| Low | `0 <= x < 25` | `0 <= x < 0.10` | `0 <= x < 0.5` |
| Moderate | `25 <= x < 35` | `0.10 <= x < 0.25` | `0.5 <= x < 1.0` |
| High | `35 <= x < 45` | `0.25 <= x < 0.50` | `1.0 <= x < 2.0` |
| Severe | `45 <= x < 55` | `0.50 <= x <= 1.00` | `2.0 <= x <= 3.0` |
| No Travel | `x >= 55` | `x > 1.00` | `x > 3.0` |

Negative or non-finite measurements are invalid data, not Low risk.

Request Open-Meteo values in mph and inches with UTC timestamps. Use `wind_speed_10m`, `rain`, and `snowfall`; do not silently substitute total precipitation for rain. Hourly rain and snowfall represent an hourly accumulation. Select the accumulation bucket containing the ETA and interpolate wind between adjacent hourly samples when possible. Document this provider mapping in code and in the README.

### 6.2 Load-based wind overrides

Apply these rules after the base wind classification:

- Wind `>= 55 mph`: No Travel for every load.
- Wind `45 <= x < 55 mph` and load `> 30,000 lb`: No Travel.
- Wind `35 <= x < 45 mph` and load `> 40,000 lb`: Severe.
- An override may increase risk but must never reduce a more dangerous classification.

The strict `>` operators matter: exactly 30,000 lb and exactly 40,000 lb do not trigger their respective load override.

### 6.3 Combined checkpoint risk

- Compute `wind_risk`, `rain_risk`, and `snow_risk` separately.
- Apply the load override to `wind_risk`.
- Set `overall_risk` to the most dangerous of the three risks.
- Return the component risks and a list of the conditions responsible for `overall_risk`, so the UI can explain the result.
- Risk ordering is `Low=0`, `Moderate=1`, `High=2`, `Severe=3`, `No Travel=4`.
- If any required forecast measurement is unavailable, mark the checkpoint `Unknown`; never treat missing data as zero or Low.

### 6.4 Segment risk and risk miles

Route ranking is expressed in miles, so checkpoint counts are insufficient. Define it deterministically:

1. Include a checkpoint at the origin, each selected interval, and the destination. Do not duplicate the destination when it lands exactly on an interval.
2. A segment is the route distance between two adjacent checkpoints.
3. Assign the segment the worse overall risk of its two endpoint checkpoints. This conservative rule prevents a dangerous boundary reading from disappearing between samples.
4. Sum actual segment lengths by risk to produce `low_miles`, `moderate_miles`, `high_miles`, `severe_miles`, `no_travel_miles`, and `unknown_miles`.
5. Calculate `average_risk` as the distance-weighted mean of the numeric segment scores. Do not average checkpoint counts.

The risk-mile totals must equal the route distance within a small floating-point tolerance.

### 6.5 Recommendation policy

Use a safety gate before applying the assessment's four ordered preferences:

1. A route with `no_travel_miles > 0` is ineligible while at least one route has no No Travel miles.
2. A route with `unknown_miles > 0` is incomplete and cannot beat a complete eligible route.
3. Rank the remaining routes lexicographically by:
   1. `severe_miles` ascending.
   2. `high_miles` ascending.
   3. `average_risk` ascending.
   4. `travel_time_minutes` ascending.
4. Use stable route ID as a final deterministic tie-break only when all required criteria tie.
5. If every route has No Travel miles, return no recommended route and show **Do not travel under the analyzed conditions**.
6. If every route is incomplete because weather is unavailable, return no recommendation and explain that the analysis is incomplete.

This implements the required order exactly: fewest Severe miles, then fewest High miles, then lowest average risk, then shortest travel time.

Return a human-readable explanation such as: `Route B is recommended because it has 18.4 fewer Severe miles than Route A; High miles were not needed as a tie-break.`

## 7. Checkpoint, ETA, and forecast calculations

### 7.1 Checkpoint geometry

- Decode the full route polyline.
- Compute geodesic cumulative distance along consecutive coordinates.
- Interpolate a coordinate at every selected mileage boundary.
- Preserve the provider's route distance for the displayed summary; compare it with geometry-derived distance and log a warning if the difference exceeds an agreed tolerance.
- Generate calculations in meters and convert to miles only through shared unit functions.

### 7.2 Estimated arrival time

- Pass the requested departure time to the routing provider when supported.
- Use route section distance and duration data to build a cumulative travel-time profile.
- For a checkpoint inside a section, interpolate that section's duration by its fraction of section distance.
- `checkpoint_eta = departure_time + cumulative_duration_to_checkpoint`.
- No rest/fuel-stop model is implied; state this limitation in the UI.

### 7.3 Time handling

- The client sends an ISO 8601 timestamp with an explicit offset and also sends its IANA time-zone name for display.
- Django rejects naive timestamps and performs calculations in UTC.
- The UI shows an explicit zone with departure, checkpoint ETA, and arrival timestamps.
- Validate that all checkpoint ETAs and the departure +48 hour heatmap horizon are inside the weather provider's available forecast window. Return a clear validation error instead of inventing data.

## 8. Weather corridor heatmap

The heatmap is separate from checkpoint risk: checkpoints use trip ETAs, while the slider shows the whole corridor at one selected forecast time.

- Define slider hour `0` as the requested departure time and hour `48` as departure +48 hours, in one-hour steps.
- Build a bounded grid inside a configurable buffer around the union of the three route geometries.
- Use a geospatially correct projection for buffering and distance; do not buffer raw longitude/latitude degrees.
- De-duplicate overlapping grid points and enforce a point budget. Increase grid spacing for very long routes rather than making thousands of calls.
- Fetch all 49 hourly values for the grid in batched requests. Each point stores 49 risk scores computed with the entered load weight.
- Send compact point data once. Moving the slider changes the MapLibre heatmap weight locally and must not trigger a request for every slider event.
- Display the selected absolute timestamp, risk legend, loading state, and `Unknown` cells. Checkpoint markers remain based on their own ETAs and do not change with the heatmap slider.
- Debounce pointer/slider rendering and keep route/marker sources stable to avoid rebuilding the entire map.

## 9. Backend organization and API contract

Use provider adapters only at external boundaries and pure typed functions for geometry, ETA, risk, aggregation, and ranking.

```text
backend/
  config/
  route_analysis/
    api/                 # serializers, views, response mapping
    domain/              # typed models and pure calculations
      checkpoints.py
      eta.py
      risk.py
      ranking.py
    providers/           # TomTom and Open-Meteo clients
    services/            # analysis orchestration
    tests/
frontend/
  src/
    api/
    components/
    features/trip-form/
    features/route-map/
    features/route-summary/
    features/forecast-slider/
    types/
```

### Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/health/` | Deployment health check without calling providers |
| `POST /api/v1/route-analyses/` | Geocode, route, forecast, score, rank, and return map data |

Example request:

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

The response must include:

- Normalized origin/destination names and coordinates.
- Units, generated timestamp, request inputs, provider attribution, and warnings.
- Exactly three routes for the normal success case.
- For each route: stable ID, GeoJSON geometry, distance, duration, arrival time, checkpoints, component and overall risks, segment risks, risk-mile totals, average risk, completeness, and eligibility.
- Recommendation route ID or `null`, the applied policy, and an explanation.
- Heatmap timestamps and compact point/risk arrays for all 49 hours.

Use consistent errors:

- `400`: invalid fields, units, enum, or naive date/time.
- `422`: valid request cannot be analyzed, including no geocode match, departure outside forecast coverage, or fewer than three distinct routes.
- `429`: application rate limit reached.
- `502/504`: upstream provider error or timeout.

Provider failures must include safe diagnostic context in server logs, but never keys, tokens, or sensitive request headers.

## 10. Frontend behavior

### Trip form

- Origin and destination.
- Departure date/time with visible time-zone label.
- Load weight in pounds.
- Checkpoint interval segmented control: 10, 25, or 50 miles.
- Inline validation, submit loading state, and actionable API errors.

### Route comparison

- Three route cards with distance, duration, arrival time, risk miles, average risk, and status.
- A clearly highlighted recommendation and a short explanation of the winning criterion.
- No Travel and incomplete routes remain visible but cannot appear safe or recommended.
- Selecting a card emphasizes the matching line and checkpoints without hiding the other routes.

### Map

- Three visually distinct route lines; selected/recommended line has stronger emphasis.
- Checkpoint markers colored by overall risk.
- Popup details: mile marker, ETA, wind/rain/snow values, component risks, overall risk, and cause.
- Heatmap toggle, 0-48 hour slider, absolute forecast timestamp, and accessible legend.
- Fit bounds to all routes after analysis. Preserve map state while the slider moves.

### Safety copy

Display: `Planning aid based on forecast data and assignment thresholds. Not a guarantee of road or vehicle safety. Follow official warnings, closures, and carrier policies.`

## 11. Implementation roadmap

### Phase 0 - Provider spike and contracts

- Confirm TomTom truck routing returns one primary plus two alternatives for the demo route.
- Confirm geometry, distance, section duration, departure-time behavior, quotas, attribution, and terms.
- Confirm Open-Meteo batched coordinate limits, hourly units, time semantics, forecast horizon, quotas, and attribution.
- Save sanitized provider fixtures and define typed internal models before building UI components.

Exit: one documented request/response from each provider and a frozen internal API schema.

### Phase 1 - Project foundation

- Create `frontend` and `backend` projects, environment templates, lint/type-check/test commands, CORS configuration, and health endpoint.
- Keep all secrets server-side. Add generated data, local databases, logs, and environment files to `.gitignore`.

Exit: both applications run locally and CI can execute validation commands.

### Phase 2 - Routing, checkpoints, and ETA

- Implement input serializers, geocoding, TomTom adapter, route normalization, duplicate-route detection, geometry interpolation, and ETA calculation.
- Surface a clear error if three genuine routes are unavailable; never duplicate a route to meet the count.

Exit: the demo request returns three routes with correct geometry, interval checkpoints, durations, and ETAs.

### Phase 3 - Weather, risk, and recommendation

- Implement batched forecast requests, unit normalization, timestamp matching, risk functions, segment-risk miles, safety gate, and lexicographic ranking.
- Include route-level explanation data rather than generating recommendation prose in React.

Exit: deterministic analysis response passes all boundary and ranking tests.

### Phase 4 - Route comparison and map

- Build the trip form, route cards, MapLibre sources/layers, markers/popups, selection behavior, legends, loading states, and errors.

Exit: a user can compare all routes and inspect every checkpoint.

### Phase 5 - Corridor heatmap

- Generate the bounded corridor grid, obtain its 49-hour forecast, encode the response compactly, and implement the client-side slider update.
- Profile response size and slider/map frame rate on the long demo route.

Exit: hours 0-48 render correctly and slider movement does not refetch or rebuild the map.

### Phase 6 - Hardening and submission

- Run automated checks, live-provider smoke tests, cross-browser checks, mobile checks, accessibility checks, and failure scenarios.
- Deploy frontend/backend, configure exact CORS origins and environment variables, and verify from a clean browser session.
- Finish README, add architecture/risk-policy notes and screenshots, and record the 5-10 minute Loom walkthrough.

Exit: repository, hosted app, and Loom links all work and the definition of done is satisfied.

## 12. Verification strategy

### Pure domain tests

- Every exact weather boundary and a value immediately below/above it.
- Wind 55 mph at any load is No Travel.
- Wind 45 mph at 30,000 lb remains base Severe; at more than 30,000 lb it becomes No Travel.
- Wind 35 mph at 40,000 lb remains base High; at more than 40,000 lb it becomes Severe.
- Combined checkpoint risk is the worst component and never downgrades risk.
- Missing required weather produces Unknown.
- Segment miles sum to total route miles.
- Average risk is distance weighted.
- Fewer Severe miles wins before High miles, average risk, or time.
- Fewer High miles decides only after Severe miles tie.
- No Travel safety gate and all-routes-No-Travel behavior.

### Integration tests with sanitized fixtures

- Provider payloads normalize into the internal models.
- Checkpoints follow curved route geometry at 10/25/50-mile intervals.
- Section timing produces monotonic ETAs and the correct final arrival.
- ETA selects the intended forecast hour/bucket.
- Three alternatives remain distinct after normalization.
- Heatmap contains 49 timestamps and stable point ordering.

### End-to-end and live smoke tests

- Submit a representative trip and inspect all three routes.
- Change load across 30,000 and 40,000 lb boundaries.
- Change checkpoint interval and verify counts and summaries recalculate.
- Move the slider rapidly and confirm smooth local updates.
- Simulate unavailable weather, provider timeout, invalid place, out-of-range departure, and fewer than three routes.
- Confirm secrets do not appear in browser requests, the repository, logs shown in the UI, or documentation.

## 13. Reliability and performance

- Set explicit connect/read timeouts for every external call.
- Retry transient `429` and `5xx` responses a small bounded number of times with backoff and warnings, then return the final error. Do not retry validation failures.
- Batch and de-duplicate coordinates; use bounded concurrency if provider request limits require chunks.
- Cache provider-normalized forecasts by rounded grid cell, forecast run, and time range where provider terms permit. Caching is an optimization and must not change results.
- Cancel or ignore stale frontend requests when the user submits a newer trip.
- Put an application rate limit on the public analysis endpoint.
- Record structured timings for geocoding, routing, weather, risk calculation, heatmap generation, total response size, and error category.
- Establish measurable targets after the provider spike; suggested assessment targets are a warm analysis under 5 seconds and smooth slider updates near 60 fps on a normal laptop.

## 14. README and walkthrough checklist

The README should contain:

- Hosted application and Loom links near the top.
- Local setup, exact environment-variable names, and commands.
- Architecture diagram and request flow.
- Provider choices, attribution, limitations, and quota notes.
- Exact threshold boundary convention, weather-variable mapping, load overrides, segment-mile method, safety gate, and ranking tuple.
- Time-zone/ETA assumptions and the definition of heatmap hour 0.
- Test and deployment commands.
- Known limitations and the safety disclaimer.

Suggested Loom sequence:

1. State the problem and architecture.
2. Submit one normal trip.
3. Compare the three routes and explain why the recommendation won.
4. Inspect checkpoint weather, ETAs, and component risks.
5. Move the 0-48 hour heatmap slider.
6. Change load or checkpoint spacing to show recalculation.
7. Show a No Travel or unavailable-weather state.
8. Briefly show the backend domain modules, tests, README, and deployed configuration.

## 15. Final definition of done

- [ ] React and Django are implemented and deployment-configured; public deployment is still pending.
- [x] Required inputs are validated and time-zone aware.
- [x] A documented live demo produces three distinct truck route options.
- [x] Checkpoints are on-route at the selected 10/25/50-mile spacing.
- [x] Each checkpoint uses weather for its own ETA.
- [x] All risk thresholds and strict load boundaries match this plan.
- [x] Risk miles are distance based and totals reconcile to route distance.
- [x] Recommendation uses the No Travel safety gate and the four required priorities in order.
- [x] All routes, summaries, ETAs, selected-route checkpoints, risks, and explanations are available in the map/UI.
- [x] The corridor heatmap covers departure +0 through +48 hours and updates locally without refetching.
- [x] Missing data is Unknown and never silently treated as safe.
- [x] Automated tests, production configuration checks, and a real-provider smoke test pass.
- [ ] Provider keys remain server-side, but Git-history verification requires initializing or attaching the final repository.
- [ ] README includes the implemented documentation; hosted-app and Loom links are pending.
- [ ] Hosted app still needs deployment and clean/incognito browser verification.

Priority if time is limited: first make routing/weather/risk/recommendation correct, then make all required map and heatmap interactions smooth, then harden and document. Do not spend assessment time on out-of-scope product features.
