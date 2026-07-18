const router = require('express').Router();
const { getProject, listProjects } = require('../services/projectRegistry');

router.get('/', (req, res) => {
  res.json({
    schema: 'sbqc.projects/v1',
    projects: listProjects()
  });
});

router.get('/:id', (req, res) => {
  const project = getProject(req.params.id);
  if (!project) {
    return res.status(404).json({
      status: 'error',
      message: `Unknown public project: ${req.params.id}`
    });
  }
  return res.json({
    schema: 'sbqc.project/v1',
    project
  });
});

module.exports = router;
