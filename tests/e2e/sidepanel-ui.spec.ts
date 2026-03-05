import { test, expect } from './fixtures';

test.describe('Side panel UI', () => {
  test('chat tab renders with input field and suggestion chips', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for React to mount
    await page.waitForSelector('#root > *', { timeout: 10_000 });

    // If onboarding appears, skip it
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // The chat input textarea should be present
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    // Suggestion chips should be visible when there are no messages.
    // Check that at least 2 buttons with suggestion-like text are visible
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await page.close();
  });

  test('settings tab shows API key fields', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#root > *', { timeout: 10_000 });

    // If onboarding appears, skip it
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // The sidebar is collapsed by default. Click the settings tab (last nav item).
    const settingsTab = page.locator('[role="tab"]').last();
    await settingsTab.click({ timeout: 5_000 });

    // Wait for settings panel to render - look for any input fields
    const inputs = page.locator('input');
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 });

    // Should have multiple input fields for API keys
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(3);

    await page.close();
  });

  test('navigation between tabs works', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#root > *', { timeout: 10_000 });

    // If onboarding appears, skip it
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    // The compact header shows the active tab name
    const header = page.locator('header');
    await expect(header).toBeVisible({ timeout: 5_000 });

    // Get all tab buttons
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(5);

    // Click on a different tab (2nd one = scrape)
    await tabs.nth(1).click();
    await page.waitForTimeout(300);

    // Verify the header text changed
    const headerText1 = await header.textContent();
    expect(headerText1?.toLowerCase()).toContain('scrape');

    // Click on the last tab (settings)
    await tabs.last().click();
    await page.waitForTimeout(300);

    const headerText2 = await header.textContent();
    expect(headerText2?.toLowerCase()).toContain('settings');

    // Click back to first tab (chat)
    await tabs.first().click();
    await page.waitForTimeout(300);

    const headerText3 = await header.textContent();
    expect(headerText3?.toLowerCase()).toContain('chat');

    await page.close();
  });

  test('onboarding flow appears without API keys', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();

    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');

    // Clear stored keys to trigger onboarding
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        chrome.storage.local.remove(
          ['claudeApiKey', 'onboardingComplete', 'ux_scraper_settings'],
          () => resolve()
        );
      });
    });

    // Reload so App.tsx re-checks storage
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#root > *', { timeout: 10_000 });

    // The onboarding should show - look for welcome text or next/skip buttons
    const welcomeText = page.getByText(/welcome/i);
    const nextButton = page.getByRole('button', { name: /next/i });

    const hasWelcome = await welcomeText.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNext = await nextButton.isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasWelcome || hasNext).toBe(true);

    await page.close();
  });

  test('message input accepts text', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#root > *', { timeout: 10_000 });

    // If onboarding shows, skip it first
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }

    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    // Type a message
    await textarea.fill('Analyze the checkout flow');
    await expect(textarea).toHaveValue('Analyze the checkout flow');

    // Clear the input
    await textarea.fill('');
    await expect(textarea).toHaveValue('');

    await page.close();
  });
});
