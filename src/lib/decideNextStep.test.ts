import { describe, expect, it } from "vitest"
import { decideNextStep } from "./decideNextStep"

describe("decideNextStep", () => {
  it("returns followup when depthCount is 0", () => {
    expect(decideNextStep(0)).toBe("followup")
  })

  it("returns next_main when depthCount is 1", () => {
    expect(decideNextStep(1)).toBe("next_main")
  })

  it("returns complete when depthCount is 2", () => {
    expect(decideNextStep(2)).toBe("complete")
  })
})
