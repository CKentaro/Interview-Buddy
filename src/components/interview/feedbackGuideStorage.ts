const FEEDBACK_GUIDE_VERSION = 1;
const FEEDBACK_GUIDE_CHANGE_EVENT = "interview-buddy:feedback-guide-change";

/**
 * 同じブラウザでもアカウント間で既読状態が混ざらず、説明改訂時には再表示できるキー。
 */
export function feedbackGuideStorageKey(userId: string): string {
  return `interview-buddy:feedback-guide:v${FEEDBACK_GUIDE_VERSION}:${userId}`;
}

export function hasSeenFeedbackGuide(userId: string): boolean {
  try {
    return window.localStorage.getItem(feedbackGuideStorageKey(userId)) === "seen";
  } catch {
    // localStorage が使えない環境では、説明を見逃さない方へ倒す。
    return false;
  }
}

export function markFeedbackGuideAsSeen(userId: string): void {
  try {
    window.localStorage.setItem(feedbackGuideStorageKey(userId), "seen");
    window.dispatchEvent(new Event(FEEDBACK_GUIDE_CHANGE_EVENT));
  } catch {
    // 保存できなくてもフィードバックの閲覧自体は妨げない。
  }
}

/** useSyncExternalStore 用。別タブと同一タブの双方の変更を購読する。 */
export function subscribeFeedbackGuide(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key?.startsWith("interview-buddy:feedback-guide:") ?? false) {
      onStoreChange();
    }
  }

  window.addEventListener(FEEDBACK_GUIDE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(FEEDBACK_GUIDE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}
