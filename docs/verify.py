"""Third — end-to-end smoke test in a real browser (Playwright)."""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
errors = []
ok = []

def check(cond, msg):
    (ok if cond else errors).append(("ok  " if cond else "FAIL") + " - " + msg)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 480, "height": 900})

    console_errors = []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append("pageerror: " + str(e)))

    # fresh state every run
    page.goto(BASE)
    page.evaluate("() => localStorage.clear()")
    page.reload()
    page.wait_for_load_state("networkidle")

    # ---- onboarding ----
    check(page.locator("#ob-form").count() == 1, "onboarding form shown on first run")
    page.fill("#ob-name", "検証ユーザー")
    page.fill("#ob-initial", "検")
    page.click("button[data-action='onboard']")
    page.wait_for_selector(".haunts", timeout=4000)
    check(page.locator(".haunts .haunt").count() >= 3, "home shows haunt cards")
    page.screenshot(path="docs/shot-home.png")

    # 燈 should carry a 常連 badge (seeded regular)
    tomoshibi = page.locator(".haunt", has_text="Bar 燈")
    check(tomoshibi.locator(".badge", has_text="常連").count() == 1, "燈 has 常連 badge")

    # search filter
    page.fill("#home-search", "月光")
    visible = page.locator(".haunts .haunt:visible").count()
    check(visible == 1, "search filters to 1 (月光) -> got %d" % visible)
    page.fill("#home-search", "")

    # ---- check in to 燈 (stealth ON by default = 安全側) ----
    tomoshibi.click()
    page.wait_for_selector("button[data-action='checkin']", timeout=4000)
    page.screenshot(path="docs/shot-preview.png")
    check(page.eval_on_selector("#pv-stealth", "el => el.checked"), "こっそり is the default (F-3 safe-by-default)")
    page.click("button[data-action='checkin']")
    page.wait_for_selector(".inn-stage", timeout=4000)
    seats = page.locator(".inn-stage .seat[data-action='open-signal']").count()
    check(seats == 5, "venue shows 5 present regulars -> got %d" % seats)
    me_label = page.locator(".seat--me .seat__nm").inner_text()
    check("見るだけ" in me_label, "stealth: me shown as 見るだけ -> %r" % me_label)
    page.screenshot(path="docs/shot-venue.png")

    # ---- stealth blocks sending (見るだけ) ----
    page.locator(".seat[data-action='open-signal']").first.click()
    page.wait_for_selector(".sheet", timeout=4000)
    check(page.locator(".signal-btn[disabled]", has_text="こっそり中は送れません").count() == 1, "stealth disables sending (見るだけ)")
    page.keyboard.press("Escape")

    # ---- reveal, then send ----
    page.click("button[data-action='toggle-stealth']")
    page.wait_for_timeout(150)
    me_label2 = page.locator(".seat--me .seat__nm").inner_text()
    check("見るだけ" not in me_label2, "after reveal: me is visible -> %r" % me_label2)

    page.locator(".seat[data-action='open-signal']").first.click()
    page.wait_for_selector(".sheet .signal-btn", timeout=4000)
    page.screenshot(path="docs/shot-signal.png")
    check(page.locator(".signal-btn", has_text="乾杯しませんか").count() == 1, "signal CTA present (text-only)")
    page.click(".signal-btn")
    page.wait_for_selector(".toast", timeout=4000)
    check(page.locator(".toast__title", has_text="乾杯の合図を送りました").count() >= 1, "send shows confirmation toast")

    page.locator(".seat[data-action='open-signal']").nth(1).click()
    page.wait_for_selector(".sheet .signal-btn", timeout=4000)
    page.click(".signal-btn")
    page.wait_for_timeout(400)
    page.locator(".seat[data-action='open-signal']").nth(2).click()
    page.wait_for_selector(".sheet", timeout=4000)
    check(page.locator(".signal-btn[disabled]", has_text="使い切りました").count() == 1, "third signal blocked by nightly quota")
    page.keyboard.press("Escape")

    # ---- inbound (non-stealth) then leave ----
    page.click("button[data-action='demo-receive']")
    page.wait_for_selector(".toast__title:has-text('乾杯の合図')", timeout=4000)
    check(page.locator(".toast__btn", has_text="そっとブロック").count() >= 1, "inbound toast offers そっとブロック")
    page.click("button[data-action='demo-ff']")
    page.wait_for_timeout(250)
    page.click("button[data-action='leave']")
    page.wait_for_selector(".haunts", timeout=4000)
    page.wait_for_timeout(350)
    toasts_txt = page.locator(".toast-host").inner_text()
    check("常連の記録" in toasts_txt, "leaving already-regular store: shows 常連の記録 -> %r" % toasts_txt)
    check("あと0回" not in toasts_txt, "no awkward 'あと0回' for an existing 常連")

    # ---- KEY FIX: re-check-in same night must NOT refill the 合図 quota ----
    page.locator(".haunt", has_text="Bar 燈").click()
    page.wait_for_selector("button[data-action='checkin']", timeout=4000)
    page.click("label[for='pv-stealth']")          # reveal so stealth isn't the blocker
    page.click("button[data-action='checkin']")
    page.wait_for_selector(".inn-stage", timeout=4000)
    page.locator(".seat[data-action='open-signal']").nth(3).click()
    page.wait_for_selector(".sheet", timeout=4000)
    check(page.locator(".signal-btn[disabled]", has_text="使い切りました").count() == 1,
          "nightly quota persists across re-check-in (no refill) — the §7.2.1 brake")
    page.keyboard.press("Escape")
    page.click("button[data-action='leave']")
    page.wait_for_selector(".haunts", timeout=4000)

    # ---- 常連 promotion moment via profile demo (よあけ 3 -> 5) ----
    page.click("button[data-action='nav'][data-arg='profile']")
    page.wait_for_selector(".prof", timeout=4000)
    page.click("button[data-action='demo-add'][data-arg='yoake']")
    page.wait_for_timeout(250)
    page.click("button[data-action='demo-add'][data-arg='yoake']")
    page.wait_for_selector(".toast__title:has-text('常連になりました')", timeout=4000)
    check(page.locator(".toast__title", has_text="常連になりました").count() >= 1, "よあけ promoted to 常連 (celebration)")
    page.screenshot(path="docs/shot-promote.png")

    # ---- history / 常連の証 ----
    page.click(".tab[data-arg='history']")
    page.wait_for_selector(".creed .ring-wrap", timeout=4000)
    check(page.locator(".ring-prog").count() == 1, "history shows progress ring")
    check(page.locator(".rooms .room").count() >= 2, "history lists rooms")
    page.screenshot(path="docs/shot-history.png")

    # ---- profile ----
    page.click(".tab[data-arg='home']")
    page.wait_for_selector(".haunts", timeout=4000)
    page.click("button[data-action='nav'][data-arg='profile']")
    page.wait_for_selector(".prof", timeout=4000)
    check(page.locator(".sect", has_text="安全").count() >= 1, "profile has 安全 section")
    page.screenshot(path="docs/shot-profile.png")

    check(len(console_errors) == 0, "no console/page errors -> %r" % console_errors[:5])

    browser.close()

print("\n".join(ok))
print("\n".join(errors))
print("\n%d passed, %d failed" % (len(ok), len(errors)))
sys.exit(1 if errors else 0)
