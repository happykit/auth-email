import { NextApiRequest, NextApiResponse } from "next"
import { AuthRouteHandlerOptions } from "."

export function createTokenContent(options: AuthRouteHandlerOptions) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const auth = options.getServerSideAuth(req)
    res.status(200).json(auth ? { data: auth } : { data: null })
  }
}
