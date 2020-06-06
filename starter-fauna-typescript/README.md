This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) using the [starter-fauna-typescript](https://github.com/happykit/auth-email/tree/master/starter-fauna-typescript) setup.

## Setup

### Create a new FaunaDB

Open [dashboard.fauna.com](https://dashboard.fauna.com/) to create a free FaunaDB instance. No credit card requried.

Then use the Fauna web app to create a new "Server Key" (under "Security") and copy it.

Finally, configure your FaunaDB by running the following command:

```
yarn auth-email db init
```

Copy your FaunaDB secret in when prompted.

### Environment variables

Create a `.env.local` file. Next.js will load the environment variables automatically.

Fill it with this content:

```bash
# Your server key from fauna.com
# Create a new database,
# then go to "Security > New Key"
# and create a new server key.
FAUNA_SERVER_KEY="<your faunadb server key>"
# A random secret to sign your tokens.
# We automatically created a random secret when creating this file.
# You can keep it, or you can replace it with your own.
# Note that existing users will be signed out whenever you change the secret.
#
# You can use "yarn auth-email random-secret" to create one.
# Alternatively, you can just provide your own long random string.
HAPPYAUTH_TOKEN_SECRET="<a random secret used to sign your tokens>"
```

## Getting Started

Now you can run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

## Email

Out of the box, HappyAuth is configured to log all mails to the server console instead of sending them. You can provide your the triggers in `pages/api/auth/[...params].js` with your own functions to start sending real mails.

## Resources

- [HappyKit site](https://happykit.dev/)
- [Full documentation](https://docs.happykit.dev/)
- [Repo](https://github.com/happykit/auth-email/)
