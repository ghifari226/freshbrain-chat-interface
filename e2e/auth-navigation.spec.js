import { expect, test } from '@playwright/test'

async function logInAsAdmin(page) {
  await page.goto('/')

  await page.getByLabel('Email').fill('admin')
  await page.getByLabel('Kata sandi').fill('admin')
  await page.getByRole('button', { name: 'Masuk' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('button', { name: 'Menu akun' })).toBeVisible()
}

test('logs in and opens access configuration', async ({ page }) => {
  await logInAsAdmin(page)

  await page.getByRole('button', { name: 'Menu akun' }).click()
  await page.getByRole('button', { name: 'Admin' }).click()

  await expect(page).toHaveURL('/config')
  await expect(page.getByRole('button', { name: 'Konfigurasi Akses' })).toBeVisible()
})

test('redirects an unknown authenticated route to chat home', async ({ page }) => {
  await logInAsAdmin(page)

  await page.goto('/not-a-real-route')
  await expect(page).toHaveURL('/')
})
