#! /usr/bin/env node

// This file is necessary since the cli needs executable permissions (chmod +x).
// TypeScript will not keep the executable permissions during compilation.
//
// Tihs file is executable (chmod +x) and is never touched by TypeScript.
// This allows us to use TypeScript to build the CLI.

require("./dist-cli/index.js")
