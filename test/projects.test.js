const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');
const { loadConfig, rewritePublicPath } = require('../scripts/projectPublisher');
const { getProject, listProjects } = require('../services/projectRegistry');
const { createGraphysXStatic } = require('../services/projectStatic');

describe('public project registry', () => {
  it('pins every source to a full commit and exposes GraphysX agent discovery', () => {
    const config = loadConfig(path.resolve(__dirname, '..', 'projects.config.json'));
    assert.equal(config.projects.length, 5);
    assert.ok(config.projects.every((project) => /^[0-9a-f]{40}$/.test(project.commit)));

    const graphysx = getProject('GraphysX');
    assert.equal(graphysx.url, '/Projects/GraphysX/');
    assert.equal(graphysx.agent.schema, 'graphysx.agent-tool-bridge/v1');
    assert.equal(graphysx.agent.remoteMutation, false);
    assert.ok(graphysx.deployment === null || typeof graphysx.deployment.builtAt === 'string');
    assert.equal(listProjects().length, 5);
  });

  it('rewrites GraphysX root assets in generated JS, JSON, CSS, and HTML', () => {
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

  it('revalidates GraphysX HTML while retaining asset caching', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sbqc-project-static-'));
    try {
      fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>GraphysX</title>');
      fs.writeFileSync(path.join(root, 'scene.js'), 'window.sceneReady = true;');
      const app = express().use('/Projects/GraphysX', createGraphysXStatic(root));

      await request(app)
        .get('/Projects/GraphysX/')
        .expect(200)
        .expect('Cache-Control', 'public, max-age=0, must-revalidate');
      await request(app)
        .get('/Projects/GraphysX/scene.js')
        .expect(200)
        .expect('Cache-Control', 'public, max-age=3600');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
