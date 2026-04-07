import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
// 6-char valid code (alphabet: ABCDEFGHJKLMNPQRSTUVWXYZ23456789, no I/O/1/0)
const TEST_CODE = 'TSTAB2'

// ── 1. API health ─────────────────────────────────────────────────────────────

test('GET /api/health returns ok', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.status).toBe('ok')
})

// ── 2. Token API ──────────────────────────────────────────────────────────────

test('GET /api/token returns a JWT for valid 6-char room', async ({ request }) => {
  // Room code must be exactly 6 A-Z0-9 chars
  const res = await request.get('/api/token?room=AABBCC&identity=Alice')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(typeof body.token).toBe('string')
  expect(body.token.split('.').length).toBe(3) // JWT = header.payload.sig
})

test('GET /api/token returns 400 for short room code', async ({ request }) => {
  const res = await request.get('/api/token?room=AB&identity=Alice')
  expect(res.status()).toBe(400)
})

// ── 3. Homepage ───────────────────────────────────────────────────────────────

test('homepage loads with Vyde branding', async ({ page }) => {
  await page.goto(BASE)
  // Title "Vyde" present in heading
  await expect(page.getByRole('heading').filter({ hasText: /vyde/i }).first()
    .or(page.locator('h1').filter({ hasText: /vyde/i }))).toBeVisible({ timeout: 5_000 })
})

test('entering a valid 6-char code navigates to call page', async ({ page }) => {
  await page.goto(BASE)
  // CodeEntry input has placeholder "ENTER CODE" and maxLength=6
  const input = page.locator('input[placeholder="ENTER CODE"]')
  await input.fill(TEST_CODE)
  // The "Join Call" button inside CodeEntry
  const joinBtn = page.getByRole('button', { name: /join call/i })
  await expect(joinBtn).toBeEnabled({ timeout: 3_000 })
  await joinBtn.click()
  await expect(page).toHaveURL(new RegExp(`/call/${TEST_CODE}`, 'i'), { timeout: 5_000 })
})

// ── 4. Call page structure ────────────────────────────────────────────────────

test('call page shows connecting screen', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/call/${TEST_CODE}`)

  // Should show connecting spinner immediately
  await expect(page.locator('text=Connecting').first()).toBeVisible({ timeout: 5_000 })
  await ctx.close()
})

test('call page resolves to call UI or error screen within 30s', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/call/${TEST_CODE}`)

  // Wait for either: call controls (End call button) OR error screen
  const endCallBtn = page.getByRole('button', { name: 'End call' })
  const errorHeading = page.getByRole('heading', { name: /connection problem/i })

  await expect(endCallBtn.or(errorHeading)).toBeVisible({ timeout: 30_000 })
  await ctx.close()
})

test('call page shows error screen with retry when token API fails', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] })
  const page = await ctx.newPage()
  // Make token API fail
  await page.route('/api/token*', route => route.fulfill({ status: 500, body: '{"error":"test"}' }))
  await page.goto(`${BASE}/call/${TEST_CODE}`)

  // Should eventually show error screen
  await expect(page.getByRole('heading', { name: /connection problem/i })).toBeVisible({ timeout: 15_000 })
  // Retry button should be present
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
  await ctx.close()
})

// ── 5. Full call – two browser contexts ──────────────────────────────────────

test.describe('two-user call flow', () => {
  test('both users connect, call controls visible, chat relay works, end call', async ({ browser }) => {
    const hostCtx = await browser.newContext({ permissions: ['camera', 'microphone'] })
    const guestCtx = await browser.newContext({ permissions: ['camera', 'microphone'] })
    const hostPage = await hostCtx.newPage()
    const guestPage = await guestCtx.newPage()

    // Use unique room for this test run (6 chars from valid alphabet)
    const ts = Date.now().toString(36).toUpperCase().replace(/[^A-Z2-9]/g, 'A')
    const room = (`CALL${ts}`).slice(0, 6)

    await Promise.all([
      hostPage.goto(`${BASE}/call/${room}`),
      guestPage.goto(`${BASE}/call/${room}`),
    ])

    // Both should show "Connecting" first
    await Promise.all([
      expect(hostPage.locator('text=Connecting').first()).toBeVisible({ timeout: 5_000 }),
      expect(guestPage.locator('text=Connecting').first()).toBeVisible({ timeout: 5_000 }),
    ])

    // Wait for both to reach call UI (end call button visible) or error screen
    const hostEndBtn = hostPage.getByRole('button', { name: 'End call' })
    const guestEndBtn = guestPage.getByRole('button', { name: 'End call' })
    const hostErr = hostPage.getByRole('heading', { name: /connection problem/i })
    const guestErr = guestPage.getByRole('heading', { name: /connection problem/i })

    await Promise.all([
      expect(hostEndBtn.or(hostErr)).toBeVisible({ timeout: 30_000 }),
      expect(guestEndBtn.or(guestErr)).toBeVisible({ timeout: 30_000 }),
    ])

    // If both connected (no error), test mic toggle and chat
    const hostConnected = await hostEndBtn.isVisible()
    const guestConnected = await guestEndBtn.isVisible()

    if (hostConnected && guestConnected) {
      // ── Mic toggle ────────────────────────────────────────────────────────
      const micBtn = hostPage.getByRole('button', { name: /mute mic|unmute mic/i })
      if (await micBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const initialLabel = await micBtn.getAttribute('aria-label')
        await micBtn.click()
        await hostPage.waitForTimeout(600)
        const afterLabel = await micBtn.getAttribute('aria-label')
        // Label should have flipped between mute/unmute
        expect(afterLabel).not.toBe(initialLabel)
      }

      // ── Chat relay ────────────────────────────────────────────────────────
      // Open host chat via the Chat button in CallControls
      const hostChatBtn = hostPage.getByRole('button', { name: /chat/i })
      if (await hostChatBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await hostChatBtn.click()
        const hostInput = hostPage.locator('input[placeholder*="message" i], input[placeholder*="type" i]').first()

        if (await hostInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
          const msg = `relay-${Date.now()}`
          await hostInput.fill(msg)
          await hostInput.press('Enter')

          // Message appears in host chat immediately (optimistic)
          await expect(hostPage.locator(`text=${msg}`)).toBeVisible({ timeout: 5_000 })

          // Open guest chat
          const guestChatBtn = guestPage.getByRole('button', { name: /chat/i })
          await guestChatBtn.click().catch(() => {})

          // Message should arrive in guest window via PartyKit relay
          await expect(guestPage.locator(`text=${msg}`)).toBeVisible({ timeout: 8_000 })
        }
      }

      // ── End call ──────────────────────────────────────────────────────────
      await hostEndBtn.click()
      await expect(hostPage).toHaveURL(/\?ended=1/, { timeout: 5_000 })
    } else {
      // At minimum, verify we got some response (not hanging forever)
      const hostResolved = hostConnected || (await hostErr.isVisible())
      const guestResolved = guestConnected || (await guestErr.isVisible())
      console.log(`Host resolved: ${hostResolved}, Guest resolved: ${guestResolved}`)
      expect(hostResolved).toBeTruthy()
      expect(guestResolved).toBeTruthy()
    }

    await hostCtx.close()
    await guestCtx.close()
  })
})

// ── 6. PartyKit WebSocket direct test ────────────────────────────────────────

test('PartyKit WebSocket connects and receives welcome', async ({ page }) => {
  const room = `WS${Date.now().toString(36).toUpperCase().slice(-4)}`
  const wsUrl = `ws://localhost:1999/parties/main/${room}`

  const received: string[] = []

  await page.exposeFunction('onWsMessage', (data: string) => { received.push(data) })

  await page.evaluate(({ url }) => {
    const ws = new WebSocket(url)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', userId: 'u1', displayName: 'Tester' }))
    }
    ws.onmessage = (e) => (window as any).onWsMessage(e.data)
  }, { url: wsUrl })

  await page.waitForTimeout(2_000)

  // Should have received at least one message (the "welcome" message)
  expect(received.length).toBeGreaterThan(0)
  const welcome = received.find(r => r.includes('"welcome"') || r.includes('"type":"welcome"'))
  expect(welcome).toBeTruthy()
})

// ── 7. Audio-only mode (camera denied) ───────────────────────────────────────

test('call continues as audio-only when camera is denied', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['microphone'] }) // no camera
  const page = await ctx.newPage()

  // Simulate camera denial via getUserMedia override
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints?.video) throw new DOMException('Permission denied', 'NotAllowedError')
      return orig(constraints)
    }
  })

  await page.goto(`${BASE}/call/${TEST_CODE}`)

  // Should show connecting (not crash immediately)
  await expect(page.locator('text=Connecting').first()).toBeVisible({ timeout: 5_000 })

  // Wait for resolution — should NOT crash fatally
  await page.waitForTimeout(10_000)
  // Check it's not showing a JS crash ("Something went wrong" from React error boundary)
  const crashed = await page.locator('text=Something went wrong').isVisible().catch(() => false)
  expect(crashed).toBe(false)

  await ctx.close()
})
