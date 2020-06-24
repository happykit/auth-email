import { createAuthRouteHandler } from "@happykit/auth-email/api"
import { publicConfig, TokenData } from "happyauth"
import { serverConfig, getServerSideAuth } from "happyauth/server"

// You can use the triggers to customize the server behaviour.
//
// Alternatively, you can completely override individual functions by creating
// files for their routes /api/auth/<action>.ts, e.g. /api/auth/login.ts
export default createAuthRouteHandler<TokenData>({
  publicConfig,
  serverConfig,
  getServerSideAuth,
})
