import { expect, test } from '@playwright/test'

test('app loads and shows Chinese header', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('面试烤炉')).toBeVisible()
})
