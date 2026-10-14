from collections.abc import Sequence
from datetime import datetime, timedelta, timezone

import pytest

from route_analysis.domain.models import (
    Coordinate,
    Place,
    RouteGeometry,
    RouteTimingSection,
    WeatherReading,
)
from route_analysis.services.analysis import RouteAnalysisService


class FakeRoutingProvider:
    def geocode(self, query: str) -> Place:
        coordinate = Coordinate(39.7, -104.9) if "Denver" in query else Coordinate(40.7, -111.9)
        return Place(query, coordinate)

    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure_time: datetime,
    ) -> tuple[RouteGeometry, ...]:
        del departure_time
        return tuple(
            RouteGeometry(
                provider_id=f"provider-{index}",
                label=f"Alternative {index + 1}",
                coordinates=(
                    origin,
                    Coordinate(40.0 + index * 0.08, -108.0 + index * 0.12),
                    destination,
                ),
                distance_meters=(500 + index * 10) * 1609.344,
                duration_seconds=(500 + index * 20) * 60,
                timing_sections=(
                    RouteTimingSection(
                        distance_meters=(500 + index * 10) * 1609.344,
                        duration_seconds=(500 + index * 20) * 60,
                    ),
                ),
            )
            for index in range(3)
        )


class FakeWeatherProvider:
    def hourly_forecasts(
        self,
        coordinates: Sequence[Coordinate],
        start_time: datetime,
        end_time: datetime,
    ) -> tuple[tuple[WeatherReading, ...], ...]:
        del end_time
        hour = start_time.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
        series = tuple(
            WeatherReading(hour + timedelta(hours=index), 20, 0, 0)
            for index in range(72)
        )
        return tuple(series for _ in coordinates)


def test_analysis_service_returns_three_routes_and_49_heatmap_hours() -> None:
    service = RouteAnalysisService(FakeRoutingProvider(), FakeWeatherProvider())
    result = service.analyze(
        origin_query="Denver, Colorado",
        destination_query="Salt Lake City, Utah",
        departure_time=datetime(2026, 10, 15, 14, tzinfo=timezone.utc),
        departure_timezone="America/Denver",
        load_weight_lb=35_000,
        checkpoint_interval_miles=50,
    )
    assert len(result["routes"]) == 3
    assert len(result["heatmap"]["timestamps"]) == 49
    assert result["heatmap"]["points"]
    assert all(len(point[2]) == 49 for point in result["heatmap"]["points"])
    assert result["recommendation"]["route_id"] == "Route A"
    for route in result["routes"]:
        checkpoint_etas = [checkpoint["eta"] for checkpoint in route["checkpoints"]]
        assert checkpoint_etas == sorted(checkpoint_etas)
        assert abs(sum(route["risk_miles"].values()) - route["distance_miles"]) < 0.05
        assert len(route["segments"]) == len(route["checkpoints"]) - 1
        assert sum(segment["distance_miles"] for segment in route["segments"]) == pytest.approx(
            route["distance_miles"],
            abs=0.05,
        )
