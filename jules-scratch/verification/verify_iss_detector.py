from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console messages
    console_messages = []
    page.on("console", lambda msg: console_messages.append(msg.text))

    # Navigate to the ISS detector page
    page.goto("http://localhost:3001/iss-detector")

    # Wait for the page to load and for some time for the 3D view to initialize
    page.wait_for_timeout(10000)

    # Take a screenshot for visual verification
    page.screenshot(path="jules-scratch/verification/iss_detector.png")

    browser.close()

    # Print captured console messages
    print("\n--- Console Messages ---")
    for msg in console_messages:
        print(msg)
    print("------------------------\n")


with sync_playwright() as playwright:
    run(playwright)