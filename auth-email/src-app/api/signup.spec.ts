import { createSignup } from "./signup"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"

let options = createAuthRouteHandlerOptions()
let signup = createSignup(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  signup = createSignup(options)
})

test("when tokenSecret is missing", () => {
  expect(() =>
    createSignup({
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
    () => signup,
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
  "when request body is missing password",
  handler(
    () => signup,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: { code: "invalid password", message: "Invalid password." },
      })
    },
  ),
)

test(
  "when email is missing",
  handler(
    () => signup,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "", password: "hunter2" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "missing email or password",
          message: "Email and password must be provided.",
        },
      })
    },
  ),
)

test(
  "when password is missing",
  handler(
    () => signup,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "missing email or password",
          message: "Email and password must be provided.",
        },
      })
    },
  ),
)

test(
  "when signup is successful",
  handler(
    () => {
      options.driver.createEmailUser = jest.fn(async () => ({
        success: true as true,
        data: { userId: "1" },
      }))
      options.triggers.sendConfirmAccountMail = jest.fn()
      return createSignup(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "hunter2" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(options.triggers.sendConfirmAccountMail).toHaveBeenCalledWith(
        "user@test.com",
        expect.stringMatching(
          new RegExp("^http://localhost:3000/confirm-account#token=ey"),
        ),
      )
      expect(data).toEqual({ data: { ok: true } })
    },
  ),
)

test(
  "when user exists already",
  handler(
    () => {
      options.driver.createEmailUser = jest.fn(async () => {
        const creationError: {
          success: false
          reason: "instance not unique"
        } = {
          success: false,
          reason: "instance not unique",
        }
        return creationError
      })
      options.triggers.sendConfirmAccountMail = jest.fn()
      return createSignup(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "hunter2" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(options.triggers.sendConfirmAccountMail).not.toHaveBeenCalled()
      expect(data).toEqual({ data: { ok: true } })
    },
  ),
)

test(
  "when user creation fails",
  handler(
    () => {
      options.driver.createEmailUser = jest.fn(async () => {
        throw new Error("custom error")
      })
      options.triggers.sendConfirmAccountMail = jest.fn()
      return createSignup(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "hunter2" }),
      })
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(options.triggers.sendConfirmAccountMail).not.toHaveBeenCalled()
      expect(data).toEqual({ error: { code: "unexpected error" } })
    },
  ),
)
