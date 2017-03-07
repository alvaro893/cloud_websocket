"use strict";
const WebsocketConnections = require('./websocketConnections');
const WebSocket = require('ws');
const url = require('url');

console.log("version 1.0");
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const PASSWORD = process.env.WS_PASSWORD;
const camDataPath = "/camera";
const clientDataPath = "/client";
var camConnections = WebsocketConnections.CameraConnections();

const wss = new WebSocket.Server({
    host: ip,
    port: port,
    verifyClient: verifyClient
});

console.log("running on %s:%d", wss.options.host, wss.options.port);

wss.on('connection', function connection(ws) {
    var parsedUrl = url.parse(ws.upgradeReq.url);
    var path = parsedUrl.pathname;

    switch (path) {
        case camDataPath:  // a camera wants to register
            camConnections.add(ws); // a name can be provide as well;
            break;
        case clientDataPath:  // a client wants to register to a camera
        case "/":
            var name = "camera0"; // TODO: get name from request;
            camConnections.addClientToCamera(name, ws);
            break;
        default:
            console.log("rejected: no valid path");
            ws.terminate();
            return;
    }
});


function verifyClient(info) {
    var acceptHandshake = false;
    var accepted = "rejected: no valid password, use 'pass' parameter in the handshake please";

    var clientUrl = url.parse(info.req.url, true);
    var params = clientUrl.query;

    acceptHandshake = params.pass == PASSWORD;

    if (acceptHandshake) {
        accepted = "accepted";
    }
    console.log("new client %s: %s", accepted, info.req.url);
    return acceptHandshake;
}