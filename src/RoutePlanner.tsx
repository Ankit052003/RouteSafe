import { lazy, Suspense, type CSSProperties, type FormEvent, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Clock3,
  CloudSun,
  MapPin,
  Navigation,
  Route,
  TriangleAlert,
  Waypoints,
  Weight,
} from "lucide-react";

import { createRouteAnalysis, RouteAnalysisApiError } from "./api/routeAnalysis";
import type { CheckpointInterval, RouteAnalysis, RouteAnalysisRequest } from "./types/analysis";

const RouteAnalysisMap = lazy(() => import("./components/RouteAnalysisMap"));

type PlannerInput = {
  origin: string;
  destination: string;
  departure: string;
  loadWeight: number;
  checkpointInterval: CheckpointInterval;
};

const routeColors = ["#24b66f", "#2389ef", "#f2463d"];
const riskLabels = ["Low", "Moderate", "High", "Severe", "No Travel", "Unknown"] as const;
const riskKeys = ["low", "moderate", "high", "severe", "no_travel", "unknown"] as const;

function tomorrowAtEight(): string {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(8, 0, 0, 0);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

const defaultInput: PlannerInput = {
  origin: "Denver, Colorado",
  destination: "Salt Lake City, Utah",
  departure: tomorrowAtEight(),
  loadWeight: 35_000,
  checkpointInterval: 25,
};

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function formatDateTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(value));
}

function RoutePlanner() {
  const [formInput, setFormInput] = useState<PlannerInput>(defaultInput);
  const [analysis, setAnalysis] = useState<RouteAnalysis | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [forecastHour, setForecastHour] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const selectedRoute = useMemo(
    () => analysis?.routes.find((route) => route.id === selectedRouteId) ?? analysis?.routes[0] ?? null,
    [analysis, selectedRouteId],
  );

  function updateInput<Key extends keyof PlannerInput>(key: Key, value: PlannerInput[Key]): void {
    setFormInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setError(null);
    const request: RouteAnalysisRequest = {
      origin: formInput.origin.trim(),
      destination: formInput.destination.trim(),
      departure_time: new Date(formInput.departure).toISOString(),
      departure_timezone: timezone,
      load_weight_lb: formInput.loadWeight,
      checkpoint_interval_miles: formInput.checkpointInterval,
    };
    try {
      const result = await createRouteAnalysis(request, controller.signal);
      setAnalysis(result);
      setSelectedRouteId(result.recommendation.route_id ?? result.routes[0]?.id ?? "");
      setForecastHour(0);
      setShowHeatmap(true);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }
      setError(
        caught instanceof RouteAnalysisApiError || caught instanceof Error
          ? caught.message
          : "The route analysis could not be completed.",
      );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  return (
    <section className="planner-section" id="route-planner" aria-labelledby="planner-title">
      <div className="planner-section__glow" aria-hidden="true" />
      <div className="planner-layout">
        <div className="planner-setup">
          <div className="section-kicker"><Navigation size={14} aria-hidden="true" />Plan your trip</div>
          <h2 id="planner-title">Find the safest and smartest route</h2>
          <p>Compare three genuine truck routes using weather at each checkpoint's estimated arrival time.</p>

          <form className="trip-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Origin</span>
              <span className="field__control"><MapPin size={18} aria-hidden="true" /><input type="text" value={formInput.origin} onChange={(event) => updateInput("origin", event.target.value)} required /></span>
            </label>
            <label className="field">
              <span className="field__label">Destination</span>
              <span className="field__control"><MapPin size={18} aria-hidden="true" /><input type="text" value={formInput.destination} onChange={(event) => updateInput("destination", event.target.value)} required /></span>
            </label>
            <label className="field">
              <span className="field__label">Departure date &amp; time · {timezone}</span>
              <span className="field__control"><CalendarDays size={18} aria-hidden="true" /><input type="datetime-local" value={formInput.departure} onChange={(event) => updateInput("departure", event.target.value)} required /></span>
            </label>
            <div className="form-row">
              <label className="field">
                <span className="field__label">Load weight (lb)</span>
                <span className="field__control"><Weight size={18} aria-hidden="true" /><input type="number" min="0" max="200000" step="500" value={formInput.loadWeight} onChange={(event) => updateInput("loadWeight", Number(event.target.value))} required /></span>
              </label>
              <label className="field">
                <span className="field__label">Checkpoint interval</span>
                <span className="field__control"><Waypoints size={18} aria-hidden="true" /><select value={formInput.checkpointInterval} onChange={(event) => updateInput("checkpointInterval", Number(event.target.value) as CheckpointInterval)}><option value={10}>10 miles</option><option value={25}>25 miles</option><option value={50}>50 miles</option></select></span>
              </label>
            </div>
            {error && <p className="planner-error" role="alert"><TriangleAlert size={16} />{error}</p>}
            <button className="button find-routes-button" type="submit" disabled={isLoading}>{isLoading ? "Analyzing routes…" : "Analyze three routes"}</button>
          </form>
        </div>

        <section className="routes-panel" aria-labelledby="route-options-title" aria-busy={isLoading}>
          <div className="panel-heading">
            <span><small>{analysis ? "Live forecast analysis" : "Ready to analyze"}</small><strong id="route-options-title">Route options {analysis ? `(${analysis.routes.length})` : ""}</strong></span>
            <span className="live-pill"><span />{analysis ? "API data" : "Awaiting trip"}</span>
          </div>
          {!analysis ? (
            <div className="planner-empty-state"><Route size={34} aria-hidden="true" /><strong>Your route comparison will appear here</strong><p>Submit the trip to retrieve truck routes, ETA-matched weather, and a deterministic safety recommendation.</p></div>
          ) : (
            <div className="route-list">
              <p className="analysis-places">
                <span>{analysis.places.origin.label}</span>
                <span aria-hidden="true">→</span>
                <span>{analysis.places.destination.label}</span>
              </p>
              {analysis.routes.map((routeOption, index) => {
                const isRecommended = analysis.recommendation.route_id === routeOption.id;
                return (
                  <button className={`route-card ${selectedRoute?.id === routeOption.id ? "is-selected" : ""}`} key={routeOption.id} onClick={() => setSelectedRouteId(routeOption.id)} style={{ "--route-color": routeColors[index] } as CSSProperties} type="button">
                    <span className="route-card__heading"><span className="route-number"><Route size={17} aria-hidden="true" /></span><span><small>{routeOption.id}</small><strong>{routeOption.label}</strong></span>{isRecommended && <em>Recommended</em>}</span>
                    <span className="route-metrics">
                      <span><strong>{routeOption.distance_miles} mi</strong><small>Distance</small></span>
                      <span><strong>{formatDuration(routeOption.duration_minutes)}</strong><small>Travel time</small></span>
                      <span><strong>{routeOption.average_risk === null ? "Unknown" : `${routeOption.average_risk.toFixed(2)} / 4`}</strong><small>Average risk</small></span>
                    </span>
                    <span className="route-risk-miles" aria-label="Risk miles">
                      {riskKeys.map((key, riskIndex) => (
                        <span className={`risk-mile risk-mile--${key}${routeOption.risk_miles[key] === 0 ? " is-zero" : ""}`} key={key}>
                          <strong>{routeOption.risk_miles[key]} mi</strong>
                          <small>{riskLabels[riskIndex]}</small>
                        </span>
                      ))}
                    </span>
                    <span className="route-card__footer"><span><Clock3 size={13} />Arrive {formatDateTime(routeOption.arrival_time, timezone)}</span><span>{routeOption.checkpoints.length} checkpoints · {routeOption.complete ? "Complete" : "Incomplete"}</span></span>
                    {(!routeOption.eligible || !routeOption.complete) && <span className="no-travel-alert"><TriangleAlert size={14} />{routeOption.eligible ? "Incomplete forecast data" : "Contains No Travel miles"}</span>}
                  </button>
                );
              })}
              <p className={`recommendation-note ${analysis.recommendation.route_id ? "" : "is-warning"}`}>{analysis.recommendation.explanation}</p>
              {analysis.warnings.map((warning) => <p className="analysis-warning" key={warning}><TriangleAlert size={13} />{warning}</p>)}
              <p className="analysis-attribution">
                {analysis.attribution.join(" · ")} · Analysis generated {formatDateTime(analysis.generated_at, timezone)}
              </p>
            </div>
          )}
        </section>

        <section className="route-map" aria-label="Interactive route and weather map">
          {analysis && selectedRoute ? (
            <>
              <Suspense fallback={<div className="map-empty-state"><strong>Loading interactive map…</strong></div>}>
                <RouteAnalysisMap
                  analysis={analysis}
                  selectedRouteId={selectedRoute.id}
                  forecastHour={forecastHour}
                  showHeatmap={showHeatmap}
                  timezone={timezone}
                />
              </Suspense>
              <div className="map-summary">
                <span className="map-summary__route" style={{ background: routeColors[analysis.routes.findIndex((route) => route.id === selectedRoute.id)] }} />
                <span><small>Selected route</small><strong>{selectedRoute.label}</strong></span>
                <span><small>Average risk</small><strong>{selectedRoute.average_risk === null ? "Unknown" : `${selectedRoute.average_risk.toFixed(2)} / 4`}</strong></span>
              </div>
              <div className="weather-timeline">
                <div className="weather-timeline__heading">
                  <span><CloudSun size={16} />Forecast corridor</span>
                  <button aria-pressed={showHeatmap} onClick={() => setShowHeatmap((visible) => !visible)} type="button">{showHeatmap ? "Hide heatmap" : "Show heatmap"}</button>
                  <strong>+{forecastHour}h · {formatDateTime(analysis.heatmap.timestamps[forecastHour], timezone)}</strong>
                </div>
                <input
                  aria-label="Forecast hour"
                  aria-valuetext={`Plus ${forecastHour} hours, ${formatDateTime(analysis.heatmap.timestamps[forecastHour], timezone)}`}
                  disabled={!showHeatmap}
                  max="48"
                  min="0"
                  onChange={(event) => setForecastHour(Number(event.target.value))}
                  type="range"
                  value={forecastHour}
                />
                <div className="weather-scale" aria-label="Risk legend">
                  {riskLabels.map((label, index) => <span className={`risk-legend--${riskKeys[index]}`} key={label}>{label}</span>)}
                </div>
              </div>
            </>
          ) : (
            <div className="map-empty-state"><MapPin size={40} aria-hidden="true" /><strong>Interactive corridor map</strong><p>All three routes, checkpoint risks, popups, and the 0–48 hour heatmap will load after analysis.</p></div>
          )}
        </section>
      </div>
      <p className="planner-disclaimer">Planning aid based on forecast data and assignment thresholds. Not a guarantee of road or vehicle safety. Follow official warnings, closures, and carrier policies.</p>
    </section>
  );
}

export default RoutePlanner;
