from typing import Any

from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None
    detail = response.data
    response.data = {
        "error": {
            "code": _code_for_status(response.status_code),
            "message": "The request could not be completed.",
            "details": detail,
        }
    }
    return response


def _code_for_status(status_code: int) -> str:
    return {
        400: "invalid_request",
        404: "not_found",
        429: "rate_limit_exceeded",
        502: "provider_error",
        504: "provider_timeout",
    }.get(status_code, "request_failed")
