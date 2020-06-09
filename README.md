<a id="nav">
  <img src="https://i.imgur.com/fxD3HmM.png" width="100%" />
</a>

<div align="right">
  <a href="https://github.com/happykit/auth/tree/master/package/docs#nav">Documentation</a>
  <span>&nbsp;•&nbsp;</span>
  <a href="https://auth-email-demo.now.sh/">Demo</a>
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

## Quickstart

> This Quickstart focuses on FaunaDB, but HappyAuth works with other databases as well. 

We provide an example application which you can use as the foundation of your project. You can use `create-next-app` to start a new project:

```
npx create-next-app --example https://github.com/happykit/auth-email/tree/master/starter-fauna my-app
or
yarn create next-app --example https://github.com/happykit/auth-email/tree/master/starter-fauna my-app
```

<details>
<summary>TypeScript starter</summary>

In case you're using TypeScript, you can use this starter instead:

```
npx create-next-app --example https://github.com/happykit/auth-email/tree/master/starter-fauna-typescript my-app
or
yarn create next-app --example https://github.com/happykit/auth-email/tree/master/starter-fauna-typescript my-app
```

</details>

> Check out our [documentation](https://docs.happykit.dev/) in case you want to add HappyAuth to an existing project. We provide a convenient CLI which adds the required files to your project in one step.
> 
> **Note:** The documentation site is still under construction. In the meantime, you can check out the README at this [commit](https://github.com/happykit/auth-email/blob/740a01395ab517c7e18fbed2751d6fbd5ff12d0c/README.md#setup) for the manual setup instructions.


### Create a FaunaDB instance

Next, you'll need to create a free FaunaDB instance. It takes around 3 minutes. No credit card is required.

The following steps will walk you through the setup of a free FaunaDB instance on [fauna.com](https://fauna.com/). That database will be used to store our user accounts. You can use it to store your applications information too.

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


### The starter

The most important concept is that you'll usually not import from `@happykit/auth-email`. Instead, you'll import preconfigured functions from a local folder called `happyauth`. The project is configured so that you can just do `import x from "happyauth"` and it will resolve to the `happyauth` folder.

The following files are included in your Next.js HappyAuth starter.

#### `.env.local`

This file contains your secrets for local development.

Paste in the `FAUNA_SERVER_KEY` which you created in the previous step.

Make sure to replace the `HAPPYAUTH_TOKEN_SECRET` with a random value. You can execute `yarn auth-email random-secret` to create one.

Contents:

```sh
FAUNA_SERVER_KEY="fnxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
HAPPYAUTH_TOKEN_SECRET="<random value>"
```

> This file sets the environment variables for development. Make sure to provide these environment variables in your production application too. It's recommended to create a separate FaunaDB database for production, with its own secret. You can execute `yarn auth-email db init` to configure your production database. You don't need to worry about this now if you're just playing around locally.

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

This file, `happyauth/index.js` and `happyauth/server.js` are the three places where you can configure HappyAuth.

<details>
<summary>Less important files</summary>

#### `pages/_app.js`

HappyAuth needs an `AuthProvider` component which wraps your application. This component will ensure that you're only using one `useAuth` hook per page.

#### `jsconfg.json` and `tsconfig.json`

These files enable importing from `happyauth` and treating it as if it was a regular package. This is done using [Absolute Imports](#configure-absolute-imports).

The JavaScript starter uses `jsconfig.json`, while the TypeScript starter uses `tsconfig.json`.

The configuration will map the following absolute imports to the files at the root:

- `happyauth` to `/happyauth/index.js`
- `happyauth/server` to `/happyauth/server.js`
- `fauna-client` to `/fauna-client.js`

</details>

### Running locally

You're now ready to run your app!

```
yarn dev
```

Then visit [localhost:3000](http://localhost:3000/) to see HappyAuth in action.

