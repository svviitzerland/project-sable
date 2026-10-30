"""Run against a local Jude preview; creates synthetic data in a new test account."""

import os
import json
import zipfile
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
    page.set_default_timeout(12000)
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
    page.get_by_role("tab", name="Hearings", exact=True).click()
    page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)")
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(
        path=str(ARTIFACTS / "hearings-desktop.png"),
        full_page=True,
        animations="disabled",
    )
    page.get_by_role("button", name="The warehouse examination", exact=False).click()
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
    page.get_by_role("button", name="The accounts").click()
    page.get_by_label("Your review note").fill(
        "Verify the date against the original log."
    )
    page.get_by_role("button", name="Supported Both accounts").click()
    page.get_by_role("button", name="The accounts").click()
    expect(page.get_by_label("Your review note")).to_have_value(
        "Verify the date against the original log."
    )
    page.get_by_role("button", name="Mark reviewed", exact=True).click()
    expect(page.get_by_text("Reviewed by you · saved to the case")).to_be_visible()
    page.reload()
    page.get_by_role("tab", name="Hearings", exact=True).click()
    page.get_by_role("button", name="The warehouse examination", exact=False).click()
    page.get_by_role("button", name="The accounts").click()
    expect(page.get_by_label("Your review note")).to_have_value(
        "Verify the date against the original log."
    )
    page.get_by_label("Filter findings").select_option("unreviewed")
    expect(page.get_by_role("button", name="The accounts")).to_have_count(0)
    page.get_by_label("Filter findings").select_option("all")
    # A clipboard error must not replace the evidence.
    page.evaluate(
        "Object.defineProperty(navigator, 'clipboard', {value: {writeText: () => Promise.reject(new Error('Denied'))}, configurable: true})"
    )
    page.get_by_role("button", name="Copy question").click()
    expect(page.get_by_text("Clipboard unavailable.", exact=False)).to_be_visible()
    expect(page.get_by_role("link", name="Download original")).to_be_visible()
    page.get_by_role("tab", name="Case documents").click()
    page.get_by_role("tabpanel").locator("input[type=file]").set_input_files(
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
        page.get_by_role("link", name="Export .jude").click()
    archive_path = Path(export.value.path())
    with zipfile.ZipFile(archive_path) as archive:
        record = json.loads(archive.read("manifest.json"))
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
    page.get_by_role("tab", name="Hearings", exact=True).click()
    page.get_by_role("button", name="New hearing", exact=True).click()
    page.get_by_label("Hearing title", exact=True).fill("Witness examination")
    page.get_by_role("button", name="Create hearing", exact=True).click()
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
    page.get_by_role("tab", name="Hearings", exact=True).focus()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("tab", name="Case documents")).to_be_focused()
    page.keyboard.press("Home")
    expect(page.get_by_role("tab", name="Evidence", exact=True)).to_be_focused()
    page.get_by_role("button", name="Find connections", exact=True).click()
    page.get_by_text("Suggested links are ready", exact=False).wait_for()
    page.get_by_label("Ask about this case").fill("jade receipt")
    page.get_by_role("button", name="Search evidence", exact=True).click()
    expect(page.get_by_role("heading", name="Relevant passages")).to_be_visible()
    page.get_by_role("button", name="Close search results").click()
    page.get_by_role("button", name="Connections", exact=True).click()
    page.get_by_role("button", name="related", exact=False).first.click()
    page.get_by_role("button", name="Confirm connection", exact=True).click()
    expect(
        page.get_by_role("button", name="Reopen connection", exact=True)
    ).to_be_visible()
    expect(
        page.get_by_role("button", name="Find connections", exact=True)
    ).to_be_enabled()
    page.get_by_role("button", name="Evidence map", exact=True).click()
    page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)")
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(
        path=str(ARTIFACTS / "workspace-desktop.png"),
        full_page=True,
        animations="disabled",
    )
    for width in [1024, 390]:
        page.set_viewport_size({"width": width, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    # Closed mobile drawer is hidden; open traps focus and Escape restores it.
    expect(page.get_by_role("button", name="New case", exact=True)).to_be_hidden()
    page.get_by_role("button", name="Open case navigation").click()
    expect(page.get_by_role("button", name="Close case navigation")).to_be_focused()
    page.keyboard.press("Escape")
    expect(page.get_by_role("button", name="Open case navigation")).to_be_focused()
    page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)")
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(
        path=str(ARTIFACTS / "evidence-mobile.png"),
        full_page=True,
        animations="disabled",
    )
    page.get_by_role("tab", name="Hearings", exact=True).click()
    page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)")
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(
        path=str(ARTIFACTS / "hearings-mobile.png"),
        full_page=True,
        animations="disabled",
    )
    page.get_by_role("button", name="The warehouse examination", exact=False).click()
    page.get_by_role("button", name="Supported Both accounts").click()
    expect(
        page.get_by_role("region", name="Finding and source inspector")
    ).to_be_focused()
    page.get_by_role("button", name="Back to findings").click()
    expect(page.get_by_role("button", name="Supported Both accounts")).to_be_focused()
    page.evaluate("window.scrollTo(0,0)")
    page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)")
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(
        path=str(ARTIFACTS / "workspace-mobile.png"),
        full_page=True,
        animations="disabled",
    )
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.get_by_role("button", name="All hearings", exact=True).click()
    page.get_by_label("Upload hearing transcript").set_input_files(
        {
            "name": "witness.txt",
            "mimeType": "text/plain",
            "buffer": b"Counsel: When did you arrive?\nWitness: I arrived at eight in the morning.",
        }
    )
    expect(page.get_by_label("Statement 2", exact=True)).to_have_value(
        "I arrived at eight in the morning."
    )
    page.get_by_label("Imported hearing title").fill("Uploaded witness examination")
    page.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)")
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.screenshot(
        path=str(ARTIFACTS / "hearing-import-desktop.png"),
        full_page=True,
        animations="disabled",
    )
    page.get_by_role("button", name="Confirm & import hearing").click()
    expect(
        page.get_by_role("heading", name="Uploaded witness examination", exact=True)
    ).to_be_visible()
    expect(
        page.get_by_text("I arrived at eight in the morning.", exact=True)
    ).to_be_visible()
    expect(
        page.get_by_role("button", name="Analyze hearing", exact=True)
    ).to_be_disabled()
    page.get_by_role("button", name="All hearings", exact=True).click()
    page.get_by_label("Upload hearing transcript").set_input_files(
        {
            "name": "notes.txt",
            "mimeType": "text/plain",
            "buffer": b"The witness says she arrived at eight in the morning.",
        }
    )
    expect(page.get_by_role("button", name="Convert with AI")).to_be_disabled()
    page.get_by_role("button", name="Close import preview").click()
    page.get_by_label("Import .jude", exact=True).set_input_files(
        {
            "name": "roundtrip.jude",
            "mimeType": "application/vnd.jude+zip",
            "buffer": archive_path.read_bytes(),
        }
    )
    expect(page.get_by_role("heading", name="Follow the evidence.")).to_be_visible()
    page.get_by_role("tab", name="Hearings", exact=True).click()
    page.get_by_role("button", name="The warehouse examination", exact=False).click()
    expect(
        page.get_by_text("Imported finding · verify sources", exact=False).first
    ).to_be_visible()
    assert not errors, errors
    print(
        "PASS: hearing import/preview, unavailable conversion, archive round-trip, graph connection review, evidence search, registration, simulation, four statuses, notes, review, filter, clipboard failure, upload, search, original download, export, isolation, offline analysis, login, tabs, mobile navigation, inspector focus, responsive layouts; no page errors."
    )
    browser.close()
