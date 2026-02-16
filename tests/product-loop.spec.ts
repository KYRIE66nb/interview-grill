import { expect, test } from '@playwright/test'

test('mistake book, review queue, and dashboard daily report loop works', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '408 每日小课' }).click()
  await page.getByRole('button', { name: '看不懂' }).click()

  await page.getByRole('button', { name: '错题本' }).click()
  await expect(page.getByText('错题本 / 薄弱点')).toBeVisible()
  await expect(page.locator('.taskCard').first()).toContainText('408')

  const todayDate = await page.evaluate(() => {
    const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
    const raw = localStorage.getItem('ig.state.v2')
    if (!raw) return dateKey
    const state = JSON.parse(raw)
    if (state.meta?.mistakes?.length) {
      state.meta.mistakes[0].srs.dueDate = dateKey
      localStorage.setItem('ig.state.v2', JSON.stringify(state))
    }
    return dateKey
  })

  await page.reload()
  await page.getByRole('button', { name: '复习', exact: true }).click()
  await expect(page.getByText('复习队列（SRS）')).toBeVisible()
  await page.getByRole('button', { name: 'Good' }).first().click()

  const reviewUpdated = await page.evaluate((dateKey) => {
    const raw = localStorage.getItem('ig.state.v2')
    if (!raw) return false
    const state = JSON.parse(raw)
    const item = state.meta?.mistakes?.[0]
    if (!item) return false
    return item.srs.reviewCount >= 1 && item.srs.dueDate > dateKey
  }, todayDate)

  expect(reviewUpdated).toBeTruthy()

  await page.getByRole('button', { name: 'Dashboard' }).click()
  await expect(page.getByText('数据面板')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '生成今日日报' }).first().click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}\.md$/)

  const stream = await download.createReadStream()
  expect(stream).not.toBeNull()

  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk))
  }
  const markdown = Buffer.concat(chunks).toString('utf8')

  expect(markdown).toContain('# 学习日报')
  expect(markdown).toContain('## 今日薄弱点 Top 3')
})
