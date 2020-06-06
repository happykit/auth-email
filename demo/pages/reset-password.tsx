import { ResetPassword } from "@happykit/auth-email/pages/reset-password"
import { publicConfig, useAuth } from "happyauth"

export default function ResetPasswordPage() {
  const auth = useAuth()
  return <ResetPassword auth={auth} publicConfig={publicConfig} />
}
