from playwright.sync_api import Page, expect

def test_iss_detector_page(page: Page):
    """
    This test verifies that the ISS detector page loads correctly and that the
    new pass-by details section is visible.
    """
    # 1. Arrange: Go to the ISS Detector page.
    page.goto("http://localhost:3001/iss-detector")

    # 2. Assert: Check for the presence of key elements.
    expect(page.locator("#sketch-holder")).to_be_visible()
    expect(page.locator("#pass-entry-time")).to_be_visible()
    expect(page.locator("#pass-exit-time")).to_be_visible()

    # 3. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/iss_detector_verification.png")