import {
  createAuthRouteHandler,
  createFaunaEmailDriver,
} from "@happykit/auth-email/api"
import { publicConfig, TokenData } from "happyauth"
import { serverConfig, getServerSideAuth } from "happyauth/server"
import {
  SendConfirmAccountMail,
  SendForgotPasswordMail,
} from "@happykit/auth-email/api"
import { faunaClient } from "fauna-client"
import createMailgun from "mailgun-js"

const mailgun = createMailgun({
  apiKey: process.env.MAILGUN_API_KEY!,
  publicApiKey: process.env.MAILGUN_API_KEY!,
  domain: "mg.happykit.dev",
  // the mailgun host (default: 'api.mailgun.net'). Note that if you are using
  // the EU region the host should be set to 'api.eu.mailgun.net'
  // https://www.npmjs.com/package/mailgun-js
  host: "api.eu.mailgun.net",
})

const sendConfirmAccountMail: SendConfirmAccountMail = (email, link) => {
  return new Promise((resolve) => {
    const data = {
      from: process.env.SENDMAIL_SENDER_EMAIL_ADDRESS,
      to: email,
      subject: "Reset your password",
      html: [
        `Welcome,`,
        ``,
        `your account has been created.`,
        ``,
        `Click the link below to activate it:`,
        `<a href="${link}">${link}</a>`,
        ``,
        `PS: If you did not sign up, you can simply ignore this email.`,
        ``,
        `Cheers`,
      ].join("\n"),
    }
    mailgun.messages().send(data, () => {
      resolve()
    })
  })
}

const sendForgotPasswordMail: SendForgotPasswordMail = (email, link) => {
  return new Promise((resolve) => {
    const data = {
      from: process.env.SENDMAIL_SENDER_EMAIL_ADDRESS,
      to: email,
      subject: "Reset your password",
      html: [
        `Hello,`,
        ``,
        `somebody requested a reset of your password.`,
        `Click the link below to reset it:`,
        `<a href="${link}">${link}</a>`,
        ``,
        `Cheers`,
      ].join("\n"),
    }
    mailgun.messages().send(data, () => {
      resolve()
    })
  })
}

// You can use the triggers to customize the server behaviour.
//
// Alternatively, you can completely override individual functions by creating
// files for their routes /api/auth/<action>.ts, e.g. /api/auth/login.ts
export default createAuthRouteHandler<TokenData>({
  publicConfig,
  serverConfig,
  getServerSideAuth,
  triggers: {
    sendConfirmAccountMail,
    sendForgotPasswordMail,
  },
  driver: createFaunaEmailDriver(faunaClient),
})
