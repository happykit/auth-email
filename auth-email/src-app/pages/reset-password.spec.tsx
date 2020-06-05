import * as React from "react"
import { ResetPassword } from "./reset-password"
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
let ResetPasswordPage = () => {
  const auth = useAuth()
  return <ResetPassword auth={auth} publicConfig={publicConfig} />
}

test("when token is missing", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedOutTokenContentResponse),
    { status: 200 },
  ])
  renderApp(<ResetPasswordPage />)

  expect(await screen.findByText(/Invalid link/)).toBeInTheDocument()
})

test("when token is present", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedOutTokenContentResponse),
    { status: 200 },
  ])
  window.location.href = "#token=abc"
  renderApp(<ResetPasswordPage />)

  expect(await screen.findByText(/Reset your password/)).toBeInTheDocument()
  expect(await screen.queryByText(/Invalid link/)).not.toBeInTheDocument()
})

test("setting a new password", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedOutTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )
  window.location.href = "#token=abc"
  renderApp(<ResetPasswordPage />)

  const newPasswordInput = await screen.findByLabelText(/New Password/)
  fireEvent.click(newPasswordInput)
  fireEvent.change(newPasswordInput, { target: { value: "hunter2" } })
  fireEvent.blur(newPasswordInput)

  const submitButton = await screen.findByText("Reset my password")
  fireEvent.click(submitButton)

  expect(await screen.queryByText(/Invalid link/)).not.toBeInTheDocument()
  expect(await screen.findByText("Password reset")).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/reset-password", {
    body: '{"token":"abc","password":"hunter2"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})

test("when making mistakes while setting new password", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedOutTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )
  window.location.href = "#token=abc"
  renderApp(<ResetPasswordPage />)

  const newPasswordInput = await screen.findByLabelText(/New Password/)
  fireEvent.click(newPasswordInput)
  fireEvent.blur(newPasswordInput)
  expect(await screen.findByText(/The password is missing/)).toBeInTheDocument()

  const submitButton = await screen.findByText("Reset my password")
  fireEvent.click(submitButton)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  fireEvent.click(newPasswordInput)
  fireEvent.change(newPasswordInput, { target: { value: "h" } })
  fireEvent.blur(newPasswordInput)
  expect(
    await screen.findByText(
      /The password should at least be three characters long/,
    ),
  ).toBeInTheDocument()

  fireEvent.click(submitButton)
  expect(fetchMock).toHaveBeenCalledTimes(1)

  fireEvent.click(newPasswordInput)
  fireEvent.change(newPasswordInput, { target: { value: "hunter2" } })
  fireEvent.blur(newPasswordInput)

  fireEvent.click(submitButton)

  expect(await screen.queryByText(/Invalid link/)).not.toBeInTheDocument()
  expect(await screen.findByText("Password reset")).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/reset-password", {
    body: '{"token":"abc","password":"hunter2"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})
