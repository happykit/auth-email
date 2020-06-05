import * as React from "react"
import { createMachine, assign } from "@xstate/fsm"
import { useMachine } from "@xstate/react/lib/fsm"
import cookie from "cookie"

const OneInstanceOnlyContext = React.createContext<
  [(id: Symbol) => void, (id: Symbol) => void] | [null, null]
>([null, null])

const AllowOneInstanceOnlyProvider: React.FunctionComponent = (props) => {
  const [activeHookId, setActiveHookId] = React.useState<Symbol | null>(null)

  const registerHook = React.useCallback(
    (id) => {
      setActiveHookId((prev) => {
        if (prev === null) return id
        if (prev === id) return prev
        throw new Error("AuthProvider: Only one useAuth may be used per page.")
      })
    },
    [activeHookId, setActiveHookId],
  )
  const unregisterHook = React.useCallback(
    (id) => {
      setActiveHookId((prev) => {
        if (prev === id) return null
        throw new Error(
          "AuthProvider: Tried to unregister an inactive useAuth hook.",
        )
      })
    },
    [activeHookId, setActiveHookId],
  )

  return (
    <OneInstanceOnlyContext.Provider value={[registerHook, unregisterHook]}>
      {props.children}
    </OneInstanceOnlyContext.Provider>
  )
}

function useAllowOneInstanceOnly() {
  const hookIdRef = React.useRef(Symbol())
  const [registerHook, unregisterHook] = React.useContext(
    OneInstanceOnlyContext,
  )

  if (registerHook === null || unregisterHook === null)
    throw new Error("Missing AuthProvider. Add it to _app.js or _app.tsx.")

  React.useEffect(() => {
    registerHook(hookIdRef.current)
    return () => {
      unregisterHook(hookIdRef.current)
    }
  }, [])
}

/**
 * Wrap your application in <AuthProvider /> by configuring it in _app.js / _app.ts.
 *
 * This provider makes sure that you're only using one useAuth hook per page.
 */
export const AuthProvider: React.FunctionComponent = (props) => {
  return (
    <AllowOneInstanceOnlyProvider>
      {props.children}
    </AllowOneInstanceOnlyProvider>
  )
}

export enum Provider {
  email = "email",
}

export enum AccountStatus {
  unconfirmed = "unconfirmed",
  confirmed = "confirmed",
}

/**
 * Shape of your token data.
 *
 * You can extend this interface to configure your own shape, in case you
 * are using serverConfig.triggers.fetchAdditionalTokenContent.
 *
 * Keep in mind that some users might still have an old token when they sign in,
 * so there is no guarantee that the shape of your additional data actually
 * matches the token you're receiving. You can change the serverConfig.tokenSecret
 * and thereby force a logout of all your users when you change the token contents.
 */
export interface BaseTokenData {
  accountStatus: AccountStatus
  provider: Provider
  userId: string
}

interface AuthContext<T extends BaseTokenData> {
  tokenData: T | null
  error: string | null
}

export type AuthEvent<T extends BaseTokenData> =
  | { type: "SIGN_IN_SUCCESS"; tokenData: T }
  | { type: "SIGN_IN_FAILURE"; error: string }
  | { type: "SIGN_IN_ERROR"; error: string }

export type BaseAuthState<T extends BaseTokenData> =
  | {
      value: "authenticating"
      context: AuthContext<T> & {
        tokenData: null
        error: null
      }
    }
  | {
      value: "signedIn"
      context: AuthContext<T> & { tokenData: T; error: null }
    }
  | {
      value: "signedOut"
      context: AuthContext<T> & {
        tokenData: null
        error: null
      }
    }
  | {
      value: "signInError"
      context: AuthContext<T> & {
        tokenData: null
        error: string
      }
    }

export type AuthApi = {
  /**
   * Signs a user in using their email and password.
   */
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<HappyApiResponse<{ ok: true }>>
  /**
   * Signs a user out.
   */
  signOut: (redirectTo?: string) => Promise<void>
  /**
   * Confirms an unconfirmed account.
   *
   * The token is sent to users via email after they sign up. You can configure
   * the email using serverConfig.triggers.sendConfirmAccountMail.
   */
  confirmAccount: (token: string) => Promise<HappyApiResponse<{ ok: true }>>
  /**
   * Reset a users password.
   *
   * You can start this flow by calling auth.forgotPassword().
   */
  resetPassword: (
    token: string,
    password: string,
  ) => Promise<HappyApiResponse<{ ok: true }>>
  /**
   * Register a new user.
   */
  signUp: (
    email: string,
    password: string,
  ) => Promise<HappyApiResponse<{ ok: true }>>
  /**
   * Change a users password.
   */
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<HappyApiResponse<{ ok: true }>>
  /**
   * Request a password reset link for a user.
   *
   * The link including a password-reset token will be sent to the users email
   * address using serverConfig.triggers.sendForgotPasswordMail.
   *
   * You can then call auh.resetPassword() with that token to reset the password.
   */
  forgotPassword: (email: string) => Promise<HappyApiResponse<{ ok: true }>>
}

export type Auth<T extends BaseTokenData> =
  | {
      state: "authenticating"
      tokenData: null
      error: null
      signIn: null
      signUp: null
      signOut: null
      changePassword: null
      confirmAccount: null
      forgotPassword: null
      resetPassword: null
    }
  | {
      state: "signedIn"
      tokenData: T
      error: null
      signIn: null
      signUp: null
      signOut: AuthApi["signOut"]
      changePassword: AuthApi["changePassword"]
      confirmAccount: null
      forgotPassword: null
      resetPassword: null
    }
  | {
      state: "signedOut"
      tokenData: null
      error: null
      signIn: AuthApi["signIn"]
      signUp: AuthApi["signUp"]
      signOut: null
      changePassword: null
      confirmAccount: AuthApi["confirmAccount"]
      forgotPassword: AuthApi["forgotPassword"]
      resetPassword: AuthApi["resetPassword"]
    }
  | {
      state: "signInError"
      tokenData: null
      error: string
      signIn: null
      signUp: null
      signOut: null
      changePassword: null
      confirmAccount: null
      forgotPassword: null
      resetPassword: null
    }

function transformToAuth<T extends BaseTokenData>(
  state: BaseAuthState<T>,
  api: AuthApi,
): Auth<T> {
  switch (state.value) {
    case "authenticating":
      return {
        state: "authenticating",
        tokenData: null,
        error: null,
        signIn: null,
        signUp: null,
        signOut: null,
        changePassword: null,
        confirmAccount: null,
        forgotPassword: null,
        resetPassword: null,
      }
    case "signedIn":
      return {
        state: "signedIn",
        tokenData: state.context.tokenData,
        error: null,
        signIn: null,
        signUp: null,
        signOut: api.signOut,
        changePassword: api.changePassword,
        confirmAccount: null,
        forgotPassword: null,
        resetPassword: null,
      }
    case "signedOut":
      return {
        state: "signedOut",
        tokenData: null,
        error: null,
        signIn: api.signIn,
        signUp: api.signUp,
        signOut: null,
        changePassword: null,
        confirmAccount: api.confirmAccount,
        forgotPassword: api.forgotPassword,
        resetPassword: api.resetPassword,
      }
    case "signInError":
      return {
        state: "signInError",
        tokenData: null,
        error: state.context.error,
        signIn: null,
        signUp: null,
        signOut: null,
        changePassword: null,
        confirmAccount: null,
        forgotPassword: null,
        resetPassword: null,
      }
  }
}

/**
 * Returns a preconfigured useAuth hook
 *
 * Note that you may only use one useAuth hook per page. Pass the hook data
 * down to each component which needs it, or create your custom provider.
 *
 * Every page can decide whether it wants to prefetch the auth data on the server,
 * or whether it wants to have the client handle that. That way you can mix
 * server-side rendering and static generation as you need.
 */
export function createUseAuth<T extends BaseTokenData>(
  publicConfig: PublicConfig,
) {
  // signIn and signOut will require a full page reload, so we never have to leave
  // the signedIn and signedOut states
  // This has the upside that we don't need useEnsuredAuth, as sould be able to
  // simply init useAuth with an authenticated state.
  //
  // The input to this function is deliberately differnet from the output shape,
  // as
  // - we want to avoid programmers from using the initialState directly
  return function useAuth(
    initialUserState: BaseAuthState<T> = {
      value: "authenticating",
      context: {
        tokenData: null,
        error: null,
      },
    },
  ) {
    useAllowOneInstanceOnly()

    const userMachine = React.useMemo(
      () =>
        createMachine<AuthContext<T>, AuthEvent<T>, BaseAuthState<T>>({
          id: "userMachine",
          initial: initialUserState.value,
          context: initialUserState.context,
          states: {
            authenticating: {
              entry: ["refetchTokenContent"],
              on: {
                SIGN_IN_SUCCESS: {
                  target: "signedIn",
                  actions: assign({
                    tokenData: (context, event) => event.tokenData,
                  }),
                },
                SIGN_IN_FAILURE: {
                  target: "signedOut",
                  actions: assign({
                    tokenData: (context, event) => null,
                    error: (context, event) => null,
                  }),
                },
                SIGN_IN_ERROR: {
                  target: "signedOut",
                  actions: assign({
                    error: (context, event) => event.error,
                  }),
                },
              },
            },
            signedIn: {},
            signedOut: {},
            signInError: {},
          },
        }),
      [],
    )
    const [state, send] = useMachine(userMachine)

    // These functions should not return promises.
    // Components should read the state from "auth" instead.
    // The errors are stored there as well
    const signIn: AuthApi["signIn"] = React.useCallback(
      async (email, password, rememberMe = false) => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe }),
        })

        if (response.status === 200) {
          return response.json()
        } else {
          throw new Error(await response.text())
        }
      },
      [send],
    )

    const syncAuth = (event: StorageEvent) => {
      if (event.key === "logout") {
        window.localStorage.removeItem("logout")
        window.location.reload()
      }
      if (event.key === "login") {
        window.localStorage.removeItem("login")
        window.location.reload()
      }
    }

    React.useEffect(() => {
      window.addEventListener("storage", syncAuth)

      return () => {
        window.removeEventListener("storage", syncAuth)
      }
    }, [])

    // When a user signs in, a syncAuthState cookie will be set by the server.
    // If such a cookie exists, we trigger a sync on all tabs and delete it.
    React.useEffect(() => {
      const parsedCookies = cookie.parse(document.cookie)

      if (parsedCookies.syncAuthState === "login") {
        document.cookie = cookie.serialize("syncAuthState", "", { maxAge: -1 })
        window.localStorage.setItem("login", String(Date.now()))
      }
    }, [])

    // TODO use these functions on the pages instead of the manual API calls
    // model these after Amplify
    // https://aws-amplify.github.io/amplify-js/api/classes/authclass.html

    const signOut: AuthApi["signOut"] = React.useCallback(
      async (redirectTo = publicConfig?.redirects?.afterSignOut || "/") => {
        // simulate fetch
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })

        if (response.status === 200) {
          // no state necessary, as we do a full page reload / redirect
          window.localStorage.setItem("logout", String(Date.now()))
          window.location.href = redirectTo
          return response.json()
        } else {
          throw new Error(await response.text())
        }
      },
      [send],
    )

    const signUp: AuthApi["signUp"] = React.useCallback(
      async (email, password) => {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        if (response.status === 200) {
          return response.json()
        } else {
          throw new Error(await response.text())
        }
      },
      [send],
    )

    const resetPassword: AuthApi["resetPassword"] = React.useCallback(
      async (token, password) => {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        })

        if (response.status === 200) {
          return response.json()
        } else {
          throw new Error(await response.text())
        }
      },
      [send],
    )

    const confirmAccount: AuthApi["confirmAccount"] = React.useCallback(
      async (token) => {
        const response = await fetch("/api/auth/confirm-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        return response.json()
      },
      [send],
    )

    const changePassword: AuthApi["changePassword"] = React.useCallback(
      async (currentPassword, newPassword) => {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        })

        if (response.status === 200) {
          return response.json()
        } else {
          throw new Error(await response.text())
        }
      },
      [send],
    )

    const forgotPassword: AuthApi["forgotPassword"] = React.useCallback(
      async (email) => {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })

        if (response.status === 200) {
          return response.json()
        } else {
          throw new Error(await response.text())
        }
      },
      [send],
    )

    const api: AuthApi = React.useMemo(
      () => ({
        signIn,
        signOut,
        signUp,
        resetPassword,
        confirmAccount,
        changePassword,
        forgotPassword,
      }),
      [
        signIn,
        signOut,
        signUp,
        resetPassword,
        confirmAccount,
        changePassword,
        forgotPassword,
      ],
    )

    React.useEffect(() => {
      if (!Array.isArray(state.actions)) return

      state.actions.forEach((action) => {
        switch (action.type) {
          case "refetchTokenContent": {
            fetch("/api/auth/tokencontent").then(
              async (res) => {
                if (res.status === 200) {
                  const response = await res.json()
                  const nextState = response
                    ? (response.data as BaseAuthState<T>)
                    : null

                  if (!nextState) {
                    send({ type: "SIGN_IN_FAILURE", error: "" })
                    return
                  }

                  if (nextState.value === "signedIn") {
                    send({
                      type: "SIGN_IN_SUCCESS",
                      tokenData: nextState.context.tokenData,
                    })
                  } else {
                    send({
                      type: "SIGN_IN_FAILURE",
                      error: "",
                    })
                  }
                } else {
                  // status code not 200, which is unexpected
                  send({
                    type: "SIGN_IN_ERROR",
                    error: "unexpected error",
                  })
                }
              },
              (err) => {
                // json decoding failed or another error occurred
                console.error(err)
                send({
                  type: "SIGN_IN_ERROR",
                  error: "json decoding failed or another unexpected error",
                })
              },
            )
          }
        }
      })
    }, [send, state.actions])

    const auth = React.useMemo(
      () => transformToAuth<T>(state as BaseAuthState<T>, api),
      [state, api],
    )

    return auth
  }
}

export type PublicConfig = {
  /**
   * URL of your application (without the trailing slash).
   *
   * Example: https://example.now.sh
   *
   * This is used when generating links for emails, OAuth and redirects.
   * Set it to http://localhost:3000 for local development.
   */
  baseUrl: string
  /**
   * A list of identity providers for OAuth logins and signups.
   *
   * Pass a map of keys and their names, like { github: { name: 'GitHub' } }
   * The passed names will be shown as the labels of the OAuth buttons.
   *
   * This is the frontend part of the configuration. You'll also need to configure `serverConfig.identityProviders`.
   */
  identityProviders: {
    [key: string]: { name: string }
  }
  /**
   * Configure where users are redirected to after certain actions.
   */
  redirects?: {
    afterConfirmAccount?: string
    afterResetPassword?: string
    afterSignIn?: string
    afterSignOut?: string
    afterChangePassword?: string
  }
}

export type HappyError = { code: string; message?: string }

export type HappyApiResponse<D extends any> =
  | { error: undefined; data: D }
  | { error: HappyError; data: undefined }
