let http = require('http');
let url = require('url');
let querystring = require('querystring');


let subscribers = Object.create(null);

function onSubscribe(req, res) {
    let id = Math.random(); //POOR USE OF random, please don't kill me
    console.log(`NEW SUBSCRIBER ${id}`) //or more like old subscriber renewing their subscription
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.setHeader("Cache-Control", "no-cache, must-revalidate");

    subscribers[id] = res;

    req.on('close', function () {
        delete subscribers[id];
    });

}

function publish(message) {
    message = JSON.stringify(message)
    for (let id in subscribers) {
        let res = subscribers[id];
        res.end(message);
    }

    subscribers = Object.create(null);
}

function queryHandler(req, res) {
    let urlParsed = url.parse(req.url, true);

    // new client wants messages
    if (urlParsed.pathname == '/subscribe') {
        onSubscribe(req, res);
        return;
    }
    res.end(`What you are looking for is not here, please don't DDoS me`)

}

function close() {
    for (let id in subscribers) {
        let res = subscribers[id];
        res.end();
    }
}    

if (module.parent) {
    exports.publish = publish;
    exports.queryHandler = queryHandler;
}
process.on('SIGINT', close);
