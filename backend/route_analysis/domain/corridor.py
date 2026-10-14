import math
from collections.abc import Sequence

from .checkpoints import cumulative_distances, interpolate_coordinate
from .models import Coordinate


def corridor_points(
    routes: Sequence[Sequence[Coordinate]],
    buffer_miles: float,
    point_budget: int,
) -> tuple[Coordinate, ...]:
    if not routes or point_budget < 3:
        raise ValueError("Corridor generation requires routes and a point budget of at least three")
    per_route = max(1, point_budget // (len(routes) * 3))
    points: list[Coordinate] = []
    for route in routes:
        cumulative = cumulative_distances(route)
        for index in range(per_route):
            target = cumulative[-1] * index / max(1, per_route - 1)
            center = interpolate_coordinate(route, cumulative, target)
            tangent_a = interpolate_coordinate(route, cumulative, max(0.0, target - 500.0))
            tangent_b = interpolate_coordinate(route, cumulative, min(cumulative[-1], target + 500.0))
            bearing = _initial_bearing(tangent_a, tangent_b)
            points.append(center)
            points.append(_offset(center, buffer_miles, bearing + math.pi / 2))
            points.append(_offset(center, buffer_miles, bearing - math.pi / 2))
    deduplicated: dict[tuple[float, float], Coordinate] = {}
    for point in points:
        deduplicated[(round(point.latitude, 3), round(point.longitude, 3))] = point
    return tuple(deduplicated.values())[:point_budget]


def _initial_bearing(start: Coordinate, end: Coordinate) -> float:
    start_latitude = math.radians(start.latitude)
    end_latitude = math.radians(end.latitude)
    longitude_delta = math.radians(end.longitude - start.longitude)
    east = math.sin(longitude_delta) * math.cos(end_latitude)
    north = (
        math.cos(start_latitude) * math.sin(end_latitude)
        - math.sin(start_latitude) * math.cos(end_latitude) * math.cos(longitude_delta)
    )
    if east == 0 and north == 0:
        return 0.0
    return math.atan2(east, north)


def _offset(point: Coordinate, miles: float, bearing: float) -> Coordinate:
    distance_meters = miles * 1609.344
    angular = distance_meters / 6_371_008.8
    latitude = math.radians(point.latitude)
    longitude = math.radians(point.longitude)
    destination_latitude = math.asin(
        math.sin(latitude) * math.cos(angular)
        + math.cos(latitude) * math.sin(angular) * math.cos(bearing)
    )
    destination_longitude = longitude + math.atan2(
        math.sin(bearing) * math.sin(angular) * math.cos(latitude),
        math.cos(angular) - math.sin(latitude) * math.sin(destination_latitude),
    )
    return Coordinate(math.degrees(destination_latitude), math.degrees(destination_longitude))
