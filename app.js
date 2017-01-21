const WebSocket = require('ws');
const url = require('url')
const PASSWORD = "90011"

const socketCam = new WebSocket.Server({
     port: 8080, verifyClient: verifyClient});

var buffer = "data"
console.log("running on %s:%d", socketCam.options.host, socketCam.options.port)

socketCam.on('connection', function connection(ws) {
    var parsedUrl = url.parse(ws.upgradeReq.url)
    console.log("path:%s, params:%s", parsedUrl.pathname, parsedUrl.query)
    if(parsedUrl.pathname == '/hi'){
        console.log('wtf')
        var incoming = function incoming(message) {
            console.log('received from hi: %s', message);
        }
    }else{
        var incoming = function incoming(message) {
            console.log('received: %s', message);
        }
    }
  ws.on('message', incoming);

  ws.send('something');
});

function verifyClient(info){
    var acceptHandshake = false
    var accepted = "not accepted"

    clientUrl = url.parse(info.req.url, true)
    params = clientUrl.query
    
    acceptHandshake = params.pass == PASSWORD

    if(acceptHandshake){
        accepted = "accepted"
    }
    console.warn("new client %s: %s", accepted, info.origin)
    return acceptHandshake
}

