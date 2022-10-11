import { Command } from "https://deno.land/x/cliffy@v0.25.1/command/command.ts";
import { getDefaultChangelog } from "https://deno.land/x/ghlog@0.3.4/mod.ts";
import { Octokit } from "https://esm.sh/@octokit/core@4.0.5";
import { getNewVersion } from "./mod.ts";

const { args, options } = await new Command()
  .name("denomantic-release")
  .version("0.1.0") // @denopendabot hasundue/denomantic-release
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

const body = await getDefaultChangelog({ name: `${owner}/${repo}` }, { tag });
console.log(body);

if (options?.dryRun) Deno.exit(0);

const release = await octokit.request(
  "POST /repos/{owner}/{repo}/releases",
  { owner, repo, tag_name: tag, body, draft: options?.draft },
);
console.log(`🚀 Release ${release.data.tag_name} created.`);
