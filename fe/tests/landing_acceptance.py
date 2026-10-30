"""Original landing composition, navigation, and progressive motion checks."""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2] / ".impeccable/review"
ROOT.mkdir(parents=True, exist_ok=True)
BASE = os.getenv("JUDE_TEST_URL", "http://localhost:3000")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.getenv("CHROMIUM_EXECUTABLE"), args=["--no-sandbox"]
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until="domcontentloaded")
    paper = page.locator(".hero-evidence")
    page.wait_for_function(
        "document.querySelector('.hero-evidence')?.getAnimations({subtree:true}).some(a => a.playState === 'running')"
    )
    page.locator("#questions").scroll_into_view_if_needed()
    page.wait_for_function(
        "document.querySelector('.hero-evidence').getAnimations({subtree:true}).every(a => a.playState !== 'running')"
    )
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    page.wait_for_function(
        "document.querySelector('.hero-evidence').getAnimations({subtree:true}).length === 0"
    )
    assert paper.evaluate("el => getComputedStyle(el).transform") == "none"
    expect(page.locator(".hero h1")).to_have_text(
        "Stay with the testimony. See the whole story."
    )
    expect(page.locator(".workflow-list > li")).to_have_count(3)
    expect(page.locator(".hero .source-link")).to_have_count(2)
    assert "jude-case-files.webp" in page.locator(".hero").evaluate(
        "el => getComputedStyle(el).backgroundImage"
    )
    for width in (1440, 1280, 768, 390):
        page.set_viewport_size(
            {"width": width, "height": 1100 if width == 1440 else 844}
        )
        page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            width
        )
        page.screenshot(
            path=str(ROOT / f"original-landing-{width}.png"), full_page=True
        )
        if width in (1440, 390):
            page.screenshot(path=str(ROOT / f"original-hero-{width}.png"))
    page.get_by_role("button", name="Open navigation", exact=True).click()
    expect(page.locator("#mobile-navigation a").first).to_be_focused()
    page.keyboard.press("Escape")
    expect(
        page.get_by_role("button", name="Open navigation", exact=True)
    ).to_be_focused()
    page.locator(".hero .source-link").nth(1).click()
    expect(page.locator("#demo-title")).to_be_focused()
    expect(
        page.get_by_role("heading", name="Earlier account of events")
    ).to_be_visible()
    page.get_by_role("button", name="A matching detail").click()
    expect(
        page.get_by_role("heading", name="Both accounts place a guard")
    ).to_be_visible()
    page.get_by_role("button", name="Mark as reviewed", exact=False).click()
    expect(
        page.get_by_role("button", name="Marked as reviewed", exact=False)
    ).to_have_attribute("aria-pressed", "true")
    page.get_by_role("button", name="Witness statement", exact=True).click()
    expect(
        page.get_by_role("heading", name="Earlier account of events")
    ).to_be_visible()
    page.get_by_text("Can I upload case documents here?", exact=True).click()
    expect(
        page.get_by_text("The authenticated workspace accepts", exact=False)
    ).to_be_visible()
    page.set_viewport_size({"width": 1440, "height": 1100})
    page.emulate_media(reduced_motion="reduce")
    page.reload(wait_until="networkidle")
    assert paper.evaluate("el => el.getAnimations({subtree:true}).length") == 0
    assert paper.evaluate("el => getComputedStyle(el).transform") == "none"
    static = browser.new_page(java_script_enabled=False)
    static.goto(BASE)
    expect(static.get_by_role("heading", level=1)).to_be_visible()
    expect(
        static.get_by_text("I arrived at 9:30 PM.", exact=False).first
    ).to_be_visible()
    assert (
        static.get_by_role("link", name="Open workspace", exact=True).get_attribute(
            "href"
        )
        == "/workspace"
    )
    assert not errors, errors
    browser.close()
    print(
        "PASS: original composition, finite/offscreen motion, source navigation, review state, FAQ, keyboard menu, four responsive widths, reduced motion, and no-JavaScript content; no page errors."
    )
