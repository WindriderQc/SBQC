const fs = require('fs/promises');
const path = require('path');
const { MongoClient } = require('mongodb');

const blockedFields = new Set([
    'prompt',
    'response',
    'thinking',
    'judge_prompt',
    'human_notes',
    'quality_explanation',
    'expected_answer',
    'reference_answer',
    'judge_raw_response'
]);

let clientPromise = null;

function publicMongoUri() {
    return process.env.MONGO_PUBLIC_URI || process.env.AGENTX_PUBLIC_MONGO_URI || '';
}

function publicDbName() {
    return process.env.MONGO_PUBLIC_DB || process.env.AGENTX_PUBLIC_DB || 'agentx_public';
}

function publicAssetRoot() {
    return process.env.PUBLIC_ASSET_ROOT
        || path.join(__dirname, '..', 'public', 'agentx-data');
}

function cloneAndSanitize(value) {
    if (Array.isArray(value)) return value.map(cloneAndSanitize);
    if (!value || typeof value !== 'object') return value;

    const result = {};
    for (const [key, child] of Object.entries(value)) {
        if (blockedFields.has(key)) continue;
        result[key] = cloneAndSanitize(child);
    }
    return result;
}

function emptyPayload(kind) {
    if (kind === 'leaderboard') {
        return { generatedAt: null, leaderboard: [], rows: [] };
    }
    if (kind === 'efficiency') {
        return { generatedAt: null, entries: [], frontier: [], meta: { totalModels: 0, totalHosts: 0, totalTests: 0 } };
    }
    if (kind === 'snapshots') {
        return { generatedAt: null, snapshots: [] };
    }
    if (kind === 'model') {
        return null;
    }
    return {
        generatedAt: null,
        status: 'empty',
        metrics: {
            models: 0,
            tests: 0,
            snapshots: 0
        }
    };
}

async function getClient() {
    const uri = publicMongoUri();
    if (!uri) return null;
    if (!clientPromise) {
        const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2500 });
        clientPromise = client.connect().catch((err) => {
            clientPromise = null;
            throw err;
        });
    }
    return clientPromise;
}

async function readJsonFallback(filename) {
    try {
        const file = path.join(publicAssetRoot(), filename);
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function readCurrentCollection(collectionName) {
    const client = await getClient();
    if (!client) return null;
    const db = client.db(publicDbName());
    return db.collection(collectionName).findOne(
        {},
        { sort: { published_at: -1, generatedAt: -1, updatedAt: -1, _id: -1 } }
    );
}

async function readMany(collectionName, options = {}) {
    const client = await getClient();
    if (!client) return null;
    const db = client.db(publicDbName());
    return db.collection(collectionName)
        .find(options.filter || {})
        .sort(options.sort || { published_at: -1, generatedAt: -1, _id: -1 })
        .limit(options.limit || 50)
        .toArray();
}

function unwrap(doc, fallbackKey) {
    if (!doc) return null;
    if (doc.data && typeof doc.data === 'object') return doc.data;
    if (fallbackKey && doc[fallbackKey]) return doc[fallbackKey];
    return doc;
}

async function readPublicPayload({ collection, file, kind, fallbackKey }) {
    let source = 'empty';
    let data = null;
    let warning = null;

    try {
        data = unwrap(await readCurrentCollection(collection), fallbackKey);
        if (data) source = 'mongo';
    } catch (err) {
        warning = err.message;
    }

    if (!data) {
        const fallback = await readJsonFallback(file);
        if (fallback) {
            data = fallback;
            source = 'file';
        }
    }

    if (!data) data = emptyPayload(kind);

    return {
        data: cloneAndSanitize(data),
        meta: {
            source,
            warning,
            dbConfigured: Boolean(publicMongoUri()),
            assetRoot: publicAssetRoot()
        }
    };
}

async function getSummary() {
    return readPublicPayload({
        collection: 'benchmark_summary_current',
        file: 'summary.json',
        kind: 'summary'
    });
}

async function getLeaderboard() {
    return readPublicPayload({
        collection: 'leaderboard_current',
        file: 'leaderboard.json',
        kind: 'leaderboard',
        fallbackKey: 'leaderboard'
    });
}

async function getEfficiency() {
    return readPublicPayload({
        collection: 'efficiency_current',
        file: 'efficiency.json',
        kind: 'efficiency',
        fallbackKey: 'entries'
    });
}

async function getSnapshots() {
    let source = 'empty';
    let snapshots = null;
    let warning = null;

    try {
        snapshots = await readMany('leaderboard_snapshots', { limit: 100 });
        if (snapshots && snapshots.length > 0) source = 'mongo';
    } catch (err) {
        warning = err.message;
    }

    if (!snapshots || snapshots.length === 0) {
        const fallback = await readJsonFallback('snapshots.json');
        snapshots = Array.isArray(fallback) ? fallback : fallback?.snapshots;
        if (snapshots && snapshots.length > 0) source = 'file';
    }

    return {
        data: { generatedAt: new Date().toISOString(), snapshots: cloneAndSanitize(snapshots || []) },
        meta: { source, warning, dbConfigured: Boolean(publicMongoUri()), assetRoot: publicAssetRoot() }
    };
}

async function getModelCard(slug) {
    const normalized = String(slug || '').trim().toLowerCase();
    let source = 'empty';
    let model = null;
    let warning = null;

    try {
        const client = await getClient();
        if (client) {
            model = await client.db(publicDbName()).collection('model_cards').findOne({ slug: normalized });
            if (model) source = 'mongo';
        }
    } catch (err) {
        warning = err.message;
    }

    if (!model) {
        const fallback = await readJsonFallback('model-cards.json');
        const cards = Array.isArray(fallback) ? fallback : fallback?.models;
        model = (cards || []).find((entry) => String(entry.slug || '').toLowerCase() === normalized);
        if (model) source = 'file';
    }

    return {
        data: cloneAndSanitize(model || emptyPayload('model')),
        meta: { source, warning, dbConfigured: Boolean(publicMongoUri()), assetRoot: publicAssetRoot() }
    };
}

function getStatus() {
    return {
        dbConfigured: Boolean(publicMongoUri()),
        dbName: publicDbName(),
        assetRoot: publicAssetRoot()
    };
}

module.exports = {
    getSummary,
    getLeaderboard,
    getEfficiency,
    getSnapshots,
    getModelCard,
    getStatus,
    cloneAndSanitize
};
