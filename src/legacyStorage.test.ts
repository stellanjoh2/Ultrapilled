import { afterEach, describe, expect, it } from "vitest";
import { lsGet, lsRemove, lsSet } from "./legacyStorage";

describe("legacyStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("migrates a leftover Falldown key onto the Ultrapilled name", () => {
    localStorage.setItem("falldown.prefs", '{"soundOn":false}');
    expect(lsGet("prefs")).toBe('{"soundOn":false}');
    expect(localStorage.getItem("ultrapilled.prefs")).toBe('{"soundOn":false}');
    expect(localStorage.getItem("falldown.prefs")).toBeNull();
  });

  it("prefers the new key when both exist", () => {
    localStorage.setItem("falldown.prefs", "old");
    localStorage.setItem("ultrapilled.prefs", "new");
    expect(lsGet("prefs")).toBe("new");
  });

  it("writes only the Ultrapilled key", () => {
    lsSet("welcomeDismissed", "1");
    expect(localStorage.getItem("ultrapilled.welcomeDismissed")).toBe("1");
    expect(localStorage.getItem("falldown.welcomeDismissed")).toBeNull();
    lsRemove("welcomeDismissed");
    expect(localStorage.getItem("ultrapilled.welcomeDismissed")).toBeNull();
  });
});
