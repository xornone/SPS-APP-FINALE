import { describe, expect, it, vi } from "vitest";
import { hapticTap, hapticSuccess, hapticWarning } from "@/lib/haptics";

describe("lib/haptics", () => {
  it("calls navigator.vibrate when available", () => {
    const vibrateMock = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateMock });

    hapticTap();
    expect(vibrateMock).toHaveBeenCalledWith(8);

    hapticSuccess();
    expect(vibrateMock).toHaveBeenCalledWith([10, 30, 15]);

    hapticWarning();
    expect(vibrateMock).toHaveBeenCalledWith([20, 40, 20]);

    vi.unstubAllGlobals();
  });

  it("handles absence of navigator.vibrate gracefully without error", () => {
    vi.stubGlobal("navigator", {});
    expect(() => hapticTap()).not.toThrow();
    expect(() => hapticSuccess()).not.toThrow();
    expect(() => hapticWarning()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
