"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { UpdateUserRequest, UserMeResponse } from "@/app/api/types";
import {
  CareerPreferenceFields,
  type CareerPreferenceValue,
} from "@/components/profile/CareerPreferenceFields";
import { DISPLAY_NAME_MAX_LENGTH } from "@/domain/user/model/DisplayName.vo";

type Props = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  career: CareerPreferenceValue;
};

/** 大分類・小分類の組を「大 ／ 小」で見せる。片方でも欠けていれば未設定。 */
function pairLabel(major: string, minor: string): string {
  return major && minor ? `${major} ／ ${minor}` : "未設定";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
      <span style={{ flex: "none", width: 84, fontSize: 12, color: "var(--ink-3)" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, minWidth: 0 }}>{value}</span>
    </div>
  );
}

/**
 * マイページのプロフィール（表示名・志望業界・志望職種）の表示と編集。
 *
 * 志望設定は面接設定画面の「マイページの設定から入力」が読む値でもあるので、
 * 選択肢は面接設定と同じマスタ（careerTaxonomy）から引く。
 */
export function ProfileSettingsSection({ userId, name, email, image, career }: Props) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name ?? "");
  const [draftCareer, setDraftCareer] = useState<CareerPreferenceValue>(career);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const avatarChar = (name ?? "?").charAt(0).toUpperCase();

  const startEditing = () => {
    // 前回のキャンセル分が残らないよう、保存済みの値から編集を始める。
    setDraftName(name ?? "");
    setDraftCareer(career);
    setError(false);
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(false);
    const body: UpdateUserRequest = { name: draftName, ...draftCareer };
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      // 保存後の正規化（前後の空白落としなど）はサーバーの返り値が正。
      const saved = (await res.json()) as UserMeResponse;
      setDraftName(saved.name ?? "");
      setDraftCareer({
        industryMajor: saved.industryMajor ?? "",
        industryMinor: saved.industryMinor ?? "",
        jobMajor: saved.jobMajor ?? "",
        jobMinor: saved.jobMinor ?? "",
      });
      setEditing(false);
      // サイドバーの名前とサーバーコンポーネント側の表示を貼り替える。
      await updateSession();
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="card" style={{ padding: 24, gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name ?? "ユーザー"}
              referrerPolicy="no-referrer"
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flex: "none" }}
            />
          ) : (
            <div
              style={{
                width: 64, height: 64, borderRadius: "50%", flex: "none",
                background: "var(--color-neutral-300)", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700,
              }}
            >
              {avatarChar}
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 500 }}>{name ?? "名前未設定"}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{email}</div>
          </div>
          {!editing && (
            <button className="btn btn-secondary" onClick={startEditing} style={{ flex: "none" }}>
              編集
            </button>
          )}
        </div>

        <div className="hr" style={{ margin: 0 }} />

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label htmlFor="profile-name">表示名</label>
              <input
                id="profile-name"
                className="input"
                type="text"
                value={draftName}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                disabled={saving}
                placeholder="例：面接 太郎"
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <CareerPreferenceFields
              value={draftCareer}
              onChange={setDraftCareer}
              disabled={saving}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={() => void save()} disabled={saving}>
                {saving ? "保存しています…" : "保存する"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="志望業界" value={pairLabel(career.industryMajor, career.industryMinor)} />
            <Row label="志望職種" value={pairLabel(career.jobMajor, career.jobMinor)} />
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.7 }}>
              登録しておくと、面接の設定画面でワンタップで呼び出せます。
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--color-danger)" }}>
          保存に失敗しました。時間をおいて、もう一度お試しください。
        </p>
      )}
    </section>
  );
}
