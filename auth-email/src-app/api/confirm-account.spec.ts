import { createConfirmAccount } from "./confirm-account"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"
import jwt from "jsonwebtoken"

let options = createAuthRouteHandlerOptions()
let confirmAccount = createConfirmAccount(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  confirmAccount = createConfirmAccount(options)
})

test("when tokenSecret is missing", () => {
  expect(() =>
    createConfirmAccount({
      ...options,
      serverConfig: {
        ...options.serverConfig,
        tokenSecret: "",
      },
    }),
  ).toThrow("HappyAuth: Missing token secret")
})

test(
  "when request body is missing",
  handler(
    () => confirmAccount,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toEqual({ error: { code: "token missing" } })
    },
  ),
)

test(
  "when token verification fails",
  handler(
    () => {
      options.serverConfig.driver.confirmAccount = jest.fn(async () => false)
      return createConfirmAccount(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "invalid-token" }),
      })
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "unexpected error",
          message: "jwt malformed",
        },
      })
    },
  ),
)

test(
  "when account confirmation fails",
  handler(
    () => {
      options.serverConfig.driver.confirmAccount = jest.fn(async () => false)
      return createConfirmAccount(options)
    },
    async (url) => {
      const token = jwt.sign(
        { userId: "fake-user-id" },
        options.serverConfig.tokenSecret,
      )
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        error: { code: "no user or user in invalid state" },
      })
    },
  ),
)

test(
  "when account confirmation succeeds",
  handler(
    () => {
      options.serverConfig.driver.confirmAccount = jest.fn(async () => true)
      return createConfirmAccount(options)
    },
    async (url) => {
      const token = jwt.sign(
        { userId: "fake-user-id" },
        options.serverConfig.tokenSecret,
      )
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ data: { ok: true } })
      expect(response.headers.get("Set-Cookie")).toMatch(
        new RegExp(
          `^${options.serverConfig.cookieName}=(\s+|\.)+; Path=/; HttpOnly; SameSite=Lax, syncAuthState=login; Path=/; SameSite=Lax$`,
        ),
      )
    },
  ),
)
