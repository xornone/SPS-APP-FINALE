import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { BottomNav } from "@/components/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
}));

vi.mock("@/lib/useIsAdmin", () => ({
  useIsAdmin: () => false,
}));

describe("BottomNav and Modal interaction", () => {
  beforeEach(() => {
    document.body.className = "";
  });

  it("renders navigation when modal is not open", () => {
    const { container } = render(<BottomNav />);
    expect(container.querySelector(".bottom-nav-container")).toBeTruthy();
    expect(screen.getByText("Accueil")).toBeDefined();
  });

  it("hides navigation when sps-modal-toggle event is fired with modal-open class", async () => {
    const { container } = render(<BottomNav />);
    expect(container.querySelector(".bottom-nav-container")).toBeTruthy();

    await act(async () => {
      document.body.classList.add("modal-open");
      window.dispatchEvent(new Event("sps-modal-toggle"));
    });

    expect(container.querySelector(".bottom-nav-container")).toBeNull();

    await act(async () => {
      document.body.classList.remove("modal-open");
      window.dispatchEvent(new Event("sps-modal-toggle"));
    });

    expect(container.querySelector(".bottom-nav-container")).toBeTruthy();
  });
});
