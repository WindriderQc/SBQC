var counter = function() {
    var count = 0;

    this.addCount = function() {
        count++
    }

    this.getCount = function() {
        return count;
    }
}

counter.instance = null;

counter.getInstance = function() {
    if (this.instance === null) {
        this.instance = new counter();
    }

    return this.instance;
}

module.exports = counter.getInstance();