import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import Home from "./page"

test("renders the hero heading", () => {
  render(<Home />)

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "面接を、もっと落ち着いて練習できる場所に。",
  )
})
