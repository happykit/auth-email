import * as React from "react"
import { render } from "@testing-library/react"
import { PublicConfig, AuthProvider } from ".."

export const publicConfig: PublicConfig = {
  baseUrl: "http://localhost:3000",
  identityProviders: {},
}

type P = Parameters<typeof render>
export function renderApp(ui: P[0], options?: P[1]): ReturnType<typeof render> {
  return render(<AuthProvider>{ui}</AuthProvider>, options)
}

export const signedInTokenContentResponse = {
  data: {
    value: "signedIn",
    context: {
      tokenData: {
        userId: "266962171104068102",
        provider: "email",
        accountStatus: "confirmed",
        iat: 1591028529,
        exp: 2195828529,
      },
      error: null,
    },
  },
}
export const signedOutTokenContentResponse = {
  data: {
    value: "signedOut",
    context: {
      tokenData: null,
      error: null,
    },
  },
}

export * from "@testing-library/react"
