import {
  createGetServerSideAuth,
  sendConfirmAccountMailToConsole,
  sendForgotPasswordMailToConsole,
  createFaunaEmailDriver,
} from "@happykit/auth-email/api"
import { faunaClient } from "fauna-client"

export const serverConfig = {
  tokenSecret: process.env.HAPPYAUTH_TOKEN_SECRET,
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
export const getServerSideAuth = createGetServerSideAuth(serverConfig)
