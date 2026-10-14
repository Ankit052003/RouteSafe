import math

import pytest

from route_analysis.domain.models import RiskLevel
from route_analysis.domain.risk import (
    aggregate_risk_miles,
    apply_load_override,
    assess_weather,
    classify_rain,
    classify_snow,
    classify_wind,
)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0, RiskLevel.LOW),
        (24.999, RiskLevel.LOW),
        (25, RiskLevel.MODERATE),
        (35, RiskLevel.HIGH),
        (45, RiskLevel.SEVERE),
        (55, RiskLevel.NO_TRAVEL),
        (-1, RiskLevel.UNKNOWN),
        (math.nan, RiskLevel.UNKNOWN),
        (None, RiskLevel.UNKNOWN),
    ],
)
def test_classify_wind_boundaries(value: float | None, expected: RiskLevel) -> None:
    assert classify_wind(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0.099, RiskLevel.LOW),
        (0.10, RiskLevel.MODERATE),
        (0.25, RiskLevel.HIGH),
        (0.50, RiskLevel.SEVERE),
        (1.00, RiskLevel.SEVERE),
        (1.001, RiskLevel.NO_TRAVEL),
    ],
)
def test_classify_rain_boundaries(value: float, expected: RiskLevel) -> None:
    assert classify_rain(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0.499, RiskLevel.LOW),
        (0.5, RiskLevel.MODERATE),
        (1.0, RiskLevel.HIGH),
        (2.0, RiskLevel.SEVERE),
        (3.0, RiskLevel.SEVERE),
        (3.001, RiskLevel.NO_TRAVEL),
    ],
)
def test_classify_snow_boundaries(value: float, expected: RiskLevel) -> None:
    assert classify_snow(value) == expected


def test_load_override_uses_strict_30000_boundary() -> None:
    base = classify_wind(45)
    assert apply_load_override(45, 30_000, base) == RiskLevel.SEVERE
    assert apply_load_override(45, 30_001, base) == RiskLevel.NO_TRAVEL


def test_load_override_uses_strict_40000_boundary() -> None:
    base = classify_wind(35)
    assert apply_load_override(35, 40_000, base) == RiskLevel.HIGH
    assert apply_load_override(35, 40_001, base) == RiskLevel.SEVERE


def test_combined_risk_is_unknown_when_any_measurement_is_missing() -> None:
    assessment = assess_weather(20, None, 0, 20_000)
    assert assessment.overall == RiskLevel.UNKNOWN
    assert assessment.causes == ("missing forecast data",)


def test_aggregate_risk_miles_is_distance_weighted() -> None:
    distances = (0.0, 10 * 1609.344, 30 * 1609.344)
    totals, average = aggregate_risk_miles(
        distances,
        (RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH),
    )
    assert sum(totals.values()) == pytest.approx(30)
    assert totals["moderate"] == pytest.approx(10)
    assert totals["high"] == pytest.approx(20)
    assert average == pytest.approx(5 / 3)
