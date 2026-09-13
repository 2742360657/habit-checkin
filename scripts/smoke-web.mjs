import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:8081';

await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({ viewport: { width: 500, height: 900 }, hasTouch: true, isMobile: true });
const page = await context.newPage();
page.on('dialog', async (dialog) => dialog.dismiss());

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('今天', { exact: true }).first().waitFor();
  assert.equal(await page.getByText('待办', { exact: true }).count() > 0, true);
  assert.equal(await page.getByText('习惯', { exact: true }).count() > 0, true);
  assert.equal(await page.getByText('设置', { exact: true }).count() > 0, true);

  await page.getByText('＋ 待办', { exact: true }).click();
  await page.getByPlaceholder('例如：提交报销材料').fill('界面冒烟测试待办');
  await page.getByText('今天', { exact: true }).last().click();
  await page.getByText('保存', { exact: true }).click();
  await page.getByPlaceholder('例如：提交报销材料').waitFor({ state: 'hidden' });
  await page.getByText('界面冒烟测试待办', { exact: true }).first().waitFor();

  await page.getByLabel('完成待办：界面冒烟测试待办').first().click();
  await page.getByText('待办已完成', { exact: true }).waitFor();
  await page.getByText('撤销', { exact: true }).click();
  await page.getByText('界面冒烟测试待办', { exact: true }).first().waitFor();

  await page.getByText('＋ 待办', { exact: true }).click();
  await page.getByPlaceholder('例如：提交报销材料').fill('第二个无日期待办');
  await page.getByText('保存', { exact: true }).click();
  await page.getByPlaceholder('例如：提交报销材料').waitFor({ state: 'hidden' });

  await page.getByText('习惯', { exact: true }).last().click();
  await page.getByText('＋ 习惯', { exact: true }).click();
  await page.getByPlaceholder('例如：喝水、散步、背单词').fill('每周运动');
  await page.getByText('每周', { exact: true }).click();
  await page.locator('input').nth(1).fill('3');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('目标周期', { exact: true }).waitFor({ state: 'hidden' });
  await page.getByText('每周运动', { exact: true }).nth(1).waitFor();
  await page.screenshot({ path: 'artifacts/smoke-habits.png', fullPage: true });

  await page.getByText('待办', { exact: true }).last().click();
  await page.getByText('自定义', { exact: true }).click();
  await page.getByText('界面冒烟测试待办', { exact: true }).nth(1).waitFor();
  await page.getByText('拖动排序', { exact: true }).click();
  await page.getByText('待办自定义排序', { exact: true }).waitFor();
  await page.waitForTimeout(500);
  const secondHandle = page.getByLabel('拖动 第二个无日期待办');
  const secondBox = await secondHandle.boundingBox();
  assert.ok(secondBox, 'Second reorder handle should be visible');
  const client = await context.newCDPSession(page);
  const touchX = secondBox.x + secondBox.width / 2;
  const touchY = secondBox.y + secondBox.height / 2;
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: touchX, y: touchY, radiusX: 4, radiusY: 4, force: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: touchX, y: touchY - 74, radiusX: 4, radiusY: 4, force: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const firstBoxAfter = await page.getByLabel('拖动 界面冒烟测试待办').boundingBox();
  const secondBoxAfter = await page.getByLabel('拖动 第二个无日期待办').boundingBox();
  await page.screenshot({ path: 'artifacts/smoke-reorder.png', fullPage: true });
  assert.ok(firstBoxAfter && secondBoxAfter && secondBoxAfter.y < firstBoxAfter.y, 'Dragged item should move above the first item');
  await page.getByText('保存', { exact: true }).click();
  await page.getByText('待办自定义排序', { exact: true }).waitFor({ state: 'hidden' });
  await page.screenshot({ path: 'artifacts/smoke-tasks.png', fullPage: true });

  process.stdout.write('Smoke test passed: today, todo, undo, habit cadence, custom view, and drag reorder.\n');
} finally {
  await browser.close();
}
