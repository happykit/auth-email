import { createGetServerSideAuth } from "@happykit/auth-email/api"

export const serverConfig = {
  tokenSecret: process.env.HAPPYAUTH_TOKEN_SECRET,
  cookieName: "happyauth",
  secure: process.env.NODE_ENV === "production",
  identityProviders: {},
}

/* you can probably leave these as they are */
export const getServerSideAuth = createGetServerSideAuth(serverConfig)
