"""
WSGI entrypoint.

This is what Railway (or any server) uses to run the Django app
in production. You don't need to touch this file.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
