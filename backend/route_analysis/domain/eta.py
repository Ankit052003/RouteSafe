from datetime import datetime, timedelta
from collections.abc import Sequence

from .models import RouteTimingSection


def calculate_etas(
    departure_time: datetime,
    checkpoint_distances_meters: Sequence[float],
    route_distance_meters: float,
    route_duration_seconds: float,
) -> tuple[datetime, ...]:
    if departure_time.utcoffset() is None:
        raise ValueError("Departure time must include a UTC offset")
    if route_distance_meters <= 0 or route_duration_seconds <= 0:
        raise ValueError("Route distance and duration must be positive")
    return tuple(
        departure_time
        + timedelta(seconds=route_duration_seconds * distance / route_distance_meters)
        for distance in checkpoint_distances_meters
    )


def calculate_section_etas(
    departure_time: datetime,
    checkpoint_distances_meters: Sequence[float],
    timing_sections: Sequence[RouteTimingSection],
) -> tuple[datetime, ...]:
    if departure_time.utcoffset() is None:
        raise ValueError("Departure time must include a UTC offset")
    if not timing_sections or any(
        section.distance_meters <= 0 or section.duration_seconds <= 0
        for section in timing_sections
    ):
        raise ValueError("Route timing sections must contain positive distance and duration")
    distance_boundaries: list[float] = []
    elapsed_boundaries: list[float] = []
    cumulative_distance = 0.0
    cumulative_duration = 0.0
    for section in timing_sections:
        cumulative_distance += section.distance_meters
        cumulative_duration += section.duration_seconds
        distance_boundaries.append(cumulative_distance)
        elapsed_boundaries.append(cumulative_duration)
    results = []
    for checkpoint_distance in checkpoint_distances_meters:
        previous_distance = 0.0
        previous_duration = 0.0
        elapsed = cumulative_duration
        for index, boundary in enumerate(distance_boundaries):
            if checkpoint_distance <= boundary:
                section = timing_sections[index]
                fraction = min(
                    1.0,
                    max(0.0, (checkpoint_distance - previous_distance) / section.distance_meters),
                )
                elapsed = previous_duration + section.duration_seconds * fraction
                break
            previous_distance = boundary
            previous_duration = elapsed_boundaries[index]
        results.append(departure_time + timedelta(seconds=elapsed))
    return tuple(results)
