import { type CSSProperties, useMemo, useState } from "react";
import { CloudRain, Gauge, Snowflake, TriangleAlert, Weight, Wind } from "lucide-react";

type RiskLevel = "Low" | "Moderate" | "High" | "Severe" | "No Travel";
type Condition = "wind" | "rain" | "snow";

const riskOrder: ReadonlyArray<RiskLevel> = ["Low", "Moderate", "High", "Severe", "No Travel"];
const riskColors: Record<RiskLevel, string> = {
  Low: "#29a765",
  Moderate: "#e9bd25",
  High: "#f07b22",
  Severe: "#e33b31",
  "No Travel": "#26324f",
};

const riskTable: ReadonlyArray<{
  condition: string;
  key: Condition;
  values: ReadonlyArray<string>;
}> = [
  { condition: "Wind (mph)", key: "wind", values: ["< 25", "25-<35", "35-<45", "45-<55", ">= 55"] },
  { condition: "Rain (in/hr)", key: "rain", values: ["< 0.10", "0.10-<0.25", "0.25-<0.50", "0.50-1.00", "> 1.00"] },
  { condition: "Snow (in/hr)", key: "snow", values: ["< 0.5", "0.5-<1.0", "1.0-<2.0", "2.0-3.0", "> 3.0"] },
];

function classifyWind(value: number): RiskLevel {
  if (value >= 55) return "No Travel";
  if (value >= 45) return "Severe";
  if (value >= 35) return "High";
  if (value >= 25) return "Moderate";
  return "Low";
}

function classifyRain(value: number): RiskLevel {
  if (value > 1) return "No Travel";
  if (value >= 0.5) return "Severe";
  if (value >= 0.25) return "High";
  if (value >= 0.1) return "Moderate";
  return "Low";
}

function classifySnow(value: number): RiskLevel {
  if (value > 3) return "No Travel";
  if (value >= 2) return "Severe";
  if (value >= 1) return "High";
  if (value >= 0.5) return "Moderate";
  return "Low";
}

function maxRisk(levels: ReadonlyArray<RiskLevel>): RiskLevel {
  return levels.reduce((highest, level) =>
    riskOrder.indexOf(level) > riskOrder.indexOf(highest) ? level : highest,
  );
}

function RiskClassifier() {
  const [windSpeed, setWindSpeed] = useState(38);
  const [rainRate, setRainRate] = useState(0.18);
  const [snowRate, setSnowRate] = useState(0.4);
  const [loadWeight, setLoadWeight] = useState(35000);
  const [activeRiskCondition, setActiveRiskCondition] = useState<Condition>("wind");

  const analysis = useMemo(() => {
    const baseWindRisk = classifyWind(windSpeed);
    let windRisk = baseWindRisk;
    let activeLoadRule = -1;

    if (windSpeed >= 55) {
      windRisk = "No Travel";
      activeLoadRule = 0;
    } else if (windSpeed >= 45 && loadWeight > 30000) {
      windRisk = "No Travel";
      activeLoadRule = 1;
    } else if (windSpeed >= 35 && loadWeight > 40000) {
      windRisk = "Severe";
      activeLoadRule = 2;
    }

    const rainRisk = classifyRain(rainRate);
    const snowRisk = classifySnow(snowRate);
    return {
      componentRisk: { wind: windRisk, rain: rainRisk, snow: snowRisk },
      overallRisk: maxRisk([windRisk, rainRisk, snowRisk]),
      activeLoadRule,
    };
  }, [loadWeight, rainRate, snowRate, windSpeed]);

  const overallStyle = { "--current-risk": riskColors[analysis.overallRisk] } as CSSProperties;
  const activeRiskRow = riskTable.find(({ key }) => key === activeRiskCondition) ?? riskTable[0];

  return (
    <section className="risk-section" id="safety" aria-labelledby="risk-title">
      <div className="section-heading section-heading--centered">
        <span className="light-kicker">Weather risk classification</span>
        <h2 id="risk-title">Test the rules against real trip conditions</h2>
        <p>Adjust the forecast and load values to see the component risks, load override, and final checkpoint classification update instantly.</p>
      </div>

      <div className="risk-dashboard">
        <div className="risk-controls">
          <div className="risk-controls__heading">
            <span><Gauge size={20} /> Live checkpoint</span>
            <strong style={overallStyle}>{analysis.overallRisk}</strong>
          </div>

          <label className="risk-slider">
            <span><Wind size={17} /> Wind speed <strong>{windSpeed} mph</strong></span>
            <input min="0" max="70" step="1" type="range" value={windSpeed} onChange={(event) => setWindSpeed(Number(event.target.value))} />
          </label>
          <label className="risk-slider">
            <span><CloudRain size={17} /> Rain rate <strong>{rainRate.toFixed(2)} in/hr</strong></span>
            <input min="0" max="1.5" step="0.01" type="range" value={rainRate} onChange={(event) => setRainRate(Number(event.target.value))} />
          </label>
          <label className="risk-slider">
            <span><Snowflake size={17} /> Snow rate <strong>{snowRate.toFixed(1)} in/hr</strong></span>
            <input min="0" max="4" step="0.1" type="range" value={snowRate} onChange={(event) => setSnowRate(Number(event.target.value))} />
          </label>
          <label className="risk-slider">
            <span><Weight size={17} /> Load weight <strong>{loadWeight.toLocaleString()} lb</strong></span>
            <input min="0" max="60000" step="500" type="range" value={loadWeight} onChange={(event) => setLoadWeight(Number(event.target.value))} />
          </label>

          <div className="component-risks">
            {(Object.entries(analysis.componentRisk) as Array<[Condition, RiskLevel]>).map(([condition, level]) => (
              <span key={condition} style={{ "--component-color": riskColors[level] } as CSSProperties}>
                <small>{condition}</small>
                <strong>{level}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="risk-reference">
          <div className="risk-mobile-reference">
            <div className="risk-condition-tabs" role="tablist" aria-label="Weather risk conditions">
              {riskTable.map((row) => (
                <button
                  aria-selected={activeRiskCondition === row.key}
                  className={activeRiskCondition === row.key ? "is-active" : ""}
                  key={row.key}
                  onClick={() => setActiveRiskCondition(row.key)}
                  role="tab"
                  type="button"
                >
                  {row.condition}
                </button>
              ))}
            </div>
            <div className="risk-mobile-levels" role="tabpanel" aria-live="polite">
              {activeRiskRow.values.map((value, index) => {
                const level = riskOrder[index];
                const isActive = analysis.componentRisk[activeRiskCondition] === level;
                return (
                  <div
                    className={isActive ? "risk-mobile-level is-active" : "risk-mobile-level"}
                    key={level}
                    style={{ "--level-color": riskColors[level] } as CSSProperties}
                  >
                    <i aria-hidden="true" />
                    <strong>{level}</strong>
                    <span>{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="risk-table-wrap">
            <table className="risk-table">
              <thead>
                <tr>
                  <th>Condition</th>
                  {riskOrder.map((level) => <th key={level} style={{ "--level-color": riskColors[level] } as CSSProperties}>{level}</th>)}
                </tr>
              </thead>
              <tbody>
                {riskTable.map((row) => (
                  <tr key={row.key}>
                    <th>{row.condition}</th>
                    {row.values.map((value, index) => (
                      <td className={analysis.componentRisk[row.key] === riskOrder[index] ? "is-active" : ""} key={value}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="load-rules">
            <h3>Load rules</h3>
            <p>Wind-specific overrides based on the entered load.</p>
            {[
              ">= 55 mph -> No Travel for any load",
              "45-54 mph + > 30,000 lb -> No Travel",
              "35-44 mph + > 40,000 lb -> Severe",
            ].map((rule, index) => (
              <div className={analysis.activeLoadRule === index ? "load-rule is-active" : "load-rule"} key={rule}>
                <TriangleAlert size={17} />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default RiskClassifier;
