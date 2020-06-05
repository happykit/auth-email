import {
  createUseAuth,
  AuthProvider,
  PublicConfig,
  BaseTokenData,
} from "@happykit/auth-email"

export interface TokenData extends BaseTokenData {
  /* define your additional token data here */
}

export const publicConfig: PublicConfig = {
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
export const useAuth = createUseAuth<TokenData>(publicConfig)
export type Auth = ReturnType<typeof useAuth>
