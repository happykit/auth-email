import { createForgotPassword } from "./forgot-password"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"
import jwt from "jsonwebtoken"

let options = createAuthRouteHandlerOptions()
let forgotPassword = createForgotPassword(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  forgotPassword = createForgotPassword(options)
})

test("when tokenSecret is missing", () => {
  expect(() =>
    createForgotPassword({
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
    () => forgotPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "invalid email",
          message: "Email must be provided as a string.",
        },
      })
    },
  ),
)

test(
  "when request body contains an empty email",
  handler(
    () => forgotPassword,
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "   " }),
      })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "missing email",
          message: "Email must be provided.",
        },
      })
    },
  ),
)

test(
  "when the email does not match a user",
  handler(
    () => {
      options.driver.getUserIdByEmail = jest.fn(async () => null)
      options.triggers.sendForgotPasswordMail = jest.fn()
      return createForgotPassword(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(options.triggers.sendForgotPasswordMail).not.toHaveBeenCalled()
      expect(body).toEqual({ data: { ok: true } })
    },
  ),
)

test(
  "when the email matches a user",
  handler(
    () => {
      options.driver.getUserIdByEmail = jest.fn(async () => "fake-user-id")
      options.triggers.sendForgotPasswordMail = jest.fn()
      return createForgotPassword(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(options.triggers.sendForgotPasswordMail).toHaveBeenCalledWith(
        "user@test.com",
        expect.stringMatching(
          new RegExp(
            `^${options.publicConfig.baseUrl}/reset-password#token=(\s|\.)+`,
          ),
        ),
      )
      expect(body).toEqual({ data: { ok: true } })
    },
  ),
)

test(
  "when an unexpected error happens during getUserIdByEmail",
  handler(
    () => {
      options.driver.getUserIdByEmail = jest.fn(async () => {
        throw new Error("hmm")
      })
      options.triggers.sendForgotPasswordMail = jest.fn()
      return createForgotPassword(options)
    },
    async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@test.com" }),
      })
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body).toEqual({
        error: { code: "unexpected error", message: "hmm" },
      })
    },
  ),
)
