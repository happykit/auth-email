import { program, Command } from "commander"
import open from "open"
import createInit from "./init"
import files from "./files"
import db from "./db"

program.name("auth").action(() => {
  console.log(program.helpInformation())
})

program.usage("[command]")

// yarn auth init
createInit(program as Command)

program
  .command("docs")
  .description(`Open the documentation`)
  .action(() => {
    open("https://github.com/happykit/auth/tree/master/package")
  })

// yarn auth files init
// yarn auth files clean
// yarn auth files eject <path>
program.addCommand(files)

// yarn auth db init
// yarn auth db validate
program.addCommand(db)

program.parse(process.argv)
