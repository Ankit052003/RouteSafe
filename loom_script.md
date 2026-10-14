# Loom Walkthrough Script — RouteSafe (7 minutes)

> **Target:** 7 minutes | **Tone:** Confident, clear, demo-driven  
> **Recording tip:** Record screen + webcam (bottom-right). Use 1080p. Speak at ~150 wpm.

---

## 0:00 – 0:45  ▸  Intro & Problem Statement  (45 sec)

**Say:**
> "Hi, I'm Ankit. This is RouteSafe — a weather-aware truck routing application built for the Spotter assignment.  
> Truck drivers today pick routes based on distance or time, but weather at each checkpoint can turn a routine haul into a safety hazard. RouteSafe solves this: it generates three real truck routes, samples forecast weather at every checkpoint using the truck's ETA, classifies risk with load-aware rules, and recommends the safest route using a transparent priority order."

**Show:**
- Landing page (hero section)
- Scroll to show: "Plan your route" button, benefit bar
- **Do NOT** click yet — just narrate the value prop

---

## 0:45 – 1:30  ▸  Trip Input Form  (45 sec)

**Say:**
> "Let's plan a trip. The driver enters origin, destination, departure date/time, load weight, and checkpoint interval — every 10, 25, or 50 miles."

**Show:**
- Click "Plan your route" → scroll to Route Planner section
- Fill form live:
  - Origin: `Denver, Colorado`
  - Destination: `Salt Lake City, Utah`
  - Departure: tomorrow 8:00 AM (local timezone shown)
  - Load weight: `35000` lb
  - Checkpoint interval: `25` miles
- **Hover** over each field, explain briefly
- Click **"Analyze three routes"**

---

## 1:30 – 2:45  ▸  Route Comparison Panel  (75 sec)

**Say:**
> "The backend calls TomTom for three real truck routes, then Open-Meteo for hourly forecasts at each checkpoint's ETA. Risk is classified per the assignment thresholds: wind, rain, snow — with load overrides.  
> Here we see all three routes side-by-side: distance, travel time, average risk (0–4 scale), and the critical breakdown — Severe miles, High miles, Moderate, Low, No Travel, Unknown.  
> Route A is recommended — fewer Severe miles, then fewer High miles, then lower average risk, then shorter time. The explanation tells you exactly why."

**Show:**
- Wait for loading state → "Analyzing routes…"
- When results appear:
  - Point to **Route A = Recommended** badge
  - Read the **recommendation explanation** aloud
  - Hover each route card: show risk-mile chips (color-coded)
  - Click Route B → show it updates map
  - Click Route A again
  - Show **warnings** (if any) and **attribution** line

---

## 2:45 – 4:15  ▸  Interactive Map & Checkpoint Popups  (90 sec)

**Say:**
> "The map uses MapLibre GL. All three routes render with arrows showing direction. The selected route is bold. Each checkpoint is a colored dot — color = overall risk.  
> Click any checkpoint — you get the exact mile marker, ETA in local timezone, wind/rain/snow values, individual risk levels, and the cause of the overall rating.  
> This is ETA-matched: the forecast hour used is when the truck actually arrives, not 'now'."

**Show:**
- Pan/zoom map to show all three routes
- Click **Route A checkpoint** (e.g., mile ~100)
- Read popup: mile, ETA, wind/risk, rain/risk, snow/risk, cause
- Click **Route B checkpoint** → compare
- Click **Route C** → show "No Travel" or "Severe" if present
- Show **legend** bottom-left (risk colors)
- Toggle **heatmap off/on** (button top-right of map)

---

## 4:15 – 5:15  ▸  48-Hour Forecast Heatmap Slider  (60 sec)

**Say:**
> "Below the map: a 0–48 hour forecast slider. This shows risk intensity along the entire corridor — not just checkpoints. Slide to +24h, +36h — you see weather fronts move. The heatmap uses the same risk scale.  
> This lets dispatchers see: 'If we delay departure 6 hours, do we hit the storm?'"

**Show:**
- Drag slider from 0 → 48
- Narrate: "At +0h, clear. At +18h, rain band hits Wyoming. At +30h, snow in the mountains."
- Toggle **Hide heatmap** → show routes only
- Toggle back on
- Show **timestamp** updates: "+18h · Oct 15, 2:00 PM MDT"

---

## 5:15 – 6:00  ▸  Risk Classifier (Interactive Rules Demo)  (45 sec)

**Say:**
> "The risk engine is deterministic. This panel lets you test any condition: adjust wind, rain, snow, load — see component risks, load override, and final classification update instantly.  
> Example: 45 mph wind + 35,000 lb → No Travel (load override). 35 mph + 45,000 lb → Severe. The reference table on the right shows every threshold."

**Show:**
- Scroll to **Weather Risk Classification** section
- Drag **Wind** to 45 → show "No Travel" + load rule highlight
- Drag **Load** to 25,000 → reverts to "Severe"
- Drag **Rain** to 0.6 → "Severe"
- Click tabs: Wind / Rain / Snow → show mobile + desktop tables
- Point to **Load rules** panel: three rules, active one highlighted

---

## 6:00 – 6:30  ▸  Recommendation Logic Demo  (30 sec)

**Say:**
> "The recommendation isn't a black-box score. It's a strict priority order: 1) No Travel exclusion, 2) Complete routes only, 3) Fewest Severe miles, 4) Fewest High miles, 5) Lowest average risk, 6) Shortest time.  
> This demo shows four scenarios — watch the deciding criterion change."

**Show:**
- Scroll to **Route Recommendation** section
- Click each scenario tab: Mountain Storm → Severe-mile tie → Risk-mile tie → Full risk tie
- Point to **Ranking order** left panel: deciding criterion highlights
- Show **winner card** right: "It beats X on [criterion]"

---

## 6:30 – 7:00  ▸  Tech Stack, Code Quality, Closing  (30 sec)

**Say:**
> "Stack: React 18 + TypeScript + Vite frontend, Django 6 + DRF backend. MapLibre GL for maps. TomTom for routing/geocoding. Open-Meteo for weather.  
> Backend: 48 tests passing — risk classification, ranking, ETA interpolation, provider normalization, full analysis service. Clean architecture: ports/adapters, domain models, pure functions.  
> Deployed on Vercel (frontend) and Render (backend) with PostgreSQL.  
> GitHub: github.com/ankit052003/RouteSafe  
> Thanks for watching."

**Show:**
- Terminal: `cd backend && python -m pytest -v` → show 48 passed
- Terminal: `npm run typecheck` → clean
- GitHub repo page (brief)
- Vercel/Render dashboard (optional, if deployed)
- Final smile + wave

---

## 🎬 Recording Checklist

| Item | Done? |
|------|-------|
| 1080p screen + webcam | ☐ |
| Mic test (no echo) | ☐ |
| Browser: Chrome, devtools closed | ☐ |
| Demo data loads (API keys work) | ☐ |
| Tab order: Planner → Map → Risk → Recommendation | ☐ |
| No sensitive data visible (.env, keys) | ☐ |
| Speaking pace: ~150 wpm | ☐ |
| Total time: 6:45–7:15 | ☐ |

---

## 🗣️ Speaking Tips

- **"The backend calls…"** not "I call…" — separates concerns
- **"Watch…"** / **"Notice…"** / **"Here…"** — directs eye
- Pause 1 sec after each click for viewer to register
- If API slow: "This usually takes 3–5 seconds…" (don't show long spinner)
- No "um/uh" — script it, practice once

---

## 🔗 Links to Have Ready (description box)

- GitHub: `https://github.com/ankit052003/RouteSafe`
- Live demo (if deployed): `https://routesafe.vercel.app`
- API health: `https://routesafe-api.onrender.com/health`
- Assignment requirements: (link if public)

---

**Good luck!** 🎯