export type NextStep = "followup" | "next_main" | "complete"

export function decideNextStep(depthCount: number): NextStep {
  if (depthCount === 0) {
    return "followup"
  }

  if (depthCount === 1) {
    return "next_main"
  }

  return "complete"
}
