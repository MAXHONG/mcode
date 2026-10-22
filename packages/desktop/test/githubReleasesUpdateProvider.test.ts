import { DebUpdater, NsisUpdater } from "electron-updater";
import { describe, expect, it } from "vitest";
import {
  MCODE_LATEST_DOWNLOAD_URL,
  GitHubReleasesUpdateProvider,
  resolveGitHubReleaseChannelFile,
} from "@desktop/main/manifestUpdateProvider.js";

describe("Mcode website (GitHub Releases layout) update provider", () => {
  it("maps each platform/arch to the manifest file published by the release workflow", () => {
    expect(resolveGitHubReleaseChannelFile("win32", "x64")).toBe("latest.yml");
    expect(resolveGitHubReleaseChannelFile("win32", "arm64")).toBe("latest-arm64.yml");
    expect(resolveGitHubReleaseChannelFile("darwin", "arm64")).toBe("latest-mac.yml");
    expect(resolveGitHubReleaseChannelFile("darwin", "x64")).toBe("latest-mac.yml");
    expect(resolveGitHubReleaseChannelFile("linux", "x64")).toBe("latest-linux.yml");
    expect(resolveGitHubReleaseChannelFile("linux", "arm64")).toBe("latest-linux-arm64.yml");
  });

  it("resolves relative asset names against the Mcode website latest download URL", () => {
    const provider = new GitHubReleasesUpdateProvider(
      { provider: "custom" },
      Object.create(NsisUpdater.prototype),
      { platform: "win32", isUseMultipleRangeRequest: false, executor: {} as never },
    );
    const [file] = provider.resolveFiles({
      version: "3.15.2",
      releaseDate: "2026-10-15",
      files: [{ url: "Mcode-3.15.2-win-x64.exe", sha512: "x", size: 1 }],
    } as never);
    expect(file?.url.href).toBe(`${MCODE_LATEST_DOWNLOAD_URL}Mcode-3.15.2-win-x64.exe`);
    expect(file?.url.href).toBe("https://mcode.hjh.im/download/latest/Mcode-3.15.2-win-x64.exe");
  });

  it("keeps only the installer format matching the installed Linux package", () => {
    const provider = new GitHubReleasesUpdateProvider(
      { provider: "custom" },
      Object.create(DebUpdater.prototype),
      { platform: "linux", isUseMultipleRangeRequest: false, executor: {} as never },
    );
    const files = provider.resolveFiles({
      version: "3.15.2",
      releaseDate: "2026-10-15",
      files: ["AppImage", "deb", "rpm"].map((ext) => ({
        url: `Mcode-3.15.2-linux-amd64.${ext}`,
        sha512: ext,
      })),
    } as never);
    expect(files.map((f) => f.url.pathname.split("/").pop())).toEqual([
      "Mcode-3.15.2-linux-amd64.deb",
    ]);
  });
});
