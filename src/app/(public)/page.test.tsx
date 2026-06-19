import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import Home from "./page"

test("renders the app heading", () => {
  render(<Home />)

  expect(
    screen.getByRole("heading", { level: 1, name: "Interview Buddy" }),
  ).toBeInTheDocument()
})
