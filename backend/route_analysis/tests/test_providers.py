from datetime import datetime, timezone

import pytest

from route_analysis.providers.errors import ProviderError
from route_analysis.providers.open_meteo import OpenMeteoProvider
from route_analysis.providers.tomtom import TomTomProvider


def test_tomtom_fixture_normalizes_geometry_and_section_timing() -> None:
    route = TomTomProvider("fixture-key", 1)._normalize_route(  # noqa: SLF001
        {
            "summary": {"lengthInMeters": 804_672, "travelTimeInSeconds": 31_500},
            "progress": [
                {"pointIndex": 0, "distanceInMeters": 0, "travelTimeInSeconds": 0},
                {
                    "pointIndex": 1,
                    "distanceInMeters": 300_000,
                    "travelTimeInSeconds": 15_000,
                },
                {
                    "pointIndex": 2,
                    "distanceInMeters": 804_672,
                    "travelTimeInSeconds": 31_500,
                },
            ],
            "legs": [
                {
                    "summary": {
                        "lengthInMeters": 804_672,
                        "travelTimeInSeconds": 31_500,
                    },
                    "points": [
                        {"latitude": 39.7, "longitude": -104.9},
                        {"latitude": 40.0, "longitude": -108.0},
                        {"latitude": 40.7, "longitude": -111.9},
                    ],
                }
            ],
        },
        0,
    )
    assert route.provider_id == "tomtom-route-1"
    assert route.label == "Fastest truck route"
    assert len(route.coordinates) == 3
    assert len(route.timing_sections) == 2
    assert route.timing_sections[0].duration_seconds == 15_000
    assert sum(section.duration_seconds for section in route.timing_sections) == 31_500


def test_open_meteo_fixture_normalizes_units_and_timestamps() -> None:
    series = OpenMeteoProvider(1)._normalize_series(  # noqa: SLF001
        {
            "hourly_units": {
                "time": "unixtime",
                "wind_speed_10m": "mp/h",
                "rain": "inch",
                "snowfall": "inch",
            },
            "hourly": {
                "time": [1_791_998_400],
                "wind_speed_10m": [22.5],
                "rain": [0.12],
                "snowfall": [0.5],
            },
        }
    )
    assert series[0].timestamp == datetime.fromtimestamp(1_791_998_400, timezone.utc)
    assert series[0].wind_mph == pytest.approx(22.5)
    assert series[0].snow_inches == pytest.approx(0.5)


def test_open_meteo_fixture_rejects_unexpected_units() -> None:
    with pytest.raises(ProviderError, match="invalid hourly forecast"):
        OpenMeteoProvider(1)._normalize_series(  # noqa: SLF001
            {
                "hourly_units": {
                    "wind_speed_10m": "km/h",
                    "rain": "mm",
                    "snowfall": "cm",
                },
                "hourly": {"time": [], "wind_speed_10m": [], "rain": [], "snowfall": []},
            }
        )
