"use strict";

const express = require('express');
var WebsocketConnections = require('./websocketConnections');
var WebSocket = require('ws');
var url = require('url');
var http = require('http');
var getIP = require('ipware')().get_ip;
var params;

console.log("version 1.0");
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || process.argv[2] || '0.0.0.0';

var PASSWORD = process.env.WS_PASSWORD;
var camDataPath = "/camera";
var clientDataPath = "/client";
var camConnections = new WebsocketConnections.CameraConnections();

/** http server: base */
const app = express();
app.get('/cams', function(req, res){
    res.send({ cams: camConnections.getInfo(), count: camConnections.count()});
});
const server = http.createServer(app);
main(server)

/** @function
 *  @param {http.Server} server */
function main(server) {
     /** websocket server extends the http server */
    var wss = new WebSocket.Server({
        verifyClient: verifyClient,
        server: server
    });

    console.log("running on %s:%d", ip, port);

    wss.on('connection', function connection(ws) {
        var parsedUrl = url.parse(ws.upgradeReq.url);
        var path = parsedUrl.pathname;

        switch (path) {
            case camDataPath:  // a camera wants to register
                var camera_name = params.camera_name || undefined;
                var req = ws.upgradeReq;
                var ipInfo = getIP(req);
                var ipAddress = [req.headers['x-forwarded-for'],
                                req.connection.remoteAddress,
                                ipInfo];
                camConnections.add(ws, camera_name, ipAddress);
                break;
            case clientDataPath:  // a client wants to register to a camera
            case "/":
                var camera_name = params.camera_name || "camera0";
                camConnections.addClientToCamera(camera_name, ws, function(err){
                    if(err){ws.terminate();}
                });
                break;
            default:
                console.log("rejected: no valid path");
                ws.terminate();
                return;
        }
    });

    server.listen(port, ip);
}


function verifyClient(info) {
    var acceptHandshake = false;
    var accepted = "rejected: no valid password, use 'pass' parameter in the handshake please";
    var ip = info.req.connection.remoteAddress;
    var clientUrl = url.parse(info.req.url, true);
    params = clientUrl.query;

    acceptHandshake = params.pass == PASSWORD;

    if (acceptHandshake) {
        accepted = "accepted";
    }
    console.log("new client %s: %s", accepted, info.req.url);
    return acceptHandshake;
}