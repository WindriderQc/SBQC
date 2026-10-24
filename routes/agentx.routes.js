const router = require('express').Router();
const publicAgentx = require('../services/publicAgentxService');

router.get('/agentx', async (_req, res, next) => {
    try {
        const [summary, leaderboard, efficiency] = await Promise.all([
            publicAgentx.getSummary(),
            publicAgentx.getLeaderboard(),
            publicAgentx.getEfficiency()
        ]);

        res.render('agentx', {
            title: 'AgentX Public Scoreboard',
            menuId: 'agentx',
            summary: summary.data,
            leaderboard: leaderboard.data,
            efficiency: efficiency.data,
            publicMeta: {
                summary: summary.meta,
                leaderboard: leaderboard.meta,
                efficiency: efficiency.meta
            }
        });
    } catch (err) {
        next(err);
    }
});

router.get('/agentx/models/:slug', async (req, res, next) => {
    try {
        const model = await publicAgentx.getModelCard(req.params.slug);
        if (!model.data) return res.status(404).render('agentx-model', {
            title: 'Model not found',
            model: null,
            publicMeta: model.meta
        });

        res.render('agentx-model', {
            title: `${model.data.name || model.data.model || req.params.slug} - AgentX`,
            model: model.data,
            publicMeta: model.meta
        });
    } catch (err) {
        next(err);
    }
});

router.get('/agentx/snapshots', async (_req, res, next) => {
    try {
        const snapshots = await publicAgentx.getSnapshots();
        res.render('agentx-snapshots', {
            title: 'AgentX Snapshots',
            snapshots: snapshots.data.snapshots || [],
            publicMeta: snapshots.meta
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
