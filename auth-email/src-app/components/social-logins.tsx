import * as React from "react"
import { PublicConfig } from ".."
import Link from "next/link"

export const SocialLogins: React.FunctionComponent<{
  identityProviders: PublicConfig["identityProviders"]
}> = (props) => (
  <React.Fragment>
    <div className="mt-6 flex">
      <div className="flex flex-auto items-center">
        <hr className="w-full" />
      </div>
      <div className="flex flex-initial items-center justify-center text-gray-600 text-sm px-4">
        Or continue with
      </div>
      <div className="flex flex-auto items-center">
        <hr className="w-full" />
      </div>
    </div>
    <div className="mt-6 flex justify-around">
      {Object.entries(props.identityProviders).map(([key, value]) => (
        <div key={key}>
          <Link href={`/api/auth/oauth/${key}/authorize`}>
            <a>
              <button className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-1 px-2 text-sm border border-gray-400 rounded shadow">
                {value.name}
              </button>
            </a>
          </Link>
        </div>
      ))}
    </div>
  </React.Fragment>
)
