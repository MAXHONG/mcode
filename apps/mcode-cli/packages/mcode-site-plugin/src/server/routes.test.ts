import { describe, expect, it } from "vitest";
import { resourcePath } from "./routes.ts";

const SITE = "1978123456789012480";
const DEP = "1978123456789012481";

describe("resourcePath", () => {
  it.each([
    ["mcode-site://usage", "/api/v1/sites/usage"],
    ["mcode-site://plans", "/api/v1/sites/plans"],
    ["mcode-site://sites", "/api/v1/sites"],
    ["mcode-site://sites?cursor=", "/api/v1/sites"],
    ["mcode-site://sites?cursor=a%2Fb&limit=20", "/api/v1/sites?cursor=a%2Fb&limit=20"],
    [`mcode-site://sites/${SITE}`, `/api/v1/sites/${SITE}`],
    [
      `mcode-site://sites/${SITE}/deployments?cursor=x`,
      `/api/v1/sites/${SITE}/deployments?cursor=x`,
    ],
    [`mcode-site://sites/${SITE}/deployments/${DEP}`, `/api/v1/sites/${SITE}/deployments/${DEP}`],
    [`mcode-site://sites/${SITE}/cover`, `/api/v1/sites/${SITE}/cover`],
    [
      `mcode-site://sites/${SITE}/deployments/${DEP}/logs?offset=12`,
      `/api/v1/sites/${SITE}/deployments/${DEP}/logs?offset=12`,
    ],
  ])("maps %s", (uri, path) => {
    expect(resourcePath(uri)).toBe(path);
  });

  it.each([
    "mcode-site://other",
    "https://sites/1",
    "mcode-site://usage?cursor=1",
    "mcode-site://plans?limit=1",
    "mcode-site://plans/free",
    "mcode-site://sites/abc",
    "mcode-site://sites/0123",
    "mcode-site://sites/1/deployments/2/logs/extra",
    "mcode-site://sites/1/cover/2",
    "mcode-site://sites/1/cover?offset=1",
    "mcode-site://sites/1/settings",
    "mcode-site://sites/1/deployments/2/logs?offset=-1",
    "mcode-site://sites?limit=1e3",
    "mcode-site://sites?cursor=a&cursor=b",
    "mcode-site://sites/1/deployments/2?offset=1",
    "mcode-site://user@sites",
    "mcode-site://sites/..%2Fusage",
    "not a uri",
  ])("rejects %s", (uri) => {
    expect(resourcePath(uri)).toBeUndefined();
  });
});
