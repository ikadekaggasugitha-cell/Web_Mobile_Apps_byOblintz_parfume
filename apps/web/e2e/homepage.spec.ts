import { test, expect } from '@playwright/test';

// Smoke test for the storefront homepage (drives the real UI).
test.describe('homepage', () => {
  test('renders the hero and primary CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/OBLINTZ/i);

    // Hero headline (keyword-rich H1 from the SEO work).
    await expect(
      page.getByRole('heading', { level: 1, name: /Parfum yang Menuturkan/i })
    ).toBeVisible();

    // Primary CTAs.
    await expect(page.getByRole('link', { name: /Jelajahi Koleksi/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Temukan Aroma Anda/i })).toBeVisible();
  });

  test('primary CTA navigates to the catalogue', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Jelajahi Koleksi/i }).click();
    await expect(page).toHaveURL(/\/products/);
  });

  test('quiz CTA navigates to the quiz', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Temukan Aroma Anda/i }).click();
    await expect(page).toHaveURL(/\/quiz/);
  });

  test('exposes Organization + WebSite structured data (SEO)', async ({ page }) => {
    await page.goto('/');
    const ldTypes = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const joined = ldTypes.join(' ');
    expect(joined).toContain('Organization');
    expect(joined).toContain('WebSite');
  });
});
