"""DRF serializers for the vendors app."""

from rest_framework import serializers


class VendorOnboardSerializer(serializers.Serializer):
    store_name  = serializers.CharField(max_length=120, trim_whitespace=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    phone       = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")

    def validate_store_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("store_name is required")
        return value


class VendorUpdateSerializer(serializers.Serializer):
    store_name  = serializers.CharField(max_length=120, required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    phone       = serializers.CharField(max_length=20, required=False, allow_blank=True)
    logo_url    = serializers.URLField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("no valid fields to update")
        return attrs
