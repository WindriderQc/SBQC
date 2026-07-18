const express = require('express');
const path = require('path');

function createGraphysXStatic(root = path.resolve(__dirname, '..', 'public', 'Projects', 'GraphysX')) {
  return express.static(root, {
    maxAge: 1000 * 60 * 60,
    setHeaders(res, filePath) {
      if (path.extname(filePath).toLowerCase() === '.html') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  });
}

module.exports = { createGraphysXStatic };
