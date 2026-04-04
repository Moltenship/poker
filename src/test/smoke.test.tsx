import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "./utils";

function HelloWorld() {
  return <div>Hello World</div>;
}

test("renders a React component", () => {
  renderWithProviders(<HelloWorld />);
  expect(screen.getByText("Hello World")).toBeInTheDocument();
});
