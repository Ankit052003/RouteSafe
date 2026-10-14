from typing import Any

from django.conf import settings
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response

from ..providers.errors import AnalysisUnavailableError, ProviderError
from ..providers.open_meteo import OpenMeteoProvider
from ..providers.tomtom import TomTomProvider
from ..services.analysis import RouteAnalysisService
from .serializers import RouteAnalysisRequestSerializer


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
        service = RouteAnalysisService(
            TomTomProvider(settings.TOMTOM_API_KEY, settings.TOMTOM_TIMEOUT_SECONDS),
            OpenMeteoProvider(settings.OPEN_METEO_TIMEOUT_SECONDS),
        )
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
