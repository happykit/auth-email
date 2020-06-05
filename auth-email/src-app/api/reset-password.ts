import { NextApiRequest, NextApiResponse } from "next"
import jwt from "jsonwebtoken"
import { AccountStatus, Provider } from ".."
import {
  serializeAuthCookie,
  ok,
  jwtExpired,
  unexpectedError,
  AuthRouteHandlerOptions,
} from "."

export function createResetPassword(options: AuthRouteHandlerOptions) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function resetPassword(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const { token, password } = req.body

    if (typeof token !== "string") {
      res.status(200).json({
        error: {
          code: "invalid token",
          message: "Invalid token.",
        },
      })
      return
    }

    if (typeof password !== "string") {
      res.status(200).json({
        error: {
          code: "invalid password",
          message: "Invalid password.",
        },
      })
      return
    }

    if (!token) {
      res.status(200).json({
        error: {
          code: "missing token",
          message: "Token must be provided.",
        },
      })
      return
    }

    if (!password) {
      res.status(200).json({
        error: {
          code: "missing password",
          message: "Password must be provided.",
        },
      })
      return
    }

    try {
      const data = jwt.verify(token, options.serverConfig.tokenSecret) as {
        userId: string
      }

      const userId = data.userId
      await options.driver.updateEmailUserPassword(userId, password.trim())

      const additionalTokenContent = options.triggers
        .fetchAdditionalTokenContent
        ? await options.triggers.fetchAdditionalTokenContent({ userId })
        : {}

      const serializedCookie = serializeAuthCookie(
        options.serverConfig,
        {
          userId,
          ...additionalTokenContent,
          provider: Provider.email,
          accountStatus: AccountStatus.confirmed,
        },
        { rememberMe: false },
      )

      res.setHeader("Set-Cookie", serializedCookie)
      ok(res)
    } catch (error) {
      if (error.message === "jwt expired") {
        jwtExpired(res)
      } else {
        unexpectedError(res, error)
      }
    }
  }
}
