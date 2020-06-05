import faunadb from "faunadb"
import { AccountStatus } from ".."
import { query as q } from "faunadb"
import { Driver } from "../api"

export function createFaunaEmailDriver(faunaClient: faunadb.Client): Driver {
  return {
    attemptEmailPasswordLogin: async (email, password) => {
      try {
        const loginRes: {
          userRef: { id: string }
          accountStatus: AccountStatus
        } = await faunaClient.query(
          q.Let(
            {
              loginData: q.Login(q.Match(q.Index("users_by_email"), email), {
                password,
              }),
            },
            {
              userRef: q.Select(["instance"], q.Var("loginData")),
              accountStatus: q.Select(
                ["data", "accountStatus"],
                q.Get(q.Select("instance", q.Var("loginData"))),
              ),
            },
          ),
        )
        return {
          success: true,
          data: {
            userId: loginRes.userRef.id,
            accountStatus: loginRes.accountStatus,
          },
        }
      } catch (error) {
        if (error.message === "authentication failed")
          return { success: false, reason: "authentication failed" }

        throw error
      }
    },
    createEmailUser: async (email, password) => {
      try {
        const user: { ref: { id: string } } = await faunaClient.query(
          q.Create(q.Collection("User"), {
            credentials: { password },
            data: {
              email,
              created: q.Now(),
              // We do not need an "updated" timestamp, as fauna includes
              // a "ts" on all documents.
              //
              // See "ts" here:
              // https://docs.fauna.com/fauna/current/api/fql/functions/get
              accountStatus: AccountStatus.confirmed,
            },
          }),
        )
        return { success: true, data: { userId: user.ref.id } }
      } catch (error) {
        if (error.message === "instance not unique")
          return { success: false, reason: "instance not unique" }

        throw error
      }
    },
    getUserIdByEmail: async (email: string) => {
      const response: string | false = await faunaClient.query<false | string>(
        q.Let(
          {
            match: q.Match(q.Index("users_by_email"), email.toLowerCase()),
          },
          q.If(
            q.Exists(q.Var("match")),
            q.Select(["ref", "id"], q.Get(q.Var("match"))),
            false,
          ),
        ),
      )
      return response || null
    },
    updateEmailUserPassword: async (userId, password) => {
      // update user by storing new password
      // https://docs.fauna.com/fauna/current/tutorials/authentication/user#change_password
      await faunaClient.query(
        q.Update(q.Ref(q.Collection("User"), userId), {
          credentials: { password },
        }),
      )
    },
    // update user by storing new password
    // https://docs.fauna.com/fauna/current/tutorials/authentication/user#change_password
    changeEmailUserPassword: async (userId, currentPassword, newPassword) => {
      await faunaClient.query(
        q.Do(
          // Login will throw an error in case the password is invalid.
          // This then skips the Update in case the currentPassword is invalid.
          q.Login(q.Ref(q.Collection("User"), userId), {
            password: currentPassword,
          }),
          q.Update(q.Ref(q.Collection("User"), userId), {
            credentials: { password: newPassword },
          }),
        ),
      )
    },
    confirmAccount: async (userId) => {
      return faunaClient.query<boolean>(
        q.Let(
          { userRef: q.Ref(q.Collection("User"), userId) },
          q.If(
            q.Exists(q.Var("userRef")),
            q.Let(
              {
                accountStatus: q.Select(
                  ["data", "accountStatus"],
                  q.Get(q.Var("userRef")),
                ),
              },
              q.If(
                q.Or(
                  q.Equals(q.Var("accountStatus"), AccountStatus.confirmed),
                  q.Equals(q.Var("accountStatus"), AccountStatus.unconfirmed),
                ),
                q.Do(
                  q.Update(q.Var("userRef"), {
                    data: { accountStatus: AccountStatus.confirmed },
                  }),
                  true,
                ),
                false,
              ),
            ),
            false,
          ),
        ),
      )
    },
  }
}
