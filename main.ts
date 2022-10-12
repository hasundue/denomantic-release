import { Command } from "https://deno.land/x/cliffy@v0.25.2/command/command.ts";
import { getDefaultChangelog } from "https://deno.land/x/ghlog@0.3.4/mod.ts";
import { createPullRequest } from "https://deno.land/x/denopendabot@0.1.0/mod.ts";
import { Octokit } from "https://esm.sh/@octokit/core@4.0.5";
import { getNewVersion } from "./mod.ts";

const { args, options } = await new Command()
  .name("denomantic-release")
  .version("0.2.0") // @denopendabot hasundue/denomantic-release
  .description("Semantic release for Deno projects.")
  .option("-t --token <token>", "GitHub token.")
  .option("--draft", "Draft release.")
  .option("--dry-run", "Don't actually create a release.")
  .option("--major <...types>", "Types for a major release.", {
    default: ["BREAKING"],
  })
  .option("--minor <...types>", "Types for a minor release.", {
    default: ["feat"],
  })
  .option("--patch <...types>", "Types for a patch release.", {
    default: ["fix"],
  })
  .arguments("<repository>")
  .parse(Deno.args);

const repository = args[0];
const [owner, repo] = repository.split("/");

const octokit = new Octokit({
  auth: options?.token ?? Deno.env.get("GITHUB_TOKEN"),
});

const tag = await getNewVersion(owner, repo, {
  types: options,
});

if (!tag) {
  console.log("☕ No relevant commits found.");
  Deno.exit(0);
}

// check if dependencies are up to date
console.log("👀 Checking updates on dependencies...");
const request = await createPullRequest(repository, { release: tag });
if (request) {
  console.log(`❗ Pull request should be merged before a release:`);
  console.log(request.html_url);
}

const body = await getDefaultChangelog({ name: `${owner}/${repo}` }, { tag });

if (options?.dryRun) {
  console.log(body);
  Deno.exit(0);
}

const { data: release } = await octokit.request(
  "POST /repos/{owner}/{repo}/releases",
  { owner, repo, tag_name: tag, body, draft: options?.draft },
);
console.log(`🚀 Release ${release.tag_name} created.`);
console.log(release.html_url);
