// Example of how to use HappyAuth.
//
// You can replace your existing pages/index.js file this one to test
// your HappyAuth setup.
//
// This file can be deleted.
import * as React from "react"
import Head from "next/head"
import Link from "next/link"
import { useAuth } from "happyauth"
import { getServerSideAuth } from "happyauth/server"

export const getServerSideProps = async ({ req }) => {
  const initialAuth = getServerSideAuth(req)
  return { props: { initialAuth } }
}

const Example = (props) => {
  const auth = useAuth(props.initialAuth)

  return (
    <React.Fragment>
      <Head>
        <link
          href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div>
            <h2 className="text-center text-3xl leading-9 font-extrabold text-gray-900">
              HappyAuth
            </h2>
            <p className="mt-2 text-center text-sm leading-5 text-gray-600">
              Demo
            </p>
          </div>
          <div className="mt-8 text-sm text-gray-700">
            <p className="mt-2">
              This <span className="text-pink-600">pink page</span> was created
              automatically, so you can explore HappyAuth. You would replace
              this page with your own application.
            </p>
            <p className="mt-2">
              All the authentication pages with{" "}
              <span className="text-indigo-600">purple buttons</span> are set up
              for you already. You can keep using them, or replace them with
              your own!
            </p>
          </div>
          {auth.state === "signedIn" ? (
            <div className="mt-8">
              <div className="mt-6 flex">
                <div className="flex flex-auto items-center">
                  <hr className="w-full" />
                </div>
                <div className="flex flex-initial items-center justify-center text-gray-600 text-sm px-4">
                  You are signed in
                </div>
                <div className="flex flex-auto items-center">
                  <hr className="w-full" />
                </div>
              </div>
              <div className="mt-6 flex justify-around items-center">
                <div>
                  <Link href={`/change-password`}>
                    <a>
                      <button className="relative w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-500 focus:outline-none focus:border-pink-700 focus:shadow-outline-pink active:bg-pink-700 transition duration-150 ease-in-out">
                        Change password
                      </button>
                    </a>
                  </Link>
                </div>
                <div>
                  <button
                    className="relative w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-500 focus:outline-none focus:border-pink-700 focus:shadow-outline-pink active:bg-pink-700 transition duration-150 ease-in-out"
                    type="button"
                    onClick={() => auth.signOut()}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="mt-6 flex">
                <div className="flex flex-auto items-center">
                  <hr className="w-full" />
                </div>
                <div className="flex flex-initial items-center justify-center text-gray-600 text-sm px-4">
                  Start with
                </div>
                <div className="flex flex-auto items-center">
                  <hr className="w-full" />
                </div>
              </div>
              <div className="mt-6 flex justify-around items-center">
                <div>
                  <Link href={`/signup`}>
                    <a>
                      <button className="relative w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-500 focus:outline-none focus:border-pink-700 focus:shadow-outline-pink active:bg-pink-700 transition duration-150 ease-in-out">
                        Sign up
                      </button>
                    </a>
                  </Link>
                </div>
                <div>
                  <Link href={`/login`}>
                    <a>
                      <button className="relative w-full flex justify-center py-2 px-4 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-500 focus:outline-none focus:border-pink-700 focus:shadow-outline-pink active:bg-pink-700 transition duration-150 ease-in-out">
                        Login
                      </button>
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  )
}

export default Example
