async function getUserInfo() {
    const body = document.querySelector('body');
    try {
        const log = JSON.parse(body.dataset.requestLog);
        console.log(log);

        // Assuming Tools.ipLookUp is available from another script
        const info = await Tools.ipLookUp();
        info.logType = 'userIP';
        info.content = 'Connection from ' + info.City + ', ' + info.Country + ' (' + info.IP + ')  Server Content:' + log.content;

        info.client = log.client;
        info.authorization = log.authorization;
        info.host = log.host;
        info.ip = log.ip;
        info.hitCount = log.hitCount;
        info.created = log.created;
        info.queryParams = log.queryParams;
        info.path = log.path;
        info.method = log.method;
        info.protocol = log.protocol;
        info.hostname = log.hostname;
        info.originalUrl = log.originalUrl;
        info.cookies = log.cookies;

        const url = '/v2/logs';

        fetch(url, {
            method: 'POST',
            body: JSON.stringify(info),
            headers: {
                'content-type': 'application/json'
            }
        }).then(response => {
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('json')) {
                    return response.json().then(error => Promise.reject(error.message));
                } else {
                    return response.text().then(message => Promise.reject(message));
                }
            }
        }).catch(errorMessage => { console.log(errorMessage) });

    } catch (e) {
        console.error("Could not parse requestLog data or fetch user info:", e);
    }
}

function engageInteractiveExperience() {
    const welcomeSections = document.querySelectorAll('.welcome-section');
    welcomeSections.forEach(section => section.style.display = 'none');

    // Assuming setupNestor is defined in nestor.js
    setupNestor();
}

document.addEventListener('DOMContentLoaded', function() {
    const body = document.querySelector('body');
    const isWelcomePage = body.dataset.isWelcomePage === 'true';

    // Logic for welcome/interacted page can be added here if needed

    // Initialize MDB tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-mdb-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new mdb.Tooltip(tooltipTriggerEl);
    });

    getUserInfo();
});