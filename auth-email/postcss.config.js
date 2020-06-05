const purgecss = require("@fullhuman/postcss-purgecss")

const plugins = [
  require("postcss-import"),
  require("tailwindcss"),
  require("autoprefixer"),
]

if (process.env.NODE_ENV === "production") {
  plugins.push(
    purgecss({
      content: ["./src-app/**/*.tsx"],
      extractors: [
        {
          extractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
          extensions: ["tsx"],
        },
      ],
    }),
  )
}

module.exports = { plugins }
