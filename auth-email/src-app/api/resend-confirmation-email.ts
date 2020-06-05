import { NextApiRequest, NextApiResponse } from "next"
import { ok, unexpectedError, AuthRouteHandlerOptions } from "."
import jwt from "jsonwebtoken"

export function createResendConfirmationEmail(
  options: AuthRouteHandlerOptions,
) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function resendConfirmationEmail(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const { email } = req.body

    if (typeof email !== "string") {
      res.status(200).json({
        error: {
          code: "invalid email",
          message: "Invalid email.",
        },
      })
      return
    }

    if (email.trim() === "") {
      res.status(200).json({
        error: {
          code: "missing email",
          message: "Email must be provided.",
        },
      })
      return
    }

    try {
      const userId = await options.driver.getUserIdByEmail(
        email.trim().toLowerCase(),
      )

      if (!userId) {
        // We don't give any information whether the user exists or not
        ok(res)
        return
      }

      // TODO only send confirmation email for unconfirmed accounts?

      const confirmJwt = jwt.sign(
        { userId },
        options.serverConfig.tokenSecret,
        {
          expiresIn: "1h",
        },
      )
      const link = `${options.publicConfig.baseUrl}/confirm-account#token=${confirmJwt}`
      await options.triggers.sendConfirmAccountMail(email, link)
      ok(res)
    } catch (error) {
      unexpectedError(res, error)
    }
  }
}
