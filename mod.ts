import { intersect } from "https://deno.land/std@0.201.0/collections/intersect.ts";
import {
  format,
  gt,
  increment,
  parse,
  SemVer,
} from "https://deno.land/std@0.201.0/semver/mod.ts";
import * as commit from "https://deno.land/x/commit@0.1.5/mod.ts";
import { Octokit } from "https://esm.sh/@octokit/core@5.0.0";

const octokit = new Octokit({ auth: Deno.env.get("GITHUB_TOKEN") });

type CommitTypes = {
  major: string[];
  minor: string[];
  patch: string[];
};

type VersioningOptions = {
  types: CommitTypes;
};

const defaultVersioningOptions: VersioningOptions = {
  types: {
    major: ["BREAKING"],
    minor: ["feat"],
    patch: ["fix"],
  },
};

async function getLatestRelease(
  owner: string,
  repo: string,
) {
  try {
    const { data: release } = await octokit.request(
      "GET /repos/{owner}/{repo}/releases/latest",
      { owner, repo },
    );
    return release;
  } catch {
    return null;
  }
}

async function getCommits(
  owner: string,
  repo: string,
  base?: string,
) {
  if (base) {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/compare/{base}...{head}",
      { owner, repo, base, head: "HEAD" },
    );
    return data.commits.map((entry) => entry.commit);
  } else {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits",
      { owner, repo },
    );
    return data.map((entry) => entry.commit);
  }
}

export function bumpSemVer(
  version: string | SemVer,
  types: (commit.Field | undefined)[],
  options: VersioningOptions = defaultVersioningOptions,
): SemVer {
  const include = (triggers: string[]) => intersect(types, triggers).length;
  const semver = parse(version);

  if (semver.major === 0) {
    // an unstable version, for which we do not bump the major version.
    const triggers = [...options.types.major, ...options.types.minor];
    if (include(triggers)) return increment(semver, "minor");
  } else {
    // a stable version.
    if (include(options.types.major)) return increment(semver, "major");
    if (include(options.types.minor)) return increment(semver, "minor");
  }
  if (include(options.types.patch)) return increment(semver, "patch");

  return semver; // no version bump.
}

export async function getNewVersion(
  owner: string,
  repo: string,
  options: VersioningOptions = defaultVersioningOptions,
): Promise<string | null> {
  const release = await getLatestRelease(owner, repo);
  const commits = await getCommits(owner, repo, release?.tag_name);

  const semver = parse(release?.tag_name ?? "0.0.0");

  if (!semver) {
    throw new Error(
      `The latest release tag ${
        release!.tag_name
      } does not follow the sementic versioning.`,
    );
  }

  const types = commits.map((entry) => commit.parse(entry.message).type);
  const newSemVer = bumpSemVer(semver, types, options)!;

  return gt(newSemVer, semver) ? format(newSemVer) : null;
}
