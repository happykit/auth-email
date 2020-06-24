import * as React from "react"
import Head from "next/head"
import Link from "next/link"
import {
  Auth,
  BaseTokenData,
  HappyError,
  HappyApiResponse,
  PublicConfig,
} from ".."
import classNames from "classnames"
import tailwind from "../tailwind.css"
import { SocialLogins } from "../components/social-logins"
import { ErrorMessage, SuccessMessage } from "../components/messages"
import {
  InputGroup,
  hasValidationErrors,
  inputAssigner,
  submitAssigner,
  touchedAssigner,
} from "../components/forms"
import { createMachine, assign, StateMachine } from "@xstate/fsm"
import { useMachine } from "@xstate/react/lib/fsm"

type SignUpContext = {
  values: { email: string; password: string }
  error: null | HappyError
  touched: { email: boolean; password: boolean }
  validationErrors: {
    email: null | "missing" | "invalid"
    password: null | "missing" | "too-short"
  }
}
type SignUpEvent =
  | { type: "INPUT"; payload: Partial<SignUpContext["values"]> }
  | { type: "BLUR"; payload: Partial<SignUpContext["touched"]> }
  | { type: "SUBMIT" }
  | { type: "ERROR"; payload: HappyError | null }
  | { type: "CREATED" }
type SignUpState =
  | { value: "form"; context: SignUpContext }
  | { value: "submitting"; context: SignUpContext }
  | { value: "created"; context: SignUpContext }

function validate(
  values: SignUpContext["values"],
): SignUpContext["validationErrors"] {
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

// see https://xstate.js.org/viz/
const loginMachine = createMachine<SignUpContext, SignUpEvent, SignUpState>({
  id: "loginMachine",
  initial: "form",
  context: {
    values: { email: "", password: "" },
    error: null,
    touched: { email: false, password: false },
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
      },
    },
    submitting: {
      entry: ["submit"],
      on: {
        ERROR: {
          target: "form",
          actions: assign({ error: (context, event) => event.payload }),
        },
        CREATED: "created",
      },
    },
    created: {},
  },
})

async function signUpAction(
  state: StateMachine.State<SignUpContext, SignUpEvent, any>,
  auth: Auth<BaseTokenData>,
  send: (event: SignUpEvent) => void,
) {
  if (hasValidationErrors(state.context.validationErrors)) {
    send({ type: "ERROR", payload: null })
    return
  }

  if (!auth.signUp)
    throw new Error(
      `Tried to call auth.signUp, but it does not exist on state "${auth.state}"`,
    )

  const { email, password } = state.context.values

  try {
    const response = await auth.signUp(email, password)
    if (response.error) {
      send({ type: "ERROR", payload: response.error })
    } else {
      send({ type: "CREATED" })
    }
  } catch (error) {
    console.error(error)
    send({
      type: "ERROR",
      payload: { code: "unexpected error", message: error.message },
    })
  }
}

function AlreadySignedUp(props: { publicConfig: PublicConfig }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div>
          <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
            Create a new account
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

export function Signup(props: {
  auth: Auth<BaseTokenData>
  publicConfig: PublicConfig
}) {
  const [state, send] = useMachine(loginMachine)

  React.useEffect(() => {
    state.actions.forEach((action) => {
      switch (action.type) {
        case "submit":
          signUpAction(state, props.auth, send)
          break
      }
    })
  }, [state, props.auth])

  const hasConfiguredIdentityProviders =
    props.publicConfig.identityProviders &&
    Object.keys(props.publicConfig.identityProviders).length > 0

  return (
    <React.Fragment>
      <Head>
        <style>{tailwind}</style>
      </Head>
      {props.auth.state === "signedIn" ? (
        <AlreadySignedUp publicConfig={props.publicConfig} />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div>
              <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
                Create a new account
              </h2>
              <p className="mt-2 text-center text-sm leading-5 text-gray-600">
                Or{" "}
                <Link href="/login">
                  <a className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150">
                    sign in to your account
                  </a>
                </Link>
              </p>
            </div>
            {state.value === "created" ? (
              <SuccessMessage title="Account created">
                <p className="text-sm">
                  Your account was created. Check your email to verify your
                  account.
                </p>
              </SuccessMessage>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  send({ type: "SUBMIT" })
                }}
                className={classNames(
                  "mt-8",
                  state.value === "submitting" && "opacity-50",
                )}
                noValidate
              >
                <input type="hidden" name="remember" defaultValue="true" />
                <InputGroup
                  id="email"
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  disabled={state.value === "submitting"}
                  required
                  touched={state.context.touched.email}
                  error={(() => {
                    switch (state.context.validationErrors.email) {
                      case "missing":
                        return "The email address is missing."
                      case "invalid":
                        return "The email address doesn't seem valid."
                      default:
                        return null
                    }
                  })()}
                  value={state.context.values.email}
                  onChange={(event) => {
                    const email = event.target.value
                    send({ type: "INPUT", payload: { email } })
                  }}
                  onBlur={() => {
                    send({ type: "BLUR", payload: { email: true } })
                  }}
                />

                <InputGroup
                  id="password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  disabled={state.value === "submitting"}
                  required
                  touched={state.context.touched.password}
                  error={(() => {
                    switch (state.context.validationErrors.password) {
                      case "missing":
                        return "The password is missing."
                      case "too-short":
                        return "The password should at least be three characters long."
                      default:
                        return null
                    }
                  })()}
                  value={state.context.values.password}
                  onChange={(event) => {
                    const password = event.target.value
                    send({ type: "INPUT", payload: { password } })
                  }}
                  onBlur={() => {
                    send({ type: "BLUR", payload: { password: true } })
                  }}
                />
                {state.context.error && (
                  <ErrorMessage title="Unexpected error">
                    <p>
                      {state.context.error.message || state.context.error.code}
                    </p>
                  </ErrorMessage>
                )}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={state.value === "submitting"}
                    className={classNames(
                      "w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out",
                    )}
                  >
                    Sign up
                  </button>
                </div>
                {hasConfiguredIdentityProviders && (
                  <SocialLogins
                    identityProviders={props.publicConfig.identityProviders}
                  />
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
