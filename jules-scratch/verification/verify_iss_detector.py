from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This test verifies that the issDetector page loads correctly and displays the
    3D viewer and essential information sections.
    """
    # 1. Arrange: Go to the issDetector page.
    page.goto("http://localhost:3001/iss-detector")

    # 2. Assert: Check for the presence of key elements.
    # Expect the main 3D viewer card to be visible.
    expect(page.locator(".card-header", has_text="3D ISS Viewer")).to_be_visible()

    # Expect the info card with ISS and client location to be visible.
    expect(page.locator(".card-header", has_text="Info")).to_be_visible()
    expect(page.locator("p", has_text="ISS Location - Latitude:")).to_be_visible()
    expect(page.locator("p", has_text="Client Location - Latitude:")).to_be_visible()

    # Expect the pass-by time card to be visible.
    expect(page.locator("p", has_text="Next ISS pass-by:")).to_be_visible()

    # 3. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()