from datetime import datetime, timezone

import pytest

from route_analysis.domain.checkpoints import generate_checkpoints
from route_analysis.domain.corridor import corridor_points
from route_analysis.domain.eta import calculate_etas, calculate_section_etas
from route_analysis.domain.models import Coordinate, RouteTimingSection


def test_checkpoints_include_origin_intervals_and_destination_without_duplicate() -> None:
    coordinates = (Coordinate(0, 0), Coordinate(0, 1))
    checkpoints = generate_checkpoints(coordinates, 50 * 1609.344, 25)
    assert [point.distance_meters / 1609.344 for point in checkpoints] == pytest.approx([0, 25, 50])


def test_checkpoint_coordinates_follow_curved_geometry() -> None:
    coordinates = (Coordinate(0, 0), Coordinate(1, 0), Coordinate(1, 1))
    checkpoints = generate_checkpoints(coordinates, 100 * 1609.344, 25)
    assert checkpoints[1].coordinate.longitude == pytest.approx(0, abs=0.02)
    assert checkpoints[-2].coordinate.latitude == pytest.approx(1, abs=0.02)


def test_etas_are_monotonic_and_end_at_route_duration() -> None:
    departure = datetime(2026, 10, 15, 14, tzinfo=timezone.utc)
    etas = calculate_etas(departure, (0, 25, 100), 100, 7200)
    assert etas[0] == departure
    assert etas[0] < etas[1] < etas[2]
    assert (etas[-1] - departure).total_seconds() == 7200


def test_eta_rejects_naive_departure() -> None:
    with pytest.raises(ValueError, match="UTC offset"):
        calculate_etas(datetime(2026, 10, 15, 14), (0, 100), 100, 3600)


def test_section_eta_uses_each_sections_travel_rate() -> None:
    departure = datetime(2026, 10, 15, 14, tzinfo=timezone.utc)
    sections = (RouteTimingSection(50, 3600), RouteTimingSection(50, 1800))
    etas = calculate_section_etas(departure, (0, 25, 50, 75, 100), sections)
    assert [(eta - departure).total_seconds() for eta in etas] == [0, 1800, 3600, 4500, 5400]


def test_corridor_respects_point_budget_at_high_latitude() -> None:
    route = (
        Coordinate(68.0, -110.0),
        Coordinate(68.5, -108.0),
        Coordinate(69.0, -106.0),
    )
    points = corridor_points((route,), buffer_miles=12, point_budget=9)
    assert 3 <= len(points) <= 9
    assert all(-90 <= point.latitude <= 90 for point in points)
    assert all(-180 <= point.longitude <= 180 for point in points)
