import * as React from "react"
import Head from "next/head"
import { PublicConfig, HappyError, Auth, BaseTokenData } from ".."
import classNames from "classnames"
import tailwind from "../tailwind.css"
import {
  InputGroup,
  hasValidationErrors,
  inputAssigner,
  submitAssigner,
  touchedAssigner,
} from "../components/forms"
import { createMachine, assign, StateMachine } from "@xstate/fsm"
import { useMachine } from "@xstate/react/lib/fsm"
import { SuccessMessage } from "../components/messages"

type ForgotPasswordContext = {
  values: { email: string }
  error: null | HappyError
  touched: { email: boolean }
  validationErrors: { email: null | "missing" | "invalid" }
}
type ForgotPasswordEvent =
  | { type: "INPUT"; payload: Partial<ForgotPasswordContext["values"]> }
  | { type: "BLUR"; payload: Partial<ForgotPasswordContext["touched"]> }
  | { type: "SUBMIT" }
  | { type: "ERROR"; payload: HappyError | null }
  | { type: "SENT" }
type ForgotPasswordState =
  | { value: "form"; context: ForgotPasswordContext }
  | { value: "submitting"; context: ForgotPasswordContext }
  | { value: "sent"; context: ForgotPasswordContext }

function validate(
  values: ForgotPasswordContext["values"],
): ForgotPasswordContext["validationErrors"] {
  return {
    email: (() => {
      const email = values.email.trim()
      if (email.length === 0) return "missing"
      if (email.length <= 5) return "invalid"
      if (!email.includes("@")) return "invalid"
      if (!email.includes(".")) return "invalid"
      return null
    })(),
  }
}

async function forgotPasswordAction(
  state: StateMachine.State<ForgotPasswordContext, ForgotPasswordEvent, any>,
  auth: Auth<BaseTokenData>,
  send: (event: ForgotPasswordEvent) => void,
) {
  if (hasValidationErrors(state.context.validationErrors)) {
    send({ type: "ERROR", payload: null })
    return
  }

  if (!auth.forgotPassword)
    throw new Error(
      `Tried to call auth.forgotPassword, but it does not exist on state "${auth.state}"`,
    )

  try {
    const response = await auth.forgotPassword(state.context.values.email)
    if (response.data?.ok) {
      send({ type: "SENT" })
    } else {
      send({ type: "ERROR", payload: response.error || null })
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
const forgotPasswordMachine = createMachine<
  ForgotPasswordContext,
  ForgotPasswordEvent,
  ForgotPasswordState
>({
  id: "forgotPasswordMachine",
  initial: "form",
  context: {
    values: { email: "" },
    error: null,
    touched: { email: false },
    validationErrors: { email: null },
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
        SENT: "sent",
      },
    },
    sent: {},
  },
})

export function ForgotPassword(props: {
  auth: Auth<BaseTokenData>
  publicConfig: PublicConfig
}) {
  const [state, send] = useMachine(forgotPasswordMachine)

  React.useEffect(() => {
    state.actions.forEach((action) => {
      switch (action.type) {
        case "submit":
          forgotPasswordAction(state, props.auth, send)
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
              Forgot your password?
            </h2>
            <p className="mt-2 text-center text-sm leading-5 text-gray-600">
              Enter your email and we will send instructions to reset your
              password
            </p>
          </div>
          {state.value === "sent" ? (
            <SuccessMessage title="Email sent">
              <p className="text-sm">
                In case <b>{state.context.values.email}</b> is connected to an
                account, an email with a link to reset your password has been
                sent to it.
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
              <InputGroup
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
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
                disabled={state.value === "submitting"}
                onChange={(event) => {
                  const email = event.target.value
                  send({ type: "INPUT", payload: { email } })
                }}
                onBlur={() => {
                  send({ type: "BLUR", payload: { email: true } })
                }}
              />
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
