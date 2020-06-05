import * as React from "react"
import Head from "next/head"
import { PublicConfig, Auth, BaseTokenData, HappyError } from ".."
import Link from "next/link"
import classNames from "classnames"
import tailwind from "../tailwind.css"
import queryString from "query-string"
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

type ResetPasswordContext = {
  values: { password: string }
  token: null | string
  error: null | HappyError
  touched: { password: boolean }
  validationErrors: { password: null | "missing" | "too-short" }
}
type ResetPasswordEvent =
  | { type: "TOKEN"; payload: string }
  | { type: "MISSING_TOKEN" }
  | { type: "INPUT"; payload: Partial<ResetPasswordContext["values"]> }
  | { type: "BLUR"; payload: Partial<ResetPasswordContext["touched"]> }
  | { type: "SUBMIT" }
  | { type: "ERROR"; payload: HappyError | null }
  | { type: "RESET" }
type ResetPasswordState =
  | { value: "awaitingToken"; context: ResetPasswordContext }
  | { value: "missingToken"; context: ResetPasswordContext }
  | { value: "form"; context: ResetPasswordContext }
  | { value: "submitting"; context: ResetPasswordContext }
  | { value: "reset"; context: ResetPasswordContext }

function validate(
  values: ResetPasswordContext["values"],
): ResetPasswordContext["validationErrors"] {
  return {
    password: (() => {
      const password = values.password.trim()
      if (password.length === 0) return "missing"
      if (password.length < 3) return "too-short"
      return null
    })(),
  }
}

async function resetPasswordAction(
  state: StateMachine.State<ResetPasswordContext, ResetPasswordEvent, any>,
  auth: Auth<BaseTokenData>,
  send: (event: ResetPasswordEvent) => void,
) {
  if (hasValidationErrors(state.context.validationErrors)) {
    send({ type: "ERROR", payload: null })
    return
  }

  if (!state.context.token) {
    send({
      type: "ERROR",
      payload: { code: "missing token", message: "Token missing" },
    })
    return
  }

  if (!auth.resetPassword)
    throw new Error(
      `Tried to call auth.resetPassword, but it does not exist on state "${auth.state}"`,
    )

  try {
    const response = await auth.resetPassword(
      state.context.token,
      state.context.values.password,
    )
    if (response.error) {
      send({ type: "ERROR", payload: response.error })
    } else {
      send({ type: "RESET" })
    }
  } catch (error) {
    console.error(error)
    send({
      type: "ERROR",
      payload: { code: "unexpected-error", message: error.message },
    })
  }
}

// see https://xstate.js.org/viz/
const resetPasswordMachine = createMachine<
  ResetPasswordContext,
  ResetPasswordEvent,
  ResetPasswordState
>({
  id: "resetPasswordMachine",
  initial: "awaitingToken",
  context: {
    values: { password: "" },
    token: null,
    error: null,
    touched: { password: false },
    validationErrors: { password: null },
  },
  states: {
    awaitingToken: {
      on: {
        TOKEN: {
          target: "form",
          actions: assign({
            token: (context, event) => event.payload,
          }),
        },
        MISSING_TOKEN: {
          target: "missingToken",
        },
      },
    },
    missingToken: {},
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
          actions: assign({
            error: (context, event) => event.payload,
          }),
        },
        RESET: "reset",
      },
    },
    reset: {},
  },
})

const ResetPasswordError: React.FunctionComponent<{ error: HappyError }> = (
  props,
) => {
  if (props.error.code === "jwt expired") {
    return (
      <ErrorMessage title="Expired">
        <p>
          The password reset link is no longer valid. Request a new link{" "}
          <Link href="/forgot-password">
            <a className="underline">here</a>
          </Link>
          .
        </p>
      </ErrorMessage>
    )
  }
  return (
    <ErrorMessage title="Error">
      <p>{props.error.message || props.error.code}</p>
    </ErrorMessage>
  )
}

export function ResetPassword(props: {
  auth: Auth<BaseTokenData>
  publicConfig: PublicConfig
}) {
  const [state, send] = useMachine(resetPasswordMachine)

  React.useEffect(() => {
    state.actions.forEach((action) => {
      switch (action.type) {
        case "submit":
          resetPasswordAction(state, props.auth, send)
          break
      }
    })
  }, [state, props.auth])

  React.useEffect(() => {
    const parsed = queryString.parse(window.location.hash)
    const extractedToken = Array.isArray(parsed.token)
      ? parsed.token[0]
      : parsed.token

    if (extractedToken) {
      send({ type: "TOKEN", payload: extractedToken })
    } else {
      send({ type: "MISSING_TOKEN" })
    }
    window.location.hash = ""
  }, [])

  return (
    <React.Fragment>
      <Head>
        <style>{tailwind}</style>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div>
            <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm leading-5 text-gray-600">
              Choose your new password
            </p>
          </div>
          {state.value === "reset" ? (
            <React.Fragment>
              <SuccessMessage title="Password reset">
                <p className="text-sm">
                  Your password was reset successfully. You are now signed in.
                </p>
              </SuccessMessage>
              <div className="flex justify-center mt-4">
                <Link
                  href={
                    props.publicConfig?.redirects?.afterResetPassword || "/"
                  }
                >
                  <a>
                    <button
                      type="button"
                      className="py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
                      autoFocus
                    >
                      Continue
                    </button>
                  </a>
                </Link>
              </div>
            </React.Fragment>
          ) : state.value === "missingToken" ? (
            <ErrorMessage title="Invalid link">
              <p>
                The reset token is missing. Request a new link{" "}
                <Link href="/forgot-password">
                  <a className="underline">here</a>
                </Link>{" "}
                to start over.
              </p>
            </ErrorMessage>
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
              <InputGroup
                id="password"
                label="New Password"
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
                <ResetPasswordError error={state.context.error} />
              )}
              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
                  disabled={state.value === "submitting"}
                >
                  Reset my password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </React.Fragment>
  )
}
