// scripts/syncRepos.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// List your repos here
const repos = [
  "https://github.com/WindriderQc/mqttTest.git",
  "https://github.com/WindriderQc/DrawTogether.git",
  "https://github.com/WindriderQc/PhotoBox.git",
  "https://github.com/WindriderQc/Tides.git",
];

const baseDir = path.join(__dirname, "..", "public", "Projects");

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

function syncRepos() {
  repos.forEach(repo => {
    const repoName = path.basename(repo, ".git");
    const targetDir = path.join(baseDir, repoName);

    if (fs.existsSync(targetDir)) {
      console.log(`Updating ${repoName}...`);
      try {
        execSync("git pull", { cwd: targetDir, stdio: "inherit" });
      } catch (err) {
        console.error(`Failed to pull ${repoName}:`, err.message);
      }
    } else {
      console.log(`Cloning ${repoName}...`);
      try {
        execSync(`git clone ${repo} ${targetDir}`, { stdio: "inherit" });
      } catch (err) {
        console.error(`Failed to clone ${repoName}:`, err.message);
      }
    }
  });
}

module.exports = syncRepos;
