import { NextApiRequest, NextApiResponse } from "next"
import { AccountStatus, Provider } from ".."
import {
  serializeAuthCookie,
  ok,
  authenticationFailed,
  unexpectedError,
  AuthRouteHandlerOptions,
} from "."
import { Token } from "simple-oauth2"

export type FetchAdditionalTokenContent = (options: {
  userId: string
  // only defined when using an oauth flow
  oauthToken?: Token
}) => object

// consumers can either use the default, or they can use
// createEmailLogin to customize the default
export function createLogin(options: AuthRouteHandlerOptions) {
  return async function login(req: NextApiRequest, res: NextApiResponse) {
    const { email, password, rememberMe } = req.body

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
      const loginRes = await options.serverConfig.driver.attemptEmailPasswordLogin(
        email,
        password,
      )

      if (!loginRes.success) return authenticationFailed(res)

      if (loginRes.data.accountStatus !== AccountStatus.confirmed) {
        res.status(200).json({
          error: {
            code: "account not confirmed",
            message:
              "Your account is not confirmed yet. You need to confirm it before you can sign in.",
          },
        })
        return
      }

      const additionalTokenContent = options.serverConfig.triggers
        .fetchAdditionalTokenContent
        ? await options.serverConfig.triggers.fetchAdditionalTokenContent({
            userId: loginRes.data.userId,
          })
        : {}

      const serializedCookie = serializeAuthCookie(
        options.serverConfig,
        {
          userId: loginRes.data.userId,
          ...additionalTokenContent,
          provider: Provider.email,
          accountStatus: loginRes.data.accountStatus,
        },
        { rememberMe: Boolean(rememberMe) },
      )

      res.setHeader("Set-Cookie", serializedCookie)
      ok(res)
    } catch (error) {
      unexpectedError(res, error)
    }
  }
}
