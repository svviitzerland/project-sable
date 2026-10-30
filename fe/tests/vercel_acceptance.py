"""Hosted transport checks against the documented local acceptance fixture.

Build with NEXT_PUBLIC_API_WS_URL and NEXT_PUBLIC_HOSTED_UPLOADS=1. Audio
uses a mocked Speechmatics-facing socket; it does not validate a live provider.
"""

import io
import json
import os
import re
import zipfile
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv("JUDE_TEST_URL", "http://127.0.0.1:3012")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.getenv("CHROMIUM_EXECUTABLE"),
        args=[
            "--no-sandbox",
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
        ],
    )
    context = browser.new_context(permissions=["microphone"])
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    socket_urls = []
    page.on("websocket", lambda ws: socket_urls.append(ws.url))
    page.on("pageerror", lambda e: errors.append(str(e)))
    tickets = []
    page.on(
        "request",
        lambda req: (
            tickets.append(req.url) if req.url.endswith("/socket-ticket") else None
        ),
    )

    def capabilities(route):
        response = route.fetch()
        data = response.json()
        data["speech"]["configured"] = True
        route.fulfill(response=response, json=data)

    page.route("**/api/v1/capabilities", capabilities)
    connections = []
    stops = []
    binary = []

    def socket(ws):
        index = len(connections)
        connections.append(ws.url)

        def message(data):
            if isinstance(data, bytes):
                binary.append((index, len(data)))
                return
            body = json.loads(data)
            if "sample_rate" in body:
                # Accelerate only the first rotation; the second stays open
                # long enough to verify a manual stop and final-buffer flush.
                ws.send(
                    json.dumps(
                        {
                            "type": "ready",
                            "rotate_after": 0.3 if index == 0 else 0,
                            "start_offset": body.get("start_offset", 0),
                        }
                    )
                )
            elif body.get("type") == "stop":
                stops.append(index)
                ws.send(json.dumps({"type": "stopped"}))
                ws.close()

        ws.on_message(message)

    page.route_web_socket(re.compile(r"/audio(?:\?|$)"), socket)
    page.goto(BASE + "/workspace")
    page.get_by_role("button", name="Create an account").click()
    page.get_by_label("Your name").fill("Hosted acceptance")
    page.get_by_label("Email address").fill(f"vercel-{uuid4()}@example.invalid")
    page.get_by_label("Password").fill("test-password-12345")
    page.get_by_role("button", name="Create account", exact=True).click()
    page.get_by_role("button", name="New case", exact=True).click()
    page.get_by_label("Case title").fill("Vercel transport case")
    page.get_by_role("button", name="Create case", exact=True).click()
    page.get_by_role("tab", name="Case documents", exact=False).click()
    # A DOCX with a small text body and a large irrelevant media part stays
    # inside the document extraction limits while crossing Vercel's envelope.
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as z:
        z.writestr(
            "word/document.xml",
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>The hosted witness arrived at eight.</w:t></w:r></w:p></w:body></w:document>',
        )
        z.writestr("word/media/padding.bin", b"x" * (4 * 1024 * 1024))
    parts = []
    page.on(
        "request",
        lambda req: (
            parts.append(req.post_data_buffer) if "/parts/" in req.url else None
        ),
    )
    page.locator('input[type="file"]').last.set_input_files(
        {
            "name": "large-source.docx",
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "buffer": archive.getvalue(),
        }
    )
    expect(page.get_by_text("large-source.docx", exact=True).first).to_be_visible()
    assert len(parts) == 3 and all(len(part) <= 2 * 1024 * 1024 for part in parts)
    assert tickets, "The direct event connection must obtain an authenticated ticket."
    page.get_by_role("tab", name="Hearings", exact=True).click()
    page.get_by_role("button", name="New hearing", exact=True).click()
    page.get_by_label("Hearing title", exact=True).fill("Live rehearsal")
    page.get_by_role("button", name="Create hearing", exact=True).click()

    page.get_by_label("I am authorized to process this audio", exact=False).check()
    page.get_by_role("button", name="Start microphone", exact=True).click()
    for _ in range(40):
        if len(connections) >= 2 and any(index == 1 for index, _ in binary):
            break
        page.wait_for_timeout(200)
    assert len(connections) == 2, (
        connections,
        socket_urls,
        errors,
        page.locator("body").inner_text()[-1800:],
    )
    assert stops == [0]
    assert any(index == 0 for index, _ in binary) and any(
        index == 1 for index, _ in binary
    )
    page.get_by_role("button", name="Stop", exact=False).click()
    expect(
        page.get_by_role("button", name="Start microphone", exact=True)
    ).to_be_visible()
    assert stops == [0, 1]
    assert len(set(connections)) == 2, (
        "Each audio connection needs a fresh one-use ticket."
    )
    assert not errors, errors
    print(
        "PASS: direct event tickets, 4 MB chunked upload, mocked audio rotation with fresh tickets and final stop; no page errors."
    )
    browser.close()
