import jwt from "jsonwebtoken"
import { NextApiRequest, NextApiResponse } from "next"
import { ok, unexpectedError, AuthRouteHandlerOptions } from "."

export type SendForgotPasswordMail = (
  email: string,
  link: string,
) => Promise<void>

export const sendForgotPasswordMailToConsole: SendForgotPasswordMail = async (
  email,
  link,
) => {
  console.log(
    [
      "",
      "***********************************************************************",
      `To: ${email}`,
      "***********************************************************************",
      "",
      "Hello,",
      "",
      "somebody requested a reset of your password.",
      "Click the link below to reset it:",
      link,
      "",
      "Cheers",
      "",
      "***********************************************************************",
      "",
    ].join("\n"),
  )
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

export function createForgotPassword(options: AuthRouteHandlerOptions) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function forgotPassword(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const { email } = req.body

    if (typeof email !== "string") {
      res.status(200).json({
        error: {
          code: "invalid email",
          message: "Email must be provided as a string.",
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
      const userId = await options.serverConfig.driver.getUserIdByEmail(email)

      const forgotPasswordDelay = delay()

      if (userId) {
        new Promise((resolve, reject) => {
          jwt.sign(
            { userId },
            options.serverConfig.tokenSecret,
            { expiresIn: "1h" },
            (err, resetJwt) => {
              if (err) return reject(err)

              const link = `${options.publicConfig.baseUrl}/reset-password#token=${resetJwt}`
              resolve(
                options.serverConfig.triggers.sendForgotPasswordMail(
                  email,
                  link,
                ),
              )
            },
          )
        })
      }

      // take roughly the same time no matter whether login succeeds or not to
      // prevent user enumeration attacks
      await forgotPasswordDelay

      ok(res)
    } catch (error) {
      unexpectedError(res, error)
    }
  }
}
