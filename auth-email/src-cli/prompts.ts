import inquirer from "inquirer"

export const faunaSecret: inquirer.PasswordQuestion = {
  type: "password",
  name: "faunaSecret",
  message: "FaunaDB Server Key",
  validate: (input) => {
    if (input.trim().length === 0) return "Key must be provided"

    if (!input.startsWith("fn"))
      return `This looks like an invalid FaunaDB key. They usually start with "fn", but this one doesn't.`

    return true
  },
  mask: "*",
}
