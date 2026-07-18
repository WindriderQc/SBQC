const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG_SCHEMA = 'sbqc.project-sources/v1';
const RELEASE_SCHEMA = 'sbqc.project-release/v1';
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const SAFE_DIRECTORY_PATTERN = /^[A-Za-z0-9._ -]+$/;
const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.mtl', '.obj', '.svg', '.txt', '.xml'
]);

function loadConfig(configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  validateConfig(config);
  return config;
}

function validateConfig(config) {
  if (!config || config.schema !== CONFIG_SCHEMA || !Array.isArray(config.projects)) {
    throw new Error(`Expected ${CONFIG_SCHEMA} with a projects array.`);
  }

  const ids = new Set();
  const directories = new Set();
  for (const project of config.projects) {
    if (!project || typeof project.id !== 'string' || !/^[a-z0-9-]+$/.test(project.id)) {
      throw new Error('Every project needs a lowercase, URL-safe id.');
    }
    if (ids.has(project.id)) throw new Error(`Duplicate project id: ${project.id}`);
    ids.add(project.id);

    if (typeof project.directory !== 'string' || !SAFE_DIRECTORY_PATTERN.test(project.directory)) {
      throw new Error(`Unsafe public directory for ${project.id}.`);
    }
    if (directories.has(project.directory.toLowerCase())) {
      throw new Error(`Duplicate public directory: ${project.directory}`);
    }
    directories.add(project.directory.toLowerCase());

    if (!COMMIT_PATTERN.test(project.commit ?? '')) {
      throw new Error(`${project.id} must pin a full 40-character Git commit.`);
    }
    if (typeof project.repository !== 'string' || !project.repository.startsWith('https://github.com/')) {
      throw new Error(`${project.id} must use an HTTPS GitHub repository URL.`);
    }
    if (project.publicPath !== `/Projects/${project.directory}/`) {
      throw new Error(`${project.id} publicPath must match its public directory.`);
    }
    if (!project.publish || !['static', 'npm-build'].includes(project.publish.type)) {
      throw new Error(`${project.id} has an unsupported publisher.`);
    }
  }
  return config;
}

function run(command, args, options = {}) {
  const attempts = Math.max(1, options.attempts ?? 1);
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = spawnSync(command, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      env: options.env ?? process.env,
      stdio: options.capture ? 'pipe' : 'inherit',
      windowsHide: true
    });
    if (!result.error && result.status === 0) {
      return options.capture ? (result.stdout ?? '').trim() : '';
    }
    if (attempt < attempts) {
      process.stderr.write(`Retrying ${command} (${attempt + 1}/${attempts})...\n`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750);
    }
  }
  if (result.error) throw result.error;
  const details = options.capture ? `\n${result.stderr || result.stdout || ''}` : '';
  throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.${details}`);
}

function runNpm(args, options = {}) {
  const bundledNpm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const npmCli = [process.env.npm_execpath, bundledNpm].find((candidate) => candidate && fs.existsSync(candidate));
  if (npmCli) {
    return run(process.execPath, [npmCli, ...args], options);
  }
  if (process.platform === 'win32') throw new Error('Unable to locate npm-cli.js for this Node.js installation.');
  return run('npm', args, options);
}

function prepareCheckout(project, cacheRoot) {
  const checkout = path.join(cacheRoot, project.id);
  const gitDirectory = path.join(checkout, '.git');
  if (!fs.existsSync(gitDirectory)) {
    fs.rmSync(checkout, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(checkout), { recursive: true });
    run('git', ['clone', '--filter=blob:none', '--no-checkout', '--no-tags', project.repository, checkout], { attempts: 3 });
  } else {
    run('git', ['remote', 'set-url', 'origin', project.repository], { cwd: checkout });
  }

  run('git', ['config', 'core.longpaths', 'true'], { cwd: checkout });
  if (Array.isArray(project.sparsePaths) && project.sparsePaths.length > 0) {
    run('git', ['sparse-checkout', 'init', '--cone'], { cwd: checkout });
    run('git', ['sparse-checkout', 'set', ...project.sparsePaths], { cwd: checkout });
  } else {
    run('git', ['sparse-checkout', 'disable'], { cwd: checkout });
  }

  if (!hasGitCommit(checkout, project.commit)) {
    run('git', ['fetch', '--depth', '1', '--no-tags', 'origin', project.commit], { cwd: checkout, attempts: 3 });
  }
  run('git', ['checkout', '--detach', '--force', project.commit], { cwd: checkout });
  run('git', ['reset', '--hard', project.commit], { cwd: checkout });
  run('git', ['clean', '-ffdqx'], { cwd: checkout });

  const resolved = run('git', ['rev-parse', 'HEAD'], { cwd: checkout, capture: true });
  if (resolved !== project.commit) {
    throw new Error(`${project.id} resolved ${resolved}; expected ${project.commit}.`);
  }
  return checkout;
}

function hasGitCommit(checkout, commit) {
  const result = spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], {
    cwd: checkout,
    encoding: 'utf8',
    stdio: 'ignore',
    windowsHide: true
  });
  return !result.error && result.status === 0;
}

function copyTree(source, destination) {
  const sourceRoot = path.resolve(source);
  fs.cpSync(sourceRoot, destination, {
    recursive: true,
    filter(candidate) {
      const relative = path.relative(sourceRoot, candidate);
      return !relative.split(path.sep).includes('.git');
    }
  });
}

function rewritePublicPath(root, fromRoot, toRoot) {
  if (!fromRoot.startsWith('/') || !fromRoot.endsWith('/') || !toRoot.startsWith('/') || !toRoot.endsWith('/')) {
    throw new Error('Public path rewrites must be root-relative directories ending in /.');
  }
  let filesChanged = 0;
  let replacements = 0;
  const rootReference = rootReferencePattern(fromRoot);

  walkFiles(root, (filePath) => {
    if (!TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return;
    const before = fs.readFileSync(filePath, 'utf8');
    const occurrences = Array.from(before.matchAll(rootReference)).length;
    if (occurrences === 0) return;
    fs.writeFileSync(filePath, before.replace(rootReferencePattern(fromRoot), (match, prefix) => `${prefix}${toRoot}`));
    filesChanged += 1;
    replacements += occurrences;
  });

  return { filesChanged, replacements };
}

function findTextReference(root, needle) {
  let match = null;
  const rootReference = rootReferencePattern(needle);
  walkFiles(root, (filePath) => {
    if (match || !TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return;
    if (rootReference.test(fs.readFileSync(filePath, 'utf8'))) match = filePath;
  });
  return match;
}

function rootReferencePattern(root) {
  const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_./-])${escaped}`, 'gm');
}

function walkFiles(root, visit) {
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(child);
      else if (entry.isFile()) visit(child);
    }
  }
}

function publishProject(project, options) {
  const checkout = prepareCheckout(project, options.cacheRoot);
  const sourceRoot = confinedPath(checkout, project.sourceDirectory ?? '.');
  if (!fs.existsSync(sourceRoot)) throw new Error(`${project.id} source directory is missing.`);

  if (project.publish.type === 'npm-build') {
    runNpm(project.publish.installArguments ?? ['ci'], { cwd: sourceRoot });
    runNpm(project.publish.buildArguments ?? ['run', 'build'], { cwd: sourceRoot });
  }

  const publishSource = project.publish.type === 'npm-build'
    ? confinedPath(sourceRoot, project.publish.outputDirectory)
    : sourceRoot;
  if (!fs.existsSync(publishSource)) throw new Error(`${project.id} publish output is missing.`);

  const stage = path.join(options.outputRoot, `.staging-${project.id}-${process.pid}-${Date.now()}`);
  const destination = confinedPath(options.outputRoot, project.directory);
  fs.rmSync(stage, { recursive: true, force: true });
  copyTree(publishSource, stage);

  let rewrite = { filesChanged: 0, replacements: 0 };
  if (project.publish.rewriteRoot) {
    const targetRoot = `${project.publicPath}${project.publish.rewriteRoot.slice(1)}`;
    rewrite = rewritePublicPath(stage, project.publish.rewriteRoot, targetRoot);
    const unresolved = findTextReference(stage, project.publish.rewriteRoot);
    if (unresolved) throw new Error(`${project.id} still contains ${project.publish.rewriteRoot} in ${unresolved}.`);
  }

  const metadata = publicProject(project, {
    builtAt: new Date().toISOString(),
    rewrite
  });
  fs.writeFileSync(path.join(stage, '.sbqc-project.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  activateOne(stage, destination);
  return metadata;
}

function publicProject(project, deployment = null) {
  const result = {
    id: project.id,
    title: project.title,
    description: project.description,
    url: `${project.publicPath}${project.entry === 'index.html' ? '' : project.entry}`,
    publicPath: project.publicPath,
    source: {
      repository: project.repository.replace(/\.git$/, ''),
      commit: project.commit
    },
    deployment
  };
  if (project.agent) {
    result.agent = {
      ...project.agent,
      launchUrl: project.publicPath,
      discoveryUrl: `/api/projects/${project.id}`
    };
  }
  return result;
}

function activateOne(stage, destination) {
  const backup = `${destination}.backup-${process.pid}-${Date.now()}`;
  let movedExisting = false;
  try {
    if (fs.existsSync(destination)) {
      fs.renameSync(destination, backup);
      movedExisting = true;
    }
    fs.renameSync(stage, destination);
    if (movedExisting) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(destination) && movedExisting && fs.existsSync(backup)) {
      fs.renameSync(backup, destination);
    }
    throw error;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function confinedPath(root, relative) {
  if (typeof relative !== 'string') throw new Error('Expected a relative path.');
  const rootPath = path.resolve(root);
  const result = path.resolve(rootPath, relative);
  if (result !== rootPath && !result.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error(`Path escapes its root: ${relative}`);
  }
  return result;
}

function publishProjects({ configPath, outputRoot, cacheRoot, only = [] }) {
  const config = loadConfig(configPath);
  const selected = only.length > 0 ? config.projects.filter((project) => only.includes(project.id)) : config.projects;
  if (only.length > 0 && selected.length !== only.length) {
    const found = new Set(selected.map((project) => project.id));
    throw new Error(`Unknown project ids: ${only.filter((id) => !found.has(id)).join(', ')}`);
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(cacheRoot, { recursive: true });
  const deployments = [];
  for (const project of selected) {
    process.stdout.write(`\nPublishing ${project.title} @ ${project.commit.slice(0, 12)}\n`);
    deployments.push(publishProject(project, { outputRoot, cacheRoot }));
  }

  const release = {
    schema: RELEASE_SCHEMA,
    publishedAt: new Date().toISOString(),
    projects: deployments.map((project) => ({
      id: project.id,
      directory: config.projects.find((candidate) => candidate.id === project.id).directory,
      commit: project.source.commit
    }))
  };
  fs.writeFileSync(path.join(outputRoot, '.sbqc-projects.json'), `${JSON.stringify(release, null, 2)}\n`);
  return release;
}

module.exports = {
  CONFIG_SCHEMA,
  RELEASE_SCHEMA,
  confinedPath,
  loadConfig,
  publicProject,
  publishProjects,
  rewritePublicPath,
  validateConfig
};
