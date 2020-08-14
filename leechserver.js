let url = require('url');
let querystring = require('querystring');


let subscribers = Object.create(null);
let timers = Object.create(null);

// // function processingHeader(){
//     // const processing = () => {
//         res.writeProcessing
//     // }
// //     processing()
// // }
function onSubscribe(req, res) {
    let id = Math.random(); //POOR USE OF random, please don't kill me
    let urlParsed = url.parse(req.url, true);
    console.log(`Incoming request from ${urlParsed.query.uuid} using ${urlParsed.query.key} with id: ${id}`)
 
    res.writeProcessing()
    let timerid = setInterval(res.writeProcessing.bind(res),60*1000)
    subscribers[id] = res;
    timers[id] = timerid;
    

    req.on('close', function () {
        console.log(`Incoming request from ${id} Ended`)
        clearInterval(timers[id]);
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
