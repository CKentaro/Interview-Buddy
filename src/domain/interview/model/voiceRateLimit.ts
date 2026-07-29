/**
 * 音声あり面接のレート制限（ドメイン方針）。
 *
 * 実際の強制は DB の一意制約 VoiceUsage(userId, usageDate) で行う（同時リクエストでも
 * 2 回目の消費を弾く）。この定数は残回数表示・上限の単一の真実の源。上限を 2 以上に
 * 変える場合は VoiceUsage の一意制約と消費ロジックの見直しが必要。
 */
export const MAX_VOICE_SESSIONS_PER_DAY = 3;
