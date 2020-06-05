import { createTokenContent } from "./tokencontent"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
  createAuthCookie,
} from "../jest/utils.node"

let options = createAuthRouteHandlerOptions()
let tokenContent = createTokenContent(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  tokenContent = createTokenContent(options)
})

test(
  "when authenticated",
  handler(
    () => tokenContent,
    async (url) => {
      const payload = { userId: "1", foo: true }
      const response = await fetch(url, {
        headers: { Cookie: createAuthCookie(options, payload) },
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        data: expect.objectContaining({
          value: "signedIn",
          context: {
            tokenData: expect.objectContaining(payload),
            error: null,
          },
        }),
      })
    },
  ),
)

test(
  "when not authenticated",
  handler(
    () => tokenContent,
    async (url) => {
      const response = await fetch(url)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        data: {
          context: {
            error: null,
            tokenData: null,
          },
          value: "signedOut",
        },
      })
    },
  ),
)
