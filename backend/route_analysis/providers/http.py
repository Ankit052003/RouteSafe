import logging
import time
from collections.abc import Mapping, Sequence
from typing import Any

import httpx

from .errors import ProviderError, ProviderTimeoutError


logger = logging.getLogger(__name__)


def get_json(
    url: str,
    params: Mapping[str, str | int | float | Sequence[str]],
    timeout_seconds: float,
    provider_name: str,
) -> Any:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = httpx.get(url, params=params, timeout=timeout_seconds)
            if response.status_code == 429 or response.status_code >= 500:
                response.raise_for_status()
            if response.status_code >= 400:
                logger.error(
                    "provider_request_rejected",
                    extra={
                        "provider": provider_name,
                        "status": response.status_code,
                        "response_body": response.text[:300],
                    },
                )
                raise ProviderError(
                    f"{provider_name} rejected the request with status {response.status_code}"
                )
            try:
                return response.json()
            except ValueError as error:
                logger.error(
                    "provider_invalid_json",
                    extra={
                        "provider": provider_name,
                        "status": response.status_code,
                        "response_body": response.text[:300],
                    },
                )
                raise ProviderError(f"{provider_name} returned an invalid JSON response") from error
        except httpx.TimeoutException as error:
            last_error = error
            logger.warning(
                "provider_timeout",
                extra={"provider": provider_name, "attempt": attempt + 1},
            )
        except (httpx.NetworkError, httpx.HTTPStatusError) as error:
            last_error = error
            status = error.response.status_code if isinstance(error, httpx.HTTPStatusError) else None
            logger.warning(
                "provider_transient_error",
                extra={"provider": provider_name, "attempt": attempt + 1, "status": status},
            )
        if attempt < 2:
            time.sleep(0.25 * (2**attempt))
    if isinstance(last_error, httpx.TimeoutException):
        raise ProviderTimeoutError(f"{provider_name} did not respond before the timeout") from last_error
    raise ProviderError(f"{provider_name} is temporarily unavailable") from last_error
