"""DRF serializers for the orders app."""

from rest_framework import serializers


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.CharField(max_length=40)
    quantity   = serializers.IntegerField(min_value=1, default=1)


class CheckoutSerializer(serializers.Serializer):
    items            = serializers.ListField(child=CheckoutItemSerializer(), min_length=1)
    # Address is free-form per the storefront; we just ensure it's an object.
    shipping_address = serializers.DictField(required=False, default=dict)
    coupon_code      = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")


class CouponValidateSerializer(serializers.Serializer):
    code  = serializers.CharField(max_length=40)
    total = serializers.FloatField(min_value=0)

    def validate_code(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("coupon code is required")
        return value


class CouponCreateSerializer(serializers.Serializer):
    code                = serializers.CharField(max_length=40)
    description         = serializers.CharField(max_length=300, required=False, allow_blank=True, default="")
    discount_type       = serializers.ChoiceField(choices=["percentage", "fixed"], default="percentage")
    discount_value      = serializers.FloatField(min_value=0)
    max_discount_amount = serializers.FloatField(min_value=0, required=False, allow_null=True, default=None)
    min_order_amount    = serializers.FloatField(min_value=0, required=False, default=0)
    max_uses            = serializers.IntegerField(min_value=1, required=False, allow_null=True, default=None)
    expires_at          = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def validate_code(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("code is required")
        return value

    def validate(self, attrs):
        # A percentage discount can't exceed 100%
        if attrs["discount_type"] == "percentage" and attrs["discount_value"] > 100:
            raise serializers.ValidationError("percentage discount cannot exceed 100")
        return attrs


class CouponUpdateSerializer(serializers.Serializer):
    description         = serializers.CharField(max_length=300, required=False, allow_blank=True)
    discount_type       = serializers.ChoiceField(choices=["percentage", "fixed"], required=False)
    discount_value      = serializers.FloatField(min_value=0, required=False)
    max_discount_amount = serializers.FloatField(min_value=0, required=False, allow_null=True)
    min_order_amount    = serializers.FloatField(min_value=0, required=False)
    max_uses            = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    is_active           = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("no valid fields to update")
        return attrs
