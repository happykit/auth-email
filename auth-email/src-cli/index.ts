import { program, Command } from "commander"
import open from "open"
import createInit from "./init"
import files from "./files"
import db from "./db"
import createRandomSecret from "./random-secret"

program.name("auth").action(() => {
  console.log(program.helpInformation())
})

program.usage("[command]")

// yarn auth-email init
createInit(program as Command)

// yarn auth-email random-secret
createRandomSecret(program as Command)

program
  .command("docs")
  .description(`Open the documentation`)
  .action(() => {
    open("https://docs.happykit.dev/")
  })

program
  .command("repo")
  .description(`Open the repository`)
  .action(() => {
    open("https://github.com/happykit/auth-email")
  })

// yarn auth-email files init
// yarn auth-email files clean
// yarn auth-email files eject <path>
program.addCommand(files)

// yarn auth-email db init
// yarn auth-email db validate
program.addCommand(db)

program.parse(process.argv)
