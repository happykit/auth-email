<a id="nav">
  <img src="https://i.imgur.com/fxD3HmM.png" width="100%" />
</a>

<div align="right">
  <a href="https://github.com/happykit/auth/tree/master/package/docs#nav">Documentation</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://github.com/happykit/auth/blob/master/package/docs/demos.md#nav">Demo</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://www.happykit.dev/auth" target="_blank">Website</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://www.twitter.com/dferber90" target="_blank">Twitter</a>
</div>

&nbsp;
&nbsp;

<p>HappyAuth is an open-source account system specifically designed for Next.js applications. Users sign up with their email address and a password. HappyAuth supports server-side rendering and static pages. You can provide your own auth components or use our prebuilt ones. It's really easy to get up and running, and grows nicely alongside your application.</p>

### Key Features

- A `useAuth` hook which gets the current user
- An optional `getServerSideAuth` for server-side rendering
- HappyAuth is tiny
  - it adds only 4.6 kB to the first load JS
  - it adds less than 0.04 kB if you're transitioning from another page
- Extremely customizable
  - Use the predefined authentication components or ship your own auth pages
  - Special `triggers` allow you to hook into certain events
  - You can even completely replace pages and api routes
- All user data is stored in your own database
  - You can run it on a free FaunaDB instance, which you can then also use for your app data
  - We have a CLI which configures FaunaDB for you
  - Works with any database by adding a small database-specific driver
- Full TypeScript support with extensive types
- OAuth support (authenticate using Facebook, GitHub etc)

## The Gist

```js
import { useAuth } from "happyauth"

export default function Home() {
  const auth = useAuth()

  if (auth.state === "authenticating") return <p>loading</p>
  return auth.state === "signedIn" ? (
    <p>Hi {auth.userId}</p>
  ) : (
    <p>Hi anonymous</p>
  )
}
```

The `useAuth` hook returns an authentication object. This object contains information about the current user. The `useAuth` function syncs the authentication state across all tabs.

The returned `auth` object not only contains data about the current user, but it also provides methods for `signUp`, `signIn` and so on.

Let's now add server-side rendering support to our page.

```js
import { useAuth } from "happyauth"
import { getServerSideAuth } from "happyauth/server"

export const getServerSideProps = async ({ req }) => {
  const initialAuth = getServerSideAuth(req)
  return { props: { initialAuth } }
}

export default function Home(props) {
  const auth = useAuth(props.initialAuth)

  return auth.state === "signedIn" ? (
    <p>Hi {auth.userId}</p>
  ) : (
    <p>Hi anonymous</p>
  )
}
```

We are now prechecking the authenticated user on the server and passing that information down to the client. This allows us to get rid off the loading state. And more importantly, this gives us full access to the currently authenticated user inside `getServerSideProps`. We can prefetch any data we like based on that user and return it to as a prop. No more loading spinners!

## Demo

_gif coming soon_

## Setup

> HappyAuth works with other databases too. This Quickstart focuses on FaunaDB.

<details>

<summary>Creating a FaunaDB instance (3 minutes)</summary>

### Create a FaunaDB instance

We'll start by setting up a free FaunaDB instance on [fauna.com](https://fauna.com/). That database will be used to store our user accounts. You can use it to store your applications information too.

There's a generous free tier and it doesn't require a credit card. You can sign in with GitHub.

#### Create the database

1. Open the [FaunaDB console](https://dashboard.fauna.com/) and sign in
1. Click on "New Database", enter a name and click on "Save" to create your first database

#### Create a key to access your database

1. Now click on "Security" and then "New key"
1. Change the Role to "Server"
1. Enter a Key Name like "Nextjs Application"
1. Click "Save"

That completes our database setup for now. We'll later use a script to create a User collection and an index.

</details>

<details>
  <summary>TypeScript setup (optional)</summary>
    
    
### TypeScript (optional)

If you want to use TypeScript, you should set it up in your project before continuing. HappyAuth will detect that your project uses TypeScript and will emit TypeScript files instead of plain JavaScript files.

```bash
touch tsconfig.json
yarn add --dev typescript @types/react @types/node
```

Then start your app once to make Next.js prefill tsconfig.json:

```bash
yarn dev
```

After it booted, you can stop the app and continue with the setup.

We recommend setting these compiler options in `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

Full instructions: https://nextjs.org/docs/basic-features/typescript

</details>

### Install packages

```
yarn add @happykit/auth-email faunadb
```

You'll notice that we're not actually installing a `happyauth` package even though we are importing from `happyauth` in the examples above. That's because `happyauth` is not an npm package. Instead, we are using a Next.js feature called [Absolute Imports](https://nextjs.org/docs/advanced-features/module-path-aliases) to alias `happyauth` to a folder you'll create in your project later on.

### Run the scaffolding

Run the following command to configure the database and init the files. Make sure you have the FaunaDB secret ready (see "Creating a FaunaDB instance (3 minutes)" above):

```
yarn auth-email init
```

This will create a "User" collection and an appropriate index. It will also set the required files in your a Next.js project.

> We will auto-detect if your are using TypeScript. In that case we'll create TypeScript files instead. See "TypeScript (optional)" above for setup instructions.

### Configure Absolute Imports

To enable importing from the `happyauth` folder, you'll need to set up [Absolute Imports](https://nextjs.org/docs/advanced-features/module-path-aliases) (`import {} from "happyauth"`).

#### With JavaScript

If you're using JavaScript, the scaffolding will create that file for you. If you're using TypeScript, you'll need to add the `baseUrl` option to your `compilerOptions` in `tsconfig.json` like so:

```json
{
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

#### With TypeScript

If you're using JavaScript, you'll need a file called `jsconfig.json` at the root of your project with the following contents:

```json
{
  "compilerOptions": {
    "baseUrl": "."
  }
}
```

### What you get

The following files will be created by the scaffolding.

#### `.env.local`

This file contains your secrets for local development.

Contents:

```sh
FAUNA_SERVER_KEY="fnxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
HAPPYAUTH_TOKEN_SECRET="<random value>"
```

> Make sure to provide these environment variables in your production application. It's recommended to create a separate FaunaDB database for production, with its own secret. You can execute `yarn auth-email db init` to configure your production database. You don't need to worry about this now if you're just playing around locally.

#### `happyauth/index.js`

This file contains the public configuration, which is shared with the clients. The file exports a preconfigured `useAuth` hook and the `publicConfig`.

When you use `import { useAuth } from "happyauth"`, the import resolves to this file.

#### `happyauth/server.js`

This file contains the server configuration. That configuration is not accessible to the clients. The file exports a preconfigured `getServerSideAuth` hook and the `serverConfig`.

When you use `import { getServerSideAuth } from "happyauth/server"`, the import resolves to this file.

#### `pages/*.js`

These pages handle user authentication. They define the following routes:

- `/change-password`
- `/confirm-account`
- `/forgot-password`
- `/login`
- `/reset-password`
- `/signup`

#### `pages/api/[...params].js`

This file defines a [Catch all API route](https://nextjs.org/docs/api-routes/dynamic-api-routes#catch-all-api-routes) which handles all requests to `/api/auth/*`.

#### `pages/_app.js`

HappyAuth needs an `AuthProvider` component which wraps your application. This component will ensure that you're only using one `useAuth` hook per page.

#### `jsconfg.json`

This file is only created for JavaScript projects as stated in [Configure Absolute Imports](#configure-absolute-imports). If you're using TypeScript, you'll need to modify `tsconfig.json` as stated [here](#configure-absolute-imports).

The configuration will map the following absolute imports to the files at the root:

- `happyauth` to `/happyauth/index.js`
- `happyauth/server` to `/happyauth/server.js`
- `fauna-client` to `/fauna-client.js`

### Running locally

You're now ready to run your app!

```
yarn dev
```

You can visit these pages locally to see HappyAuth in action:

- [localhost:3000/signup](http://localhost:3000/signup)
- [localhost:3000/login](http://localhost:3000/login)
- [localhost:3000/forgot-password](http://localhost:3000/forgot-password)
- [localhost:3000/change-password](http://localhost:3000/change-password)

> We also created a file called `pages/example.js` which is an example index page tying all these routes together. You can rename `pages/example.js` to `pages/index.js` to see it in action. Otherwise, you can delete `pages/example.js` as it's only there for demo purposes.
