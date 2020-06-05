import cookie from "cookie"
import { NextApiRequest, NextApiResponse } from "next"
import { ok, AuthRouteHandlerOptions } from "."

export function createLogout(options: AuthRouteHandlerOptions) {
  return async function logout(req: NextApiRequest, res: NextApiResponse) {
    // Clear cookie no matter what.
    // The jwt contains a fauna secret which can be used to act as the user.
    // We want to remove that from the client in any case.
    const serializedCookie = cookie.serialize(
      options.serverConfig.cookieName,
      "",
      {
        sameSite: "lax",
        secure: options.serverConfig.secure,
        maxAge: -1,
        httpOnly: true,
        path: "/",
      },
    )
    res.setHeader("Set-Cookie", serializedCookie)
    ok(res)
  }
}
