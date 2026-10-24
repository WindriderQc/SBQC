const router = require('express').Router();
const publicAgentx = require('../services/publicAgentxService');

function sendPublic(res, payload) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json({ status: 'success', ...payload });
}

router.get('/agentx/summary', async (_req, res, next) => {
    try {
        sendPublic(res, await publicAgentx.getSummary());
    } catch (err) {
        next(err);
    }
});

router.get('/agentx/leaderboard', async (_req, res, next) => {
    try {
        sendPublic(res, await publicAgentx.getLeaderboard());
    } catch (err) {
        next(err);
    }
});

router.get('/agentx/efficiency', async (_req, res, next) => {
    try {
        sendPublic(res, await publicAgentx.getEfficiency());
    } catch (err) {
        next(err);
    }
});

router.get('/agentx/models/:slug', async (req, res, next) => {
    try {
        const payload = await publicAgentx.getModelCard(req.params.slug);
        if (!payload.data) {
            return res.status(404).json({ status: 'error', message: 'Model not found', meta: payload.meta });
        }
        sendPublic(res, payload);
    } catch (err) {
        next(err);
    }
});

router.get('/agentx/snapshots', async (_req, res, next) => {
    try {
        sendPublic(res, await publicAgentx.getSnapshots());
    } catch (err) {
        next(err);
    }
});

module.exports = router;
