import * as React from "react"

export const ErrorMessage: React.FunctionComponent<{ title: string }> = (
  props,
) => (
  <div
    className="mt-3 bg-red-100 border-l-4 border-red-500 text-red-700 p-4"
    role="alert"
  >
    <p className="font-bold">{props.title}</p>
    {props.children}
  </div>
)

export const WarningMessage: React.FunctionComponent<{ title: string }> = (
  props,
) => (
  <div
    className="mt-3 bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4"
    role="alert"
  >
    <p className="font-bold">{props.title}</p>
    {props.children}
  </div>
)

export const SuccessMessage: React.FunctionComponent<{ title?: string }> = (
  props,
) => (
  <div
    className="mt-3 bg-green-100 border-l-4 border-green-500 text-green-700 p-4"
    role="alert"
  >
    {props.title && <p className="font-bold">{props.title}</p>}
    {props.children}
  </div>
)
