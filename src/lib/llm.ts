// LLM integration placeholder — will use gemini-2.5-flash-lite in later phases
export type LLMProvider = "gemini";

export async function generateFollowUpQuestion(
  _sessionContext: unknown,
  _provider: LLMProvider = "gemini",
): Promise<string> {
  throw new Error("Not implemented");
}
