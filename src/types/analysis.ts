export type CheckpointInterval = 10 | 25 | 50;
export type RiskLabel = "Low" | "Moderate" | "High" | "Severe" | "No Travel" | "Unknown";

export type Coordinate = { latitude: number; longitude: number };

export type RouteAnalysisRequest = {
  origin: string;
  destination: string;
  departure_time: string;
  departure_timezone: string;
  load_weight_lb: number;
  checkpoint_interval_miles: CheckpointInterval;
};

export type Checkpoint = {
  index: number;
  mile_marker: number;
  coordinate: Coordinate;
  eta: string;
  weather: {
    wind_mph: number | null;
    rain_inches_per_hour: number | null;
    snow_inches_per_hour: number | null;
  };
  risk: {
    wind: RiskLabel;
    rain: RiskLabel;
    snow: RiskLabel;
    overall: RiskLabel;
    causes: string[];
  };
};

export type AnalyzedRoute = {
  id: string;
  provider_route_id: string;
  label: string;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance_miles: number;
  duration_minutes: number;
  arrival_time: string;
  checkpoints: Checkpoint[];
  segments: {
    start_mile: number;
    end_mile: number;
    distance_miles: number;
    risk: RiskLabel;
  }[];
  risk_miles: Record<"low" | "moderate" | "high" | "severe" | "no_travel" | "unknown", number>;
  average_risk: number | null;
  complete: boolean;
  eligible: boolean;
};

export type RouteAnalysis = {
  generated_at: string;
  units: Record<string, string>;
  request: RouteAnalysisRequest;
  places: {
    origin: { label: string; coordinate: Coordinate };
    destination: { label: string; coordinate: Coordinate };
  };
  routes: AnalyzedRoute[];
  recommendation: { route_id: string | null; policy: string; explanation: string };
  heatmap: { timestamps: string[]; points: [number, number, number[]][] };
  attribution: string[];
  warnings: string[];
};
