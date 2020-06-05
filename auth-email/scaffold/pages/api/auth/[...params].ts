import {
  createAuthRouteHandler,
  sendConfirmAccountMailToConsole,
  sendForgotPasswordMailToConsole,
  createFaunaEmailDriver,
} from "@happykit/auth-email/api"
import { publicConfig, TokenData } from "happyauth"
import { serverConfig, getServerSideAuth } from "happyauth/server"
import { faunaClient } from "fauna-client"

// You can use the triggers to customize the server behaviour.
//
// Alternatively, you can completely override individual functions by creating
// files for their routes /api/auth/<action>.ts, e.g. /api/auth/login.ts
export default createAuthRouteHandler<TokenData>({
  publicConfig,
  serverConfig,
  getServerSideAuth,
  triggers: {
    sendConfirmAccountMail: sendConfirmAccountMailToConsole,
    sendForgotPasswordMail: sendForgotPasswordMailToConsole,
  },
  driver: createFaunaEmailDriver(faunaClient),
})
