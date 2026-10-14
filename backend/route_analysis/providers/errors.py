class ProviderError(RuntimeError):
    status_code = 502


class ProviderTimeoutError(ProviderError):
    status_code = 504


class AnalysisUnavailableError(RuntimeError):
    status_code = 422
