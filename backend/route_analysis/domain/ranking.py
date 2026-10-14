from collections.abc import Sequence

from .models import RouteSummary


POLICY = (
    "Exclude No Travel routes when a safe alternative exists; prefer complete routes; "
    "then compare Severe miles, High miles, average risk, and travel time in that order."
)


def recommend_route(routes: Sequence[RouteSummary]) -> tuple[str | None, str]:
    if not routes:
        raise ValueError("At least one route is required")
    if all(route.no_travel_miles > 0 for route in routes):
        return None, "Do not travel under the analyzed conditions. Every route contains No Travel miles."
    eligible = [route for route in routes if route.no_travel_miles == 0]
    complete = [route for route in eligible if route.unknown_miles == 0 and route.average_risk is not None]
    if complete:
        candidates = complete
    elif all(route.unknown_miles > 0 or route.average_risk is None for route in eligible):
        return None, "No recommendation is available because weather analysis is incomplete for every eligible route."
    else:
        candidates = eligible
    winner = min(
        candidates,
        key=lambda route: (
            route.severe_miles,
            route.high_miles,
            route.average_risk if route.average_risk is not None else float("inf"),
            route.travel_time_minutes,
            route.route_id,
        ),
    )
    others = [route for route in candidates if route.route_id != winner.route_id]
    if not others:
        reason = "it is the only complete route without No Travel conditions"
    else:
        runner_up = min(
            others,
            key=lambda route: (
                route.severe_miles,
                route.high_miles,
                route.average_risk if route.average_risk is not None else float("inf"),
                route.travel_time_minutes,
                route.route_id,
            ),
        )
        if winner.severe_miles != runner_up.severe_miles:
            reason = f"it has {runner_up.severe_miles - winner.severe_miles:.1f} fewer Severe miles"
        elif winner.high_miles != runner_up.high_miles:
            reason = f"it has {runner_up.high_miles - winner.high_miles:.1f} fewer High miles"
        elif winner.average_risk != runner_up.average_risk:
            reason = "it has the lower distance-weighted average risk"
        else:
            reason = "it has the shorter travel time after all safety criteria tied"
    return winner.route_id, f"{winner.route_id} is recommended because {reason}."
