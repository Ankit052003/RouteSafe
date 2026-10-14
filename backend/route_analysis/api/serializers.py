from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone
from rest_framework import serializers


class ExplicitOffsetDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):  # type: ignore[no-untyped-def]
        if isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                parsed = None
            if parsed is not None and parsed.utcoffset() is None:
                raise serializers.ValidationError("Include an explicit UTC offset.")
        return super().to_internal_value(value)


class RouteAnalysisRequestSerializer(serializers.Serializer):
    origin = serializers.CharField(min_length=2, max_length=200, trim_whitespace=True)
    destination = serializers.CharField(min_length=2, max_length=200, trim_whitespace=True)
    departure_time = ExplicitOffsetDateTimeField()
    departure_timezone = serializers.CharField(max_length=100)
    load_weight_lb = serializers.FloatField(min_value=0, max_value=200_000)
    checkpoint_interval_miles = serializers.ChoiceField(choices=(10, 25, 50))

    def validate_departure_time(self, value):  # type: ignore[no-untyped-def]
        if value.utcoffset() is None:
            raise serializers.ValidationError("Include an explicit UTC offset in departure_time.")
        now = timezone.now()
        if value < now:
            raise serializers.ValidationError("Departure time cannot be in the past.")
        if value > now + timedelta(days=13):
            raise serializers.ValidationError(
                "Departure must be within 13 days so the full 48-hour forecast is available."
            )
        return value

    def validate_departure_timezone(self, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise serializers.ValidationError("Use a valid IANA time-zone name.") from error
        return value

    def validate(self, attrs):  # type: ignore[no-untyped-def]
        if attrs["origin"].casefold() == attrs["destination"].casefold():
            raise serializers.ValidationError("Origin and destination must be different.")
        return attrs
