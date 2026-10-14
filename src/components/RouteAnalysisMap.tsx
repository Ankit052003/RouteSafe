import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";

import type { RouteAnalysis } from "../types/analysis";

const routeColors = ["#15b878", "#2b8ef0", "#f35b4f"];
const mapStyleLoadTimeoutMs = 12_000;
const riskColors: Record<string, string> = {
  Low: "#1fad73",
  Moderate: "#e5aa14",
  High: "#f27b26",
  Severe: "#ef4438",
  "No Travel": "#7d2638",
  Unknown: "#73828a",
};
const defaultMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    "backup-basemap": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "fallback-background",
      type: "background",
      paint: { "background-color": "#dcefeb" },
    },
    {
      id: "backup-basemap",
      type: "raster",
      source: "backup-basemap",
    },
  ],
};

type RouteAnalysisMapProps = {
  analysis: RouteAnalysis;
  selectedRouteId: string;
  forecastHour: number;
  showHeatmap: boolean;
  timezone: string;
};

type RouteOverlay = {
  width: number;
  height: number;
  paths: Array<{
    id: string;
    path: string;
    color: string;
    selected: boolean;
  }>;
  checkpoints: Array<{
    id: string;
    x: number;
    y: number;
    color: string;
  }>;
};

const emptyRouteOverlay: RouteOverlay = {
  width: 0,
  height: 0,
  paths: [],
  checkpoints: [],
};

function RouteAnalysisMap({ analysis, selectedRouteId, forecastHour, showHeatmap, timezone }: RouteAnalysisMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [routeOverlay, setRouteOverlay] = useState<RouteOverlay>(emptyRouteOverlay);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    setMapReady(false);
    const configuredMapStyle = (import.meta.env.VITE_MAP_STYLE_URL as string | undefined)?.trim();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: configuredMapStyle || defaultMapStyle,
      center: [-105.5, 39.5],
      zoom: 4,
      attributionControl: false,
    });
    let fallbackApplied = false;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    const handleStyleLoad = () => {
      window.clearTimeout(styleLoadTimeout);
      setMapReady(true);
      if (!fallbackApplied) {
        setMapError(null);
      }
    };
    map.on("load", handleStyleLoad);
    map.on("style.load", handleStyleLoad);
    const styleLoadTimeout = configuredMapStyle
      ? window.setTimeout(() => {
          if (map.isStyleLoaded()) {
            return;
          }
          fallbackApplied = true;
          map.setStyle(defaultMapStyle);
          setMapError("The configured basemap timed out. Using the OpenStreetMap backup.");
        }, mapStyleLoadTimeoutMs)
      : undefined;
    mapRef.current = map;
    return () => {
      if (styleLoadTimeout !== undefined) {
        window.clearTimeout(styleLoadTimeout);
      }
      map.off("load", handleStyleLoad);
      map.off("style.load", handleStyleLoad);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    const renderRoutes = () => {
      const routes: FeatureCollection<LineString> = {
        type: "FeatureCollection",
        features: analysis.routes.map((route, index) => ({
          type: "Feature",
          geometry: route.geometry,
          properties: {
            id: route.id,
            color: routeColors[index] ?? "#64748b",
            selected: route.id === selectedRouteId,
          },
        })),
      };
      const selected = analysis.routes.find((route) => route.id === selectedRouteId) ?? analysis.routes[0];
      const checkpoints: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: selected.checkpoints.map((checkpoint) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [checkpoint.coordinate.longitude, checkpoint.coordinate.latitude],
          },
          properties: {
            mile: checkpoint.mile_marker,
            eta: checkpoint.eta,
            risk: checkpoint.risk.overall,
            color: riskColors[checkpoint.risk.overall],
            windRisk: checkpoint.risk.wind,
            rainRisk: checkpoint.risk.rain,
            snowRisk: checkpoint.risk.snow,
            causes: checkpoint.risk.causes.join(", "),
            wind: checkpoint.weather.wind_mph,
            rain: checkpoint.weather.rain_inches_per_hour,
            snow: checkpoint.weather.snow_inches_per_hour,
          },
        })),
      };
      upsertGeoJson(map, "analysis-routes", routes);
      upsertGeoJson(map, "analysis-checkpoints", checkpoints);
      if (!map.getLayer("analysis-route-lines")) {
        map.addLayer({
          id: "analysis-route-lines",
          type: "line",
          source: "analysis-routes",
          paint: {
            "line-color": ["get", "color"],
            "line-width": ["case", ["==", ["get", "selected"], true], 7, 4],
            "line-opacity": ["case", ["==", ["get", "selected"], true], 1, 0.55],
          },
        });
      }
      if (!map.getLayer("analysis-checkpoint-dots")) {
        map.addLayer({
          id: "analysis-checkpoint-dots",
          type: "circle",
          source: "analysis-checkpoints",
          paint: {
            "circle-radius": 6,
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        map.on("click", "analysis-checkpoint-dots", (event) => {
          const feature = event.features?.[0] as Feature<Point> | undefined;
          if (!feature?.properties) {
            return;
          }
          const properties = feature.properties;
          new maplibregl.Popup({ closeButton: false, offset: 10 })
            .setLngLat(feature.geometry.coordinates as [number, number])
            .setHTML(
              `<strong>Mile ${properties.mile}</strong><br>${properties.risk} risk<br>` +
                `${formatDateTime(String(properties.eta), timezone)}<br>` +
                `Wind ${formatValue(properties.wind)} mph (${properties.windRisk})<br>` +
                `Rain ${formatValue(properties.rain)} in/hour (${properties.rainRisk})<br>` +
                `Snow ${formatValue(properties.snow)} in/hour (${properties.snowRisk})<br>` +
                `Cause: ${properties.causes || "None"}`,
            )
            .addTo(map);
        });
        map.on("mouseenter", "analysis-checkpoint-dots", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "analysis-checkpoint-dots", () => { map.getCanvas().style.cursor = ""; });
      }
      const bounds = new maplibregl.LngLatBounds();
      analysis.routes.forEach((route) => route.geometry.coordinates.forEach((coordinate) => bounds.extend(coordinate)));
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 52, duration: 700 });
      }
    };
    map.on("load", renderRoutes);
    map.on("style.load", renderRoutes);

    renderRoutes();

    return () => {
      map.off("load", renderRoutes);
      map.off("style.load", renderRoutes);
    };
  }, [analysis, mapReady, selectedRouteId, timezone]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    const renderHeatmap = () => {
      const heatmap: FeatureCollection<Point> = {
        type: "FeatureCollection",
        features: analysis.heatmap.points.map(([longitude, latitude, risks]) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [longitude, latitude] },
          properties: { weight: risks[forecastHour] ?? 5 },
        })),
      };
      upsertGeoJson(map, "analysis-heatmap", heatmap);
      if (!map.getLayer("analysis-risk-heatmap")) {
        const beforeRouteLayer = map.getLayer("analysis-route-lines") ? "analysis-route-lines" : undefined;
        map.addLayer(
          {
            id: "analysis-risk-heatmap",
            type: "heatmap",
            source: "analysis-heatmap",
            maxzoom: 10,
            layout: { visibility: showHeatmap ? "visible" : "none" },
            paint: {
              "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.12, 4, 1, 5, 0],
              "heatmap-intensity": 1.1,
              "heatmap-radius": 34,
              "heatmap-opacity": 0.62,
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(39,174,96,0)", 0.25, "#27ae60", 0.5, "#f1c40f", 0.72, "#f39c12", 1, "#e74c3c",
              ],
            },
          },
          beforeRouteLayer,
        );
      } else {
        map.setLayoutProperty("analysis-risk-heatmap", "visibility", showHeatmap ? "visible" : "none");
      }
      if (!map.getLayer("analysis-unknown-points")) {
        map.addLayer(
          {
            id: "analysis-unknown-points",
            type: "circle",
            source: "analysis-heatmap",
            filter: ["==", ["get", "weight"], 5],
            layout: { visibility: showHeatmap ? "visible" : "none" },
            paint: {
              "circle-radius": 4,
              "circle-color": riskColors.Unknown,
              "circle-opacity": 0.72,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1,
            },
          },
          map.getLayer("analysis-route-lines") ? "analysis-route-lines" : undefined,
        );
      } else {
        map.setLayoutProperty("analysis-unknown-points", "visibility", showHeatmap ? "visible" : "none");
      }
    };
    map.on("load", renderHeatmap);
    map.on("style.load", renderHeatmap);

    renderHeatmap();

    return () => {
      map.off("load", renderHeatmap);
      map.off("style.load", renderHeatmap);
    };
  }, [analysis, forecastHour, mapReady, showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    let animationFrame: number | null = null;
    const updateOverlay = () => {
      animationFrame = null;
      if (mapRef.current !== map) {
        return;
      }
      const container = map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;
      const orderedRoutes = [...analysis.routes].sort(
        (first, second) => Number(first.id === selectedRouteId) - Number(second.id === selectedRouteId),
      );
      const paths = orderedRoutes.map((route) => ({
        id: route.id,
        path: route.geometry.coordinates
          .map((coordinate, index) => {
            const point = map.project(coordinate);
            return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
          })
          .join(" "),
        color: routeColors[analysis.routes.findIndex((candidate) => candidate.id === route.id)] ?? "#64748b",
        selected: route.id === selectedRouteId,
      }));
      const selectedRoute = analysis.routes.find((route) => route.id === selectedRouteId) ?? analysis.routes[0];
      const checkpoints = selectedRoute.checkpoints.map((checkpoint) => {
        const point = map.project([
          checkpoint.coordinate.longitude,
          checkpoint.coordinate.latitude,
        ]);
        return {
          id: `${selectedRoute.id}-${checkpoint.index}`,
          x: point.x,
          y: point.y,
          color: riskColors[checkpoint.risk.overall] ?? riskColors.Unknown,
        };
      });
      setRouteOverlay({ width, height, paths, checkpoints });
    };
    const scheduleOverlayUpdate = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(updateOverlay);
      }
    };
    map.on("move", scheduleOverlayUpdate);
    map.on("resize", scheduleOverlayUpdate);
    scheduleOverlayUpdate();

    return () => {
      map.off("move", scheduleOverlayUpdate);
      map.off("resize", scheduleOverlayUpdate);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [analysis, mapReady, selectedRouteId]);

  return (
    <div className="analysis-map-shell">
      <div className="analysis-map" ref={containerRef} />
      {routeOverlay.width > 0 && routeOverlay.height > 0 && (
        <svg
          aria-hidden="true"
          className="analysis-route-overlay"
          viewBox={`0 0 ${routeOverlay.width} ${routeOverlay.height}`}
        >
          <defs>
            {routeOverlay.paths.map((route) => (
              <marker
                id={`route-arrow-${route.id.replaceAll(" ", "-")}`}
                key={route.id}
                markerHeight="7"
                markerWidth="7"
                orient="auto"
                refX="6"
                refY="3.5"
                viewBox="0 0 7 7"
              >
                <path d="M0 0 L7 3.5 L0 7 Z" fill={route.color} />
              </marker>
            ))}
          </defs>
          {routeOverlay.paths.map((route) => (
            <path
              className="analysis-route-overlay__outline"
              d={route.path}
              key={`${route.id}-outline`}
              strokeWidth={route.selected ? 11 : 8}
            />
          ))}
          {routeOverlay.paths.map((route) => (
            <path
              className="analysis-route-overlay__line"
              d={route.path}
              key={route.id}
              markerEnd={`url(#route-arrow-${route.id.replaceAll(" ", "-")})`}
              opacity={route.selected ? 1 : 0.72}
              stroke={route.color}
              strokeWidth={route.selected ? 7 : 4}
            />
          ))}
          {routeOverlay.checkpoints.map((checkpoint) => (
            <circle
              className="analysis-route-overlay__checkpoint"
              cx={checkpoint.x}
              cy={checkpoint.y}
              fill={checkpoint.color}
              key={checkpoint.id}
              r="5"
            />
          ))}
        </svg>
      )}
      {mapError && <p className="analysis-map__error" role="status">{mapError}</p>}
    </div>
  );
}

function upsertGeoJson(
  map: MapLibreMap,
  id: string,
  data: FeatureCollection<LineString | Point>,
): void {
  const source = map.getSource(id) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(id, { type: "geojson", data });
  }
}

function formatValue(value: unknown): string {
  return typeof value === "number" ? value.toFixed(2) : "Unknown";
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

export default RouteAnalysisMap;
