import * as React from "react"
import { ChangePassword } from "./change-password"
import fetchMock from "jest-fetch-mock"
import { createUseAuth } from ".."
import {
  renderApp,
  publicConfig,
  signedInTokenContentResponse,
  fireEvent,
  screen,
} from "../jest/utils.jsdom"

const useAuth = createUseAuth(publicConfig)
let ChangePasswordPage = () => {
  const auth = useAuth()
  return <ChangePassword auth={auth} publicConfig={publicConfig} />
}

test("when signed out", async () => {
  fetchMock.mockResponses([
    JSON.stringify({ error: { code: "no content" } }),
    { status: 200 },
  ])

  renderApp(<ChangePasswordPage />)

  // screen.debug()

  expect(await screen.findByText(/Change your password/)).toBeInTheDocument()
  expect(await screen.findByText(/Not signed in/)).toBeInTheDocument()
  expect(
    await screen.findByText(/You must be signed in to change your password/),
  ).toBeInTheDocument()
})

test("when signed in", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedInTokenContentResponse),
    { status: 200 },
  ])

  renderApp(<ChangePasswordPage />)

  expect(await screen.findByText(/Change your password/)).toBeInTheDocument()
  expect(await screen.queryByText(/Not signed in/)).not.toBeInTheDocument()
})

test("when changing successfully", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedInTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )

  renderApp(<ChangePasswordPage />)

  const currentPasswordInput = await screen.findByLabelText(/Current Password/)
  fireEvent.click(currentPasswordInput)
  fireEvent.change(currentPasswordInput, { target: { value: "hunter2" } })
  fireEvent.blur(currentPasswordInput)

  const newPasswordInput = await screen.findByLabelText(/New Password/)
  fireEvent.click(newPasswordInput)
  fireEvent.change(newPasswordInput, { target: { value: "hunter3" } })
  fireEvent.blur(newPasswordInput)

  const submitButton = await screen.findByText(/Change password/)
  fireEvent.click(submitButton)

  expect(
    await screen.findByText(/Your password was changed successfully/),
  ).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/change-password", {
    body: '{"currentPassword":"hunter2","newPassword":"hunter3"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})

test("when attempting change with invalid password", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedInTokenContentResponse), { status: 200 }],
    [
      JSON.stringify({ error: { code: "authentication failed" } }),
      { status: 200 },
    ],
  )

  renderApp(<ChangePasswordPage />)

  const currentPasswordInput = await screen.findByLabelText(/Current Password/)
  fireEvent.click(currentPasswordInput)
  fireEvent.change(currentPasswordInput, { target: { value: "wrong" } })
  fireEvent.blur(currentPasswordInput)

  const newPasswordInput = await screen.findByLabelText(/New Password/)
  fireEvent.click(newPasswordInput)
  fireEvent.change(newPasswordInput, { target: { value: "hunter3" } })
  fireEvent.blur(newPasswordInput)

  const submitButton = await screen.findByText(/Change password/)
  fireEvent.click(submitButton)

  expect(
    await screen.queryByText(/Your password was changed successfully/),
  ).not.toBeInTheDocument()

  expect(await screen.findByText(/Invalid password/)).toBeInTheDocument()
  expect(
    await screen.findByText(/The current password did not match/),
  ).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/change-password", {
    body: '{"currentPassword":"wrong","newPassword":"hunter3"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})

test("when making mistakes while filling the form", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedInTokenContentResponse),
    { status: 200 },
  ])

  renderApp(<ChangePasswordPage />)

  const currentPasswordInput = await screen.findByLabelText(/Current Password/)
  fireEvent.click(currentPasswordInput)
  fireEvent.blur(currentPasswordInput)

  expect(
    await screen.findByText(/The current password is missing/),
  ).toBeInTheDocument()

  fireEvent.click(currentPasswordInput)
  fireEvent.change(currentPasswordInput, { target: { value: "h" } })
  fireEvent.blur(currentPasswordInput)

  expect(
    await screen.queryByText(/The current password is missing/),
  ).not.toBeInTheDocument()

  const newPasswordInput = await screen.findByLabelText(/New Password/)
  fireEvent.click(newPasswordInput)
  fireEvent.blur(newPasswordInput)

  expect(
    await screen.findByText(/The new password must be at least 3 characters/),
  ).toBeInTheDocument()

  fireEvent.click(newPasswordInput)
  fireEvent.change(newPasswordInput, { target: { value: "hunter3" } })
  fireEvent.blur(newPasswordInput)

  expect(
    await screen.queryByText(/The new password must be at least 3 characters/),
  ).not.toBeInTheDocument()
})

test("when submitting without filling the form", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedInTokenContentResponse),
    { status: 200 },
  ])

  renderApp(<ChangePasswordPage />)

  const submitButton = await screen.findByText(/Change password/)
  fireEvent.click(submitButton)

  expect(
    await screen.findByText(/The current password is missing/),
  ).toBeInTheDocument()
  expect(
    await screen.findByText(/The new password must be at least 3 characters/),
  ).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledTimes(1)
})
