import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { setup, createPage } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    const page = await createPage('/')

    expect(await page.innerHTML('h1')).toMatch('Test update user profile')
    expect(await page.inputValue('#name')).toMatch('')
    expect(await page.inputValue('#email')).toMatch('')
    expect(await page.innerHTML('#name-error')).toMatch('Type your name')
    expect(await page.innerHTML('#email-error')).toMatch('Type your email')
  })
}, 10000)
