from bisect import bisect_left
from datetime import datetime
from collections.abc import Sequence

from .models import WeatherReading


def reading_at_eta(series: Sequence[WeatherReading], eta: datetime) -> WeatherReading:
    if not series:
        return WeatherReading(eta, None, None, None)
    timestamps = [reading.timestamp for reading in series]
    index = bisect_left(timestamps, eta)
    if index == 0:
        current = series[0]
        return WeatherReading(eta, current.wind_mph, current.rain_inches, current.snow_inches)
    if index >= len(series):
        return WeatherReading(eta, None, None, None)
    before, after = series[index - 1], series[index]
    interval = (after.timestamp - before.timestamp).total_seconds()
    elapsed = (eta - before.timestamp).total_seconds()
    wind = _interpolate(before.wind_mph, after.wind_mph, elapsed / interval if interval else 0.0)
    # Rain and snowfall are preceding-hour accumulations. The next timestamp closes
    # the accumulation bucket containing an ETA between hourly boundaries.
    return WeatherReading(eta, wind, after.rain_inches, after.snow_inches)


def _interpolate(start: float | None, end: float | None, fraction: float) -> float | None:
    if start is None or end is None:
        return None
    return start + (end - start) * fraction
