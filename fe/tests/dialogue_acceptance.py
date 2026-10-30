"""Case assistant and practice UI against a local preview without provider keys."""

import os
from pathlib import Path
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv("JUDE_TEST_URL", "http://localhost:3000")
ARTIFACTS = Path(__file__).resolve().parents[2] / ".impeccable/review"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.getenv("CHROMIUM_EXECUTABLE"), args=["--no-sandbox"]
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    page.set_default_timeout(12000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + "/workspace")
    page.get_by_role("button", name="Create an account").click()
    page.get_by_label("Your name").fill("Practice counsel")
    page.get_by_label("Email address").fill(f"practice-{uuid4()}@example.invalid")
    page.get_by_label("Password").fill("test-password-12345")
    page.get_by_role("button", name="Create account", exact=True).click()
    page.get_by_role("button", name="Try a synthetic hearing").click()
    # Carry an exact evidence passage into the assistant.
    page.get_by_role("button", name="Witness statement", exact=False).first.click()
    page.get_by_role("button", name="Discuss with assistant").click()
    expect(
        page.get_by_role("tab", name="Case assistant", exact=True)
    ).to_have_attribute("aria-selected", "true")
    page.get_by_text("Reference case material (1)", exact=False).click()
    expect(page.get_by_label("Selected evidence passage")).to_be_checked()
    page.get_by_label("Ask about this case", exact=True).fill(
        "What does the statement say about arrival time?"
    )
    page.get_by_role("button", name="Send message").click()
    expect(page.get_by_text("AI replies are unavailable", exact=False)).to_be_visible()
    page.get_by_role("log").locator("details").first.locator("summary").click()
    expect(
        page.get_by_role("link", name="Open original", exact=True).first
    ).to_be_visible()
    expect(page.get_by_role("log").locator("blockquote").first).to_be_visible()
    page.get_by_text("Include legal lookup", exact=False).click()
    expect(page.get_by_label("Legal search terms")).to_be_disabled()
    page.get_by_label("Ask about this case", exact=True).fill(
        "What other context is available?"
    )
    # A failed exchange must preserve the draft and allow a complete retry.
    page.route("**/dialogues/*/messages", lambda route: route.fulfill(
        status=503, content_type="application/json",
        body='{"detail":"Provider temporarily unavailable. Retry your message."}',
    ), times=1)
    page.get_by_role("button", name="Send message").click()
    expect(page.get_by_role("alert").filter(has_text="Provider temporarily unavailable")).to_be_visible()
    expect(page.get_by_label("Ask about this case", exact=True)).to_have_value(
        "What other context is available?"
    )
    expect(page.get_by_role("log").locator("article")).to_have_count(2)
    page.get_by_role("button", name="Send message").click()
    expect(page.get_by_role("log").locator("article")).to_have_count(4)
    with page.expect_download() as download:
        page.get_by_role("link", name="Export conversation").click()
    exported = download.value
    assert exported.suggested_filename.endswith(".json")
    page.evaluate("document.activeElement?.blur();window.scrollTo(0,0)")
    page.screenshot(path=str(ARTIFACTS / "assistant-desktop.png"), full_page=True)
    page.reload()
    page.get_by_role("tab", name="Case assistant", exact=True).click()
    expect(page.get_by_role("log").locator("article")).to_have_count(4)
    page.get_by_role("button", name="New conversation").click()
    expect(
        page.get_by_role("textbox", name="Ask about this case", exact=True)
    ).to_be_focused()
    expect(page.get_by_role("log").locator("article")).to_have_count(0)
    page.get_by_role("button", name="What does the statement say", exact=False).click()
    expect(page.get_by_role("log").locator("article")).to_have_count(4)
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.evaluate("document.activeElement?.blur();window.scrollTo(0,0)")
    page.screenshot(path=str(ARTIFACTS / "assistant-mobile.png"), full_page=True)
    # Conditions are explicitly reviewed and manually editable before practice.
    page.set_viewport_size({"width": 1440, "height": 1100})
    page.get_by_role("tab", name="Courtroom practice", exact=True).click()
    expect(page.get_by_role("button", name="Suggest from case")).to_be_disabled()
    page.get_by_label("Trial type", exact=True).fill("Civil hearing practice")
    page.get_by_label("Jurisdiction / court").fill(
        "Practice court — verify local procedure"
    )
    page.get_by_label("Your role", exact=False).select_option("judge")
    page.get_by_label("Stage", exact=False).select_option("Procedural hearing")
    page.get_by_label("Difficulty").select_option("Challenging")
    page.get_by_label("Scenario assumptions and ground rules").fill(
        "Hypothetical hearing with two counsel; no additional witness facts assumed."
    )
    page.evaluate("document.activeElement?.blur();window.scrollTo(0,0)")
    page.screenshot(path=str(ARTIFACTS / "practice-setup-desktop.png"), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(ARTIFACTS / "practice-setup-mobile.png"), full_page=True)
    page.get_by_role("button", name="Start rehearsal").click()
    expect(page.get_by_text("You are practising as judge", exact=False)).to_be_visible()
    page.get_by_text("Trial conditions", exact=True).click()
    expect(page.get_by_text("Civil hearing practice", exact=True)).to_be_visible()
    page.get_by_role("textbox", name="Your turn · Judge", exact=True).fill(
        "Counsel, identify the question that the evidence leaves unresolved."
    )
    page.get_by_role("button", name="Take your turn").click()
    expect(
        page.get_by_text("Which exact source supports that point", exact=False)
    ).to_be_visible()
    page.evaluate("document.activeElement?.blur();window.scrollTo(0,0)")
    page.screenshot(path=str(ARTIFACTS / "practice-dialogue-mobile.png"), full_page=True)
    page.set_viewport_size({"width": 1440, "height": 1100})
    page.evaluate("document.activeElement?.blur();window.scrollTo(0,0)")
    page.screenshot(
        path=str(ARTIFACTS / "practice-dialogue-desktop.png"), full_page=True
    )
    page.get_by_role("button", name="Finish & debrief").click()
    expect(
        page.get_by_text("Rehearsal complete. Your dialogue and debrief are saved.")
    ).to_be_visible()
    expect(
        page.get_by_text("did not assess your performance", exact=False)
    ).to_be_visible()
    page.reload()
    page.get_by_role("tab", name="Courtroom practice", exact=True).click()
    expect(page.get_by_text("Rehearsal complete.", exact=False)).to_be_visible()
    page.get_by_text("Trial conditions", exact=True).click()
    page.get_by_role("button", name="Edit setup for a new rehearsal").click()
    expect(page.get_by_label("Trial type", exact=True)).to_have_value(
        "Civil hearing practice"
    )
    expect(page.get_by_label("Your role", exact=False)).to_have_value("judge")
    page.get_by_label("Your role", exact=False).select_option("opposing")
    page.get_by_role("button", name="Start rehearsal").click()
    expect(
        page.get_by_role("textbox", name="Your turn · Opposing counsel", exact=True)
    ).to_be_visible()
    assert not errors, errors
    print(
        "PASS: exact evidence handoff, sources-only citation inspection, followups, persistence/history/export, legal unavailable state, manual conditions/role overrides, guided turns, debrief, restart with edited setup, responsive layouts; no page errors."
    )
    browser.close()
