import { Signup } from "@happykit/auth-email/pages/signup"
import { publicConfig, useAuth } from "happyauth"

export default function SignupPage() {
  const auth = useAuth()
  return <Signup auth={auth} publicConfig={publicConfig} />
}
