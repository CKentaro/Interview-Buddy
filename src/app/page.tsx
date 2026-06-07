import { auth, signIn, signOut } from "@/auth";
import Image from "next/image";

export default async function Home() {
  // auth() でサーバー側からセッションを取得する基本パターン
  const session = await auth();
  const user = session?.user;

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
        Interview Buddy
      </h1>

      {user ? (
        <div className="flex flex-col items-center gap-4">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name ?? "ユーザー"}
              width={64}
              height={64}
              className="rounded-full"
            />
          )}
          <p className="text-lg font-medium">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              ログアウト
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-500">ログインしていません</p>
          <form action={handleSignIn}>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-5 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
            >
              <GoogleIcon />
              Google でログイン
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
