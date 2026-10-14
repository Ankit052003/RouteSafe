from dataclasses import dataclass
from datetime import datetime
from enum import IntEnum


METERS_PER_MILE = 1609.344


class RiskLevel(IntEnum):
    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4
    UNKNOWN = 5

    @property
    def label(self) -> str:
        return self.name.replace("_", " ").title()


@dataclass(frozen=True)
class Coordinate:
    latitude: float
    longitude: float


@dataclass(frozen=True)
class Place:
    label: str
    coordinate: Coordinate


@dataclass(frozen=True)
class RouteTimingSection:
    distance_meters: float
    duration_seconds: float


@dataclass(frozen=True)
class RouteGeometry:
    provider_id: str
    label: str
    coordinates: tuple[Coordinate, ...]
    distance_meters: float
    duration_seconds: float
    timing_sections: tuple[RouteTimingSection, ...]


@dataclass(frozen=True)
class CheckpointPosition:
    index: int
    distance_meters: float
    coordinate: Coordinate


@dataclass(frozen=True)
class WeatherReading:
    timestamp: datetime
    wind_mph: float | None
    rain_inches: float | None
    snow_inches: float | None


@dataclass(frozen=True)
class RiskAssessment:
    wind: RiskLevel
    rain: RiskLevel
    snow: RiskLevel
    overall: RiskLevel
    causes: tuple[str, ...]


@dataclass(frozen=True)
class RiskSegment:
    start_distance_meters: float
    end_distance_meters: float
    risk: RiskLevel


@dataclass(frozen=True)
class RouteSummary:
    route_id: str
    severe_miles: float
    high_miles: float
    average_risk: float | None
    travel_time_minutes: float
    no_travel_miles: float
    unknown_miles: float
