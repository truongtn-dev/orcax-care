#!/usr/bin/env python3
"""Capture queue management demo screenshots via Playwright."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "demo" / "queue-screenshots"
BASE = "http://localhost:5173"
META = {}

ACCOUNTS = {
    "doctor": ("doctor.an@orcaxcare.com", "Doctor@123"),
    "staff": ("staff@orcaxcare.com", "Staff@123"),
    "patient": ("patient@orcaxcare.com", "Patient@123"),
}


def shot(page, name: str, full_page: bool = True) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=full_page)
    print(f"  saved {path.name}")
    return path


def clear_auth(page):
    page.goto(f"{BASE}/login", wait_until="networkidle")
    page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")


def login(page, role: str, next_path: str | None = None):
    clear_auth(page)
    email, password = ACCOUNTS[role]
    url = f"{BASE}/login"
    if next_path:
        url += f"?next={next_path.replace('/', '%2F')}"
    page.goto(url, wait_until="networkidle")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")
    time.sleep(1.5)


def logout(page):
    clear_auth(page)


def select_first_room(page):
    # CustomSelect: click trigger then first option
    trigger = page.locator(".custom-select-trigger").first
    if trigger.count():
        trigger.click()
        page.locator(".custom-select-option").first.click()
        time.sleep(0.5)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # 1 Doctor open session
        login(page, "doctor", "/doctor/queue")
        page.goto(f"{BASE}/doctor/queue", wait_until="networkidle")
        time.sleep(1)
        shot(page, "01-doctor-open-session-form")
        select_first_room(page)
        page.click('button:has-text("Open session")')
        page.wait_for_load_state("networkidle")
        time.sleep(1.5)
        shot(page, "02-doctor-session-open")

        room_link = page.locator(".doctor-queue-board-link a")
        room_href = room_link.get_attribute("href") if room_link.count() else ""
        room_id = room_href.split("/")[-1] if room_href else ""
        META["room_id"] = room_id
        META["board_url"] = f"{BASE}/queue-board/{room_id}" if room_id else ""

        # 2 Staff issue ticket
        logout(page)
        login(page, "staff", "/staff/checkin")
        page.goto(f"{BASE}/staff/checkin", wait_until="networkidle")
        page.locator(".filter-search-control").fill("patient@orcaxcare.com")
        page.click('button:has-text("Search")')
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        shot(page, "03-staff-checkin-search")
        page.locator(".staff-checkin-card").first.click()
        page.click('button:has-text("Issue ticket")')
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        shot(page, "04-staff-ticket-issued")

        # 3 Patient queue status
        logout(page)
        login(page, "patient", "/patient/queue")
        page.goto(f"{BASE}/patient/queue", wait_until="networkidle")
        time.sleep(1.5)
        shot(page, "05-patient-queue-status")

        # 4 Queue board before call
        board_page = context.new_page()
        if META.get("board_url"):
            board_page.goto(META["board_url"], wait_until="networkidle")
            time.sleep(1)
            shot(board_page, "06-queue-board-waiting", full_page=True)

        # 5 Doctor call next + skip + recall
        logout(page)
        login(page, "doctor")
        page.goto(f"{BASE}/doctor/queue", wait_until="networkidle")
        time.sleep(1)
        page.click('button:has-text("Call next")')
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        shot(page, "07-doctor-called-next")
        if META.get("board_url"):
            board_page.reload(wait_until="networkidle")
            time.sleep(1)
            shot(board_page, "08-queue-board-calling", full_page=True)

        logout(page)
        login(page, "patient", "/patient/queue")
        page.goto(f"{BASE}/patient/queue", wait_until="networkidle")
        time.sleep(1)
        shot(page, "09-patient-called")

        logout(page)
        login(page, "doctor")
        page.goto(f"{BASE}/doctor/queue", wait_until="networkidle")
        time.sleep(1)
        page.once("dialog", lambda d: d.accept())
        page.click('button:has-text("Skip patient")')
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        shot(page, "10-doctor-skipped")
        page.click('button:has-text("Recall skipped")')
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        shot(page, "11-doctor-recalled")

        page.once("dialog", lambda d: d.accept())
        page.click('button:has-text("Close session")')
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        shot(page, "12-doctor-closed-reopen-form")

        if META.get("board_url"):
            board_page.reload(wait_until="networkidle")
            time.sleep(1)
            shot(board_page, "13-queue-board-closed", full_page=True)
            board_page.close()

        browser.close()

    (OUT / "meta.json").write_text(json.dumps(META, indent=2), encoding="utf-8")
    print(f"Done. Screenshots in {OUT}")


if __name__ == "__main__":
    main()
