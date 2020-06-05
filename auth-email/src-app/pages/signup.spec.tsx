const mockPush = jest.fn()
jest.mock("next/router", () => {
  return { push: mockPush }
})

import * as React from "react"
import { Signup } from "./signup"
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
let SignupPage = () => {
  const auth = useAuth()
  return <Signup auth={auth} publicConfig={publicConfig} />
}

test("when signing up successfully", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedOutTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )

  renderApp(<SignupPage />)

  const emailInput = await screen.findByLabelText(/Email address/)
  fireEvent.click(emailInput)
  fireEvent.change(emailInput, { target: { value: "user@test.com" } })
  fireEvent.blur(emailInput)

  const passwordInput = await screen.findByLabelText(/Password/)
  fireEvent.click(passwordInput)
  fireEvent.change(passwordInput, { target: { value: "hunter2" } })
  fireEvent.blur(passwordInput)

  const submitButton = await screen.findByText("Sign up")
  fireEvent.click(submitButton)

  // TODO verify that Router.push gets called
  expect(await screen.findByText("Account created")).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", {
    body: '{"email":"user@test.com","password":"hunter2"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})

test("when making mistakes while filling the form", async () => {
  fetchMock.mockResponses(
    [JSON.stringify(signedOutTokenContentResponse), { status: 200 }],
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
  )
  renderApp(<SignupPage />)

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

  fireEvent.click(emailInput)
  fireEvent.change(emailInput, { target: { value: "user@test.com" } })
  fireEvent.blur(emailInput)

  expect(
    await screen.queryByText(/The email address doesn't seem valid/),
  ).not.toBeInTheDocument()

  expect(
    await screen.queryByText(/The email address is missing/),
  ).not.toBeInTheDocument()

  const passwordInput = await screen.findByLabelText(/Password/)
  fireEvent.click(passwordInput)
  fireEvent.blur(passwordInput)

  expect(await screen.findByText(/The password is missing/)).toBeInTheDocument()

  fireEvent.click(passwordInput)
  fireEvent.change(passwordInput, { target: { value: "h" } })
  fireEvent.blur(passwordInput)

  expect(
    await screen.findByText(
      /The password should at least be three characters long/,
    ),
  ).toBeInTheDocument()

  fireEvent.click(passwordInput)
  fireEvent.change(passwordInput, { target: { value: "hunter2" } })
  fireEvent.blur(passwordInput)

  expect(
    await screen.queryByText(/The password is missing/),
  ).not.toBeInTheDocument()
  expect(
    await screen.queryByText(
      /The password should at least be three characters long/,
    ),
  ).not.toBeInTheDocument()

  const submitButton = await screen.findByText("Sign up")
  fireEvent.click(submitButton)

  expect(await screen.findByText("Account created")).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", {
    body: '{"email":"user@test.com","password":"hunter2"}',
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
})

test("when submitting without filling the form", async () => {
  fetchMock.mockResponses([
    JSON.stringify(signedOutTokenContentResponse),
    { status: 200 },
  ])
  renderApp(<SignupPage />)

  const submitButton = await screen.findByText("Sign up")
  fireEvent.click(submitButton)

  expect(
    await screen.findByText(/The email address is missing/),
  ).toBeInTheDocument()

  expect(await screen.findByText(/The password is missing/)).toBeInTheDocument()

  expect(fetchMock).toHaveBeenCalledTimes(1)
})
