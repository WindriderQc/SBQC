const fs = require('fs');
const path = require('path');
const { loadConfig, publicProject } = require('../scripts/projectPublisher');

const repositoryRoot = path.resolve(__dirname, '..');
const config = loadConfig(path.join(repositoryRoot, 'projects.config.json'));

function listProjects() {
  return config.projects.map((project) => publicProject(project, readDeployment(project)));
}

function getProject(id) {
  return listProjects().find((project) => project.id === String(id).toLowerCase()) ?? null;
}

function readDeployment(project) {
  const metadataPath = path.join(repositoryRoot, 'public', 'Projects', project.directory, '.sbqc-project.json');
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (metadata.id !== project.id || metadata.source?.commit !== project.commit) return null;
    return metadata.deployment;
  } catch {
    return null;
  }
}

module.exports = { getProject, listProjects };
