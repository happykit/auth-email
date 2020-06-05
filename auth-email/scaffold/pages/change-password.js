import { ChangePassword } from "@happykit/auth-email/pages/change-password"
import { publicConfig, useAuth } from "happyauth"

export default function ChangePasswordPage() {
  const auth = useAuth()
  return <ChangePassword auth={auth} publicConfig={publicConfig} />
}
