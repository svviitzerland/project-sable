from starlette.exceptions import HTTPException


class RequestSizeLimit:
    """Bound streamed bodies too, before multipart parsing can consume them."""

    def __init__(self, app, limit):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        size = 0

        async def bounded_receive():
            nonlocal size
            message = await receive()
            if message["type"] == "http.request":
                size += len(message.get("body", b""))
                if size > self.limit:
                    raise HTTPException(
                        413, "Request is too large. Files must be at most 6 MB."
                    )
            return message

        await self.app(scope, bounded_receive, send)
