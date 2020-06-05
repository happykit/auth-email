import * as React from "react"
import { ConfirmAccount } from "./confirm-account"
import fetchMock from "jest-fetch-mock"
import { createUseAuth } from ".."
import {
  renderApp,
  publicConfig,
  signedInTokenContentResponse,
  screen,
} from "../jest/utils.jsdom"

const useAuth = createUseAuth(publicConfig)
let ConfirmAccountPage = () => {
  const auth = useAuth()
  return <ConfirmAccount auth={auth} publicConfig={publicConfig} />
}

afterEach(() => {
  window.location.hash = ""
})

test("when opening without a token", async () => {
  fetchMock.mockResponses([
    JSON.stringify({ error: { code: "no content" } }),
    { status: 200 },
  ])

  window.location.hash = ""
  renderApp(<ConfirmAccountPage />)

  expect(
    await screen.findByText(/Confirming your account\.\.\./),
  ).toBeInTheDocument()
})

test("when token confirmation fails", async () => {
  fetchMock.mockResponses([
    JSON.stringify({ error: { code: "unexpected error" } }),
    { status: 500 },
  ])

  window.location.hash = "#token=broken"
  renderApp(<ConfirmAccountPage />)

  expect(
    await screen.findByText(/Account confirmation failed/),
  ).toBeInTheDocument()
})

test("when token confirmation succeeds", async () => {
  fetchMock.mockResponses(
    [JSON.stringify({ data: { ok: true } }), { status: 200 }],
    [JSON.stringify(signedInTokenContentResponse), { status: 200 }],
  )

  window.location.hash = "#token=working"
  renderApp(<ConfirmAccountPage />)

  expect(await screen.findByText(/Account confirmed/)).toBeInTheDocument()
})
