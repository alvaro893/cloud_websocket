"use strict";
const WebsocketConnections = require('./websocketConnections');
const WebSocket = require('ws');
const url = require('url');
var params;

console.log("version 1.0");
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';

const PASSWORD = process.env.WS_PASSWORD;
const camDataPath = "/camera";
const clientDataPath = "/client";
var camConnections = new WebsocketConnections.CameraConnections();

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
            var camera_name = params.camera_name || undefined;
            camConnections.add(ws, camera_name);
            break;
        case clientDataPath:  // a client wants to register to a camera
        case "/":
            var camera_name = params.camera_name || "camera0";
            camConnections.addClientToCamera(camera_name, ws);
            // if(camConnections.getCamera(camera_name)){
            //     camConnections.addClientToCamera(camera_name, ws);
            // }else{
            //     console.log("camera not found. there are %d cameras available:%s",
            //      camConnections.cameras.length, camConnections.cameras);
            //     ws.terminate();
            // }
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
    params = clientUrl.query;

    acceptHandshake = params.pass == PASSWORD;

    if (acceptHandshake) {
        accepted = "accepted";
    }
    console.log("new client %s: %s", accepted, info.req.url);
    return acceptHandshake;
}