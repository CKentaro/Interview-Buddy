import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * ログイン画面。Google OAuth でのサインインのみ。
 * ログイン済みの場合は /home へリダイレクトする。
 */
export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/home");

  return <LoginForm />;
}
