import { NextApiRequest, NextApiResponse } from "next"
import cookie from "cookie"
import { AccountStatus, Provider } from ".."
import { serializeAuthCookie, AuthRouteHandlerOptions } from "."
import { create, ModuleOptions } from "simple-oauth2"
import crypto from "crypto"

function randomString(size = 21) {
  return crypto.randomBytes(size).toString("hex").slice(0, size)
}

const extract = (x: string | string[]) => (Array.isArray(x) ? x[0] : x)

const toArray = (x: any | any[]) => (Array.isArray(x) ? x : [x])

const has = (obj: object, key: string | number) =>
  Object.prototype.hasOwnProperty.call(obj, key)

export function createOAuth(options: AuthRouteHandlerOptions) {
  if (!options.serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  return async function oauthFn(req: NextApiRequest, res: NextApiResponse) {
    // remove "oauth" from params
    const params = toArray(req.query.params).slice(1)
    if (params.length < 2) {
      res.status(200).json({
        error: {
          code: "missing identity_provider or method",
          message: "Provide an identity_provider and a method.",
        },
      })
      return
    }

    const identityProvider = params[0] as
      | keyof typeof options.serverConfig.identityProviders
      | null

    if (!identityProvider) {
      return res.status(200).json({
        error: { code: "missing identity_provider" },
      })
    }

    if (!has(options.serverConfig.identityProviders, identityProvider)) {
      return res.status(200).json({
        error: { code: "unknown identity_provider" },
      })
    }

    const method = params[1]

    const idp = options.serverConfig.identityProviders[identityProvider]
    const redirectUri = `${options.publicConfig.baseUrl}/api/auth/oauth/${identityProvider}/idpresponse`

    if (method === "authorize") {
      // see here for description of query params
      // https://aws.amazon.com/de/blogs/mobile/understanding-amazon-cognito-user-pool-oauth-2-0-grants/
      //
      // identity_provider(github/facebook/key in config)
      // response_type // code for Authorization code, token for Implicit grant
      // redirect_uri
      const state = randomString(32)

      // preconfigured oauth flow
      const oauth2 = create(idp.credentials as ModuleOptions<"client_id">)

      const authorizationUri = oauth2.authorizationCode.authorizeURL({
        redirect_uri: redirectUri,
        scope: idp.scope,
        state,
      })
      res.setHeader(
        "Set-Cookie",
        cookie.serialize("oauth2state", state, {
          sameSite: "lax",
          secure: options.serverConfig.secure,
          httpOnly: true,
          path: "/",
        }),
      )
      res.setHeader("Location", authorizationUri)
      res.setHeader("Cache-Control", "no-cache")
      res.statusMessage = "Found"
      res.status(302).end()
    }

    if (method === "idpresponse") {
      const oauth2 = create(idp.credentials as ModuleOptions<"client_id">)

      // ensure state matches the stored state to prevent CSRF
      if (req.query.state !== req.cookies.oauth2state) {
        return res.status(500).json({
          error: {
            code: "open authentication failed",
            message: "Open Authentication failed",
          },
        })
      }

      try {
        const token = await oauth2.authorizationCode.getToken({
          code: extract(req.query.code),
          redirect_uri: redirectUri,
        })

        // upsert user
        // store this in users' identities?
        // {
        //   "access_token": "xxxxxx",
        //   "token_type": "bearer",
        //   "scope": "notifications"
        // }
        const userId = await options.serverConfig.identityProviders[
          identityProvider
        ].upsertUser(token)

        // create our token
        // the oauth token never makes it to the client, except if we deliberately
        // store it upon creation/login and then put it in the token data from here
        //
        // Instead of forcing users to store it in the database, we pass it
        // to fetchAdditionalTokenContent, but only in case of OAuth (only here)
        const additionalTokenContent = options.serverConfig.triggers
          .fetchAdditionalTokenContent
          ? await options.serverConfig.triggers.fetchAdditionalTokenContent({
              userId,
              oauthToken: token,
            })
          : {}

        const serializedCookie = serializeAuthCookie(
          options.serverConfig,
          {
            userId,
            ...additionalTokenContent,
            provider: String(identityProvider) as Provider,
            accountStatus: AccountStatus.confirmed,
          },
          { rememberMe: false },
        )

        const clearOAuthStateCookie = cookie.serialize("oauth2state", "", {
          sameSite: "lax",
          secure: options.serverConfig.secure,
          httpOnly: true,
          path: "/",
          maxAge: -1,
        })

        // set our token as cookie, the user is now signed in
        res.setHeader("Set-Cookie", [
          clearOAuthStateCookie,
          ...serializedCookie,
        ])
        res.setHeader("Location", options.publicConfig.baseUrl)
        res.statusMessage = "Found"
        res.status(302).end()
        return
      } catch (error) {
        console.error("Access Token Error", error.message)
        return res.status(200).json({
          error: {
            code: "authentication failed",
            message: "Authentication failed",
          },
        })
      }
    }
  }
}
