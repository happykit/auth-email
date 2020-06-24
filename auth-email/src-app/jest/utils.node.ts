import { NextApiRequest, NextApiResponse } from "next"
import http from "http"
import listen from "test-listen"
import { apiResolver } from "next-server/dist/server/api-utils"
import fetch from "isomorphic-unfetch"
import { PublicConfig } from ".."
import jwt from "jsonwebtoken"
import {
  AuthRouteHandlerOptions,
  ServerConfig,
  createGetServerSideAuth,
} from "../api"

export { fetch }

export const publicConfig: PublicConfig = {
  baseUrl: "http://localhost:3000",
  identityProviders: {},
}

export const serverConfig: ServerConfig = {
  cookieName: "happyauth-test",
  identityProviders: {},
  secure: false,
  tokenSecret: "fake-token-secret",
  triggers: {
    sendConfirmAccountMail: jest.fn(),
    sendForgotPasswordMail: jest.fn(),
    fetchAdditionalTokenContent: jest.fn(),
  },
  driver: {
    attemptEmailPasswordLogin: jest.fn(),
    changeEmailUserPassword: jest.fn(),
    confirmAccount: jest.fn(),
    createEmailUser: jest.fn(),
    getUserIdByEmail: jest.fn(),
    updateEmailUserPassword: jest.fn(),
  },
}

export function createAuthRouteHandlerOptions(
  defaultServerConfig: ServerConfig = serverConfig,
): AuthRouteHandlerOptions {
  return {
    getServerSideAuth: createGetServerSideAuth(defaultServerConfig),
    publicConfig,
    serverConfig: {
      ...defaultServerConfig,
      driver: {
        attemptEmailPasswordLogin: jest.fn(),
        changeEmailUserPassword: jest.fn(),
        confirmAccount: jest.fn(),
        createEmailUser: jest.fn(),
        getUserIdByEmail: jest.fn(),
        updateEmailUserPassword: jest.fn(),
      },
      triggers: {
        sendConfirmAccountMail: jest.fn(),
        sendForgotPasswordMail: jest.fn(),
        fetchAdditionalTokenContent: jest.fn(),
      },
    },
  }
}

// Usage:
//   test("when not authenticated", async () => {
//     const [url, close] = await createApi(changePassword)
//     const response = await fetch(url)
//     expect(response.status).toBe(200)
//     const data = await response.json()
//     expect(data).toEqual({ error: { code: "unauthorized" } })
//     close()
//   })
export async function createApi(
  handler: (req: NextApiRequest, res: NextApiResponse<any>) => Promise<void>,
  params?: any,
): Promise<[string, () => void]> {
  const requestHandler: http.RequestListener = (req, res) =>
    apiResolver(req as NextApiRequest, res as NextApiResponse, params, handler)

  const server = http.createServer(requestHandler)
  const url = await listen(server)
  return [
    url,
    () => {
      server.close()
    },
  ]
}

export function handler(
  prepare:
    | (() => (req: NextApiRequest, res: NextApiResponse<any>) => Promise<any>)
    | {
        handle: () => (
          req: NextApiRequest,
          res: NextApiResponse<any>,
        ) => Promise<any>
        params?: any
      },
  testFn: (url: string) => Promise<void>,
) {
  return async () => {
    const apiHandler = await (typeof prepare === "function"
      ? prepare()
      : prepare.handle())
    const [url, close] = await createApi(
      apiHandler,
      typeof prepare === "function" ? undefined : prepare.params,
    )
    try {
      await testFn(url)
      close()
    } catch (e) {
      close()
      throw e
    }
  }
}

export function createAuthCookie(
  options: AuthRouteHandlerOptions,
  payload: object,
) {
  const value = jwt.sign(payload, options.serverConfig.tokenSecret)
  return `${options.serverConfig.cookieName}=${value}`
}
