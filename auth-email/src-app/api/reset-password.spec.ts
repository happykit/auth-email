import { createResetPassword } from "./reset-password"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"
import jwt from "jsonwebtoken"

let options = createAuthRouteHandlerOptions()
let resetPassword = createResetPassword(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  resetPassword = createResetPassword(options)
})

test("when tokenSecret is missing", () => {
  expect(() =>
    createResetPassword({
      ...options,
      serverConfig: {
        ...options.serverConfig,
        tokenSecret: "",
      },
    }),
  ).toThrow("HappyAuth: Missing token secret")
})

test(
  "when request body is missing token",
  handler(
    () => resetPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: { code: "invalid token", message: "Invalid token." },
      })
    },
  ),
)

test(
  "when request body is missing password",
  handler(
    () => resetPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "asdf" }),
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
  "when token is empty",
  handler(
    () => resetPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "", password: "hunter2" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: { code: "missing token", message: "Token must be provided." },
      })
    },
  ),
)

test(
  "when password is empty",
  handler(
    () => resetPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "fake-token", password: "" }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "missing password",
          message: "Password must be provided.",
        },
      })
    },
  ),
)

test(
  "when token is invalid",
  handler(
    () => resetPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "fake-token", password: "hunter2" }),
      })
      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data).toEqual({
        error: { code: "unexpected error", message: "jwt malformed" },
      })
    },
  ),
)

test(
  "when reset succeeds",
  handler(
    () => resetPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: jwt.sign({ userId: "1" }, options.serverConfig.tokenSecret),
          password: "hunter2",
        }),
      })
      expect(response.status).toBe(200)
      expect(options.triggers.fetchAdditionalTokenContent).toHaveBeenCalledWith(
        {
          userId: "1",
        },
      )
      expect(response.headers.get("Set-Cookie")).toMatch(
        new RegExp(
          `^${options.serverConfig.cookieName}=(\\s|.)+; Path=/; HttpOnly; SameSite=Lax`,
        ),
      )

      const data = await response.json()
      expect(data).toEqual({ data: { ok: true } })
    },
  ),
)
