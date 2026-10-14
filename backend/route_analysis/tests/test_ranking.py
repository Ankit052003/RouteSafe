from route_analysis.domain.models import RouteSummary
from route_analysis.domain.ranking import recommend_route


def route(
    route_id: str,
    severe: float,
    high: float,
    average: float | None,
    duration: float,
    no_travel: float,
    unknown: float,
) -> RouteSummary:
    return RouteSummary(route_id, severe, high, average, duration, no_travel, unknown)


def test_severe_miles_win_before_speed() -> None:
    winner, _ = recommend_route(
        [route("Route A", 0, 20, 1.2, 600, 0, 0), route("Route B", 1, 0, 0.1, 400, 0, 0)]
    )
    assert winner == "Route A"


def test_high_miles_break_a_severe_mile_tie() -> None:
    winner, _ = recommend_route(
        [route("Route A", 0, 5, 1.2, 600, 0, 0), route("Route B", 0, 10, 0.2, 400, 0, 0)]
    )
    assert winner == "Route A"


def test_average_risk_breaks_severe_and_high_mile_tie() -> None:
    winner, _ = recommend_route(
        [route("Route A", 0, 5, 1.4, 500, 0, 0), route("Route B", 0, 5, 1.2, 600, 0, 0)]
    )
    assert winner == "Route B"


def test_travel_time_breaks_complete_risk_tie() -> None:
    winner, _ = recommend_route(
        [route("Route A", 0, 5, 1.2, 500, 0, 0), route("Route B", 0, 5, 1.2, 450, 0, 0)]
    )
    assert winner == "Route B"


def test_complete_route_beats_incomplete_route() -> None:
    winner, _ = recommend_route(
        [route("Route A", 0, 0, None, 400, 0, 50), route("Route B", 5, 5, 2, 600, 0, 0)]
    )
    assert winner == "Route B"


def test_no_travel_route_is_ineligible_when_alternative_exists() -> None:
    winner, _ = recommend_route(
        [route("Route A", 0, 0, 0, 300, 1, 0), route("Route B", 10, 10, 3, 900, 0, 0)]
    )
    assert winner == "Route B"


def test_all_no_travel_routes_return_no_recommendation() -> None:
    winner, explanation = recommend_route(
        [route("Route A", 0, 0, 0, 300, 1, 0), route("Route B", 0, 0, 0, 400, 2, 0)]
    )
    assert winner is None
    assert "Do not travel" in explanation


def test_all_incomplete_eligible_routes_return_no_recommendation() -> None:
    winner, explanation = recommend_route(
        [route("Route A", 0, 0, 0.5, 300, 0, 10), route("Route B", 0, 0, None, 400, 0, 20)]
    )
    assert winner is None
    assert "incomplete" in explanation
