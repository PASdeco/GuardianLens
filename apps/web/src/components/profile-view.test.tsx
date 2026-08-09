import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Providers } from "./providers";
import { ProfileView } from "./profile-view";
import { AccessReminder } from "./access-reminder";

describe("consumer account experience", () => {
  afterEach(() => cleanup());

  it("shows the access requirement without exposing network diagnostics", () => {
    render(<Providers><ProfileView /></Providers>);

    expect(screen.getByText("One unlock. Every check.")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.queryByText("Relay session")).not.toBeInTheDocument();
    expect(screen.queryByText("Chain ID")).not.toBeInTheDocument();
    expect(screen.queryByText("RPC")).not.toBeInTheDocument();
  });

  it("persists the selected appearance", () => {
    render(<Providers><ProfileView /></Providers>);
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("guardian-lens-theme")).toBe("dark");
  });

  it("reminds users about one-time testnet access at app entry", () => {
    render(<Providers><AccessReminder /></Providers>);

    expect(screen.getByText(/unlock every guardian lens check for 20 test gen/i)).toBeInTheDocument();
    expect(screen.getByText(/one-time access/i)).toBeInTheDocument();
  });
});
