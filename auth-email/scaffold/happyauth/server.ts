import {
  createGetServerSideAuth,
  ServerConfig,
  sendConfirmAccountMailToConsole,
  sendForgotPasswordMailToConsole,
  createFaunaEmailDriver,
} from "@happykit/auth-email/api"
import { TokenData } from "."
import { faunaClient } from "fauna-client"

export const serverConfig: ServerConfig = {
  tokenSecret: process.env.HAPPYAUTH_TOKEN_SECRET!,
  cookieName: "happyauth",
  secure: process.env.NODE_ENV === "production",
  identityProviders: {},
  triggers: {
    sendConfirmAccountMail: sendConfirmAccountMailToConsole,
    sendForgotPasswordMail: sendForgotPasswordMailToConsole,
  },
  driver: createFaunaEmailDriver(faunaClient),
}

/* you can probably leave these as they are */
export type AuthState = ReturnType<typeof getServerSideAuth>
export const getServerSideAuth = createGetServerSideAuth<TokenData>(
  serverConfig,
)
