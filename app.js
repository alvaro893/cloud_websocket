"use strict";
require('console-stamp')(console, 'dd.mm HH:MM:ss.l'); // formats the console output
const express = require('express');
const bodyParser = require('body-parser');
//const fs = require('fs');
var WebsocketConnections = require('./websocketConnections');
var WebSocket = require('ws');
var url = require('url');
var http = require('http');
var params;

console.log("version 1.0");
var port = process.env.PORT || process.env.port || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || process.argv[2] || '0.0.0.0';

var PASSWORD = process.env.WS_PASSWORD;
var camDataPath = "/camera";
var clientDataPath = "/client";
var camsInfoPath = '/cams';
var peoplePath = '/people_count';
var heatmapPath = '/heatmap';
var camConnections = new WebsocketConnections.CameraConnections();

/** http server: base */
const app = express();
app.use(logReq); // logging middleware
app.get(camsInfoPath, function(req, res){
    res.send({ cams: camConnections.getInfo(), count: camConnections.count()});
});
app.post(peoplePath, bodyParser.text(), function(req,res){
    checkCamera(req, res, function(camera) {
        camera.peopleCount = req.body;
        //fs.createWriteStream('people.txt').write(""+camera.peopleCount);//(test only)
    });
    res.end("ok");
});

app.get(peoplePath, function(req, res){
    checkCamera(req, res, function(camera){ res.send(''+camera.peopleCount); }); 
});

app.post(heatmapPath, bodyParser.raw({type:"image/png", limit:'500kb'}), function(req, res){
    if(req.get('Content-Type') != "image/png") {res.status(415).end("must be png image");}
    checkCamera(req, res, function(camera) {
            camera.heatmap = req.body;
            //fs.createWriteStream('pic'+new Date().getTime()+'.png').write(camera.heatmap);//create image (test only)
    });
    res.end("ok");
});

app.get(heatmapPath, function(req,res){
    checkCamera(req, res, function(camera){
        if(camera.heatmap) res.send(camera.heatmap);
        else res.status(400).send("no heatmap yet");
    });
});
const server = http.createServer(app);


/* MAIN entry point */
main(server);

/** @function
 *  @param {http.Server} server */
function main(server) {
     /** websocket server extends the http server */
    var wss = new WebSocket.Server({
        verifyClient: verifyClient,
        server: server
    });

    console.log("running on %s:%d", ip, port);

    wss.on('connection', function connection(ws, upgradeReq) {
        var parsedUrl = url.parse(upgradeReq.url);
        var path = parsedUrl.pathname;
        var count = camConnections.getClientCount()
        var ip = getIpAddresses(upgradeReq);
        console.log("new WS %s, ip: %s, number of clients: %d", upgradeReq.url, ip , count);    

        switch (path) {
            case camDataPath:  // a camera wants to register
                var camera_name = params.camera_name || undefined;
                var ipAddress = getIpAddresses(upgradeReq);
                camConnections.add(ws, camera_name, ipAddress);
                break;
            case clientDataPath:  // a client wants to register to a camera
            //case "/":
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
    var ip = info.req.connection.remoteAddress;
    var clientUrl = url.parse(info.req.url, true);
    params = clientUrl.query;

    acceptHandshake = params.pass == PASSWORD;

    if (!acceptHandshake) {
        console.log("client rejected: no valid password, use 'pass' parameter in the handshake please");
    }
    return acceptHandshake;
}


function getIpAddresses(req){
    var ipAddress = req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    return ipAddress;
}

function logReq(req, res, next){
    console.log("%s %s %s",req.method, req.url, new Date().toString());
    next();
}

function checkCamera(req, res, next){
    if(!req.query.camera_name) res.status(400).end("provide camera name");

    camConnections.getCamera(req.query.camera_name, function(camera){
        if(!camera) {res.status(404).send("camera not found. Is it registered already?");}
        else{next(camera);}
    });
}