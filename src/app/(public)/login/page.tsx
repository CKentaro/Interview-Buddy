import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

/**
 * ログイン画面。Google OAuth でのサインインのみ。
 * ログイン済みの場合は /home へリダイレクトする。
 */
export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/home");

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Interview Buddy
      </h1>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/home" });
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-black/15 px-6 py-3 font-medium transition hover:bg-black/5"
        >
          Google でログイン
        </button>
      </form>
    </main>
  );
}
