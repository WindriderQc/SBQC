#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { RELEASE_SCHEMA, confinedPath, loadConfig } = require('./projectPublisher');

const repositoryRoot = path.resolve(__dirname, '..');

function activateRelease(stagingRoot) {
  const publicRoot = path.join(repositoryRoot, 'public', 'Projects');
  const config = loadConfig(path.join(repositoryRoot, 'projects.config.json'));
  const releasePath = confinedPath(stagingRoot, '.sbqc-projects.json');
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  if (release.schema !== RELEASE_SCHEMA || !Array.isArray(release.projects) || release.projects.length === 0) {
    throw new Error(`Expected a non-empty ${RELEASE_SCHEMA} bundle.`);
  }
  const releaseIds = new Set(release.projects.map((project) => project.id));
  if (releaseIds.size !== release.projects.length) throw new Error('Project release contains duplicate ids.');

  const configured = new Map(config.projects.map((project) => [project.id, project]));
  const operations = release.projects.map((item) => {
    const project = configured.get(item.id);
    if (!project || item.directory !== project.directory || item.commit !== project.commit) {
      throw new Error(`Release metadata does not match pinned config for ${item.id}.`);
    }
    const source = confinedPath(stagingRoot, project.directory);
    const metadata = JSON.parse(fs.readFileSync(path.join(source, '.sbqc-project.json'), 'utf8'));
    if (metadata.id !== project.id || metadata.source?.commit !== project.commit) {
      throw new Error(`Invalid deployment metadata for ${project.id}.`);
    }
    return {
      project,
      source,
      destination: confinedPath(publicRoot, project.directory),
      backup: confinedPath(publicRoot, `.${project.directory}.backup-${process.pid}-${Date.now()}`),
      installed: false,
      backedUp: false
    };
  });

  fs.mkdirSync(publicRoot, { recursive: true });
  try {
    for (const operation of operations) {
      if (fs.existsSync(operation.destination)) {
        fs.renameSync(operation.destination, operation.backup);
        operation.backedUp = true;
      }
      fs.renameSync(operation.source, operation.destination);
      operation.installed = true;
    }
  } catch (error) {
    for (const operation of operations.reverse()) {
      if (operation.installed && fs.existsSync(operation.destination)) {
        fs.renameSync(operation.destination, operation.source);
      }
      if (operation.backedUp && fs.existsSync(operation.backup)) {
        fs.renameSync(operation.backup, operation.destination);
      }
    }
    throw error;
  }

  for (const operation of operations) {
    if (operation.backedUp) fs.rmSync(operation.backup, { recursive: true, force: true });
  }
  fs.writeFileSync(path.join(publicRoot, '.sbqc-projects.json'), `${JSON.stringify(release, null, 2)}\n`);
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  process.stdout.write(`Activated ${operations.length} project(s) in ${publicRoot}.\n`);
}

module.exports = { activateRelease };

if (require.main === module) {
  const stagingIndex = process.argv.indexOf('--staging');
  const stagingOption = stagingIndex === -1 ? null : process.argv[stagingIndex + 1];
  try {
    if (!stagingOption) throw new Error('--staging needs a directory.');
    activateRelease(path.resolve(stagingOption));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}
