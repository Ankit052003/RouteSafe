from typing import Any
from collections.abc import Sequence
from datetime import datetime, timedelta, timezone

from django.conf import settings
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response

from ..domain.models import Coordinate, Place, RouteGeometry, RouteTimingSection, WeatherReading
from ..providers.errors import AnalysisUnavailableError, ProviderError
from ..providers.open_meteo import OpenMeteoProvider
from ..providers.tomtom import TomTomProvider
from ..services.analysis import RouteAnalysisService
from .serializers import RouteAnalysisRequestSerializer


class FakeRoutingProvider:
    def geocode(self, query: str) -> Place:
        coordinate = Coordinate(39.7392, -104.9903) if "Denver" in query else Coordinate(40.7608, -111.8910)
        return Place(query, coordinate)

    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure_time: datetime,
    ) -> tuple[RouteGeometry, ...]:
        return tuple(
            RouteGeometry(
                provider_id=f"provider-{index}",
                label=f"Alternative {index + 1}",
                coordinates=(
                    origin,
                    Coordinate(40.0 + index * 0.08, -108.0 + index * 0.12),
                    destination,
                ),
                distance_meters=(500 + index * 10) * 1609.344,
                duration_seconds=(500 + index * 20) * 60,
                timing_sections=(
                    RouteTimingSection(
                        distance_meters=(500 + index * 10) * 1609.344,
                        duration_seconds=(500 + index * 20) * 60,
                    ),
                ),
            )
            for index in range(3)
        )


class FakeWeatherProvider:
    def hourly_forecasts(
        self,
        coordinates: Sequence[Coordinate],
        start_time: datetime,
        end_time: datetime,
    ) -> tuple[tuple[WeatherReading, ...], ...]:
        hour = start_time.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)
        series = tuple(
            WeatherReading(hour + timedelta(hours=index), 20.0, 0.0, 0.0)
            for index in range(72)
        )
        return tuple(series for _ in coordinates)


@api_view(["GET"])
@throttle_classes([])
def health(_: Request) -> Response:
    return Response({"status": "ok", "service": "routesafe-api"})


@api_view(["POST"])
def create_route_analysis(request: Request) -> Response:
    serializer = RouteAnalysisRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    values: dict[str, Any] = serializer.validated_data

    try:
        if settings.DEBUG:
            routing = FakeRoutingProvider()
            weather = FakeWeatherProvider()
        else:
            routing = TomTomProvider(settings.TOMTOM_API_KEY, settings.TOMTOM_TIMEOUT_SECONDS)
            weather = OpenMeteoProvider(settings.OPEN_METEO_TIMEOUT_SECONDS)

        service = RouteAnalysisService(routing, weather)
        result = service.analyze(
            origin_query=values["origin"],
            destination_query=values["destination"],
            departure_time=values["departure_time"],
            departure_timezone=values["departure_timezone"],
            load_weight_lb=values["load_weight_lb"],
            checkpoint_interval_miles=int(values["checkpoint_interval_miles"]),
        )
    except (AnalysisUnavailableError, ProviderError) as error:
        status_code = getattr(error, "status_code", 502)
        return Response(
            {"error": {"code": _provider_code(status_code), "message": str(error)}},
            status=status_code,
        )
    return Response(result, status=201)


def _provider_code(status_code: int) -> str:
    return {422: "analysis_unavailable", 504: "provider_timeout"}.get(status_code, "provider_error")
