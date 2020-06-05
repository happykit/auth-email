import { NextApiRequest, NextApiResponse } from "next"
import { BaseTokenData, Provider, AccountStatus } from ".."
import {
  AuthRouteHandlerOptions,
  serializeAuthCookie,
  unexpectedError,
  ok,
} from "."
import jwt from "jsonwebtoken"

export function createConfirmAccount(options: AuthRouteHandlerOptions) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function confirmAccount(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const { token } = req.body

    if (!token) {
      res.status(500).json({ error: { code: "token missing" } })
      return
    }

    try {
      const data = jwt.verify(
        token,
        options.serverConfig.tokenSecret,
      ) as BaseTokenData

      const confirmed = await options.driver!.confirmAccount(data.userId)

      if (!confirmed) {
        res
          .status(200)
          .json({ error: { code: "no user or user in invalid state" } })
        return
      } else {
        const userId = data.userId
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
      }
    } catch (error) {
      unexpectedError(res, error)
    }
  }
}
