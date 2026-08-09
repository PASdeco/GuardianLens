import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiskBadge } from "./risk-badge";

describe("RiskBadge", () => {
  it("renders an explainable label instead of a score", () => {
    render(<RiskBadge level="UNDETERMINED" />);
    expect(screen.getByText("Undetermined")).toBeVisible();
  });
});
