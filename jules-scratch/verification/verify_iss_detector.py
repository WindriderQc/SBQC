import re
from playwright.sync_api import Page, expect

def verify_iss_detector_view(page: Page):
    """
    This test verifies that the ISS Detector has been moved to its own view,
    that the navigation link works, and that the original Earth view is clean.
    """
    # 1. Navigate to the home page and check for the new nav link.
    page.goto("http://localhost:3001")

    # Expect the "ISS Detector" link to be visible in the nav bar.
    iss_detector_link = page.get_by_role("link", name="ISS Detector")
    expect(iss_detector_link).to_be_visible()

    # 2. Click the link and verify the new page.
    iss_detector_link.click()

    # Expect the URL to be correct.
    expect(page).to_have_url(re.compile(r".*/iss-detector"))

    # Expect the "3D ISS Viewer" header to be present on the new page.
    viewer_header = page.get_by_text("3D ISS Viewer")
    expect(viewer_header).to_be_visible()

    # Take a screenshot of the new ISS Detector page.
    page.screenshot(path="jules-scratch/verification/iss_detector_page.png")

    # 3. Navigate to the Earth page and verify it's clean.
    page.goto("http://localhost:3001/earth")

    # Expect the URL to be correct.
    expect(page).to_have_url(re.compile(r".*/earth"))

    # Expect the "3D ISS Viewer" header to NOT be on the Earth page.
    iss_viewer_on_earth = page.get_by_text("3D ISS Viewer")
    expect(iss_viewer_on_earth).not_to_be_visible()

    # Take a screenshot of the cleaned-up Earth page.
    page.screenshot(path="jules-scratch/verification/earth_page_clean.png")

# This is a bit of a hack to run the test function without a test runner.
# We'll just instantiate the browser and page and call the function directly.
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    verify_iss_detector_view(page)
    browser.close()
    print("Verification script completed successfully.")