import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { QuickJoinModal } from "@/components/QuickJoinModal";
import type { Ride } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockRide: Ride = {
  id: "ride-1",
  title: "Sortie Test",
  ride_date: "2026-11-08",
  ride_time: "08:45:00",
  place: "Corum",
  distance_km: 80,
  elevation_gain_m: 600,
  gpx_path: null,
  route_points: null,
  description: "Test description",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
  created_by: null,
  place_url: null,
  strava_url: null,
  show_safety_notice: false,
  ride_groups: [
    { ride_id: "ride-1", group_level: "violet", target_speed: "28+ km/h" },
  ],
};

describe("QuickJoinModal", () => {
  beforeEach(() => {
    document.body.className = "";
  });

  it("renders into document.body with portal and adds modal-open class", () => {
    const { unmount } = render(
      <QuickJoinModal
        ride={mockRide}
        isOpen={true}
        onClose={vi.fn()}
        onJoinSuccess={vi.fn()}
        onLeaveSuccess={vi.fn()}
        onChangeGroupSuccess={vi.fn()}
      />
    );

    expect(document.body.classList.contains("modal-open")).toBe(true);
    expect(screen.getByText("Confirmer mon inscription 🚀")).toBeDefined();

    unmount();
    expect(document.body.classList.contains("modal-open")).toBe(false);
  });
});
