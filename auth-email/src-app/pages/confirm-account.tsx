import * as React from "react"
import { PublicConfig, HappyApiResponse, Auth, BaseTokenData } from ".."
import queryString from "query-string"
import Link from "next/link"
import Head from "next/head"
import tailwind from "../tailwind.css"
import { SuccessMessage, ErrorMessage } from "../components/messages"

enum STATE {
  confirming = "confirming",
  failed = "failed",
  confirmed = "confirmed",
}

export function ConfirmAccount(props: {
  auth: Auth<BaseTokenData>
  publicConfig: PublicConfig
}) {
  const [state, setState] = React.useState<STATE>(STATE.confirming)

  React.useEffect(() => {
    const parsed = queryString.parse(window.location.hash)

    const token = Array.isArray(parsed.token) ? parsed.token[0] : parsed.token
    if (!token) return
    if (!props.auth.confirmAccount) return

    props.auth
      .confirmAccount(token)
      .then((response) => {
        if (response.data) setState(STATE.confirmed)
        else setState(STATE.failed)
      })
      .catch(() => {
        setState(STATE.failed)
      })
  }, [setState, props.auth])

  if (state === "confirming")
    return (
      <React.Fragment>
        <Head>
          <style>{tailwind}</style>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div>
              <p className="mt-2 text-center text-sm leading-5 text-gray-600">
                Confirming your account...
              </p>
            </div>
          </div>
        </div>
      </React.Fragment>
    )

  if (state === "failed")
    return (
      <React.Fragment>
        <Head>
          <style>{tailwind}</style>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div>
              <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
                Account confirmation failed
              </h2>
            </div>
            <ErrorMessage title="Error">
              <p>There was an error</p>
            </ErrorMessage>
          </div>
        </div>
      </React.Fragment>
    )

  return (
    <React.Fragment>
      <Head>
        <style>{tailwind}</style>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div>
            <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
              Account confirmed
            </h2>
            <p className="mt-2 text-center text-sm leading-5 text-gray-600">
              You are now signed in
            </p>
          </div>

          <React.Fragment>
            <SuccessMessage>
              <p>
                Your account was confirmed and you have been signed in
                automatically.
              </p>
            </SuccessMessage>
            <div className="flex justify-center mt-4">
              <Link
                href={props.publicConfig?.redirects?.afterConfirmAccount || "/"}
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
        </div>
      </div>
    </React.Fragment>
  )
}
