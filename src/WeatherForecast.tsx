import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Pause,
  Play,
  Snowflake,
  Sun,
  Thermometer,
  type LucideIcon,
  Wind,
} from "lucide-react";

type WeatherKind = "clear" | "partly-cloudy" | "rain" | "snow" | "windy";
type TemperatureUnit = "F" | "C";

type WeatherPhase = {
  kind: WeatherKind;
  label: string;
  startHour: number;
  endHour: number;
  temperatureF: number;
  precipitation: number;
  windMph: number;
  icon: LucideIcon;
  color: string;
};

const forecastStart = new Date("2026-10-14T08:00:00");
const timelineTicks = [0, 6, 12, 18, 24, 30, 36, 42, 48];

const weatherPhases: ReadonlyArray<WeatherPhase> = [
  { kind: "clear", label: "Clear", startHour: 0, endHour: 7, temperatureF: 55, precipitation: 2, windMph: 8, icon: Sun, color: "#f4b51d" },
  { kind: "partly-cloudy", label: "Partly cloudy", startHour: 8, endHour: 15, temperatureF: 50, precipitation: 14, windMph: 12, icon: CloudSun, color: "#e4a919" },
  { kind: "rain", label: "Rain", startHour: 16, endHour: 27, temperatureF: 44, precipitation: 72, windMph: 17, icon: CloudRain, color: "#378bd2" },
  { kind: "snow", label: "Snow", startHour: 28, endHour: 35, temperatureF: 30, precipitation: 84, windMph: 15, icon: Snowflake, color: "#2589e9" },
  { kind: "windy", label: "Windy", startHour: 36, endHour: 42, temperatureF: 38, precipitation: 20, windMph: 34, icon: Wind, color: "#16a6c5" },
  { kind: "clear", label: "Clear", startHour: 43, endHour: 48, temperatureF: 43, precipitation: 4, windMph: 10, icon: Sun, color: "#f4b51d" },
];

const weatherPresets: ReadonlyArray<{ kind: WeatherKind; label: string; hour: number; icon: LucideIcon; color: string }> = [
  { kind: "clear", label: "Clear", hour: 2, icon: Sun, color: "#f4b51d" },
  { kind: "partly-cloudy", label: "Partly cloudy", hour: 10, icon: CloudSun, color: "#e4a919" },
  { kind: "rain", label: "Rain", hour: 20, icon: CloudRain, color: "#378bd2" },
  { kind: "snow", label: "Snow", hour: 31, icon: Snowflake, color: "#2589e9" },
  { kind: "windy", label: "Windy", hour: 39, icon: Wind, color: "#16a6c5" },
];

function formatForecastTime(hour: number): { date: string; time: string } {
  const timestamp = new Date(forecastStart.getTime() + hour * 60 * 60 * 1000);
  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(timestamp),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp),
  };
}

function WeatherForecast() {
  const [forecastHour, setForecastHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>("F");

  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalId = window.setInterval(() => {
      setForecastHour((currentHour) => (currentHour >= 48 ? 0 : currentHour + 1));
    }, 450);

    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  const forecast = useMemo(() => {
    const phase = weatherPhases.find(
      ({ startHour, endHour }) => forecastHour >= startHour && forecastHour <= endHour,
    ) ?? weatherPhases[0];
    const temperatureVariation = Math.round(Math.sin(forecastHour / 4.5) * 3);
    const temperatureF = phase.temperatureF + temperatureVariation;
    const temperature = temperatureUnit === "F" ? temperatureF : Math.round((temperatureF - 32) * 5 / 9);
    return {
      ...phase,
      temperature,
      precipitation: Math.min(100, Math.max(0, phase.precipitation + Math.round(Math.sin(forecastHour / 3) * 6))),
      windMph: Math.max(0, phase.windMph + Math.round(Math.cos(forecastHour / 4) * 3)),
      timestamp: formatForecastTime(forecastHour),
    };
  }, [forecastHour, temperatureUnit]);

  const forecastStyle = {
    "--forecast-color": forecast.color,
    "--forecast-progress": `${(forecastHour / 48) * 100}%`,
  } as CSSProperties;
  const CurrentIcon = forecast.icon;

  return (
    <section className="forecast-section" id="forecast" aria-labelledby="forecast-title" style={forecastStyle}>
      <div className="forecast-shell">
        <div className="forecast-heading">
          <div>
            <span className="light-kicker">48-hour weather forecast</span>
            <h2 id="forecast-title">See weather ahead of time</h2>
            <p>Explore how conditions could change along the route before the truck reaches each checkpoint.</p>
          </div>

          <div className="weather-presets" role="tablist" aria-label="Forecast condition shortcuts">
            {weatherPresets.map(({ kind, label, hour, icon: Icon, color }) => (
              <button
                aria-selected={forecast.kind === kind}
                className={forecast.kind === kind ? "is-active" : ""}
                key={kind}
                onClick={() => {
                  setForecastHour(hour);
                  setIsPlaying(false);
                }}
                role="tab"
                style={{ "--weather-color": color } as CSSProperties}
                type="button"
              >
                <Icon size={34} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            className="unit-toggle"
            onClick={() => setTemperatureUnit((current) => current === "F" ? "C" : "F")}
            type="button"
            aria-label={`Display temperature in degrees ${temperatureUnit === "F" ? "Celsius" : "Fahrenheit"}`}
          >
            °{temperatureUnit}
          </button>
        </div>

        <div className="forecast-player">
          <button
            className="forecast-play"
            onClick={() => setIsPlaying((current) => !current)}
            type="button"
            aria-label={isPlaying ? "Pause forecast animation" : "Play forecast animation"}
          >
            {isPlaying ? <Pause size={25} fill="currentColor" /> : <Play size={25} fill="currentColor" />}
          </button>

          <div className="forecast-current">
            <span className="forecast-current__icon"><CurrentIcon size={36} /></span>
            <span>
              <small>At +{forecastHour} hours</small>
              <strong>{forecast.label}</strong>
            </span>
          </div>

          <div className="forecast-timeline">
            <input
              aria-label="Forecast hour from zero to forty-eight"
              max="48"
              min="0"
              onChange={(event) => {
                setForecastHour(Number(event.target.value));
                setIsPlaying(false);
              }}
              type="range"
              value={forecastHour}
            />
            <div className="forecast-ticks" aria-hidden="true">
              {timelineTicks.map((hour) => <span key={hour}>{hour}h</span>)}
            </div>
          </div>

          <div className="forecast-metrics" aria-live="polite">
            <span><Thermometer size={16} /><strong>{forecast.temperature}°{temperatureUnit}</strong><small>Temperature</small></span>
            <span><Droplets size={16} /><strong>{forecast.precipitation}%</strong><small>Precipitation</small></span>
            <span><Gauge size={16} /><strong>{forecast.windMph} mph</strong><small>Wind</small></span>
          </div>

          <time className="forecast-time" dateTime={new Date(forecastStart.getTime() + forecastHour * 3_600_000).toISOString()}>
            <small>{forecast.timestamp.date}</small>
            <strong>{forecast.timestamp.time}</strong>
          </time>
        </div>

        <p className="demo-note">Interactive demonstration with illustrative forecast data.</p>
      </div>
    </section>
  );
}

export default WeatherForecast;
