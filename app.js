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

    switch (path) {
        case camDataPath:
            camSocket = ws
            incoming = incomingFromClient;
            break;
        case clientDataPath:
        case "/":
            clientSocket = ws
            incoming = incomingFromCamera;
            break;
        default:
            console.warn("rejected: no valid path");
            ws.terminate()
            return
    }

    ws.on('message', incoming);
    ws.on('close', function(code, message) {
        console.log("client close connection: %d, %s", code, message)
    })
});

function incomingFromCamera(message, flags) {
    if (camSocket != null) {
        try {
            camSocket.send(message)
        } catch (e) {
            console.error(e)
        }
    }
}

function incomingFromClient(message, flags) {
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

    acceptHandshake = params.pass == PASSWORD

    if (acceptHandshake) {
        accepted = "accepted"
    }
    console.warn("new client %s: %s", accepted, info.origin)
    return acceptHandshake
}