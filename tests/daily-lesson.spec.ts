import { expect, test } from '@playwright/test'

test('daily lesson can check in and export markdown', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '408 每日小课' }).click()
  await expect(page.getByText('今日主题（可配置）')).toBeVisible()

  await page.getByRole('button', { name: '完成打卡' }).click()
  await expect(page.getByText('今日已打卡')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: '408 每日小课' }).click()
  await expect(page.getByText('今日已打卡')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 Markdown' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-408\.md$/)

  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()

  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk))
  }
  const markdown = Buffer.concat(chunks).toString('utf8')

  expect(markdown).toContain('# 408 每日小课')
  expect(markdown).toContain('## 今日目标（3 条）')
  expect(markdown).toContain('## 白话讲解（零基础）')
  expect(markdown).toContain('## 记忆卡片（3-5 张）')
  expect(markdown).toContain('## 小算例（逐步）')
  expect(markdown).toContain('## 5 分钟自测（含答案与解析）')
  expect(markdown).toContain('## 我今天的薄弱点（自动列当天记录）')
})
