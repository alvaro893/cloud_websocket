const WebsocketConnections = require('./websocketConnections')
const WebSocket = require('ws');
const url = require('url');
const HttpServer = require('./httpServer')

console.log("version 1.0")
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const PASSWORD = process.env.WS_PASSWORD
const camDataPath = /\/camera\d*/
const clientDataPath = "/client"
var camSocket = new WebsocketConnections.CameraConnections()
var clientSockets = new WebsocketConnections.ClientConnections()
var httpServer = new HttpServer(port, camSocket)

const wss = new WebSocket.Server({
    host: ip,
    // port: port,
    server: httpServer.server,
    verifyClient: verifyClient
});

console.log("running on %s:%d", wss.options.host, wss.options.port)

wss.on('connection', function connection(ws) {
    var parsedUrl = url.parse(ws.upgradeReq.url)
    var path = parsedUrl.pathname
    var incomingCallback = null
    var closeCallback = null

    switch (true) {
        case camDataPath.test(path):
            var camNumber =  parseInt(path.split('camera')[1])
            camSocket.add(ws)
            incomingCallback = incomingFromCamera
            closeCallback = function(code, message){camSocket.close(ws); logClosing(code,message)}
            break;
        case path == clientDataPath:
        case path == "/":
            clientSockets.add(ws)
            incomingCallback = clientSockets.incomingCallback(camSocket)
            closeCallback = function(code, message){clientSockets.close(ws); logClosing(code, message)}
            break;
        default:
            console.warn("rejected: no valid path");
            ws.terminate()
            return
    }

    ws.on('message', incomingCallback);
    ws.on('close', closeCallback);
});

function logClosing(code, message){
    console.log("client close connection: %d, %s", code, message)
}

function incomingFromCamera(message, flags) {
    if (camSocket != null) {
        try {
            clientSockets.sendToAll(message)
        } catch (e) {
            console.error(e)
        }
    }
}



function verifyClient(info) {
    var acceptHandshake = false
    var accepted = "rejected: no valid password, use 'pass' parameter in the handshake please"

    clientUrl = url.parse(info.req.url, true)
    params = clientUrl.query

    acceptHandshake = true//params.pass == PASSWORD

    if (acceptHandshake) {
        accepted = "accepted"
    }
    console.warn("new client %s: %s", accepted, info.origin)
    return acceptHandshake
}