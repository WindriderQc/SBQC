import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:3001/iss-detector")

        # Wait for the main canvas to be visible
        await expect(page.locator("#defaultCanvas0")).to_be_visible(timeout=30000)

        # Give the scene time to render the new texture
        await page.wait_for_timeout(5000)

        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

asyncio.run(main())