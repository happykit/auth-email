import { NextApiRequest, NextApiResponse } from "next"
import { ok, AuthRouteHandlerOptions } from "."

// Placeholder file for the HappyKit facing API
export function createConnect(options: AuthRouteHandlerOptions) {
  return async function connect(req: NextApiRequest, res: NextApiResponse) {
    ok(res)
  }
}
