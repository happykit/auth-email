import { createOAuth } from "./oauth"
import http from "http"
import listen from "test-listen"
import {
  createAuthRouteHandlerOptions,
  fetch,
  handler,
} from "../jest/utils.node"
import { IdentityProviderConfig } from "../api"

let options = createAuthRouteHandlerOptions()
let openAuth = createOAuth(options)

afterEach(() => {
  options = createAuthRouteHandlerOptions()
  openAuth = createOAuth(options)
})

const fakeGithub: IdentityProviderConfig["github"] = {
  credentials: {
    client: {
      id: "github-credentials-client-id",
      secret: "github-credentials-client-secret",
    },
    auth: {
      tokenHost: "https://github.com",
      tokenPath: "/login/oauth/access_token",
      authorizePath: "/login/oauth/authorize",
    },
  },
  scope: "notifications",
  upsertUser: jest.fn(async () => "fake-user-id"),
}

function params(route: string) {
  return { params: route.split("/") }
}

test("when tokenSecret is missing", () => {
  expect(() =>
    createOAuth({
      ...options,
      serverConfig: {
        ...options.serverConfig,
        tokenSecret: "",
      },
    }),
  ).toThrow("HappyAuth: Missing token secret")
})

test(
  "when identity_provider is missing",
  handler(
    {
      handle: () => openAuth,
      params: params("oauth"),
    },
    async (url) => {
      const response = await fetch(url)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "missing identity_provider or method",
          message: "Provide an identity_provider and a method.",
        },
      })
    },
  ),
)

test(
  "when method is missing",
  handler(
    {
      handle: () => createOAuth(options),
      params: params("oauth/github"),
    },
    async (url) => {
      const response = await fetch(url)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({
        error: {
          code: "missing identity_provider or method",
          message: "Provide an identity_provider and a method.",
        },
      })
    },
  ),
)

test(
  "when identity_provider is unknown",
  handler(
    {
      handle: () => openAuth,
      params: params("oauth/unknown/authorize"),
    },
    async (url) => {
      const response = await fetch(url)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toEqual({ error: { code: "unknown identity_provider" } })
    },
  ),
)

describe("/authorize", () => {
  let oauthServer: http.Server
  let oauthUrl: string

  // we use a fake oauth server to avoid making requests to a real one like
  // github.com
  beforeEach(async () => {
    oauthServer = http.createServer((req, res) => {
      req.pipe(res)
    })
    oauthUrl = await listen(oauthServer)
  })

  afterEach(() => {
    oauthServer.close()
  })

  test(
    "when using authorize",
    handler(
      {
        handle: () => {
          options.serverConfig.identityProviders.github = {
            ...fakeGithub,
            credentials: {
              ...fakeGithub.credentials,
              auth: {
                ...fakeGithub.credentials.auth,
                tokenHost: oauthUrl,
              },
            },
          }
          return createOAuth(options)
        },
        params: params("oauth/github/authorize"),
      },
      async (url) => {
        const response = await fetch(url)
        // Since the redirect is executed by fetch, we are not seeing the
        // original response headers or status code.
        // expect(response.headers.get("Set-Cookie")).toMatch(/^oauth2state=(\s)+/)
        expect(response.url).toEqual(
          expect.stringContaining(
            `${oauthUrl}/login/oauth/authorize?response_type=code&client_id=github-credentials-client-id&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Foauth%2Fgithub%2Fidpresponse&scope=notifications&state=`,
          ),
        )
        expect(response.status).toBe(200)
      },
    ),
  )
})

test(
  "when using idpresponse with an invalid state",
  handler(
    {
      handle: () => {
        options.serverConfig.identityProviders.github = fakeGithub
        return createOAuth(options)
      },
      params: params("oauth/github/idpresponse"),
    },
    async (url) => {
      const response = await fetch(url + `?state=fakestate2`, {
        headers: { Cookie: "oauth2state=fakestate;" },
      })
      const body = await response.json()
      expect(response.status).toBe(500)
      expect(body).toEqual({
        error: {
          code: "open authentication failed",
          message: "Open Authentication failed",
        },
      })
    },
  ),
)

describe("/idpresponse", () => {
  let oauthServer: http.Server
  let oauthUrl: string
  const fakeToken = {
    access_token: "fake-access-token",
    token_type: "bearer",
    scope: "notifications",
  }

  // we use a fake oauth server to avoid making requests to a real one like
  // github.com
  beforeEach(async () => {
    oauthServer = http.createServer((req, res) => {
      if (req.url === "/login/oauth/access_token") {
        // simulate the oauth server responding with a token
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify(fakeToken))
      } else if (req.url === "/") {
        // the final page after the whole flow completes, which
        // the user gets redirected to
        res.setHeader("Content-Type", "application/json")
        res.end()
      }
    })
    oauthUrl = await listen(oauthServer)
  })

  afterEach(() => {
    oauthServer.close()
  })

  test(
    "when using idpresponse with a valid token",
    handler(
      {
        handle: () => {
          options.serverConfig.identityProviders.github = {
            ...fakeGithub,
            credentials: {
              ...fakeGithub.credentials,
              auth: {
                ...fakeGithub.credentials.auth,
                tokenHost: oauthUrl,
                authorizeHost: oauthUrl,
              },
            },
            upsertUser: jest.fn(async () => "1"),
          }
          options.publicConfig.baseUrl = oauthUrl
          return createOAuth(options)
        },
        params: params("oauth/github/idpresponse"),
      },
      async (url) => {
        const response = await fetch(url + `?state=fakestate`, {
          headers: { Cookie: "oauth2state=fakestate;" },
        })
        expect(response.status).toBe(200)
        expect(
          options.serverConfig.identityProviders.github.upsertUser,
        ).toHaveBeenCalledWith(fakeToken)
      },
    ),
  )
})
