"""Landing-page motion and navigation acceptance against a running preview."""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2] / ".impeccable/review"
ROOT.mkdir(parents=True, exist_ok=True)
BASE = os.getenv("JUDE_TEST_URL", "http://127.0.0.1:3000")
with sync_playwright() as p:
    b = p.chromium.launch(
        executable_path=os.getenv("CHROMIUM_EXECUTABLE"), args=["--no-sandbox"]
    )
    page = b.new_page(viewport={"width": 1440, "height": 1100})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    pause = page.get_by_role("button", name="Pause paper animation")
    if pause.is_visible():
        pause.click()
        expect(
            page.get_by_role("button", name="Resume paper animation")
        ).to_be_visible()
        page.get_by_role("button", name="Resume paper animation").click()
    page.get_by_role("button", name="Replay paper animation").click()
    page.get_by_role("button", name="Pause paper animation").click()
    expect(page.get_by_role("button", name="Resume paper animation")).to_be_visible()
    before = page.get_by_role("heading", name="In the hearing", exact=True).evaluate(
        '(el) => getComputedStyle(el.closest("article")).transform'
    )
    page.wait_for_timeout(200)
    after = page.get_by_role("heading", name="In the hearing", exact=True).evaluate(
        '(el) => getComputedStyle(el.closest("article")).transform'
    )
    assert before == after, "Pause must hold the paper in place"
    page.get_by_role("button", name="Resume paper animation").click()
    expect(page.get_by_role("button", name="Pause paper animation")).to_have_count(
        0, timeout=6000
    )
    page.evaluate("window.scrollTo(0,0)")
    page.screenshot(path=str(ROOT / "landing-desktop.png"), full_page=True)
    page.screenshot(path=str(ROOT / "landing-hero.png"))
    page.get_by_role("button", name="Read the statement", exact=True).click()
    expect(
        page.get_by_role("heading", name="Earlier account of events")
    ).to_be_visible()
    page.get_by_role("tab", name="Give every hearing").click()
    expect(page.get_by_text("Transcript ready for your review")).to_be_visible()
    page.get_by_role("tab", name="Give every hearing").focus()
    page.keyboard.press("ArrowDown")
    expect(page.get_by_role("tab", name="Find the thread")).to_be_focused()
    page.get_by_role("tabpanel").screenshot(
        path=str(ROOT / "landing-evidence-preview.png")
    )
    page.get_by_role("button", name="Try an example", exact=True).click()
    expect(page.locator("#demo-title")).to_be_focused()
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
    expect(page.get_by_text("Yes. The workspace accepts", exact=False)).to_be_visible()
    page.get_by_role("tab", name="Bring the whole case").click()
    for width in (1280, 768, 390):
        page.set_viewport_size({"width": width, "height": 844})
        page.evaluate("window.scrollTo(0,0)")
        page.wait_for_timeout(100)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            width
        )
        if width == 390:
            page.get_by_role("button", name="Open navigation", exact=True).click()
            expect(
                page.get_by_role("navigation", name="Mobile navigation")
                .get_by_role("link")
                .first
            ).to_be_focused()
            page.keyboard.press("Escape")
            expect(
                page.get_by_role("button", name="Open navigation", exact=True)
            ).to_be_focused()
        page.evaluate("document.activeElement?.blur();window.scrollTo(0,0)")
        page.screenshot(path=str(ROOT / f"landing-{width}.png"), full_page=True)
    page.evaluate("window.scrollTo(0,0)")
    page.screenshot(path=str(ROOT / "landing-mobile-hero.png"))
    page.locator("[data-motion-paused]").screenshot(
        path=str(ROOT / "landing-mobile-paper.png")
    )
    page.set_viewport_size({"width": 390, "height": 1500})
    page.locator("#how-it-works").screenshot(
        path=str(ROOT / "landing-mobile-workflow.png")
    )
    page.set_viewport_size({"width": 390, "height": 844})
    page.get_by_role("button", name="Replay paper animation").click()
    page.locator("#questions").scroll_into_view_if_needed()
    expect(page.locator("[data-motion-paused]")).to_have_attribute(
        "data-motion-paused", "true"
    )
    page.emulate_media(reduced_motion="reduce")
    page.reload()
    expect(page.get_by_role("button", name="Replay paper animation")).to_be_disabled()
    assert page.locator("article").evaluate_all(
        '(els)=>els.every(e=>getComputedStyle(e).animationName === "none")'
    )
    assert not errors, errors
    static = b.new_page(java_script_enabled=False)
    static.goto(BASE)
    expect(static.get_by_role("heading", level=1)).to_be_visible()
    expect(
        static.get_by_role("heading", name="A difference.", exact=False)
    ).to_be_visible()
    assert (
        static.get_by_role(
            "link", name="Open your workspace", exact=True
        ).first.get_attribute("href")
        == "/workspace"
    )
    b.close()
    print(
        "PASS: source links, keyboard workflow tabs, review state, FAQ, mobile navigation, pause/replay, offscreen pause, reduced motion, responsive layouts, and no-JavaScript content; no page errors."
    )
