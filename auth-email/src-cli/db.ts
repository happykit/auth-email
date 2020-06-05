import { Command } from "commander"
import faunadb, { query as q } from "faunadb"
import chalk from "chalk"
import inquirer from "inquirer"
import * as prompts from "./prompts"

export async function initDb({ faunaSecret }: { faunaSecret: string }) {
  const serverClient = new faunadb.Client({ secret: faunaSecret })
  try {
    await serverClient.query(
      // TODO Currently the index will not get created in case the User
      // collection already exists, as the creation will abort.
      q.Let(
        {
          collection: q.CreateCollection({
            name: "User",
            history_days: 30,
            ttl_days: null,
          }),
        },
        q.CreateIndex({
          name: "users_by_email",
          // permissions: { read: "public" },
          source: q.Select("ref", q.Var("collection")),
          terms: [{ field: ["data", "email"] }],
          unique: true,
        }),
      ),
    )
    console.log(chalk.green("Created User collection and users_by_email index"))
  } catch (e) {
    console.log(chalk.red("Creation failed"), "\n")
    if (e.message === "instance already exists") {
      console.log(
        "Seems like either the User collection or the users_by_email index exist already.",
      )
      console.log(
        "You can verify that on the FaunaDB Dashboard https://dashboard.fauna.com/.",
      )
      console.log("If they exist, you don't need to run this script again.")
    } else {
      console.error(e)
    }
  }
}

async function init() {
  const { faunaSecret } = await inquirer.prompt([prompts.faunaSecret])

  return initDb({ faunaSecret })
}

const db = new Command("db")
db.description("Database subcommand")

db.command("init").description("Initialize database").action(init)

db.command("validate")
  .description("Initialize database")
  .action(() => {
    console.log("This command is not built yet")
  })

export default db
