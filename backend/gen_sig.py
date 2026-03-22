import hmac
import hashlib
import os
from dotenv import load_dotenv

load_dotenv()

secret     = os.getenv("RAZORPAY_KEY_SECRET")
order_id   = "order_STNrKXyAg4HXUN"
payment_id = "pay_test_123456789"

signature = hmac.new(
    secret.encode(),
    f"{order_id}|{payment_id}".encode(),
    hashlib.sha256
).hexdigest()

print("signature:", signature)