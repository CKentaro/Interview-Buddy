import {
  resolveInterviewerType,
  type InterviewerType,
} from "@/domain/interview/model/InterviewerType.vo";

export type InterviewerVoiceProfile = {
  voiceName: "Sulafat" | "Schedar" | "Gacrux";
  direction: string;
};

const VOICE_PROFILES: Record<InterviewerType, InterviewerVoiceProfile> = {
  friendly: {
    voiceName: "Sulafat",
    direction:
      "明るく親しみやすい女性の面接官として、温かく柔らかい声で、少しゆっくり話してください。",
  },
  neutral: {
    voiceName: "Schedar",
    direction:
      "落ち着いた中立的な面接官として、感情を強調しすぎず、明瞭な標準速度で話してください。",
  },
  strict: {
    voiceName: "Gacrux",
    direction:
      "経験豊富な男性の面接官として、低めで成熟した声を意識し、抑揚を抑えて重みのある間で話してください。",
  },
};

export function getInterviewerVoiceProfile(
  interviewerType: string | null | undefined,
): InterviewerVoiceProfile {
  return VOICE_PROFILES[resolveInterviewerType(interviewerType)];
}
