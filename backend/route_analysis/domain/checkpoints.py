import math
from collections.abc import Sequence

from .models import CheckpointPosition, Coordinate, METERS_PER_MILE


EARTH_RADIUS_METERS = 6_371_008.8


def haversine_meters(start: Coordinate, end: Coordinate) -> float:
    lat1, lat2 = math.radians(start.latitude), math.radians(end.latitude)
    delta_lat = lat2 - lat1
    delta_lon = math.radians(end.longitude - start.longitude)
    value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(value))


def cumulative_distances(coordinates: Sequence[Coordinate]) -> tuple[float, ...]:
    if len(coordinates) < 2:
        raise ValueError("A route geometry requires at least two coordinates")
    distances = [0.0]
    for start, end in zip(coordinates, coordinates[1:], strict=False):
        distances.append(distances[-1] + haversine_meters(start, end))
    if distances[-1] <= 0:
        raise ValueError("Route geometry has no measurable length")
    return tuple(distances)


def interpolate_coordinate(
    coordinates: Sequence[Coordinate],
    cumulative: Sequence[float],
    target_meters: float,
) -> Coordinate:
    if target_meters <= 0:
        return coordinates[0]
    if target_meters >= cumulative[-1]:
        return coordinates[-1]
    for index in range(1, len(cumulative)):
        if cumulative[index] >= target_meters:
            start_distance = cumulative[index - 1]
            segment_length = cumulative[index] - start_distance
            fraction = 0.0 if segment_length == 0 else (target_meters - start_distance) / segment_length
            start, end = coordinates[index - 1], coordinates[index]
            return Coordinate(
                latitude=start.latitude + (end.latitude - start.latitude) * fraction,
                longitude=start.longitude + (end.longitude - start.longitude) * fraction,
            )
    return coordinates[-1]


def generate_checkpoints(
    coordinates: Sequence[Coordinate],
    provider_distance_meters: float,
    interval_miles: int,
) -> tuple[CheckpointPosition, ...]:
    if interval_miles not in {10, 25, 50}:
        raise ValueError("Checkpoint interval must be 10, 25, or 50 miles")
    if provider_distance_meters <= 0:
        raise ValueError("Provider distance must be positive")
    cumulative = cumulative_distances(coordinates)
    geometry_length = cumulative[-1]
    interval = interval_miles * METERS_PER_MILE
    provider_targets: list[float] = [0.0]
    current = interval
    while current < provider_distance_meters:
        provider_targets.append(current)
        current += interval
    provider_targets.append(provider_distance_meters)
    checkpoints = []
    for index, provider_target in enumerate(provider_targets):
        geometry_target = geometry_length * provider_target / provider_distance_meters
        checkpoints.append(
            CheckpointPosition(
                index=index,
                distance_meters=provider_target,
                coordinate=interpolate_coordinate(coordinates, cumulative, geometry_target),
            )
        )
    return tuple(checkpoints)
