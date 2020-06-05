import * as React from "react"
import Head from "next/head"
import { PublicConfig, HappyError, Auth, BaseTokenData } from ".."
import Link from "next/link"
import classNames from "classnames"
import tailwind from "../tailwind.css"
import { ErrorMessage, WarningMessage } from "../components/messages"
import {
  InputGroup,
  hasValidationErrors,
  inputAssigner,
  touchedAssigner,
  submitAssigner,
} from "../components/forms"
import { createMachine, assign, StateMachine } from "@xstate/fsm"
import { useMachine } from "@xstate/react/lib/fsm"

const ChangePasswordError: React.FunctionComponent<{ error: HappyError }> = (
  props,
) => {
  if (props.error.code === "authentication failed") {
    return (
      <ErrorMessage title="Invalid password">
        <p>The current password did not match.</p>
      </ErrorMessage>
    )
  }

  return (
    <ErrorMessage title="Error">
      <p>{props.error.message || props.error.code}</p>
    </ErrorMessage>
  )
}

type FormContext = {
  values: {
    currentPassword: string
    newPassword: string
  }
  error: null | HappyError
  touched: {
    currentPassword: boolean
    newPassword: boolean
  }
  validationErrors: {
    currentPassword: null | string
    newPassword: null | string
  }
}
type FormEvent =
  | { type: "INPUT"; payload: Partial<FormContext["values"]> }
  | { type: "BLUR"; payload: Partial<FormContext["touched"]> }
  | { type: "SUBMIT" }
  | { type: "ERROR"; payload: HappyError | null }
  | { type: "COMPLETE" }
type FormState =
  | { value: "form"; context: FormContext }
  | { value: "submitting"; context: FormContext }
  | { value: "passwordChangeSubmitted"; context: FormContext }

function validate(
  values: FormContext["values"],
): FormContext["validationErrors"] {
  return {
    currentPassword: values.currentPassword.length === 0 ? "missing" : null,
    newPassword: values.newPassword.length < 3 ? "too-short" : null,
  }
}

async function changePasswordAction(
  state: StateMachine.State<FormContext, FormEvent, any>,
  auth: Auth<BaseTokenData>,
  send: (event: FormEvent) => void,
) {
  if (auth.state !== "signedIn") {
    send({
      type: "ERROR",
      payload: {
        code: "not signed in",
        message: "You are not signed in.",
      },
    })
    return
  }

  if (hasValidationErrors(state.context.validationErrors)) {
    send({ type: "ERROR", payload: null })
    return
  }

  try {
    const response = await auth.changePassword(
      state.context.values.currentPassword,
      state.context.values.newPassword,
    )
    if (!response.error) {
      send({ type: "COMPLETE" })
    } else {
      send({ type: "ERROR", payload: response.error })
    }
  } catch (error) {
    console.error(error)
    send({
      type: "ERROR",
      payload: {
        code: "unexpected",
        message: "An unexpected error occurred",
      },
    })
  }
}

// see https://xstate.js.org/viz/
const changePasswordMachine = createMachine<FormContext, FormEvent, FormState>({
  id: "changePasswordMachine",
  initial: "form",
  context: {
    values: {
      currentPassword: "",
      newPassword: "",
    },
    error: null,
    touched: {
      currentPassword: false,
      newPassword: false,
    },
    validationErrors: {
      currentPassword: null,
      newPassword: null,
    },
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
          actions: assign({
            error: (context, event) => event.payload,
          }),
        },
        COMPLETE: "passwordChangeSubmitted",
      },
    },
    passwordChangeSubmitted: {},
  },
})

export function ChangePassword(props: {
  auth: Auth<BaseTokenData>
  publicConfig: PublicConfig
}) {
  const [state, send] = useMachine(changePasswordMachine)

  React.useEffect(() => {
    state.actions.forEach((action) => {
      switch (action.type) {
        case "submit":
          changePasswordAction(state, props.auth, send)
          break
      }
    })
  }, [state, props.auth])

  return (
    <React.Fragment>
      <Head>
        <style>{tailwind}</style>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div>
            <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
              Change your password
            </h2>
            <p className="mt-2 text-center text-sm leading-5 text-gray-600">
              Choose your new password
            </p>
          </div>
          {props.auth.state !== "signedIn" &&
          props.auth.state !== "authenticating" ? (
            <WarningMessage title="Not signed in">
              <p>
                You must be signed in to change your password. If you have an
                account,{" "}
                <Link href="/login">
                  <a>
                    <button type="button" className="underline">
                      sign in
                    </button>
                  </a>
                </Link>{" "}
                first.
              </p>
            </WarningMessage>
          ) : state.value === "passwordChangeSubmitted" ? (
            <React.Fragment>
              <div
                className="my-3 bg-indigo-100 border-t border-b border-indigo-500 text-indigo-700 px-4 py-3"
                role="alert"
              >
                <p className="font-bold">Password changed</p>
                <p className="text-sm">
                  Your password was changed successfully.
                </p>
              </div>
              <div className="flex justify-center">
                <Link
                  href={
                    props.publicConfig?.redirects?.afterChangePassword || "/"
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
                type="password"
                id="current-password"
                autoComplete="current-password"
                label="Current Password"
                autoFocus
                touched={state.context.touched.currentPassword}
                error={
                  state.context.validationErrors.currentPassword
                    ? "The current password is missing."
                    : null
                }
                value={state.context.values.currentPassword}
                disabled={state.value === "submitting"}
                onBlur={() => {
                  send({ type: "BLUR", payload: { currentPassword: true } })
                }}
                onChange={(event) => {
                  const currentPassword = event.target.value
                  send({ type: "INPUT", payload: { currentPassword } })
                }}
              />
              <InputGroup
                type="password"
                id="new-password"
                autoComplete="new-password"
                label="New Password"
                touched={state.context.touched.newPassword}
                error={
                  state.context.validationErrors.newPassword
                    ? "The new password must be at least 3 characters."
                    : null
                }
                value={state.context.values.newPassword}
                disabled={state.value === "submitting"}
                onBlur={() => {
                  send({ type: "BLUR", payload: { newPassword: true } })
                }}
                onChange={(event) => {
                  const newPassword = event.target.value
                  send({ type: "INPUT", payload: { newPassword } })
                }}
              />
              {state.context.error && (
                <ChangePasswordError error={state.context.error} />
              )}
              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
                  disabled={state.value === "submitting"}
                >
                  Change password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </React.Fragment>
  )
}
