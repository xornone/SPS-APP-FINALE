import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";
import { BottomNav } from "@/components/BottomNav";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({
    push: mockPush,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/useIsAdmin", () => ({
  useIsAdmin: () => false,
}));

describe("BottomNav and Modal interaction", () => {
  beforeEach(() => {
    document.body.className = "";
    mockPush.mockClear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("renders navigation when modal is not open", () => {
    const { container } = render(<BottomNav />);
    expect(container.querySelector(".bottom-nav-container")).toBeTruthy();
    expect(screen.getByText("Accueil")).toBeDefined();
    expect(screen.getByText("Stats SPS")).toBeDefined();
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

  it("smoothly scrolls to top when active tab is clicked", async () => {
    render(<BottomNav />);
    const homeTab = screen.getByText("Accueil").closest("a");
    expect(homeTab).toBeTruthy();

    await act(async () => {
      fireEvent.click(homeTab!);
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("triggers navigation when an inactive tab is clicked", async () => {
    render(<BottomNav />);
    const statsTab = screen.getByText("Stats SPS").closest("a");
    expect(statsTab).toBeTruthy();

    await act(async () => {
      fireEvent.click(statsTab!);
    });

    expect(mockPush).toHaveBeenCalledWith("/classement");
  });

  it("triggers navigation on touchEnd tap with micro-movement", async () => {
    render(<BottomNav />);
    const adminTab = screen.getByText("Admin").closest("a");
    expect(adminTab).toBeTruthy();

    await act(async () => {
      fireEvent.touchStart(adminTab!, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      // Micro-déplacement du pouce (4px horizontal, 2px vertical)
      fireEvent.touchEnd(adminTab!, {
        changedTouches: [{ clientX: 104, clientY: 102 }],
      });
    });

    expect(mockPush).toHaveBeenCalledWith("/admin");
  });
});
