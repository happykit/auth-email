import { createGetServerSideAuth, ServerConfig } from "@happykit/auth-email/api"
import { TokenData } from "."

export const serverConfig: ServerConfig = {
  tokenSecret: process.env.HAPPYAUTH_TOKEN_SECRET!,
  cookieName: "happyauth",
  secure: process.env.NODE_ENV === "production",
  identityProviders: {},
}

/* you can probably leave these as they are */
export type AuthState = ReturnType<typeof getServerSideAuth>
export const getServerSideAuth = createGetServerSideAuth<TokenData>(
  serverConfig,
)
