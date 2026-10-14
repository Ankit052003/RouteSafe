from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from .domain.models import Coordinate, Place, RouteGeometry, WeatherReading


class RoutingProvider(Protocol):
    def geocode(self, query: str) -> Place: ...

    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure_time: datetime,
    ) -> tuple[RouteGeometry, ...]: ...


class WeatherProvider(Protocol):
    def hourly_forecasts(
        self,
        coordinates: Sequence[Coordinate],
        start_time: datetime,
        end_time: datetime,
    ) -> tuple[tuple[WeatherReading, ...], ...]: ...
