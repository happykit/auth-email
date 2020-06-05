import * as React from "react"
import classNames from "classnames"
import { StateMachine, EventObject } from "@xstate/fsm"
import mapValues from "lodash.mapvalues"

export const InputGroup: React.FunctionComponent<
  {
    id: Exclude<React.InputHTMLAttributes<HTMLInputElement>["id"], undefined>
    label: string
    error?: string | null
    touched?: boolean
  } & React.InputHTMLAttributes<HTMLInputElement>
> = ({ id, label, error, touched, ...inputProps }) => {
  return (
    <label className="block mt-4" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium leading-5 text-gray-700">
        {label}
      </span>{" "}
      <input
        className={classNames(
          "bg-white focus:outline-none focus:shadow-outline border rounded-lg py-2 px-4 block w-full appearance-none leading-normal",
          touched && error ? "border-red-300" : "border-gray-300",
        )}
        id={id}
        {...inputProps}
      />
      {touched && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </label>
  )
}

export function hasValidationErrors(values: object) {
  return Object.values(values).some(Boolean)
}

export function inputAssigner<
  V,
  P,
  TC extends { values: V },
  TE extends EventObject & { payload?: P }
>(validate: (values: TC["values"]) => object): StateMachine.Assigner<TC, TE> {
  return (context, event) => {
    const values = { ...context.values, ...event.payload }
    const validationErrors = validate(values)
    return { ...context, values, validationErrors }
  }
}

export function touchedAssigner<
  T,
  V,
  P,
  TC extends { touched: T; values: V },
  TE extends EventObject & { payload?: P }
>(validate: (values: TC["values"]) => object): StateMachine.Assigner<TC, TE> {
  return (context, event) => {
    const touched = { ...context.touched, ...event.payload }
    const validationErrors = validate(context.values)
    return { ...context, touched, validationErrors }
  }
}

export function submitAssigner<
  T extends { [key: string]: boolean },
  V,
  P,
  TC extends { touched: T; values: V },
  TE extends EventObject & { payload?: P }
>(validate: (values: TC["values"]) => object): StateMachine.Assigner<TC, TE> {
  return (context, event) => {
    const touched = mapValues(context.touched, () => true)
    const validationErrors = validate(context.values)
    return { ...context, touched, validationErrors }
  }
}
