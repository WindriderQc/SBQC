#!/usr/bin/env node
const path = require('path');
const { publishProjects } = require('./projectPublisher');

const repositoryRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outputRoot = path.resolve(readOption('--output') ?? path.join(repositoryRoot, 'public', 'Projects'));
const cacheRoot = path.resolve(readOption('--cache') ?? path.join(repositoryRoot, '.project-cache'));
const only = readOptions('--only');

try {
  const release = publishProjects({
    configPath: path.join(repositoryRoot, 'projects.config.json'),
    outputRoot,
    cacheRoot,
    only
  });
  process.stdout.write(`\nPublished ${release.projects.length} pinned project(s) to ${outputRoot}.\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  if (!args[index + 1]) throw new Error(`${name} needs a value.`);
  return args[index + 1];
}

function readOptions(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name) {
      if (!args[index + 1]) throw new Error(`${name} needs a value.`);
      values.push(args[index + 1]);
    }
  }
  return values;
}
