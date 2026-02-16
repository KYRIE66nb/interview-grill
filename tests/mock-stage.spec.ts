import { expect, test } from '@playwright/test'

test('mock stage progression updates transcript and continue state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '面试训练' }).click()
  await page.getByRole('button', { name: '模拟面试' }).first().click()

  await page.getByRole('button', { name: '开始模拟（15 分钟）' }).click()
  await expect(page.getByText('[阶段 1/3] 项目深挖')).toBeVisible()

  const stagePanel = page.locator('.stage')
  const continueBtn = stagePanel.getByRole('button', { name: '请先作答' })
  await expect(continueBtn).toBeDisabled()

  await page.getByPlaceholder('回答当前阶段...').fill('这是我的项目回答，包含目标、架构、指标和风险兜底。')
  await page.getByRole('button', { name: '发送' }).click()

  const continueReadyBtn = stagePanel.getByRole('button', { name: '下一步 / 继续' })
  await expect(continueReadyBtn).toBeEnabled()
  await continueReadyBtn.click()

  await expect(page.getByText('已记录「项目深挖」的回答，继续下一阶段。')).toBeVisible()
  await expect(page.getByText('[阶段 2/3] 后端基础')).toBeVisible()
})
