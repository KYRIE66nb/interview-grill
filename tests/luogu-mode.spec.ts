import { expect, test } from '@playwright/test'

test('luogu daily mode can generate, persist, and export markdown', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '面试训练' }).click()

  await page.getByRole('button', { name: '洛谷题单' }).first().click()
  await expect(page.getByText('洛谷题单每日推送')).toBeVisible()

  await page.getByRole('button', { name: '生成 / 刷新今日题单' }).click()
  await expect(page.getByText('今日洛谷题单')).toBeVisible()

  const firstTask = page.locator('.taskCard').first()
  await firstTask.getByRole('checkbox').check()
  await firstTask.getByPlaceholder('备注：卡点、时间、思路摘要').fill('已完成，耗时 18 分钟。')

  await page.reload()
  await page.getByRole('button', { name: '面试训练' }).click()
  await page.getByRole('button', { name: '洛谷题单' }).first().click()
  await expect(page.getByText('今日洛谷题单')).toBeVisible()
  await expect(page.locator('.taskCard').first().getByRole('checkbox')).toBeChecked()

  const downloadPromise = page.waitForEvent('download')
  await page.keyboard.press('Control+S')
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-luogu\.md$/)

  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk))
  }
  const markdown = Buffer.concat(chunks).toString('utf8')
  expect(markdown).toContain('# 洛谷每日题单')
  expect(markdown).toContain('## 今日目标')
  expect(markdown).toContain('## 每日题目')
  expect(markdown).toContain('## 明日计划')
})
