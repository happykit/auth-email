const path = require("path")
const pkg = require("./package.json")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

const exposed = [
  "pages/login.tsx",
  "pages/signup.tsx",
  "pages/forgot-password.tsx",
  "pages/reset-password.tsx",
  "pages/change-password.tsx",
  "pages/confirm-account.tsx",
  "index.tsx",
  "api/",
]

// creates definition files outside of "dist" which link to the original sources
// inside of dist
class EmitFlattenedDefinitions {
  apply(compiler) {
    compiler.hooks.emit.tapAsync(
      "EmitFlattenedDefinitions",
      (compilation, callback) => {
        const getPrefix = (file) =>
          `../`.repeat((file.match(/\//g) || "").length) || "./"

        const { exposedFiles, exposedFolders } = exposed.reduce(
          (acc, item) => {
            if (item.endsWith("/")) {
              acc.exposedFolders.push(item)
            } else {
              acc.exposedFiles.push(item)
            }
            return acc
          },
          { exposedFiles: [], exposedFolders: [] },
        )

        // forward definitions
        Object.keys(compilation.assets)
          .filter((filename) => {
            const basename = filename.replace(/\.d\.ts$/, "")
            return (
              filename.endsWith(".d.ts") &&
              (exposedFiles.some((file) => file.startsWith(basename)) ||
                exposedFolders.some((folder) => filename.startsWith(folder)))
            )
          })
          .forEach((filename) => {
            // Insert this list into the webpack build as a new file asset:
            const basename = filename.replace(/\.d\.ts$/, "")
            const prefix = getPrefix(filename)
            const content = [
              `export * from "${prefix}dist-app/${basename}"`,
              `export { default } from "${prefix}dist-app/${basename}"`,
            ].join("\n")

            compilation.assets[`../${filename}`] = {
              source: () => content,
              size: () => content.length,
            }
          })

        // forward implementations
        exposed.forEach((file) => {
          const prefix = getPrefix(file)
          const basename = file.endsWith("/")
            ? `${file}index`
            : file.replace(/\.tsx?$/, "")
          const content = `module.exports = require("${prefix}dist-app/${basename}.js")`
          compilation.assets[
            basename.endsWith("/")
              ? `../${basename}index.js`
              : `../${basename}.js`
          ] = {
            source: () => content,
            size: () => content.length,
          }
        })

        callback()
      },
    )
  }
}

module.exports = [
  {
    entry: exposed.reduce((acc, file) => {
      if (file.endsWith("/")) {
        acc[`${file}index`] = `./src-app/${file}index`
      } else {
        acc[file.replace(/\.tsx?$/, "")] = `./src-app/${file}`
      }
      return acc
    }, {}),
    mode: "production",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          // We use two separate config files so we can have our tests in
          // TypeScript (using tsconfig.json) without having our test definitions
          // leak to the bundle (using tsconfig.build.json).
          // Having the test config as the main tsconfig.json helps the editor
          // e.g. VS Code understand the tests.
          options: { configFile: "tsconfig.build.json" },
          exclude: [/node_modules/],
        },
        {
          test: /\.css$/,
          use: [
            { loader: "to-string-loader" },
            { loader: "css-loader", options: { importLoaders: 1 } },
            "postcss-loader",
          ],
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".css"],
    },
    plugins: [
      //   new CleanWebpackPlugin({
      //     dry: false,
      //     cleanOnceBeforeBuildPatterns: [
      //       "**/*",
      //       ...exposed.map((file) =>
      //         file.endsWith("/")
      //           ? `../${file}**/*`
      //           : `../${file.replace(/\.tsx?$/, "")}.*`,
      //       ),
      //     ],
      //     dangerouslyAllowCleanPatternsOutsideProject: true,
      //   }),
      new EmitFlattenedDefinitions(),
    ],
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "dist-app"),
      library: ["happykit_auth", "[name]"],
      libraryTarget: "commonjs2",
    },
    performance: {
      hints: process.env.NODE_ENV === "production" ? "error" : false,
    },
    externals: [
      "crypto",
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ].map((dep) => new RegExp(`^${dep}(/.+)?$`)),
  },
  {
    entry: "./src-cli/index.ts",
    mode: "production",
    target: "node",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          exclude: [/node_modules/],
        },
      ],
    },
    resolve: {
      extensions: [".ts", ".js"],
    },
    plugins: [new CleanWebpackPlugin()],
    output: {
      filename: "index.js",
      path: path.resolve(__dirname, "dist-cli"),
      library: "cli",
      libraryTarget: "commonjs2",
    },
    optimization: {
      minimize: false,
      usedExports: true,
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
    ].map((dep) => new RegExp(`^${dep}(/.+)?$`)),
  },
]
