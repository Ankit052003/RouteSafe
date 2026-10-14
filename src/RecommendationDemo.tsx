import { type CSSProperties, useMemo, useState } from "react";
import { Check, Clock3, Route, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

type RouteMetric = {
  id: string;
  name: string;
  color: string;
  severe: number;
  high: number;
  average: number;
  time: number;
  noTravel: boolean;
};

type Scenario = {
  label: string;
  description: string;
  routes: ReadonlyArray<RouteMetric>;
};

const scenarios: Record<string, Scenario> = {
  mountainStorm: {
    label: "Mountain storm",
    description: "The northern route avoids the largest severe-weather bands.",
    routes: [
      { id: "north", name: "I-80 W (Northern)", color: "#1faf6a", severe: 12, high: 38, average: 1.18, time: 525, noTravel: false },
      { id: "central", name: "US-6 W (Central)", color: "#268ae8", severe: 28, high: 64, average: 1.54, time: 560, noTravel: false },
      { id: "south", name: "US-50 W (Southern)", color: "#ed4c42", severe: 46, high: 87, average: 2.12, time: 610, noTravel: true },
    ],
  },
  highMilesTie: {
    label: "Severe-mile tie",
    description: "Equal severe mileage advances the comparison to High-risk miles.",
    routes: [
      { id: "north", name: "I-80 W (Northern)", color: "#1faf6a", severe: 12, high: 38, average: 1.18, time: 525, noTravel: false },
      { id: "central", name: "US-6 W (Central)", color: "#268ae8", severe: 12, high: 31, average: 1.32, time: 560, noTravel: false },
      { id: "south", name: "US-50 W (Southern)", color: "#ed4c42", severe: 22, high: 24, average: 1.42, time: 605, noTravel: false },
    ],
  },
  averageRiskTie: {
    label: "Risk-mile tie",
    description: "Equal severe and High miles make distance-weighted average risk decisive.",
    routes: [
      { id: "north", name: "I-80 W (Northern)", color: "#1faf6a", severe: 12, high: 38, average: 1.32, time: 525, noTravel: false },
      { id: "central", name: "US-6 W (Central)", color: "#268ae8", severe: 12, high: 38, average: 1.18, time: 560, noTravel: false },
      { id: "south", name: "US-50 W (Southern)", color: "#ed4c42", severe: 18, high: 31, average: 1.11, time: 510, noTravel: false },
    ],
  },
  riskTie: {
    label: "Full risk tie",
    description: "Equal severe, High, and average risk makes travel time the deciding factor.",
    routes: [
      { id: "north", name: "I-80 W (Northern)", color: "#1faf6a", severe: 12, high: 38, average: 1.18, time: 525, noTravel: false },
      { id: "central", name: "US-6 W (Central)", color: "#268ae8", severe: 12, high: 38, average: 1.18, time: 560, noTravel: false },
      { id: "south", name: "US-50 W (Southern)", color: "#ed4c42", severe: 12, high: 38, average: 1.18, time: 510, noTravel: false },
    ],
  },
};

const priorities = [
  { key: "severe", label: "Fewest Severe miles" },
  { key: "high", label: "Fewest High miles" },
  { key: "average", label: "Lowest average risk" },
  { key: "time", label: "Shortest travel time" },
] as const;

function formatTime(totalMinutes: number): string {
  return `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
}

function RecommendationDemo() {
  const [scenarioKey, setScenarioKey] = useState("mountainStorm");
  const scenario = scenarios[scenarioKey];

  const recommendation = useMemo(() => {
    const ranked = [...scenario.routes].sort(
      (first, second) =>
        Number(first.noTravel) - Number(second.noTravel) ||
        first.severe - second.severe ||
        first.high - second.high ||
        first.average - second.average ||
        first.time - second.time,
    );
    const winner = ranked[0];
    const runnerUp = ranked[1];
    const criterionIndex = priorities.findIndex(({ key }) => winner[key] !== runnerUp[key]);
    return { winner, runnerUp, criterionIndex: Math.max(0, criterionIndex) };
  }, [scenario]);

  return (
    <section className="recommendation-section" aria-labelledby="recommendation-title">
      <div className="recommendation-shell">
        <div className="recommendation-intro">
          <div className="section-heading">
            <span className="light-kicker">Route recommendation</span>
            <h2 id="recommendation-title">A recommendation you can explain</h2>
            <p>Change the weather scenario and watch the required ranking order select a route without an arbitrary weighted score.</p>
          </div>

          <div className="scenario-tabs" role="tablist" aria-label="Weather scenarios">
            {Object.entries(scenarios).map(([key, value]) => (
              <button
                aria-selected={scenarioKey === key}
                className={scenarioKey === key ? "is-active" : ""}
                key={key}
                onClick={() => setScenarioKey(key)}
                role="tab"
                type="button"
              >
                {value.label}
              </button>
            ))}
          </div>
        </div>

        <div className="recommendation-grid">
          <div className="ranking-priorities">
            <span className="ranking-priorities__label">Ranking order</span>
            {priorities.map((priority, index) => (
              <div className={recommendation.criterionIndex === index ? "priority is-active" : "priority"} key={priority.key}>
                <span>{index + 1}</span>
                <strong>{priority.label}</strong>
                {recommendation.criterionIndex === index && <small>Deciding criterion</small>}
              </div>
            ))}
          </div>

          <div className="ranking-demo">
            <div className="ranking-demo__heading">
              <span>
                <small>Active scenario</small>
                <strong>{scenario.label}</strong>
              </span>
              <p>{scenario.description}</p>
            </div>

            <div className="ranking-table" role="table" aria-label="Illustrative route ranking">
              <div className="ranking-row ranking-row--header" role="row">
                <span>Route</span><span>Severe</span><span>High</span><span>Avg. risk</span><span>Time</span>
              </div>
              {scenario.routes.map((routeMetric) => {
                const isWinner = routeMetric.id === recommendation.winner.id;
                return (
                  <div className={isWinner ? "ranking-row is-winner" : "ranking-row"} key={routeMetric.id} role="row">
                    <span className="ranking-route">
                      <i style={{ background: routeMetric.color }} />
                      <Route size={15} />
                      <strong>{routeMetric.name}</strong>
                      {isWinner && <em><Check size={12} /> Best</em>}
                    </span>
                    <span data-label="Severe"><TriangleAlert size={13} /> {routeMetric.severe} mi</span>
                    <span data-label="High">{routeMetric.high} mi</span>
                    <span data-label="Avg. risk">{routeMetric.average.toFixed(2)}</span>
                    <span data-label="Time"><Clock3 size={13} /> {formatTime(routeMetric.time)}</span>
                    {routeMetric.noTravel && <small className="ranking-no-travel">No Travel</small>}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="recommendation-result" style={{ "--winner-color": recommendation.winner.color } as CSSProperties}>
            <span className="recommendation-result__icon"><ShieldCheck size={31} /></span>
            <small>Recommended route</small>
            <h3>{recommendation.winner.name}</h3>
            <p>
              It beats {recommendation.runnerUp.name} on <strong>{priorities[recommendation.criterionIndex].label.toLowerCase()}</strong>, the first metric where they differ.
            </p>
            <div>
              <Sparkles size={15} />
              Required priority order applied
            </div>
          </aside>
        </div>

        <p className="demo-note">Interactive demonstration with illustrative route metrics.</p>
      </div>
    </section>
  );
}

export default RecommendationDemo;
