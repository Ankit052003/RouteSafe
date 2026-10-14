from datetime import datetime, timedelta, timezone
from collections.abc import Sequence
from typing import Any

from ..domain.checkpoints import cumulative_distances, generate_checkpoints
from ..domain.corridor import corridor_points
from ..domain.eta import calculate_section_etas
from ..domain.models import (
    Coordinate,
    METERS_PER_MILE,
    Place,
    RouteGeometry,
    RouteSummary,
    WeatherReading,
)
from ..domain.ranking import POLICY, recommend_route
from ..domain.risk import aggregate_risk_miles, assess_weather, build_risk_segments
from ..domain.weather import reading_at_eta
from ..ports import RoutingProvider, WeatherProvider


class RouteAnalysisService:
    def __init__(self, routing: RoutingProvider, weather: WeatherProvider) -> None:
        self._routing = routing
        self._weather = weather

    def analyze(
        self,
        origin_query: str,
        destination_query: str,
        departure_time: datetime,
        departure_timezone: str,
        load_weight_lb: float,
        checkpoint_interval_miles: int,
    ) -> dict[str, Any]:
        origin = self._routing.geocode(origin_query)
        destination = self._routing.geocode(destination_query)
        geometries = self._routing.routes(origin.coordinate, destination.coordinate, departure_time)
        route_positions = [
            generate_checkpoints(route.coordinates, route.distance_meters, checkpoint_interval_miles)
            for route in geometries
        ]
        route_etas = [
            calculate_section_etas(
                departure_time,
                [checkpoint.distance_meters for checkpoint in checkpoints],
                route.timing_sections,
            )
            for route, checkpoints in zip(geometries, route_positions, strict=True)
        ]
        checkpoint_coordinates = [
            checkpoint.coordinate for checkpoints in route_positions for checkpoint in checkpoints
        ]
        final_arrival = max(etas[-1] for etas in route_etas)
        heatmap_timestamps = tuple(departure_time + timedelta(hours=hour) for hour in range(49))
        heatmap_points = corridor_points([route.coordinates for route in geometries], 12.0, 120)
        all_coordinates = [*checkpoint_coordinates, *heatmap_points]
        all_forecasts = self._forecasts_for_coordinates(
            all_coordinates,
            departure_time - timedelta(hours=1),
            max(final_arrival + timedelta(hours=1), departure_time + timedelta(hours=49)),
        )
        checkpoint_forecasts = all_forecasts[: len(checkpoint_coordinates)]
        heatmap_forecasts = all_forecasts[len(checkpoint_coordinates) :]
        forecast_cursor = 0
        route_results: list[dict[str, Any]] = []
        summaries: list[RouteSummary] = []
        warnings: list[str] = []
        for index, (route, positions, etas) in enumerate(
            zip(geometries, route_positions, route_etas, strict=True)
        ):
            route_id = f"Route {chr(65 + index)}"
            checkpoints: list[dict[str, Any]] = []
            checkpoint_risks = []
            for position, eta in zip(positions, etas, strict=True):
                reading = reading_at_eta(checkpoint_forecasts[forecast_cursor], eta.astimezone(timezone.utc))
                forecast_cursor += 1
                assessment = assess_weather(
                    reading.wind_mph,
                    reading.rain_inches,
                    reading.snow_inches,
                    load_weight_lb,
                )
                checkpoint_risks.append(assessment.overall)
                checkpoints.append(
                    {
                        "index": position.index,
                        "mile_marker": round(position.distance_meters / METERS_PER_MILE, 1),
                        "coordinate": _coordinate(position.coordinate),
                        "eta": eta.isoformat(),
                        "weather": {
                            "wind_mph": reading.wind_mph,
                            "rain_inches_per_hour": reading.rain_inches,
                            "snow_inches_per_hour": reading.snow_inches,
                        },
                        "risk": {
                            "wind": assessment.wind.label,
                            "rain": assessment.rain.label,
                            "snow": assessment.snow.label,
                            "overall": assessment.overall.label,
                            "causes": assessment.causes,
                        },
                    }
                )
            risk_miles, average_risk = aggregate_risk_miles(
                [position.distance_meters for position in positions], checkpoint_risks
            )
            risk_segments = build_risk_segments(
                [position.distance_meters for position in positions], checkpoint_risks
            )
            route_distance_from_geometry = cumulative_distances(route.coordinates)[-1]
            difference = abs(route_distance_from_geometry - route.distance_meters) / route.distance_meters
            if difference > 0.05:
                warnings.append(
                    f"{route_id} provider distance differs from decoded geometry by {difference:.1%}."
                )
            summary = RouteSummary(
                route_id=route_id,
                severe_miles=risk_miles["severe"],
                high_miles=risk_miles["high"],
                average_risk=average_risk,
                travel_time_minutes=route.duration_seconds / 60,
                no_travel_miles=risk_miles["no_travel"],
                unknown_miles=risk_miles["unknown"],
            )
            summaries.append(summary)
            route_results.append(
                {
                    "id": route_id,
                    "provider_route_id": route.provider_id,
                    "label": route.label,
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [point.longitude, point.latitude] for point in route.coordinates
                        ],
                    },
                    "distance_miles": round(route.distance_meters / METERS_PER_MILE, 1),
                    "duration_minutes": round(route.duration_seconds / 60),
                    "arrival_time": etas[-1].isoformat(),
                    "checkpoints": checkpoints,
                    "segments": [
                        {
                            "start_mile": round(segment.start_distance_meters / METERS_PER_MILE, 2),
                            "end_mile": round(segment.end_distance_meters / METERS_PER_MILE, 2),
                            "distance_miles": round(
                                (segment.end_distance_meters - segment.start_distance_meters)
                                / METERS_PER_MILE,
                                2,
                            ),
                            "risk": segment.risk.label,
                        }
                        for segment in risk_segments
                    ],
                    "risk_miles": {key: round(value, 2) for key, value in risk_miles.items()},
                    "average_risk": None if average_risk is None else round(average_risk, 3),
                    "complete": risk_miles["unknown"] == 0,
                    "eligible": risk_miles["no_travel"] == 0,
                }
            )
        recommended_id, explanation = recommend_route(summaries)
        heatmap = self._heatmap(
            heatmap_points,
            heatmap_forecasts,
            heatmap_timestamps,
            load_weight_lb,
        )
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "units": {"distance": "miles", "wind": "mph", "rain": "in/hour", "snow": "in/hour"},
            "request": {
                "origin": origin_query,
                "destination": destination_query,
                "departure_time": departure_time.isoformat(),
                "departure_timezone": departure_timezone,
                "load_weight_lb": load_weight_lb,
                "checkpoint_interval_miles": checkpoint_interval_miles,
            },
            "places": {"origin": _place(origin), "destination": _place(destination)},
            "routes": route_results,
            "recommendation": {
                "route_id": recommended_id,
                "policy": POLICY,
                "explanation": explanation,
            },
            "heatmap": heatmap,
            "attribution": ["Routing and geocoding © TomTom", "Weather data by Open-Meteo"],
            "warnings": warnings,
        }

    def _heatmap(
        self,
        points: Sequence[Coordinate],
        forecasts: Sequence[Sequence[WeatherReading]],
        timestamps: Sequence[datetime],
        load_weight_lb: float,
    ) -> dict[str, Any]:
        encoded_points = []
        for point, series in zip(points, forecasts, strict=True):
            risks = []
            for timestamp in timestamps:
                reading = reading_at_eta(series, timestamp.astimezone(timezone.utc))
                risks.append(
                    int(
                        assess_weather(
                            reading.wind_mph,
                            reading.rain_inches,
                            reading.snow_inches,
                            load_weight_lb,
                        ).overall
                    )
                )
            encoded_points.append([round(point.longitude, 5), round(point.latitude, 5), risks])
        return {"timestamps": [value.isoformat() for value in timestamps], "points": encoded_points}

    def _forecasts_for_coordinates(
        self,
        coordinates: Sequence[Coordinate],
        start_time: datetime,
        end_time: datetime,
    ) -> tuple[tuple[WeatherReading, ...], ...]:
        unique_coordinates: list[Coordinate] = []
        unique_indexes: dict[tuple[float, float], int] = {}
        requested_indexes: list[int] = []
        for coordinate in coordinates:
            key = (round(coordinate.latitude, 5), round(coordinate.longitude, 5))
            if key not in unique_indexes:
                unique_indexes[key] = len(unique_coordinates)
                unique_coordinates.append(coordinate)
            requested_indexes.append(unique_indexes[key])
        forecasts = self._weather.hourly_forecasts(unique_coordinates, start_time, end_time)
        if len(forecasts) != len(unique_coordinates):
            raise ValueError("Weather provider returned an unexpected number of forecasts")
        return tuple(forecasts[index] for index in requested_indexes)


def _coordinate(coordinate: Coordinate) -> dict[str, float]:
    return {"latitude": coordinate.latitude, "longitude": coordinate.longitude}


def _place(place: Place) -> dict[str, Any]:
    return {"label": place.label, "coordinate": _coordinate(place.coordinate)}
