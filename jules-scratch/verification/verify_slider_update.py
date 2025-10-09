from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for all console events and print them to the terminal
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

    try:
        # Navigate to the correct page for the ISS detector.
        page.goto("http://localhost:3001/iss-detector", timeout=90000)

        # Wait for the canvas to be visible.
        canvas_selector = "#sketch-holder canvas"
        expect(page.locator(canvas_selector)).to_be_visible(timeout=45000)

        # Locate the prediction length slider.
        slider_selector = "#predictionLengthSlider"
        slider_handle = page.locator(slider_selector)

        # Assert that the slider's max attribute is correct.
        expect(slider_handle).to_have_attribute("max", "6480")

        # Set the slider to its new maximum value.
        slider_handle.fill("6480")

        # Wait for rendering.
        page.wait_for_timeout(20000)

        # Take a screenshot for visual verification.
        page.screenshot(path="jules-scratch/verification/final_verification.png")

        print("Screenshot saved to jules-scratch/verification/final_verification.png")

    except Exception as e:
        print(f"An error occurred during Playwright execution: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        # Clean up resources.
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)