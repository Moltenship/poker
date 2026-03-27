import { renderWithProviders } from "./utils";
import { screen } from "@testing-library/react";

function HelloWorld() {
  return <div>Hello World</div>;
}

test("renders a React component", () => {
  renderWithProviders(<HelloWorld />);
  expect(screen.getByText("Hello World")).toBeInTheDocument();
});
