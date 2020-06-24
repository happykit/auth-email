import { NextApiRequest, NextApiResponse } from "next"
import {
  unauthorized,
  authenticationFailed,
  unexpectedError,
  jwtExpired,
  ok,
  AuthRouteHandlerOptions,
} from "."

export function createChangePassword(options: AuthRouteHandlerOptions) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function changePassword(
    req: NextApiRequest,
    res: NextApiResponse,
  ): Promise<void> {
    const auth = options.getServerSideAuth(req)
    if (auth.value !== "signedIn") return unauthorized(res)
    const { currentPassword, newPassword } = req.body

    if (typeof currentPassword !== "string") {
      res.status(200).json({
        error: {
          code: "invalid current password",
          message: "Invalid current password.",
        },
      })
      return
    }

    if (typeof newPassword !== "string") {
      res.status(200).json({
        error: {
          code: "invalid new password",
          message: "Invalid new password.",
        },
      })
      return
    }

    try {
      if (!currentPassword) {
        res.status(200).json({
          error: {
            code: "missing current password",
            message: "Current password must be provided.",
          },
        })
        return
      }

      if (!newPassword) {
        res.status(200).json({
          error: {
            code: "missing new password",
            message: "New password must be provided.",
          },
        })
        return
      }

      // update user by storing new password
      await options.serverConfig.driver.changeEmailUserPassword(
        auth.context.tokenData.userId,
        currentPassword.trim(),
        newPassword.trim(),
      )

      ok(res)
    } catch (error) {
      if (error.message === "jwt expired") {
        jwtExpired(res)
      } else if ((error.message = "authentication failed")) {
        authenticationFailed(res)
      } else {
        console.log(error)
        unexpectedError(res, error)
      }
    }
  }
}
