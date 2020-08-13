let url = require('url');
let querystring = require('querystring');


let subscribers = Object.create(null);

function onSubscribe(req, res) {
    let id = Math.random(); //POOR USE OF random, please don't kill me
    let urlParsed = url.parse(req.url, true);
    console.log(`Incoming request from ${urlParsed.query.uuid} using ${urlParsed.query.key}`)
    // res.setHeader('Content-Type', 'application/json;charset=utf-8');
    // res.setHeader("Cache-Control", "no-cache, must-revalidate");

    subscribers[id] = res;

    req.on('close', function () {
        console.log(`Incoming request from ${urlParsed.query.uuid} Ended`)
        delete subscribers[id];
    });

}

function publish(message) {
    message = JSON.stringify(message)
    for (let id in subscribers) {
        let res = subscribers[id];
        res.end(message);
        console.log(`Incoming request from ${urlParsed.query.uuid} Ended`)
    }

    subscribers = Object.create(null);
}

function close() {
    for (let id in subscribers) {
        let res = subscribers[id];
        res.end();
    }
}    

if (module.parent) {
    exports.publish = publish;
    exports.onSubscribe = onSubscribe;
}
process.on('SIGINT', close);
