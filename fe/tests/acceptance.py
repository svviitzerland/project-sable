"""Run against a local Jude preview; creates synthetic data in a new test account."""

import os
from pathlib import Path
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv("JUDE_TEST_URL", "http://127.0.0.1:3000")
ARTIFACTS = Path(__file__).resolve().parents[2] / ".impeccable/review"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.getenv("CHROMIUM_EXECUTABLE"), args=["--no-sandbox"]
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    email = f"acceptance-{uuid4()}@example.invalid"
    page.goto(BASE + "/workspace")
    page.get_by_role("button", name="Create an account").click()
    page.get_by_label("Your name").fill("Acceptance counsel")
    page.get_by_label("Email address").fill(email)
    page.get_by_label("Password").fill("test-password-12345")
    page.get_by_role("button", name="Create account", exact=True).click()
    page.get_by_role("button", name="Try a synthetic hearing").click()
    page.get_by_role("button", name="Start simulated hearing").click()
    page.get_by_role("button", name="Simulation complete").wait_for(timeout=40000)
    expect(page.get_by_text("Updates connected", exact=True)).to_be_visible()
    for label in [
        "Supported",
        "Potential inconsistency",
        "Context needed",
        "Insufficient evidence",
    ]:
        expect(
            page.get_by_label("Filter findings").locator("option", has_text=label)
        ).to_have_count(1)
    # Draft survives selecting another finding; saved review survives a reload.
    page.get_by_label("Your review note").fill(
        "Verify the date against the original log."
    )
    page.get_by_role("button", name="Supported Both accounts").click()
    page.get_by_role("button", name="Potential inconsistency The accounts").click()
    expect(page.get_by_label("Your review note")).to_have_value(
        "Verify the date against the original log."
    )
    page.get_by_role("button", name="Mark reviewed", exact=True).click()
    expect(page.get_by_text("Reviewed by you · saved to the case")).to_be_visible()
    page.reload()
    expect(page.get_by_label("Your review note")).to_have_value(
        "Verify the date against the original log."
    )
    page.get_by_label("Filter findings").select_option("unreviewed")
    expect(
        page.get_by_role("button", name="Potential inconsistency The accounts")
    ).to_have_count(0)
    page.get_by_label("Filter findings").select_option("all")
    # A clipboard error must not replace the evidence.
    page.evaluate(
        "Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(new Error('Denied'))}, configurable: true})"
    )
    page.get_by_role("button", name="Copy question").click()
    expect(page.get_by_text("Clipboard unavailable.", exact=False)).to_be_visible()
    expect(page.get_by_role("link", name="Download original")).to_be_visible()
    page.get_by_role("tab", name="Case documents").click()
    page.locator("input[type=file]").set_input_files(
        {
            "name": "acceptance.txt",
            "mimeType": "text/plain",
            "buffer": b"First page\fThe jade receipt was signed at the warehouse.",
        }
    )
    expect(page.get_by_role("button", name="acceptance.txt")).to_be_visible()
    page.get_by_label("Search case evidence").fill("jade receipt")
    page.get_by_role("button", name="Search", exact=True).click()
    expect(page.get_by_text("Page 2", exact=True)).to_be_visible()
    with page.expect_download() as download:
        page.get_by_role("link", name="Download original").click()
    assert (
        Path(download.value.path()).read_bytes()
        == b"First page\fThe jade receipt was signed at the warehouse."
    )
    with page.expect_download() as export:
        page.get_by_role("link", name="Export record").click()
    import json

    record = json.loads(Path(export.value.path()).read_text())
    assert len(record["segments"]) == 8 and len(record["findings"]) == 4
    assert any(
        f["note"] == "Verify the date against the original log."
        for f in record["findings"]
    )
    page.get_by_role("tab", name="Legal references").click()
    expect(page.get_by_role("button", name="Search Pasal.id")).to_be_disabled()
    page.get_by_role("button", name="New case", exact=True).click()
    page.get_by_label("Case title").fill("Acceptance isolated case")
    page.get_by_role("button", name="Create case", exact=True).click()
    page.get_by_role("tab", name="Hearing", exact=True).click()
    page.get_by_role("button", name="Add transcript text").click()
    page.get_by_label("Finalized statement").fill(
        "The witness arrived at ten in the morning."
    )
    page.get_by_role("button", name="Save & examine").click()
    expect(
        page.get_by_text("AI analysis is not connected.", exact=False)
    ).to_be_visible()
    page.get_by_role("tab", name="Case documents").click()
    expect(page.get_by_text("0 documents", exact=True)).to_be_visible()
    page.get_by_role("button", name="Sign out", exact=True).click()
    page.get_by_label("Email address").fill(email)
    page.get_by_label("Password").fill("test-password-12345")
    page.get_by_role("button", name="Sign in", exact=True).click()
    page.get_by_role("button", name="The warehouse hearing Synthetic exercise").click()
    page.get_by_role("tab", name="Hearing", exact=True).focus()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("tab", name="Case documents")).to_be_focused()
    page.keyboard.press("Home")
    expect(page.get_by_role("tab", name="Hearing", exact=True)).to_be_focused()
    expect(page.get_by_text("Updates connected", exact=True)).to_be_visible()
    page.screenshot(path=str(ARTIFACTS / "workspace-desktop.png"), full_page=True)
    for width in [1024, 390]:
        page.set_viewport_size({"width": width, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    # Closed mobile drawer is hidden; open traps focus and Escape restores it.
    expect(page.get_by_role("button", name="New case", exact=True)).to_be_hidden()
    page.get_by_role("button", name="Open case navigation").click()
    expect(page.get_by_role("button", name="Close case navigation")).to_be_focused()
    page.keyboard.press("Escape")
    expect(page.get_by_role("button", name="Open case navigation")).to_be_focused()
    page.get_by_role("button", name="Supported Both accounts").click()
    expect(
        page.get_by_role("region", name="Finding and source inspector")
    ).to_be_focused()
    page.get_by_role("button", name="Back to findings").click()
    expect(page.get_by_role("button", name="Supported Both accounts")).to_be_focused()
    page.evaluate("window.scrollTo(0,0)")
    page.screenshot(path=str(ARTIFACTS / "workspace-mobile.png"), full_page=True)
    assert not errors, errors
    print(
        "PASS: registration, simulation, four statuses, notes, review, filter, clipboard failure, upload, search, original download, export, isolation, offline analysis, login, tabs, mobile navigation, inspector focus, responsive layouts; no page errors."
    )
    browser.close()
