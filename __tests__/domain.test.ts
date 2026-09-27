import {
  getBillingPeriod,
  getSubscriptionTier,
  isBillingPlan,
} from "@/lib/domain";
import { classifyTaskLocally } from "@/lib/task-routing";

describe("domain helpers", () => {
  it("validates billing plans and derives billing periods", () => {
    expect(isBillingPlan("pro_annual")).toBe(true);
    expect(isBillingPlan("enterprise")).toBe(false);
    expect(getBillingPeriod("pay_task")).toBe("one_time");
    expect(getBillingPeriod("starter")).toBe("monthly");
    expect(getBillingPeriod("pro_annual")).toBe("annual");
  });

  it("derives subscription tiers without annual suffixes", () => {
    expect(getSubscriptionTier("starter_annual")).toBe("starter");
    expect(getSubscriptionTier("agency")).toBe("agency");
  });

  it("routes representative tasks deterministically", () => {
    expect(classifyTaskLocally("Write a client proposal")).toBe(
      "proposal",
    );
    expect(classifyTaskLocally("Research our competitor market")).toBe(
      "research",
    );
    expect(classifyTaskLocally("Create a YouTube script")).toBe(
      "script",
    );
    expect(classifyTaskLocally("Help with this work")).toBe("delivery");
  });
});
