import { describe, expect, it } from "vitest";
import { describeServiceError } from "@/lib/supabase/service-error";

describe("service errors", () => {
  it("identifies quota, read-only, rate limit, paused, and network failures", () => {
    expect(describeServiceError({ status: 402 }, "fallback")).toContain("quota");
    expect(describeServiceError({ code: "25006" }, "fallback")).toContain("read-only");
    expect(describeServiceError({ status: 429 }, "fallback")).toContain("Wait");
    expect(describeServiceError({ code: "PROJECT_PAUSED" }, "fallback")).toContain("resume");
    expect(describeServiceError(new TypeError("Failed to fetch"), "fallback")).toContain("temporarily unavailable");
  });

  it("preserves ordinary validation messages and supplies a fallback", () => {
    expect(describeServiceError(new Error("Invalid login credentials"), "fallback")).toBe("Invalid login credentials");
    expect(describeServiceError(null, "fallback")).toBe("fallback");
  });
});
