from datetime import datetime, timedelta, timezone

import pytest

from route_analysis.domain.models import WeatherReading
from route_analysis.domain.weather import reading_at_eta


def test_eta_interpolates_wind_and_uses_containing_accumulation_bucket() -> None:
    start = datetime(2026, 10, 15, 8, tzinfo=timezone.utc)
    series = (
        WeatherReading(start, 10, 0.1, 0.2),
        WeatherReading(start + timedelta(hours=1), 20, 0.3, 0.4),
    )
    result = reading_at_eta(series, start + timedelta(minutes=30))
    assert result.wind_mph == pytest.approx(15)
    assert result.rain_inches == pytest.approx(0.3)
    assert result.snow_inches == pytest.approx(0.4)
