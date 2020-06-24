import { NextApiRequest, NextApiResponse } from "next"
import { ok, unexpectedError, AuthRouteHandlerOptions } from "."
import jwt from "jsonwebtoken"

export type SendConfirmAccountMail = (
  email: string,
  link: string,
) => Promise<void>

export const sendConfirmAccountMailToConsole: SendConfirmAccountMail = async (
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
      "Welcome,",
      "",
      "your account has been created.",
      "",
      "Click the link below to activate it:",
      link,
      "",
      "Cheers",
      "",
      "PS: If you did not sign up, you can simply ignore this email.",
      "",
      "***********************************************************************",
      "",
    ].join("\n"),
  )
}

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

export function createSignup(options: AuthRouteHandlerOptions) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function signup(req: NextApiRequest, res: NextApiResponse) {
    const { email, password } = req.body

    if (typeof email !== "string") {
      res.status(200).json({
        error: {
          code: "invalid email",
          message: "Invalid email.",
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

    if (!email || !password) {
      res.status(200).json({
        error: {
          code: "missing email or password",
          message: "Email and password must be provided.",
        },
      })
      return
    }

    try {
      const lowercasedEmail = email.trim().toLowerCase()
      const trimmedPassword = password.trim()

      const creationDelay = delay()
      const response = await options.serverConfig.driver.createEmailUser(
        lowercasedEmail,
        trimmedPassword,
      )
      // take same time for creation
      await creationDelay

      if (!response.success) {
        // We send an "ok" back anyways, since we don't want to give any
        // information about the potential existance of that account.
        ok(res)
        return
      }

      const confirmJwt = jwt.sign(
        { userId: response.data.userId },
        options.serverConfig.tokenSecret,
        { expiresIn: "1h" },
      )
      const link = `${options.publicConfig.baseUrl}/confirm-account#token=${confirmJwt}`

      // answer request immediately, then continue sending the mail
      ok(res)
      await options.serverConfig.triggers.sendConfirmAccountMail(email, link)
    } catch (error) {
      unexpectedError(res)
    }
  }
}
