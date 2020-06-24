import * as React from "react"
import Router from "next/router"
import Link from "next/link"
import Head from "next/head"
import { PublicConfig, HappyError, Auth, BaseTokenData } from ".."
import classNames from "classnames"
import tailwind from "../tailwind.css"
import { ErrorMessage, WarningMessage } from "../components/messages"
import { SocialLogins } from "../components/social-logins"
import {
  InputGroup,
  hasValidationErrors,
  inputAssigner,
  submitAssigner,
  touchedAssigner,
} from "../components/forms"
import { createMachine, assign, StateMachine } from "@xstate/fsm"
import { useMachine } from "@xstate/react/lib/fsm"

type LoginContext = {
  values: { email: string; password: string; rememberMe: boolean }
  error: null | HappyError
  touched: { email: boolean; password: boolean; rememberMe: boolean }
  validationErrors: {
    email: null | "missing" | "invalid"
    password: null | "missing" | "too-short"
  }
}
type LoginEvent =
  | { type: "INPUT"; payload: Partial<LoginContext["values"]> }
  | { type: "BLUR"; payload: Partial<LoginContext["touched"]> }
  | { type: "SUBMIT" }
  | { type: "RESEND_CONFIRMATION_EMAIL" }
  | { type: "RESENT_CONFIRMATION_EMAIL" }
  | { type: "ERROR"; payload: HappyError | null }
  | { type: "SUBMITTED" }
type LoginState =
  | { value: "form"; context: LoginContext }
  | { value: "submitting"; context: LoginContext }
  | { value: "submitted"; context: LoginContext }
  | { value: "resendConfirmationEmail"; context: LoginContext }
  | { value: "resentConfirmationEmail"; context: LoginContext }

function validate(
  values: LoginContext["values"],
): LoginContext["validationErrors"] {
  return {
    email: (() => {
      const email = values.email.trim()
      if (email.length === 0) return "missing"
      if (email.length <= 5) return "invalid"
      if (!email.includes("@")) return "invalid"
      if (!email.includes(".")) return "invalid"
      return null
    })(),
    password: (() => {
      const password = values.password.trim()
      if (password.length === 0) return "missing"
      if (password.length < 3) return "too-short"
      return null
    })(),
  }
}

async function loginAction(
  state: StateMachine.State<LoginContext, LoginEvent, any>,
  auth: Auth<BaseTokenData>,
  send: (event: LoginEvent) => void,
  publicConfig: PublicConfig,
) {
  if (hasValidationErrors(state.context.validationErrors)) {
    send({ type: "ERROR", payload: null })
    return
  }

  if (!auth.signIn)
    throw new Error(
      `Tried to call auth.signIn, but it does not exist on state "${auth.state}"`,
    )

  const { email, password, rememberMe } = state.context.values
  try {
    const response = await auth.signIn(email, password, rememberMe)
    if (response.data?.ok) {
      Router.push(publicConfig?.redirects?.afterSignIn || "/")
    } else {
      send({ type: "ERROR", payload: response.error || null })
    }
  } catch (error) {
    console.error(error)
    send({
      type: "ERROR",
      payload: { code: "unexpected-error", message: error.message },
    })
  }
}

async function resendConfirmationEmailAction(
  state: StateMachine.State<LoginContext, LoginEvent, any>,
  send: (event: LoginEvent) => void,
) {
  const email = state.context.values.email
  console.log("sending for", email)

  await fetch("/api/auth/resend-confirmation-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  console.log("sent for", email)
  send({ type: "RESENT_CONFIRMATION_EMAIL" })
}

// see https://xstate.js.org/viz/
const loginMachine = createMachine<LoginContext, LoginEvent, LoginState>({
  id: "loginMachine",
  initial: "form",
  context: {
    values: { email: "", password: "", rememberMe: false },
    error: null,
    touched: { email: false, password: false, rememberMe: false },
    validationErrors: { email: null, password: null },
  },
  states: {
    form: {
      on: {
        INPUT: {
          target: "form",
          actions: assign(inputAssigner(validate)),
        },
        BLUR: {
          target: "form",
          actions: assign(touchedAssigner(validate)),
        },
        SUBMIT: {
          target: "submitting",
          actions: assign(submitAssigner(validate)),
        },
        RESEND_CONFIRMATION_EMAIL: {
          target: "resendConfirmationEmail",
        },
      },
    },
    submitting: {
      entry: ["submit"],
      on: {
        ERROR: {
          target: "form",
          actions: assign({ error: (context, event) => event.payload }),
        },
        RESEND_CONFIRMATION_EMAIL: {
          target: "resendConfirmationEmail",
        },
        SUBMITTED: "submitted",
      },
    },
    resendConfirmationEmail: {
      entry: ["resendConfirmationEmail"],
      on: {
        RESENT_CONFIRMATION_EMAIL: {
          target: "resentConfirmationEmail",
        },
      },
    },
    resentConfirmationEmail: {},
    submitted: {},
  },
})

const LoginError: React.FunctionComponent<{
  error: HappyError
  resendConfirmationEmail: () => void
}> = (props) => {
  if (props.error.code === "authentication failed") {
    return (
      <ErrorMessage title="Login failed">
        <p>Either this user does not exist or the password is invalid.</p>
      </ErrorMessage>
    )
  }

  if (props.error.code === "account not confirmed") {
    return (
      <WarningMessage title="Account not confirmed">
        <p>
          This account has not been confirmed yet. Check your emails to confirm
          it, or{" "}
          <button
            type="button"
            className="underline"
            onClick={() => props.resendConfirmationEmail()}
          >
            resend confirmation mail
          </button>
          .
        </p>
      </WarningMessage>
    )
  }
  return (
    <ErrorMessage title="Error">
      <p>{props.error.message || props.error.code}</p>
    </ErrorMessage>
  )
}

function ResendConfirmationEmailPage(props: { email: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div>
          <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
            Resent confirmation email
          </h2>
        </div>
        <div
          className="mt-6 bg-indigo-100 border-l-4 border-indigo-500 text-indigo-700 p-4"
          role="alert"
        >
          <p className="font-bold">Confirmation sent</p>
          <p>
            A new confirmation mail was sent to <i>{props.email}</i>.
          </p>
        </div>
      </div>
    </div>
  )
}

function AlreadySignedIn(props: { publicConfig: PublicConfig }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div>
          <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div
          className="mt-6 bg-indigo-100 border-l-4 border-indigo-500 text-indigo-700 p-4"
          role="alert"
        >
          <p className="font-bold">Already signed in</p>
          <p>You are signed in already.</p>
        </div>
        <div className="mt-6">
          <Link href={props.publicConfig.redirects?.afterSignIn || "/"}>
            <a>
              <button
                type="button"
                className="flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
              >
                Continue
              </button>
            </a>
          </Link>
        </div>
      </div>
    </div>
  )
}

function LoginPage(props: {
  state: StateMachine.State<LoginContext, LoginEvent, any>
  send: (event: LoginEvent) => void
  publicConfig: PublicConfig
}) {
  const hasConfiguredIdentityProviders =
    props.publicConfig.identityProviders &&
    Object.keys(props.publicConfig.identityProviders).length > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div>
          <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm leading-5 text-gray-600">
            Or{" "}
            <Link href="/signup">
              <a className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150">
                create a new account
              </a>
            </Link>
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            props.send({ type: "SUBMIT" })
          }}
          className={classNames(
            "mt-8",
            props.state.value === "submitting" && "opacity-50",
          )}
          noValidate
        >
          <InputGroup
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            disabled={props.state.value === "submitting"}
            required
            touched={props.state.context.touched.email}
            error={(() => {
              switch (props.state.context.validationErrors.email) {
                case "missing":
                  return "The email address is missing."
                case "invalid":
                  return "The email address doesn't seem valid."
                default:
                  return null
              }
            })()}
            value={props.state.context.values.email}
            onChange={(event) => {
              const email = event.target.value
              props.send({ type: "INPUT", payload: { email } })
            }}
            onBlur={() => {
              props.send({ type: "BLUR", payload: { email: true } })
            }}
          />
          <InputGroup
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            disabled={props.state.value === "submitting"}
            required
            touched={props.state.context.touched.password}
            error={(() => {
              switch (props.state.context.validationErrors.password) {
                case "missing":
                  return "The password is missing."
                case "too-short":
                  return "The password should at least be three characters long."
                default:
                  return null
              }
            })()}
            value={props.state.context.values.password}
            onChange={(event) => {
              const password = event.target.value
              props.send({ type: "INPUT", payload: { password } })
            }}
            onBlur={() => {
              props.send({ type: "BLUR", payload: { password: true } })
            }}
          />
          {props.state.context.error && (
            <LoginError
              error={props.state.context.error}
              resendConfirmationEmail={() => {
                props.send({ type: "RESEND_CONFIRMATION_EMAIL" })
              }}
            />
          )}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                disabled={props.state.value === "submitting"}
                value={props.state.context.values.rememberMe ? "true" : "false"}
                onChange={(event) => {
                  const rememberMe = event.target.checked
                  props.send({ type: "INPUT", payload: { rememberMe } })
                }}
              />
              <label
                htmlFor="remember_me"
                className="ml-2 block text-sm leading-5 text-gray-700 select-none"
              >
                Remember me
              </label>
            </div>
            <div className="text-sm leading-5">
              {props.state.context.error?.code === "account not confirmed" ? (
                <button
                  type="button"
                  onClick={() =>
                    props.send({ type: "RESEND_CONFIRMATION_EMAIL" })
                  }
                >
                  <a className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150">
                    Resend confirmation mail
                  </a>
                </button>
              ) : (
                <Link href="/forgot-password">
                  <a className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150">
                    Forgot your password?
                  </a>
                </Link>
              )}
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
              disabled={props.state.value === "submitting"}
            >
              Sign in
            </button>
          </div>
          {hasConfiguredIdentityProviders && (
            <SocialLogins
              identityProviders={props.publicConfig.identityProviders}
            />
          )}
        </form>
      </div>
    </div>
  )
}

export function Login(props: {
  auth: Auth<BaseTokenData>
  publicConfig: PublicConfig
}) {
  const [state, send] = useMachine(loginMachine)

  React.useEffect(() => {
    state.actions.forEach((action) => {
      switch (action.type) {
        case "submit":
          loginAction(state, props.auth, send, props.publicConfig)
          break
        case "resendConfirmationEmail":
          resendConfirmationEmailAction(state, send)
          break
      }
    })
  }, [state, props.auth])

  return (
    <React.Fragment>
      <Head>
        <style>{tailwind}</style>
      </Head>
      {state.value === "resentConfirmationEmail" ? (
        <ResendConfirmationEmailPage email={state.context.values.email} />
      ) : props.auth.state === "signedIn" ? (
        <AlreadySignedIn publicConfig={props.publicConfig} />
      ) : (
        <LoginPage
          state={state}
          send={send}
          publicConfig={props.publicConfig}
        />
      )}
    </React.Fragment>
  )
}
