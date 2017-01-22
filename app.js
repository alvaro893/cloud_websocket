const WebSocket = require('ws');
const url = require('url')
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const PASSWORD = "90011"
const camDataPath = "/camera"
const clientDataPath = "/client"
var camSocket = null
var clientSocket = null

const wss = new WebSocket.Server({
     host: ip, port: port, verifyClient: verifyClient});

var buffer = "data"
console.log("running on %s:%d", wss.options.host, wss.options.port)

wss.on('connection', function connection(ws) {
    var parsedUrl = url.parse(ws.upgradeReq.url)
    var path = parsedUrl.pathname

    if(path == camDataPath){
        camSocket = ws
        var incoming = function incoming(message) {
            console.log('received from cam: %s', message);
            if (clientSocket != null){
                clientSocket.send(message)
            }
        }
    }else if (path == clientDataPath){
        clientSocket = ws
        var incoming = function incoming(message) {
            console.log('received from client: %s', message);
                if (camSocket != null){
                camSocket.send(message)
            }
        }
    }
    
  ws.on('message', incoming);
});

function verifyClient(info){
    var acceptHandshake = false
    var accepted = "not accepted"

    clientUrl = url.parse(info.req.url, true)
    params = clientUrl.query
    
    acceptHandshake = true//params.pass == PASSWORD

    if(acceptHandshake){
        accepted = "accepted"
    }
    console.warn("new client %s: %s", accepted, info.origin)
    return acceptHandshake
}

