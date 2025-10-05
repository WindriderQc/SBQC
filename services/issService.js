const getIssData = async (issCollection) => {
    if (!issCollection) {
        console.warn('ISS data collection not available; returning empty dataset.');
        return [];
    }

    // Fetch the last 5000 records, sorted by timestamp descending, then reverse in code.
    const historicalData = await issCollection.find({})
        .sort({ timeStamp: -1 })
        .limit(5000)
        .toArray();

    // The frontend expects data sorted ascending by time.
    return historicalData.reverse();
};

module.exports = {
    getIssData,
};