import math
from collections.abc import Callable, Sequence

from .models import METERS_PER_MILE, RiskAssessment, RiskLevel, RiskSegment


ThresholdClassifier = Callable[[float | None], RiskLevel]


def _valid(value: float | None) -> bool:
    return value is not None and math.isfinite(value) and value >= 0


def classify_wind(value: float | None) -> RiskLevel:
    if not _valid(value):
        return RiskLevel.UNKNOWN
    assert value is not None
    if value < 25:
        return RiskLevel.LOW
    if value < 35:
        return RiskLevel.MODERATE
    if value < 45:
        return RiskLevel.HIGH
    if value < 55:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_rain(value: float | None) -> RiskLevel:
    if not _valid(value):
        return RiskLevel.UNKNOWN
    assert value is not None
    if value < 0.10:
        return RiskLevel.LOW
    if value < 0.25:
        return RiskLevel.MODERATE
    if value < 0.50:
        return RiskLevel.HIGH
    if value <= 1.00:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def classify_snow(value: float | None) -> RiskLevel:
    if not _valid(value):
        return RiskLevel.UNKNOWN
    assert value is not None
    if value < 0.5:
        return RiskLevel.LOW
    if value < 1.0:
        return RiskLevel.MODERATE
    if value < 2.0:
        return RiskLevel.HIGH
    if value <= 3.0:
        return RiskLevel.SEVERE
    return RiskLevel.NO_TRAVEL


def apply_load_override(
    wind_mph: float | None,
    load_weight_lb: float,
    base_risk: RiskLevel,
) -> RiskLevel:
    if not _valid(wind_mph):
        return RiskLevel.UNKNOWN
    assert wind_mph is not None
    override = base_risk
    if wind_mph >= 55 or (wind_mph >= 45 and load_weight_lb > 30_000):
        override = RiskLevel.NO_TRAVEL
    elif wind_mph >= 35 and load_weight_lb > 40_000:
        override = RiskLevel.SEVERE
    return max(base_risk, override)


def assess_weather(
    wind_mph: float | None,
    rain_inches: float | None,
    snow_inches: float | None,
    load_weight_lb: float,
) -> RiskAssessment:
    wind = apply_load_override(wind_mph, load_weight_lb, classify_wind(wind_mph))
    rain = classify_rain(rain_inches)
    snow = classify_snow(snow_inches)
    components = {"wind": wind, "rain": rain, "snow": snow}
    if RiskLevel.UNKNOWN in components.values():
        return RiskAssessment(wind, rain, snow, RiskLevel.UNKNOWN, ("missing forecast data",))
    overall = max(components.values())
    causes = tuple(name for name, level in components.items() if level == overall)
    return RiskAssessment(wind, rain, snow, overall, causes)


def aggregate_risk_miles(
    distances_meters: Sequence[float],
    risks: Sequence[RiskLevel],
) -> tuple[dict[str, float], float | None]:
    segments = build_risk_segments(distances_meters, risks)
    totals = {level.label.lower().replace(" ", "_"): 0.0 for level in RiskLevel}
    weighted_score = 0.0
    numeric_miles = 0.0
    for segment in segments:
        segment_miles = (
            segment.end_distance_meters - segment.start_distance_meters
        ) / METERS_PER_MILE
        key = segment.risk.label.lower().replace(" ", "_")
        totals[key] += segment_miles
        if segment.risk != RiskLevel.UNKNOWN:
            weighted_score += float(segment.risk) * segment_miles
            numeric_miles += segment_miles
    average = weighted_score / numeric_miles if numeric_miles else None
    return totals, average


def build_risk_segments(
    distances_meters: Sequence[float],
    risks: Sequence[RiskLevel],
) -> tuple[RiskSegment, ...]:
    if len(distances_meters) != len(risks) or len(risks) < 2:
        raise ValueError("Risk aggregation requires matching checkpoint distances and risks")
    segments: list[RiskSegment] = []
    for index in range(1, len(risks)):
        start_distance = distances_meters[index - 1]
        end_distance = distances_meters[index]
        if end_distance < start_distance:
            raise ValueError("Checkpoint distances must be monotonic")
        endpoints = (risks[index - 1], risks[index])
        segment_risk = RiskLevel.UNKNOWN if RiskLevel.UNKNOWN in endpoints else max(endpoints)
        segments.append(RiskSegment(start_distance, end_distance, segment_risk))
    return tuple(segments)
