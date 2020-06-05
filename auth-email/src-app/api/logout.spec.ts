import { createLogout } from "./logout"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"

let options = createAuthRouteHandlerOptions()
let logout = createLogout(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  logout = createLogout(options)
})

test(
  "when request body is missing email",
  handler(
    () => logout,
    async (url) => {
      const response = await fetch(url)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({ data: { ok: true } })
      expect(response.headers.get("Set-Cookie")).toMatch(
        new RegExp(
          `^${options.serverConfig.cookieName}=; Max-Age=-1; Path=/; HttpOnly; SameSite=Lax$`,
        ),
      )
    },
  ),
)
