import { createUseAuth, AuthProvider } from "@happykit/auth-email"

export const publicConfig = {
  baseUrl: "http://localhost:3000",
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
