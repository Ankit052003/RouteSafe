from collections.abc import Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

from ..domain.models import Coordinate, WeatherReading
from .errors import ProviderError
from .http import get_json


FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MAX_COORDINATES_PER_REQUEST = 30
MAX_CONCURRENT_REQUESTS = 4


class OpenMeteoProvider:
    def __init__(self, timeout_seconds: float) -> None:
        self._timeout_seconds = timeout_seconds

    def hourly_forecasts(
        self,
        coordinates: Sequence[Coordinate],
        start_time: datetime,
        end_time: datetime,
    ) -> tuple[tuple[WeatherReading, ...], ...]:
        if start_time.utcoffset() is None or end_time.utcoffset() is None:
            raise ValueError("Forecast times must include UTC offsets")
        start_utc = start_time.astimezone(timezone.utc)
        end_utc = end_time.astimezone(timezone.utc)
        batches = tuple(
            coordinates[offset : offset + MAX_COORDINATES_PER_REQUEST]
            for offset in range(0, len(coordinates), MAX_COORDINATES_PER_REQUEST)
        )
        if not batches:
            return ()
        with ThreadPoolExecutor(max_workers=min(MAX_CONCURRENT_REQUESTS, len(batches))) as executor:
            normalized_batches = executor.map(
                lambda batch: self._fetch_batch(batch, start_utc, end_utc),
                batches,
            )
            all_series = [series for batch in normalized_batches for series in batch]
        return tuple(all_series)

    def _fetch_batch(
        self,
        coordinates: Sequence[Coordinate],
        start_time: datetime,
        end_time: datetime,
    ) -> tuple[tuple[WeatherReading, ...], ...]:
        payload = get_json(
            FORECAST_URL,
            {
                "latitude": ",".join(str(point.latitude) for point in coordinates),
                "longitude": ",".join(str(point.longitude) for point in coordinates),
                "hourly": "wind_speed_10m,rain,snowfall",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "timeformat": "unixtime",
                "timezone": "GMT",
                "start_hour": start_time.strftime("%Y-%m-%dT%H:00"),
                "end_hour": end_time.strftime("%Y-%m-%dT%H:00"),
            },
            self._timeout_seconds,
            "Open-Meteo",
        )
        responses = payload if isinstance(payload, list) else [payload]
        if len(responses) != len(coordinates):
            raise ProviderError("Open-Meteo returned an unexpected number of locations")
        return tuple(self._normalize_series(response) for response in responses)

    def _normalize_series(self, payload: dict[str, Any]) -> tuple[WeatherReading, ...]:
        try:
            hourly = payload["hourly"]
            units = payload["hourly_units"]
            expected_units = {
                "wind_speed_10m": "mp/h",
                "rain": "inch",
                "snowfall": "inch",
            }
            if any(units.get(name) != unit for name, unit in expected_units.items()):
                raise ValueError(f"Unexpected weather units: {units}")
            times = hourly["time"]
            winds = hourly["wind_speed_10m"]
            rains = hourly["rain"]
            snows = hourly["snowfall"]
            if not (len(times) == len(winds) == len(rains) == len(snows)):
                raise ValueError("Weather arrays have different lengths")
            return tuple(
                WeatherReading(
                    timestamp=datetime.fromtimestamp(float(timestamp), timezone.utc),
                    wind_mph=_optional_float(wind),
                    rain_inches=_optional_float(rain),
                    snow_inches=_optional_float(snow),
                )
                for timestamp, wind, rain, snow in zip(times, winds, rains, snows, strict=True)
            )
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderError("Open-Meteo returned an invalid hourly forecast") from error


def _optional_float(value: object) -> float | None:
    return None if value is None else float(value)
