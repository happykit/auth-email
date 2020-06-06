import { NextApiResponse, NextApiRequest } from "next"
import { BaseTokenData, PublicConfig, AccountStatus, BaseAuthState } from ".."
import { IncomingMessage, ServerResponse } from "http"
import { createLogin, FetchAdditionalTokenContent } from "./login"
import { createLogout } from "./logout"
import {
  createSignup,
  sendConfirmAccountMailToConsole,
  SendConfirmAccountMail,
} from "./signup"
import { createTokenContent } from "./tokencontent"
import {
  createForgotPassword,
  sendForgotPasswordMailToConsole,
  SendForgotPasswordMail,
} from "./forgot-password"
import { createResetPassword } from "./reset-password"
import { createChangePassword } from "./change-password"
import { createConfirmAccount } from "./confirm-account"
import { createResendConfirmationEmail } from "./resend-confirmation-email"
import { createOAuth } from "./oauth"
import { createConnect } from "./connect"
import { Token, ModuleOptions } from "simple-oauth2"
import ms from "ms"
import cookie from "cookie"
import jwt from "jsonwebtoken"

export { createFaunaEmailDriver } from "../drivers/fauna"
export {
  SendForgotPasswordMail,
  SendConfirmAccountMail,
  sendConfirmAccountMailToConsole,
  sendForgotPasswordMailToConsole,
}

const extract = (x: string | string[]) => (Array.isArray(x) ? x[0] : x)

export type ServerConfig = {
  /**
   * Used to sign different tokens (auth, confirm account, reset password, change password, OAuth).
   */
  tokenSecret: string
  /**
   * Name under which your auth cookie will be stored
   */
  cookieName: string
  /**
   * Whether to set the auth cookie to "secure" or not.
   *
   * If the cookie is set to "secure", it will only be sent over HTTPS. It's
   * recommended to set this to true in production, and to false in development.
   *
   * Note that the cookie is always set to httpOnly.
   *
   * Example: { secure: process.env.NODE_ENV === 'production' }
   */
  secure: boolean
  /**
   * A list of identity provider configurations for OAuth logins and signups.
   *
   * This is the server part of the configuration. You'll also need to configure `publicConfig.identityProviders`.
   */
  identityProviders: IdentityProviderConfig
}

export type GetServerSideAuth = ReturnType<typeof createGetServerSideAuth>
/**
 * Returns preconfigured getServerSideAuth function.
 *
 * Use that getServerSideAuth function in your application.
 */
export function createGetServerSideAuth<T extends BaseTokenData>(
  serverConfig: ServerConfig,
) {
  /**
   * Returns the initial auth state for pages.
   *
   * Return this value as a prop from your getServerSideProps function.
   * Then pass that prop to your useAuth() function to preload the auth state for that page.
   */
  return function getServerSideAuth(req: IncomingMessage): BaseAuthState<T> {
    if (!serverConfig.tokenSecret)
      throw new Error("HappyAuth: Missing serverConfig.tokenSecret")

    if (!serverConfig.cookieName)
      throw new Error("HappyAuth: Missing serverConfig.cookieName")

    const cookies = cookie.parse(req.headers.cookie ?? "")
    const authCookie = cookies[serverConfig.cookieName]
    try {
      const tokenData = jwt.verify(authCookie, serverConfig.tokenSecret) as T
      return {
        value: "signedIn",
        context: { tokenData, error: null },
      }
    } catch (e) {
      return {
        value: "signedOut",
        context: { tokenData: null, error: null },
      }
    }
  }
}

/**
 * OAuth providers.
 */
export type IdentityProviderConfig = {
  [idp: string]: {
    credentials: ModuleOptions<"client_id">
    /**
     * The scopes to request
     */
    scope?: string
    /**
     * A custom function which upserts the user into your database.
     *
     * This function will get called with the OAuth token when a user signs up
     * using OAuth and every time they sign in using OAuth. Use this function to
     * map attributes from your OAuth provider to your database.
     *
     * Return the userId from your function.
     */
    upsertUser: (token: Token) => Promise<string>
  }
}

export type Triggers = {
  /**
   * Provide a function which sends the confirmation email to your user.
   */
  sendConfirmAccountMail: SendConfirmAccountMail
  /**
   * Provide a function which sends the forgot-password email to your user.
   */
  sendForgotPasswordMail: SendForgotPasswordMail
  /**
   * Put additional content into user tokens.
   *
   * When a user signs up or logs in, you can store anything you like in the
   * users token. Simply return the additional information from this function.
   *
   * Remember not to include private information here, as the users token is a
   * JSON Web Token, so the data is not encrypted.
   */
  fetchAdditionalTokenContent?: FetchAdditionalTokenContent
}

/**
 * Handles all communication with the database.
 *
 * The concept of drivers is what makes HappyAuth database agnostic. You can
 * use whichever database you want by passing a custom driver.
 */
export type Driver = {
  attemptEmailPasswordLogin: (
    email: string,
    password: string,
  ) => Promise<
    | {
        success: true
        data: {
          userId: string
          accountStatus: AccountStatus
        }
      }
    | { success: false; reason: "authentication failed" }
  >
  createEmailUser: (
    email: string,
    password: string,
  ) => Promise<
    | {
        success: true
        data: { userId: string }
      }
    | {
        success: false
        reason: "instance not unique"
      }
  >
  updateEmailUserPassword: (userId: string, password: string) => Promise<void>
  changeEmailUserPassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>
  getUserIdByEmail: (email: string) => Promise<string | null>
  confirmAccount: (userId: string) => Promise<boolean>
}

export type AuthRouteHandlerOptions = {
  publicConfig: PublicConfig
  serverConfig: ServerConfig
  triggers: Triggers
  getServerSideAuth: GetServerSideAuth
  driver: Driver
}

export function createAuthRouteHandler<T extends BaseTokenData>(
  options: AuthRouteHandlerOptions,
) {
  const handlers = {
    login: createLogin(options),
    logout: createLogout(options),
    signup: createSignup(options),
    tokencontent: createTokenContent(options),
    "forgot-password": createForgotPassword(options),
    "reset-password": createResetPassword(options),
    "change-password": createChangePassword(options),
    "confirm-account": createConfirmAccount(options),
    "resend-confirmation-email": createResendConfirmationEmail(options),
    oauth: createOAuth(options),
    connect: createConnect(options),
  }

  return function auth(req: NextApiRequest, res: NextApiResponse) {
    const key = extract(req.query.params)
    const handler = handlers.hasOwnProperty(key)
      ? handlers[key as keyof typeof handlers]
      : null
    return handler ? handler(req, res) : res.status(404).end()
  }
}

function createAuthSyncCookie(serverConfig: ServerConfig) {
  const cookieOptions: cookie.CookieSerializeOptions = {
    // Great article about sameSite
    // https://www.netsparker.com/blog/web-security/same-site-cookie-attribute-prevent-cross-site-request-forgery/
    sameSite: "lax",
    secure: serverConfig.secure,
    httpOnly: false,
    path: "/",
  }
  return cookie.serialize("syncAuthState", "login", cookieOptions)
}

export function serializeAuthCookie<T extends BaseTokenData>(
  serverConfig: ServerConfig,
  data: T,
  options: { rememberMe: boolean } = { rememberMe: false },
) {
  const maxAge = ms("7d")

  if (!serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing token secret")

  if (!serverConfig.tokenSecret)
    throw new Error("HappyAuth: Missing cookie name")

  const token = jwt.sign(data, serverConfig.tokenSecret, {
    expiresIn: maxAge,
  })

  const cookieOptions: cookie.CookieSerializeOptions = {
    // Great article about sameSite
    // https://www.netsparker.com/blog/web-security/same-site-cookie-attribute-prevent-cross-site-request-forgery/
    sameSite: "lax",
    secure: serverConfig.secure,
    httpOnly: true,
    path: "/",
  }

  if (options.rememberMe) {
    // expire jwt 30 seconds before the cookie, so that the cookie
    // never gets sent with an expired token.
    cookieOptions.maxAge = maxAge - 30
  }

  const serializedCookie = cookie.serialize(
    serverConfig.cookieName,
    token,
    cookieOptions,
  )

  return [serializedCookie, createAuthSyncCookie(serverConfig)]
}

export function redirect(res: ServerResponse, location = "/login") {
  res.writeHead(302, { Location: location }).end()
  return { props: {} }
}

export function unauthorized(res: NextApiResponse, payload?: object) {
  res.status(200).json({ error: { code: "unauthorized", ...payload } })
}

export function noContent(res: NextApiResponse) {
  res.status(200).json({ error: { code: "no content" } })
}

export function authenticationFailed(res: NextApiResponse, payload?: object) {
  res.status(200).json({ error: { code: "authentication failed", ...payload } })
}

export function unexpectedError(res: NextApiResponse, error?: Error) {
  res.status(500).json({
    error: {
      code: "unexpected error",
      ...(error ? { message: error.message } : {}),
    },
  })
}

export function jwtExpired(res: NextApiResponse, payload?: object) {
  res.status(200).json({ error: { code: "jwt expired", ...payload } })
}

export function ok(res: NextApiResponse) {
  res.status(200).json({ data: { ok: true } })
}
