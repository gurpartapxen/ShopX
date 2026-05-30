"""DRF serializers for the products app."""

from rest_framework import serializers


class ProductCreateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=200, trim_whitespace=True)
    price       = serializers.FloatField(min_value=0)
    category    = serializers.CharField(max_length=80, trim_whitespace=True)
    description = serializers.CharField(max_length=5000, required=False, allow_blank=True, default="")
    discount    = serializers.IntegerField(min_value=0, max_value=90, required=False, default=0)
    images      = serializers.ListField(
        child=serializers.URLField(), required=False, default=list, max_length=10)
    tags        = serializers.ListField(
        child=serializers.CharField(max_length=40), required=False, default=list, max_length=20)
    quantity    = serializers.IntegerField(min_value=0, required=False, default=0)


class ProductUpdateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=200, required=False)
    price       = serializers.FloatField(min_value=0, required=False)
    category    = serializers.CharField(max_length=80, required=False)
    description = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    discount    = serializers.IntegerField(min_value=0, max_value=90, required=False)
    images      = serializers.ListField(child=serializers.URLField(), required=False, max_length=10)
    tags        = serializers.ListField(child=serializers.CharField(max_length=40), required=False, max_length=20)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("no valid fields to update")
        return attrs


class InventorySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)


class ReviewSerializer(serializers.Serializer):
    rating  = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
