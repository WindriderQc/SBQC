from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/iss-detector')
        # Wait for the canvas to be rendered
        page.wait_for_selector('#sketch-holder')
        # Take a screenshot of the sketch holder element
        page.locator('#sketch-holder').screenshot(path='jules-scratch/verification/verification.png')
        browser.close()

run()