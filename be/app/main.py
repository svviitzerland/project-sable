"""ASGI entry point. Import app.factory for side-effect-free construction."""

from .factory import create_app

app = create_app()
