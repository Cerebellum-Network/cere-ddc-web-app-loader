function sendMessage(target, message) {
    return new Promise((resolve, reject) => {
        const {port1, port2} = new MessageChannel();
        port1.onmessage = event => {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };

        target.postMessage(message, [port2]);
    });
}

/**
 * @param {string} sw
 * @param {string} [scope]
 * @return {Promise<unknown>}
 */
function register(sw, scope = '/') {
    return new Promise((resolve, reject) => {
        navigator.serviceWorker.register(sw, {scope})
            .then(registration => {
                resolve(registration.installing || registration.waiting || registration.active);
            })
            .catch(err => reject(err));
    });
}

const waitForSwIsActivated = (sw) => {
    let count = 0;
    return new Promise((resolve, reject) => {
        const check = () => {
            if (sw.state === 'activated') {
                resolve();
            } else if (count > 10) {
                reject();
            } else {
                count += 1;
                setTimeout(check, 100);
            }
        };
        setTimeout(check, 0);
    });
};

const scope = location.pathname;
const sw = await register('/sw.js', scope);
await waitForSwIsActivated(sw);
await sendMessage(sw, {type: 'routes', data: window.routes});

window.location.reload();
