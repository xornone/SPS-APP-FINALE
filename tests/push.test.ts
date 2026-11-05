import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendPushToAdmins } from "@/lib/webpush";

const mockSendNotification = vi.fn();
const mockDelete = vi.fn();

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: any[]) => mockSendNotification(...args),
  },
}));

const mockSelect = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (...args: any[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: any[]) => {
            mockEq(...eqArgs);
            return Promise.resolve({
              data: [
                {
                  id: "sub-1",
                  endpoint: "https://push.example.com/1",
                  p256dh: "key1",
                  auth: "auth1",
                },
              ],
              error: null,
            });
          },
        };
      },
      delete: () => ({
        eq: (...args: any[]) => {
          mockDelete(...args);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

describe("sendPushToAdmins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://spsapp2.vercel.app";
    mockSendNotification.mockResolvedValue({});
  });

  it("filters subscribers with is_admin = true and sends notification", async () => {
    const result = await sendPushToAdmins({
      title: "Test Idea",
      body: "New idea from a member",
      url: "/boite-a-idees",
    });

    expect(mockEq).toHaveBeenCalledWith("is_admin", true);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
  });
});
