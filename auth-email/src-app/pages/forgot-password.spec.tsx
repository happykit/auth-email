import * as React from "react"
import { ForgotPassword } from "./forgot-password"
import fetchMock from "jest-fetch-mock"
import { createUseAuth } from ".."
import {
  renderApp,
  publicConfig,
  signedOutTokenContentResponse,
  fireEvent,
  screen,
} from "../jest/utils.jsdom"

const useAuth = createUseAuth(publicConfig)
let ForgotPasswordPage = () => {
  const auth = useAuth()
  return <ForgotPassword auth={auth} publicConfig={publicConfig} />
}

test("when changing successfully", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedOutTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )

  renderApp(<ForgotPasswordPage />)

  const emailInput = await screen.findByLabelText(/Email address/)
  fireEvent.click(emailInput)
  fireEvent.change(emailInput, { target: { value: "user@test.com" } })
  fireEvent.blur(emailInput)

  const submitButton = await screen.findByText(/Reset my password/)
  fireEvent.click(submitButton)

  expect(await screen.findByText(/Email sent/)).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/forgot-password", {
    body: '{"email":"user@test.com"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})

test("when making mistakes while filling the form", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedOutTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )

  renderApp(<ForgotPasswordPage />)

  const emailInput = await screen.findByLabelText(/Email address/)
  fireEvent.click(emailInput)
  fireEvent.blur(emailInput)

  expect(
    await screen.findByText(/The email address is missing/),
  ).toBeInTheDocument()

  fireEvent.click(emailInput)
  fireEvent.change(emailInput, { target: { value: "h" } })
  fireEvent.blur(emailInput)

  expect(
    await screen.findByText(/The email address doesn't seem valid/),
  ).toBeInTheDocument()

  let submitButton = await screen.findByText(/Reset my password/)
  fireEvent.click(submitButton)

  expect(fetchMock).toHaveBeenCalledTimes(1)

  fireEvent.click(emailInput)
  fireEvent.change(emailInput, { target: { value: "user@test.com" } })
  fireEvent.blur(emailInput)

  expect(
    await screen.queryByText(/The email address is missing/),
  ).not.toBeInTheDocument()
  expect(
    await screen.queryByText(/The email address doesn't seem valid/),
  ).not.toBeInTheDocument()

  fireEvent.click(submitButton)
  expect(await screen.findByText(/Email sent/)).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test("when submitting without filling the form", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedOutTokenContentResponse),
    { status: 200 },
  ])

  renderApp(<ForgotPasswordPage />)

  const submitButton = await screen.findByText(/Reset my password/)
  fireEvent.click(submitButton)

  expect(
    await screen.findByText(/The email address is missing/),
  ).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledTimes(1)
})
