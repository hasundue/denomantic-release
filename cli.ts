import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/command.ts";
import { getDefaultChangelog } from "https://deno.land/x/ghlog@0.3.4/mod.ts";
import { getUpdates } from "https://deno.land/x/denopendabot@0.16.3/mod.ts";
import { Octokit } from "https://esm.sh/@octokit/core@4.2.0";
import { getNewVersion } from "./mod.ts";

const { args, options } = await new Command()
  .name("denomantic-release")
  .version("0.8.1") // @denopendabot hasundue/denomantic-release
  .description("Semantic release for Deno projects.")
  .option("-t --token <token>", "GitHub token to create a release.")
  .option("--draft", "Draft release.")
  .option("--dry-run", "Don't actually create a release.")
  .option("--major <types:string[]>", "Types for a major release.", {
    default: ["BREAKING"],
  })
  .option("--minor <types:string[]>", "Types for a minor release.", {
    default: ["feat"],
  })
  .option("--patch <types:string[]>", "Types for a patch release.", {
    default: ["fix"],
  })
  .option("--no-check", "Don't check the version numbers in the code.")
  .arguments("<repository>")
  .parse(Deno.args);

const output = (key: string, value: string) => {
  const file = Deno.env.get("GITHUB_OUTPUT");
  if (file) {
    Deno.writeTextFileSync(file, `${key}=${value}\n`, { append: true });
    console.log(`echo "${key}=${value}" >> $GITHUB_OUTPUT`);
  }
};

const token = options?.token ?? Deno.env.get("GITHUB_TOKEN");
const octokit = new Octokit({ auth: token });

const repository = args[0];
const [owner, repo] = repository.split("/");

const tag = await getNewVersion(owner, repo, { types: options });

if (!tag) {
  console.log("☕ No relevant commits found.");
  Deno.exit(0);
}
output("version", tag);

// check if dependencies are up to date
if (options.check) {
  console.log(
    "👀 Checking if the version numbers are up-to-date in the code...",
  );
  const updates = await getUpdates(repository, {
    release: tag,
    token: token,
  });
  if (updates.length) {
    console.warn("❗ Version numbers should be updated before a release.");
    output("needs_update", "true");
    Deno.exit(0);
  }
  console.log("👍 Ready to release!");
}

// generate a changelog by ghlog
const body = await getDefaultChangelog({ name: `${owner}/${repo}` }, { tag });

if (options?.dryRun) {
  console.log(body);
  Deno.exit(0);
}

const { data: release } = await octokit.request(
  "POST /repos/{owner}/{repo}/releases",
  { owner, repo, tag_name: tag, name: tag, body, draft: options?.draft },
);
console.log(`🚀 Release ${release.tag_name} created.`);
console.log(release.html_url);

output("released", "true");
Deno.exit(0);
