import { createLogin } from "./login"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"
import { AccountStatus } from ".."

let options = createAuthRouteHandlerOptions()
let login = createLogin(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  login = createLogin(options)
})

test(
  "when request body is missing email",
  handler(
    () => login,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: "invalid email",
          message: "Invalid email.",
        },
      })
    },
  ),
)

test(
  "when request body is missing password",
  handler(
    () => login,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: "invalid password",
          message: "Invalid password.",
        },
      })
    },
  ),
)

test(
  "when request body contains empty email",
  handler(
    () => login,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "", password: "x" }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: "missing email or password",
          message: "Email and password must be provided.",
        },
      })
    },
  ),
)

test(
  "when request body contains empty password",
  handler(
    () => login,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "" }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: "missing email or password",
          message: "Email and password must be provided.",
        },
      })
    },
  ),
)

test(
  "when account is not confirmed",
  handler(
    () => {
      options.driver.attemptEmailPasswordLogin = jest.fn(async () => ({
        success: true as true,
        data: {
          userId: "1",
          accountStatus: AccountStatus.unconfirmed,
        },
      }))
      return createLogin(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "x" }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        error: {
          code: "account not confirmed",
          message:
            "Your account is not confirmed yet. You need to confirm it before you can sign in.",
        },
      })
    },
  ),
)

test(
  "when credentials are invalid",
  handler(
    () => {
      options.driver.attemptEmailPasswordLogin = jest.fn(async () => {
        const loginError = {
          success: false as false,
          reason: "authentication failed" as "authentication failed",
        }
        return loginError
      })
      return createLogin(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "x" }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({ error: { code: "authentication failed" } })
    },
  ),
)

test(
  "when login is successful",
  handler(
    () => {
      options.driver.attemptEmailPasswordLogin = jest.fn(async () => ({
        success: true as true,
        data: {
          userId: "1",
          accountStatus: AccountStatus.confirmed,
        },
      }))
      return createLogin(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "x" }),
      })
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(response.headers.get("Set-Cookie")).toMatch(
        new RegExp(
          `^${options.serverConfig.cookieName}=(\s+|\.)+; Path=/; HttpOnly; SameSite=Lax, syncAuthState=login; Path=/; SameSite=Lax$`,
        ),
      )
      expect(options.triggers.fetchAdditionalTokenContent).toHaveBeenCalledWith(
        {
          userId: "1",
        },
      )
      expect(body).toEqual({ data: { ok: true } })
    },
  ),
)
