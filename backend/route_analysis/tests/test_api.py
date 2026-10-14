from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from route_analysis.api.serializers import RouteAnalysisRequestSerializer


@pytest.mark.django_db
def test_health_endpoint_does_not_require_provider_configuration() -> None:
    response = APIClient().get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_request_rejects_naive_departure_time() -> None:
    serializer = RouteAnalysisRequestSerializer(
        data={
            "origin": "Denver, CO",
            "destination": "Salt Lake City, UT",
            "departure_time": (timezone.now() + timedelta(days=1)).replace(tzinfo=None).isoformat(),
            "departure_timezone": "America/Denver",
            "load_weight_lb": 35_000,
            "checkpoint_interval_miles": 25,
        }
    )
    assert not serializer.is_valid()
    assert "departure_time" in serializer.errors


def test_request_rejects_invalid_checkpoint_interval() -> None:
    serializer = RouteAnalysisRequestSerializer(
        data={
            "origin": "Denver, CO",
            "destination": "Salt Lake City, UT",
            "departure_time": (timezone.now() + timedelta(days=1)).isoformat(),
            "departure_timezone": "America/Denver",
            "load_weight_lb": 35_000,
            "checkpoint_interval_miles": 20,
        }
    )
    assert not serializer.is_valid()
    assert "checkpoint_interval_miles" in serializer.errors


@pytest.mark.django_db
def test_analysis_endpoint_reports_missing_provider_configuration(settings) -> None:  # type: ignore[no-untyped-def]
    settings.TOMTOM_API_KEY = ""
    response = APIClient().post(
        "/api/v1/route-analyses/",
        {
            "origin": "Denver, CO",
            "destination": "Salt Lake City, UT",
            "departure_time": (timezone.now() + timedelta(days=1)).isoformat(),
            "departure_timezone": "America/Denver",
            "load_weight_lb": 35_000,
            "checkpoint_interval_miles": 25,
        },
        format="json",
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "provider_error"
