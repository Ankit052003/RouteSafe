from datetime import datetime
from typing import Any
from urllib.parse import quote

from ..domain.models import Coordinate, Place, RouteGeometry, RouteTimingSection
from .errors import AnalysisUnavailableError, ProviderError
from .http import get_json


GEOCODE_URL_TEMPLATE = "https://api.tomtom.com/search/2/geocode/{query}.json"
ROUTES_URL_TEMPLATE = "https://api.tomtom.com/routing/1/calculateRoute/{locations}/json"


class TomTomProvider:
    def __init__(self, api_key: str, timeout_seconds: float) -> None:
        if not api_key:
            raise ProviderError("TOMTOM_API_KEY is not configured on the server")
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def geocode(self, query: str) -> Place:
        payload = get_json(
            GEOCODE_URL_TEMPLATE.format(query=quote(query, safe="")),
            {"key": self._api_key, "limit": 1},
            self._timeout_seconds,
            "TomTom Geocoding",
        )
        results = payload.get("results", [])
        if not results:
            raise AnalysisUnavailableError(f"No geocoding match was found for '{query}'")
        result = results[0]
        position = result.get("position", {})
        address = result.get("address", {})
        try:
            return Place(
                label=str(address.get("freeformAddress") or query),
                coordinate=Coordinate(float(position["lat"]), float(position["lon"])),
            )
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderError("TomTom returned an invalid geocoding response") from error

    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure_time: datetime,
    ) -> tuple[RouteGeometry, ...]:
        locations = (
            f"{origin.latitude},{origin.longitude}:"
            f"{destination.latitude},{destination.longitude}"
        )
        payload = get_json(
            ROUTES_URL_TEMPLATE.format(locations=locations),
            {
                "key": self._api_key,
                "routeType": "fastest",
                "traffic": "true",
                "travelMode": "truck",
                "vehicleCommercial": "true",
                "maxAlternatives": 2,
                "routeRepresentation": "polyline",
                "extendedRouteRepresentation": ("distance", "travelTime"),
                "departAt": departure_time.isoformat(timespec="seconds"),
            },
            self._timeout_seconds,
            "TomTom Routing",
        )
        routes = tuple(
            self._normalize_route(item, index)
            for index, item in enumerate(payload.get("routes", []))
        )
        distinct: list[RouteGeometry] = []
        signatures: set[tuple[tuple[float, float], ...]] = set()
        for route in routes:
            sample = route.coordinates[:: max(1, len(route.coordinates) // 20)]
            signature = tuple(
                (round(point.latitude, 4), round(point.longitude, 4)) for point in sample
            )
            if signature not in signatures:
                signatures.add(signature)
                distinct.append(route)
        if len(distinct) != 3:
            raise AnalysisUnavailableError(
                f"TomTom returned {len(distinct)} distinct truck routes; "
                "three are required for comparison"
            )
        return tuple(distinct)

    def _normalize_route(self, item: dict[str, Any], index: int) -> RouteGeometry:
        legs = item.get("legs", [])
        if not legs:
            raise ProviderError("TomTom returned a route without legs")
        coordinates: list[Coordinate] = []
        try:
            summary = item["summary"]
            for leg in legs:
                points = [
                    Coordinate(float(point["latitude"]), float(point["longitude"]))
                    for point in leg["points"]
                ]
                if coordinates and points and coordinates[-1] == points[0]:
                    points = points[1:]
                coordinates.extend(points)
            if len(coordinates) < 2:
                raise ValueError("route geometry contains fewer than two points")
            distance = float(summary["lengthInMeters"])
            duration = float(summary["travelTimeInSeconds"])
            timing_sections = _timing_sections(item["progress"], distance, duration)
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderError("TomTom returned an invalid route response") from error
        label = "Fastest truck route" if index == 0 else f"Truck alternative {index}"
        return RouteGeometry(
            provider_id=f"tomtom-route-{index + 1}",
            label=label,
            coordinates=tuple(coordinates),
            distance_meters=distance,
            duration_seconds=duration,
            timing_sections=tuple(timing_sections),
        )


def _timing_sections(
    progress: list[dict[str, Any]],
    route_distance_meters: float,
    route_duration_seconds: float,
) -> tuple[RouteTimingSection, ...]:
    if len(progress) < 2:
        raise ValueError("route progress requires at least two points")
    distances = [float(point["distanceInMeters"]) for point in progress]
    durations = [float(point["travelTimeInSeconds"]) for point in progress]
    if distances[0] != 0 or durations[0] != 0:
        raise ValueError("route progress must begin at zero")
    if abs(distances[-1] - route_distance_meters) > 1:
        raise ValueError("route progress distance does not match the route summary")
    if abs(durations[-1] - route_duration_seconds) > 1:
        raise ValueError("route progress duration does not match the route summary")
    sections = []
    for start_distance, end_distance, start_duration, end_duration in zip(
        distances[:-1],
        distances[1:],
        durations[:-1],
        durations[1:],
        strict=True,
    ):
        distance_delta = end_distance - start_distance
        duration_delta = end_duration - start_duration
        if distance_delta <= 0 or duration_delta <= 0:
            raise ValueError("route progress must increase monotonically")
        sections.append(RouteTimingSection(distance_delta, duration_delta))
    return tuple(sections)
