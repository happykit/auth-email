import { Command } from "commander"
import inquirer from "inquirer"
import chalk from "chalk"
import { initFiles } from "./files"
import { initDb } from "./db"
import * as prompts from "./prompts"

async function init() {
  const { faunaSecret } = await inquirer.prompt([prompts.faunaSecret])

  try {
    await initDb({ faunaSecret })
    await initFiles({ faunaSecret })
  } catch (e) {
    console.error(chalk.red("Error"), e.message)
  }
}

export default function createInit(program: Command) {
  program
    // the init command is a shortcut for executing
    // yarn auth db init
    // yarn auth files init
    .command("init")
    .description(`Initialize database and files`)
    .action(init)
}
