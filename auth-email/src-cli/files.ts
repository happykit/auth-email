import { Command } from "commander"
import findRoot from "find-root"
import fs from "fs-extra"
import path from "path"
import klaw from "klaw"
import inquirer, { ListQuestionOptions } from "inquirer"
import chalk from "chalk"
import crypto from "crypto"
import * as prompts from "./prompts"

function randomSecret() {
  return crypto.randomBytes(32).toString("hex")
}

type EnhancedItem = {
  item: klaw.Item
  pathInRoot: string
  destination: string
  exists: boolean
  existingFileMatchesScaffold: boolean
}

async function getFiles(source: string, target: string) {
  const usesTypeScript = fs.existsSync(path.join(target, "tsconfig.json"))

  console.log(
    usesTypeScript
      ? chalk.grey("Detected tsconfig.json. Scaffolding as TypeScript.")
      : chalk.grey("No tsconfig.json detected. Scaffolding as JavaScript."),
  )

  const items: klaw.Item[] = []
  return new Promise<{
    existingFiles: EnhancedItem[]
    nonExistingFiles: EnhancedItem[]
    enhancedItems: EnhancedItem[]
  }>((resolve, reject) => {
    klaw(source)
      .on("data", (item) => {
        console.log(item.path, item.stats.isDirectory())

        // exclude folders
        if (item.stats.isDirectory()) return

        // Exclude ts/tsx files for js projects, and
        // exclude js files for ts projects.
        //
        // We use the blacklist approach so that files like .env.local end
        // up in both scaffolds.
        if (item.path.match(usesTypeScript ? /\.js$/ : /\.tsx?$/)) return

        if (usesTypeScript && item.path.endsWith("/jsconfig.json")) return
        items.push(item)
      })
      .on("error", (error) => {
        console.error("Something went wrong")
        console.log(error)
        reject(error)
      })
      .on("end", async () => {
        const enhancedItems: EnhancedItem[] = await Promise.all(
          items.map((item) => {
            const pathInRoot = path.relative(source, item.path)
            const destination = path.join(target, pathInRoot)
            const exists = fs.existsSync(destination)

            const existingFileMatchesScaffold = exists
              ? (() => {
                  // check if files are equal and skip prompt/overwrite if they are
                  const a = fs.readFileSync(item.path, "utf8")
                  const b = fs.readFileSync(destination, "utf8")
                  return a === b
                })()
              : false

            return {
              item,
              pathInRoot,
              destination,
              exists,
              existingFileMatchesScaffold,
            }
          }),
        )

        const { nonExistingFiles, existingFiles } = enhancedItems.reduce<{
          nonExistingFiles: EnhancedItem[]
          existingFiles: EnhancedItem[]
        }>(
          (acc, enhancedItem) => {
            if (enhancedItem.exists) {
              acc.existingFiles.push(enhancedItem)
            } else {
              acc.nonExistingFiles.push(enhancedItem)
            }
            return acc
          },
          { nonExistingFiles: [], existingFiles: [] },
        )

        resolve({ nonExistingFiles, existingFiles, enhancedItems })
      })
  })
}

export async function initFiles({ faunaSecret }: { faunaSecret: string }) {
  const source = path.join(findRoot(__dirname), "scaffold")
  const target = process.cwd()
  const { nonExistingFiles, existingFiles, enhancedItems } = await getFiles(
    source,
    target,
  )

  const choices: ListQuestionOptions["choices"] = existingFiles
    .filter((item) => item.exists && !item.existingFileMatchesScaffold)
    .map((item) => ({ name: item.pathInRoot }))

  const { overwrite }: { overwrite: string[] } =
    choices.length > 0
      ? await inquirer.prompt([
          {
            type: "checkbox",
            message:
              "The following files have changes. Select files to overwrite",
            name: "overwrite",
            choices,
          },
        ])
      : { overwrite: [] }

  const filesToCreate = [
    ...nonExistingFiles,
    ...overwrite.map((filename) =>
      existingFiles.find((file) => file.pathInRoot === filename),
    ),
  ] as EnhancedItem[]

  console.log("")
  console.log(chalk.bold("The following changes were made:"))
  enhancedItems.map((enhancedItem) => {
    if (filesToCreate.includes(enhancedItem)) {
      // do not copy directories, as that would copy their contents too
      fs.copySync(enhancedItem.item.path, enhancedItem.destination)

      // generate .env.local secret and overwrite file
      if (enhancedItem.pathInRoot === ".env.local") {
        let content = fs.readFileSync(enhancedItem.destination, "utf8")

        content = content.replace(
          /HAPPYAUTH_TOKEN_SECRET=""/g,
          `HAPPYAUTH_TOKEN_SECRET="${randomSecret()}"`,
        )

        content = content.replace(
          /FAUNA_SERVER_KEY=""/g,
          `FAUNA_SERVER_KEY="${faunaSecret}"`,
        )

        fs.writeFileSync(enhancedItem.destination, content, "utf8")
      }

      if (enhancedItem.exists) {
        console.log(chalk.green("replaced "), enhancedItem.pathInRoot)
      } else {
        console.log(chalk.green("created  "), enhancedItem.pathInRoot)
      }
    } else {
      if (enhancedItem.existingFileMatchesScaffold) {
        console.info(chalk.grey("unchanged"), enhancedItem.pathInRoot)
      } else {
        console.info(chalk.yellow("skipped  "), enhancedItem.pathInRoot)
      }
    }
  })
}

async function init() {
  const { faunaSecret } = await inquirer.prompt([prompts.faunaSecret])

  initFiles({ faunaSecret })
}

async function clean() {
  const target = process.cwd()
  const source = path.join(findRoot(__dirname), "scaffold")
  const { existingFiles } = await getFiles(source, target)

  const { unmodifiedFiles, modifiedFiles } = existingFiles.reduce<{
    modifiedFiles: EnhancedItem[]
    unmodifiedFiles: EnhancedItem[]
  }>(
    (acc, cur) => {
      if (cur.existingFileMatchesScaffold) {
        acc.unmodifiedFiles.push(cur)
      } else {
        acc.modifiedFiles.push(cur)
      }
      return acc
    },
    {
      unmodifiedFiles: [],
      modifiedFiles: [],
    },
  )

  const choices: ListQuestionOptions["choices"] = modifiedFiles.map((item) => ({
    name: item.pathInRoot,
  }))

  const { deleteFiles }: { deleteFiles: string[] } =
    choices.length > 0
      ? await inquirer.prompt([
          {
            type: "checkbox",
            message: "The following files have changes. Select files to delete",
            name: "deleteFiles",
            choices,
          },
        ])
      : { deleteFiles: [] }

  const modifiedFilesToDelete = deleteFiles.map((filename) =>
    existingFiles.find((file) => file.pathInRoot === filename),
  ) as EnhancedItem[]

  const filesToDelete = [...unmodifiedFiles, ...modifiedFilesToDelete]

  console.log("")
  console.log(chalk.bold("The following changes were made:"))
  existingFiles.map((enhancedItem) => {
    if (filesToDelete.includes(enhancedItem)) {
      fs.removeSync(enhancedItem.destination)
      console.log(chalk.green("removed "), enhancedItem.pathInRoot)
    } else {
      console.info(chalk.yellow("skipped "), enhancedItem.pathInRoot)
    }
  })
}

const files = new Command("files")
files.description("File subcommand")

files.command("init").description("Creates files in project").action(init)

files.command("clean").description("Removes files from project").action(clean)

files
  .command("eject <file>")
  .description("Eject a file")
  .action((file) => {
    console.log("Ejected", file)
  })

export default files
