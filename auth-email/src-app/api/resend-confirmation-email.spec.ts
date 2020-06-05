import { createResendConfirmationEmail } from "./resend-confirmation-email"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"

let options = createAuthRouteHandlerOptions()
let resendConfirmationEmail = createResendConfirmationEmail(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  resendConfirmationEmail = createResendConfirmationEmail(options)
})

test("when tokenSecret is missing", () => {
  expect(() =>
    createResendConfirmationEmail({
      ...options,
      serverConfig: {
        ...options.serverConfig,
        tokenSecret: "",
      },
    }),
  ).toThrow("HappyAuth: Missing token secret")
})

test(
  "when request body is missing email",
  handler(
    () => resendConfirmationEmail,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: { code: "invalid email", message: "Invalid email." },
      })
    },
  ),
)

test(
  "when request email is empty",
  handler(
    () => resendConfirmationEmail,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "  " }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: { code: "missing email", message: "Email must be provided." },
      })
    },
  ),
)

test(
  "when no user exists for that email",
  handler(
    () => {
      options.driver.getUserIdByEmail = jest.fn(async () => null)
      return createResendConfirmationEmail(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({ data: { ok: true } })
    },
  ),
)

test(
  "when a user exists for that email",
  handler(
    () => {
      options.driver.getUserIdByEmail = jest.fn(async () => "1")
      return createResendConfirmationEmail(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({ data: { ok: true } })
    },
  ),
)
