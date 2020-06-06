import { createUseAuth, AuthProvider } from "@happykit/auth-email"

export const publicConfig = {
  baseUrl: (() => {
    if (process.env.VERCEL_GITHUB_COMMIT_REF === "master")
      return `https://${process.env.VERCEL_URL}`
    if (process.env.NODE_ENV === "production")
      return `https://${process.env.VERCEL_URL}`
    return "http://localhost:3000"
  })(),
  identityProviders: {},
  // Possible configuration:
  // redirects: {
  //   afterSignIn: "/?afterSigIn=true",
  //   afterSignOut: "/?afterSignOut=true",
  //   afterChangePassword: "/?afterChangePassword=true",
  //   afterResetPassword: "/?afterResetPassword=true",
  // },
}

/* you can probably leave these as they are */
export { AuthProvider }
export const useAuth = createUseAuth(publicConfig)
