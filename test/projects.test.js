const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadConfig, publishProjects, rewritePublicPath } = require('../scripts/projectPublisher');
const { getProject, listProjects } = require('../services/projectRegistry');

describe('public project registry', () => {
  it('pins every source to a full commit and exposes GraphysX agent discovery', () => {
    const config = loadConfig(path.resolve(__dirname, '..', 'projects.config.json'));
    assert.equal(config.projects.length, 5);
    assert.ok(config.projects.every((project) => /^[0-9a-f]{40}$/.test(project.commit)));

    const graphysx = getProject('GraphysX');
    assert.equal(graphysx.hosting, 'external');
    assert.equal(graphysx.url, 'https://graphysx.specialblend.ca/');
    assert.equal(graphysx.publicPath, null);
    assert.equal(graphysx.source.repository, 'https://github.com/WindriderQc/GraphysX-Web');
    assert.equal(graphysx.agent.schema, 'graphysx.agent-tool-bridge/v1');
    assert.equal(graphysx.agent.launchUrl, 'https://graphysx.specialblend.ca/');
    assert.equal(graphysx.agent.remoteMutation, false);
    assert.equal(graphysx.deployment, null);
    assert.equal(listProjects().length, 5);
  });

  it('retains root asset rewriting for managed npm projects', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sbqc-project-rewrite-'));
    try {
      fs.mkdirSync(path.join(root, 'assets'));
      fs.writeFileSync(path.join(root, 'index.html'), '<script src="/assets/app.js"></script>');
      fs.writeFileSync(path.join(root, 'assets', 'app.js'), 'fetch("/assets/world.json")');
      fs.writeFileSync(path.join(root, 'assets', 'world.json'), '{"textureUrl":"/assets/texture.png"}');
      fs.writeFileSync(path.join(root, 'assets', 'style.css'), 'url(/assets/texture.png)');
      fs.writeFileSync(path.join(root, 'assets', 'texture.png'), Buffer.from([0, 1, 2, 3]));

      const result = rewritePublicPath(root, '/assets/', '/Projects/GraphysX/assets/');
      assert.deepEqual(result, { filesChanged: 4, replacements: 4 });
      assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /\/Projects\/GraphysX\/assets\/app\.js/);
      assert.deepEqual(fs.readFileSync(path.join(root, 'assets', 'texture.png')), Buffer.from([0, 1, 2, 3]));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('never sends an external catalog project through the SBQC publisher', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sbqc-external-project-'));
    try {
      assert.throws(() => publishProjects({
        configPath: path.resolve(__dirname, '..', 'projects.config.json'),
        outputRoot: path.join(root, 'output'),
        cacheRoot: path.join(root, 'cache'),
        only: ['graphysx']
      }), /catalog-only and deploy independently/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
