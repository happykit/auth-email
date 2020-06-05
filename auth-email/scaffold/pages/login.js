import { Login } from "@happykit/auth-email/pages/login"
import { publicConfig, useAuth } from "happyauth"

export default function LoginPage() {
  const auth = useAuth()
  return <Login auth={auth} publicConfig={publicConfig} />
}
