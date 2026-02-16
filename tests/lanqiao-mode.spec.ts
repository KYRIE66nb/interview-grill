import { expect, test } from '@playwright/test'

test('lanqiao mode can generate, persist review card, and export markdown', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '面试训练' }).click()

  await page.getByRole('button', { name: '蓝桥刷题' }).first().click()
  await expect(page.getByText('蓝桥杯刷题模式')).toBeVisible()

  await page.getByRole('button', { name: '专题训练' }).first().click()
  await page.getByRole('button', { name: '生成今日训练' }).first().click()
  await expect(page.locator('.panelTitle', { hasText: '蓝桥杯今日训练' }).first()).toBeVisible()

  const firstTask = page.locator('.taskCard').first()
  await firstTask.getByRole('checkbox').check()
  await firstTask.getByPlaceholder('思路').fill('先建模，再写状态转移。')
  await firstTask.getByPlaceholder('坑点').fill('注意初始状态和越界。')
  await firstTask.getByPlaceholder('复杂度').fill('时间 O(n^2)，空间 O(n)。')
  await firstTask.getByPlaceholder('可复用模板').fill('二维 DP 模板 + 逆序遍历。')

  await page.reload()
  await page.getByRole('button', { name: '面试训练' }).click()
  await page.getByRole('button', { name: '蓝桥刷题' }).first().click()
  await expect(page.locator('.panelTitle', { hasText: '蓝桥杯今日训练' }).first()).toBeVisible()
  await expect(page.locator('.taskCard').first().getByPlaceholder('思路')).toHaveValue('先建模，再写状态转移。')

  const downloadPromise = page.waitForEvent('download')
  await page.keyboard.press('Control+S')
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-lanqiao\.md$/)

  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk))
  }
  const markdown = Buffer.concat(chunks).toString('utf8')
  expect(markdown).toContain('# 蓝桥杯刷题')
  expect(markdown).toContain('## 今日题目清单')
  expect(markdown).toContain('## 每题复盘卡')
  expect(markdown).toContain('## 明日计划')
})
