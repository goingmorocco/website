import { simpleGit } from "simple-git";
import { PROJECT_ROOT } from "./config.mjs";

const git = simpleGit(PROJECT_ROOT);

export async function getStatus() {
  const status = await git.status();
  return {
    changed: status.files.map((f) => ({ path: f.path, status: f.working_dir || f.index })),
    branch: status.current,
    ahead: status.ahead,
  };
}

export async function commitAndPush({ message, push = true }) {
  await git.add(".");
  const commitResult = await git.commit(message || "Update blog posts via CMS");
  let pushResult = null;
  if (push) {
    pushResult = await git.push();
  }
  return { commit: commitResult, push: pushResult };
}
