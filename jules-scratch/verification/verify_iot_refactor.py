from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the IoT page
    page.goto("http://localhost:3001/iot")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="jules-scratch/verification/iot_page.png")

    # Go to the device config profile page
    page.get_by_role("link", name="Create Config Profile").click()
    expect(page).to_have_url("http://localhost:3001/device-config-profile")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="jules-scratch/verification/device_config_profile_page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)