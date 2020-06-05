import { ForgotPassword } from "@happykit/auth-email/pages/forgot-password"
import { publicConfig, useAuth } from "happyauth"

export default function ForgotPasswordPage() {
  const auth = useAuth()
  return <ForgotPassword auth={auth} publicConfig={publicConfig} />
}
