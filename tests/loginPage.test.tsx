import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import LoginPage from "@/app/login/page";

const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
    },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the top back button and card return button", () => {
    render(<LoginPage />);
    const backButtons = screen.getAllByRole("button", { name: /retour/i });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);

    const homeLink = screen.getByRole("link", { name: /accueil du club/i });
    expect(homeLink).toBeDefined();
    expect(homeLink.getAttribute("href")).toBe("/home");
  });

  it("navigates back when history length > 1", () => {
    Object.defineProperty(window, "history", {
      value: { length: 3 },
      writable: true,
    });

    render(<LoginPage />);
    const topBackButton = screen.getByLabelText("Retour à la page précédente");
    fireEvent.click(topBackButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to /home when history length <= 1", () => {
    Object.defineProperty(window, "history", {
      value: { length: 1 },
      writable: true,
    });

    render(<LoginPage />);
    const topBackButton = screen.getByLabelText("Retour à la page précédente");
    fireEvent.click(topBackButton);

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/home");
  });
});
