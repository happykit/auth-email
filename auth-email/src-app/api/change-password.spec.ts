import { createChangePassword } from "./change-password"
import {
  createAuthRouteHandlerOptions,
  createAuthCookie,
  fetch,
  createApi,
  handler,
} from "../jest/utils.node"

let options = createAuthRouteHandlerOptions()
let changePassword = createChangePassword(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  changePassword = createChangePassword(options)
})

test("when tokenSecret is missing", () => {
  expect(() =>
    createChangePassword({
      ...options,
      serverConfig: {
        ...options.serverConfig,
        tokenSecret: "",
      },
    }),
  ).toThrow("HappyAuth: Missing token secret")
})

test("when not authenticated", async () => {
  const [url, close] = await createApi(changePassword)
  const response = await fetch(url)
  expect(response.status).toBe(200)

  const data = await response.json()
  expect(data).toEqual({ error: { code: "unauthorized" } })
  close()
})

test(
  "when authenticated and sending correct passwords",
  handler(
    () => {
      options.driver.changeEmailUserPassword = jest.fn(
        (userId: string, currentPassword: string, newPassword: string) =>
          Promise.resolve(),
      )
      return createChangePassword(options)
    },
    async (url) => {
      const authCookie = createAuthCookie(options, { userId: "1" })
      const response = await fetch(url, {
        method: "POST",
        headers: { Cookie: authCookie, "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "hunter2",
          newPassword: "hunter3",
        }),
      })
      expect(response.status).toBe(200)

      expect(options.driver.changeEmailUserPassword).toHaveBeenCalledWith(
        "1",
        "hunter2",
        "hunter3",
      )

      const data = await response.json()
      expect(data).toEqual({ data: { ok: true } })
    },
  ),
)

test(
  "when authenticated and sending incorrect current password",
  handler(
    () => {
      options.driver.changeEmailUserPassword = jest.fn(() => {
        throw new Error("authentication failed")
      })
      return createChangePassword(options)
    },
    async (url) => {
      const authCookie = createAuthCookie(options, { userId: "1" })
      const response = await fetch(url, {
        method: "POST",
        headers: { Cookie: authCookie, "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "hunter2",
          newPassword: "hunter3",
        }),
      })

      expect(response.status).toBe(200)

      expect(options.driver.changeEmailUserPassword).toHaveBeenCalledWith(
        "1",
        "hunter2",
        "hunter3",
      )

      const data = await response.json()
      expect(data).toEqual({ error: { code: "authentication failed" } })
    },
  ),
)
