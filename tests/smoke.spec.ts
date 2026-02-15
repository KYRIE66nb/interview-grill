import { test, expect } from '@playwright/test'

test('app loads and shows Interview Grill header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Interview Grill')).toBeVisible()
})
