const request = require('supertest');
const { expect } = require('chai');
const app = require('../sbqc_serv');
const { cloneAndSanitize } = require('../services/publicAgentxService');

describe('Public AgentX layer', function() {
    it('returns health probes without requiring public Mongo', async () => {
        const res = await request(app).get('/healthz').expect(200);
        expect(res.body.status).to.equal('ok');
    });

    it('renders the public AgentX scoreboard page', async () => {
        const res = await request(app).get('/agentx').expect(200);
        expect(res.text).to.include('Model Scoreboard');
    });

    it('returns an empty public leaderboard when no publication exists', async () => {
        const res = await request(app).get('/api/public/agentx/leaderboard').expect(200);
        expect(res.body.status).to.equal('success');
        expect(res.body.data).to.be.an('object');
        expect(res.body.data.leaderboard).to.be.an('array');
    });

    it('strips private benchmark fields from public payloads', () => {
        const cleaned = cloneAndSanitize({
            model: 'ax/test',
            prompt: 'private prompt',
            response: 'private response',
            nested: {
                thinking: 'private reasoning',
                score: 9
            }
        });

        expect(cleaned).to.deep.equal({
            model: 'ax/test',
            nested: { score: 9 }
        });
    });
});
