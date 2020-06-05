import { Command } from "commander"
import crypto from "crypto"

function randomSecret() {
  return crypto.randomBytes(32).toString("hex")
}

export default function createRandomSecret(program: Command) {
  program
    // the init command is a shortcut for executing
    // yarn auth db init
    // yarn auth files init
    .command("random-secret")
    .description(`Generate a random secret`)
    .action(() => {
      console.log(randomSecret())
    })
}
