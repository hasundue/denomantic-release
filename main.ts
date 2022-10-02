import { parse } from "https://deno.land/std@0.106.0/flags/mod.ts";
import { getDefaultChangelog } from "https://deno.land/x/ghlog@0.3.4/mod.ts";
import { Octokit } from "https://cdn.skypack.dev/@octokit/core@4.0.5?dts";
import { getNewVersion } from "./mod.ts";

const args = parse(Deno.args);

const octokit = new Octokit({
  auth: args.token ?? Deno.env.get("GITHUB_TOKEN"),
});

if (!args._[0]) {
  console.error("Repository name is required.");
  Deno.exit(1);
}

const [owner, repo] = String(args._[0]).split("/");

const newTag = await getNewVersion(owner, repo);
console.log(newTag);

if (!newTag) {
  console.log("No relevant commits found.");
  Deno.exit(0);
}

const changeLog = await getDefaultChangelog(
  { name: `${owner}/${repo}` },
  { tag: newTag },
);
console.log(changeLog);

try {
  const response = await octokit.request(
    "POST /repos/{owner}/{repo}/releases",
    {
      owner,
      repo,
      tag_name: newTag,
      body: changeLog,
      draft: args.draft,
    },
  );
  console.log(`Release ${response.data.tag_name} has been created.`);
  Deno.exit(0);
} catch (e) {
  console.error(e);
  Deno.exit(1);
}
