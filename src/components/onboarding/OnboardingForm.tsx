"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { UpdateUserRequest } from "@/app/api/types";
import {
  CareerPreferenceFields,
  type CareerPreferenceValue,
} from "@/components/profile/CareerPreferenceFields";
import { LcAlert } from "@/components/ui/icons";
import { DISPLAY_NAME_MAX_LENGTH } from "@/domain/user/model/DisplayName.vo";

/**
 * 初回ログイン直後のプロフィール確認フォーム。
 *
 * 表示名は Google アカウントの名前が初期値。本名で練習したくない利用者が
 * ここで変えられるようにする。志望業界・職種は任意で、スキップしても
 * 「確認済み」として記録するので、この画面は二度は出ない。
 */
export function OnboardingForm({
  userId,
  defaultName,
  email,
}: {
  userId: string;
  defaultName: string;
  email: string;
}) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [name, setName] = useState(defaultName);
  const [career, setCareer] = useState<CareerPreferenceValue>({
    industryMajor: "",
    industryMinor: "",
    jobMajor: "",
    jobMinor: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  /**
   * オンボーディングを終える。skip のときは志望設定を送らず、表示名も
   * 触らない（Google から取れた名前をそのまま残す）。
   */
  const finish = async (skip: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(false);
    const body: UpdateUserRequest = skip
      ? { completeOnboarding: true }
      : { name, ...career, completeOnboarding: true };
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      // サイドバーなどが参照するセッション上の名前を貼り替えてからホームへ。
      await updateSession();
      router.replace("/home");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(true);
      setSaving(false);
    }
  };

  return (
    <main className="ib-setup-main">
      <div
        style={{
          width: "min(560px, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, lineHeight: 1.4 }}>
            ようこそ、interview buddy へ
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.8 }}>
            はじめに、プロフィールを確認させてください。志望業界と職種を登録しておくと、
            面接設定のときにワンタップで呼び出せます。あとからマイページで変更できます。
          </p>
        </div>

        <div className="card ib-section ib-setup-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label htmlFor="onboarding-name">表示名</label>
            <input
              id="onboarding-name"
              className="input"
              type="text"
              value={name}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              disabled={saving}
              placeholder="例：面接 太郎"
              onChange={(e) => setName(e.target.value)}
            />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
              Google アカウントの名前を入れてあります。ニックネームでも構いません。
            </p>
          </div>

          <div className="hr" style={{ margin: 0 }} />

          <div>
            <div style={{ fontSize: 14.5, fontWeight: 500 }}>志望業界・志望職種（任意）</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.7 }}>
              まだ決まっていなければ、選ばずに進んで構いません。
            </div>
          </div>
          <CareerPreferenceFields value={career} onChange={setCareer} disabled={saving} />
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-line)",
            }}
          >
            <span style={{ flex: "none", marginTop: 2, color: "var(--color-danger)" }}>
              <LcAlert size={16} />
            </span>
            <div style={{ fontSize: 12.5, color: "var(--color-danger)", lineHeight: 1.7 }}>
              保存できませんでした。通信状況をご確認のうえ、もう一度お試しください。
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => void finish(true)}
            disabled={saving}
          >
            あとで設定する
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void finish(false)}
            disabled={saving}
          >
            {saving ? "保存しています…" : "この内容ではじめる"}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
          {email} でログインしています
        </p>
      </div>
    </main>
  );
}
