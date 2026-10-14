import { type CSSProperties, type KeyboardEvent, useState } from "react";
import {
  Clock3,
  CloudRain,
  CloudSun,
  MapPin,
  Route,
  Snowflake,
  Sun,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from "lucide-react";

type WeatherCondition = "Clear" | "Partly cloudy" | "Rain" | "Snow" | "Windy";
type RiskLevel = "Low" | "Moderate" | "High" | "Severe";

type Checkpoint = {
  mile: number;
  location: string;
  eta: string;
  weather: WeatherCondition;
  risk: RiskLevel;
  temperature: number;
};

type RouteDetail = {
  id: string;
  shortName: string;
  name: string;
  color: string;
  distance: number;
  durationMinutes: number;
  severeMiles: number;
  highMiles: number;
  checkpoints: ReadonlyArray<Checkpoint>;
};

const weatherIcons: Record<WeatherCondition, LucideIcon> = {
  Clear: Sun,
  "Partly cloudy": CloudSun,
  Rain: CloudRain,
  Snow: Snowflake,
  Windy: Wind,
};

const riskColors: Record<RiskLevel, string> = {
  Low: "#219a63",
  Moderate: "#d79814",
  High: "#ed6b28",
  Severe: "#df3d35",
};

const routes: ReadonlyArray<RouteDetail> = [
  {
    id: "route-1",
    shortName: "Route 1",
    name: "I-80 W (Northern)",
    color: "#0b825e",
    distance: 542,
    durationMinutes: 525,
    severeMiles: 12,
    highMiles: 38,
    checkpoints: [
      { mile: 0, location: "Denver, CO (Start)", eta: "8:00 AM", weather: "Clear", risk: "Low", temperature: 55 },
      { mile: 68, location: "Fort Collins, CO", eta: "9:06 AM", weather: "Partly cloudy", risk: "Moderate", temperature: 51 },
      { mile: 138, location: "Cheyenne, WY", eta: "10:12 AM", weather: "Rain", risk: "High", temperature: 44 },
      { mile: 205, location: "Laramie, WY", eta: "11:17 AM", weather: "Snow", risk: "High", temperature: 31 },
      { mile: 275, location: "Rawlins, WY", eta: "12:26 PM", weather: "Snow", risk: "Severe", temperature: 28 },
      { mile: 342, location: "Rock Springs, WY", eta: "1:30 PM", weather: "Rain", risk: "High", temperature: 39 },
      { mile: 410, location: "Green River, WY", eta: "2:36 PM", weather: "Windy", risk: "Moderate", temperature: 45 },
      { mile: 478, location: "Evanston, WY", eta: "3:42 PM", weather: "Partly cloudy", risk: "Low", temperature: 49 },
      { mile: 542, location: "Salt Lake City, UT (End)", eta: "4:45 PM", weather: "Clear", risk: "Low", temperature: 53 },
    ],
  },
  {
    id: "route-2",
    shortName: "Route 2",
    name: "US-6 W (Central)",
    color: "#247fdb",
    distance: 567,
    durationMinutes: 560,
    severeMiles: 28,
    highMiles: 64,
    checkpoints: [
      { mile: 0, location: "Denver, CO (Start)", eta: "8:00 AM", weather: "Clear", risk: "Low", temperature: 55 },
      { mile: 70, location: "Idaho Springs, CO", eta: "9:09 AM", weather: "Partly cloudy", risk: "Moderate", temperature: 48 },
      { mile: 142, location: "Vail, CO", eta: "10:20 AM", weather: "Snow", risk: "High", temperature: 29 },
      { mile: 212, location: "Glenwood Springs, CO", eta: "11:29 AM", weather: "Rain", risk: "High", temperature: 41 },
      { mile: 284, location: "Grand Junction, CO", eta: "12:40 PM", weather: "Windy", risk: "Severe", temperature: 47 },
      { mile: 355, location: "Green River, UT", eta: "1:50 PM", weather: "Windy", risk: "High", temperature: 44 },
      { mile: 426, location: "Price, UT", eta: "3:00 PM", weather: "Rain", risk: "Moderate", temperature: 42 },
      { mile: 497, location: "Provo, UT", eta: "4:10 PM", weather: "Partly cloudy", risk: "Moderate", temperature: 49 },
      { mile: 567, location: "Salt Lake City, UT (End)", eta: "5:20 PM", weather: "Clear", risk: "Low", temperature: 52 },
    ],
  },
  {
    id: "route-3",
    shortName: "Route 3",
    name: "US-50 W (Southern)",
    color: "#dc5345",
    distance: 603,
    durationMinutes: 610,
    severeMiles: 46,
    highMiles: 87,
    checkpoints: [
      { mile: 0, location: "Denver, CO (Start)", eta: "8:00 AM", weather: "Clear", risk: "Low", temperature: 55 },
      { mile: 75, location: "Colorado Springs, CO", eta: "9:16 AM", weather: "Windy", risk: "Moderate", temperature: 52 },
      { mile: 151, location: "Pueblo, CO", eta: "10:33 AM", weather: "Windy", risk: "High", temperature: 50 },
      { mile: 226, location: "Salida, CO", eta: "11:49 AM", weather: "Snow", risk: "Severe", temperature: 30 },
      { mile: 302, location: "Montrose, CO", eta: "1:06 PM", weather: "Snow", risk: "Severe", temperature: 27 },
      { mile: 377, location: "Grand Junction, CO", eta: "2:22 PM", weather: "Rain", risk: "High", temperature: 40 },
      { mile: 452, location: "Green River, UT", eta: "3:38 PM", weather: "Windy", risk: "High", temperature: 43 },
      { mile: 528, location: "Provo, UT", eta: "4:55 PM", weather: "Partly cloudy", risk: "Moderate", temperature: 48 },
      { mile: 603, location: "Salt Lake City, UT (End)", eta: "6:10 PM", weather: "Clear", risk: "Low", temperature: 51 },
    ],
  },
];

function formatDuration(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}

function RouteDetails() {
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0].id);
  const [selectedCheckpointIndex, setSelectedCheckpointIndex] = useState(0);
  const selectedRoute = routes.find(({ id }) => id === selectedRouteId) ?? routes[0];
  const selectedCheckpoint = selectedRoute.checkpoints[selectedCheckpointIndex];
  const progress = `${(selectedCheckpoint.mile / selectedRoute.distance) * 100}%`;
  const WeatherIcon = weatherIcons[selectedCheckpoint.weather];
  const routeStyle = {
    "--detail-route-color": selectedRoute.color,
    "--checkpoint-progress": progress,
    "--checkpoint-risk": riskColors[selectedCheckpoint.risk],
  } as CSSProperties;

  function selectRoute(routeId: string): void {
    setSelectedRouteId(routeId);
    setSelectedCheckpointIndex(0);
  }

  function selectCheckpoint(index: number): void {
    setSelectedCheckpointIndex(index);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, index: number): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCheckpoint(index);
    }
  }

  function moveCheckpoint(direction: -1 | 1): void {
    setSelectedCheckpointIndex((current) =>
      Math.min(selectedRoute.checkpoints.length - 1, Math.max(0, current + direction)),
    );
  }

  return (
    <section className="route-details-section" id="route-details" aria-labelledby="route-details-title" style={routeStyle}>
      <div className="route-details-shell">
        <div className="route-details-copy">
          <span className="light-kicker">Route details</span>
          <h2 id="route-details-title">Detailed route insights</h2>
          <p>Select a route and checkpoint to inspect its ETA, weather conditions, temperature, and risk level.</p>

          <div className="route-detail-tabs" role="tablist" aria-label="Route detail options">
            {routes.map((routeOption) => (
              <button
                aria-selected={selectedRoute.id === routeOption.id}
                className={selectedRoute.id === routeOption.id ? "is-active" : ""}
                key={routeOption.id}
                onClick={() => selectRoute(routeOption.id)}
                role="tab"
                style={{ "--tab-color": routeOption.color } as CSSProperties}
                type="button"
              >
                <Route size={16} />
                {routeOption.shortName}
              </button>
            ))}
          </div>

          <div className="checkpoint-table-wrap">
            <table className="checkpoint-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Distance</th>
                  <th>Location</th>
                  <th>ETA</th>
                  <th>Weather</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {selectedRoute.checkpoints.map((checkpoint, index) => {
                  const ConditionIcon = weatherIcons[checkpoint.weather];
                  const isSelected = index === selectedCheckpointIndex;
                  return (
                    <tr
                      aria-selected={isSelected}
                      className={isSelected ? "is-selected" : ""}
                      key={`${selectedRoute.id}-${checkpoint.mile}`}
                      onClick={() => selectCheckpoint(index)}
                      onKeyDown={(event) => handleRowKeyDown(event, index)}
                      tabIndex={0}
                    >
                      <td>{index + 1}</td>
                      <td><strong>{checkpoint.mile} mi</strong></td>
                      <td>{checkpoint.location}</td>
                      <td>{checkpoint.eta}</td>
                      <td className="checkpoint-weather"><ConditionIcon size={17} /><span>{checkpoint.weather}</span></td>
                      <td>
                        <span className="checkpoint-risk" style={{ "--row-risk": riskColors[checkpoint.risk] } as CSSProperties}>
                          <TriangleAlert size={12} /> {checkpoint.risk}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="checkpoint-mobile-list" aria-label="Route checkpoints">
            {selectedRoute.checkpoints.map((checkpoint, index) => {
              const ConditionIcon = weatherIcons[checkpoint.weather];
              const isSelected = index === selectedCheckpointIndex;
              return (
                <button
                  aria-expanded={isSelected}
                  className={isSelected ? "checkpoint-mobile-card is-selected" : "checkpoint-mobile-card"}
                  key={`${selectedRoute.id}-mobile-${checkpoint.mile}`}
                  onClick={() => selectCheckpoint(index)}
                  type="button"
                >
                  <span className="checkpoint-mobile-card__top">
                    <span className="checkpoint-mobile-card__index">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{checkpoint.location}</strong>
                    <span className="checkpoint-risk" style={{ "--row-risk": riskColors[checkpoint.risk] } as CSSProperties}>
                      <TriangleAlert size={12} /> {checkpoint.risk}
                    </span>
                  </span>
                  <span className="checkpoint-mobile-card__meta">
                    <span><small>Distance</small><strong>{checkpoint.mile} mi</strong></span>
                    <span><small>ETA</small><strong>{checkpoint.eta}</strong></span>
                    <span><small>Weather</small><strong><ConditionIcon size={16} /> {checkpoint.weather}, {checkpoint.temperature}°F</strong></span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="route-details-visual">
          <div className="route-details-image" role="img" aria-label="Truck traveling through a mountain route" />

          <div className="route-summary-card">
            <span><Route size={22} /><span><strong>{selectedRoute.distance} mi</strong><small>Total distance</small></span></span>
            <span><Clock3 size={22} /><span><strong>{formatDuration(selectedRoute.durationMinutes)}</strong><small>Estimated time</small></span></span>
            <span><TriangleAlert size={22} /><span><strong>{selectedRoute.severeMiles} mi</strong><small>Severe miles</small></span></span>
            <span><MapPin size={22} /><span><strong>{selectedRoute.highMiles} mi</strong><small>High-risk miles</small></span></span>
          </div>

          <div className="checkpoint-focus">
            <div className="checkpoint-focus__top">
              <span className="checkpoint-focus__weather"><WeatherIcon size={25} /></span>
              <span>
                <small>Checkpoint {selectedCheckpointIndex + 1} of {selectedRoute.checkpoints.length}</small>
                <strong>{selectedCheckpoint.location}</strong>
              </span>
              <span className="checkpoint-focus__risk">{selectedCheckpoint.risk}</span>
            </div>
            <div className="checkpoint-progress"><span /></div>
            <div className="checkpoint-focus__meta">
              <span><small>Distance</small><strong>{selectedCheckpoint.mile} mi</strong></span>
              <span><small>ETA</small><strong>{selectedCheckpoint.eta}</strong></span>
              <span><small>Weather</small><strong>{selectedCheckpoint.weather}, {selectedCheckpoint.temperature}°F</strong></span>
              <span className="checkpoint-nav">
                <button disabled={selectedCheckpointIndex === 0} onClick={() => moveCheckpoint(-1)} type="button">Previous</button>
                <button disabled={selectedCheckpointIndex === selectedRoute.checkpoints.length - 1} onClick={() => moveCheckpoint(1)} type="button">Next</button>
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="demo-note route-details-note">Interactive demonstration with illustrative checkpoint data.</p>
    </section>
  );
}

export default RouteDetails;
