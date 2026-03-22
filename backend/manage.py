#!/usr/bin/env python
"""
Django's command-line utility.

Usage:
  python manage.py runserver        → start dev server
  python manage.py shell            → open Django shell
  python manage.py check            → validate settings
"""

import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure you have activated "
            "your virtual environment and run: pip install -r requirements.txt"
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
