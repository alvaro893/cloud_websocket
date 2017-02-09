const WebSocket = require('ws');
const url = require('url')
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const PASSWORD = process.env.WS_PASSWORD
const camDataPath = "/camera"
const clientDataPath = "/client"
var camSocket = null
var clientSocket = null

const wss = new WebSocket.Server({
    host: ip,
    port: port,
    verifyClient: verifyClient
});

console.log("running on %s:%d", wss.options.host, wss.options.port)

wss.on('connection', function connection(ws) {
    var parsedUrl = url.parse(ws.upgradeReq.url)
    var path = parsedUrl.pathname
    var incoming = null
    var closeCallback = null

    switch (path) {
        case camDataPath:
            if(camSocket != null) {logClosing(0,"no more cams"); ws.close();return;}
            camSocket = ws
            incoming = incomingFromCamera;
            closeCallback = function(code, message){camSocket = null; logClosing(code,message)}
            break;
        case clientDataPath:
            if(clientSocket != null) {logClosing(0,"no more clients"); ws.close();return;}
            clientSocket = ws
            incoming = function(){};
            closeCallback = function(code, message){clientSocket = null; ws.close(); logClosing(code, message)}
            break;
        default:
            console.warn("rejected: no valid path");
            ws.terminate()
            return
    }

    ws.on('message', incoming);
    ws.on('close', closeCallback);
});

function logClosing(code, message){
    console.log("client close connection: %d, %s", code, message)
}

function incomingFromCamera(message, flags) {
    if (clientSocket != null) {
        try {
            clientSocket.send(message)
        } catch (e) {
            console.error(e)
        }
    }
}

function verifyClient(info) {
    var acceptHandshake = false
    var accepted = "not accepted"

    clientUrl = url.parse(info.req.url, true)
    params = clientUrl.query

    acceptHandshake = true//params.pass == PASSWORD

    if (acceptHandshake) {
        accepted = "accepted"
    }
    console.warn("new connection")
    return acceptHandshake
}