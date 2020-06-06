import { ConfirmAccount } from "@happykit/auth-email/pages/confirm-account"
import { publicConfig, useAuth } from "happyauth"

export default function ConfirmAccountPage() {
  const auth = useAuth()
  return <ConfirmAccount auth={auth} publicConfig={publicConfig} />
}
