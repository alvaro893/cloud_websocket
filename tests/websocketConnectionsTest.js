"use strict";
var chai = require('chai');
var Websocket = require('ws');
var expect = chai.expect;
var WebsocketConnections = require('../websocketConnections');
const addr = "ws://localhost";

describe('Test ClientConnections', function test0() {
    it('clients must be zero at the begining', function () {
        var connections = new WebsocketConnections.ClientConnections();
        expect(connections.clients.length).to.equal(0);
    });

    it('add two clients to array', function test1() {
        var connections = new WebsocketConnections.ClientConnections();
        var ws0 = Websocket(addr);
        var ws1 = Websocket(addr);
        connections.add(ws0);
        connections.add(ws1);
        expect(connections.clients.length).to.equal(2);
    });

    it('close connections client connection', function test2() {
        var connections = new WebsocketConnections.ClientConnections();
        var ws0 = Websocket(addr);
        var ws1 = Websocket(addr);
        connections.add(ws0); connections.add(ws1);
        expect(connections.clients.length).to.equal(2);
        connections.close(ws0);
        expect(connections.clients.length).to.equal(1);
    });

    it('send message to 5 clients', function test3() {
        var message = "hello";
        var connections = new WebsocketConnections.ClientConnections();
        var nclients = 5;
        for (var i = 0; i < nclients; i++) {
            var fakeClient = {
                on: function () {/*do nothing*/ },
                send: function (msg) { expect(msg).to.equal(message) }
            };
            connections.add(fakeClient);
        }
        connections.sendToAll(message);
    });
});

/******** cameras ********/

describe('websocketConnections-cameras', function test0() {
    it('cameras must be zero at the begining', function () {
        var connections = new WebsocketConnections.CameraConnections();
        expect(connections.cameras.length).to.equal(0);
    });

    it('add two cameras to array', function test1() {
        var connections = new WebsocketConnections.CameraConnections();
        var ws0 = Websocket(addr); var ws1 = Websocket(addr);
        connections.add(ws0);
        connections.add(ws1);
        expect(connections.cameras.length).to.equal(2);
    });

    it('close connections camera connection', function test2() {
        var connections = new WebsocketConnections.CameraConnections();
        var ws0 = Websocket(addr); var ws1 = Websocket(addr);
        var cam0 = connections.add(ws0);
        var cam1 = connections.add(ws1);
        expect(connections.cameras.length).to.equal(2);
        connections.close(cam0);
        expect(connections.cameras.length).to.equal(1);
    });

    it('5 cameras with 1 clients each', function () {
        var connections = new WebsocketConnections.CameraConnections();
        var nclients = 5;
        for (var i = 0; i < nclients; i++) {
            var message = i;
            var fakeWsCam = makeFakeWsclient(message);
            var cam = connections.add(fakeWsCam, undefined);

            var fakeWsclient = makeFakeWsclient(message);
            connections.addClientToCamera(cam, fakeWsclient);

            // check that everything is connected
            expect(cam.clients.getLength()).to.equal(1);
            cam.clients.sendToAll(message);
        }
    });

    it('5 cameras with 5 clients each (clients receive from their camera)', function () {
        var connections = new WebsocketConnections.CameraConnections();
        var nclients = 5;  // for both cameras and clients
        for (var i = 0; i < nclients; i++) {
            var message = "hello from cam " + i;
            var fakeWsCam = makeFakeWsclient(message);
            var cam = connections.add(fakeWsCam, undefined);
            
            // create the clients
            for(var j = 0; j < nclients; j++){
                var fakeWsclient = makeFakeWsclient(message);
                connections.addClientToCamera(cam, fakeWsclient);
            }
            // check clients
            expect(cam.clients.getLength()).to.equal(nclients);
            cam.clients.sendToAll(message);
            
        }
    });

    function makeFakeWsclient(message) {
        var obj = {};
        obj.on = function on(event, callback) {/*do nothing*/ };
        obj.send = function send(msg) {expect(msg).to.equal(message);console.log("message="+msg)};
        return obj;
    }


        //    it('create an incomming callback for connection', function test3(){
        //        var message = "hello"
        //        var connections = new WebsocketConnections.CameraConnections()
        //        var fakeClient = {send: function send(msg){expect(msg).to.equal(message)}}
        //
        //        connections.add(fakeClient);
        //        connections.incomingCallback(fakeClient)(message, null)
        //    })
        // it('send to all ', function test3(){
        //     var message = "hello"
        //     var connections = new WebsocketConnections.CameraConnections()
        //     var fakeClient = {send: function send(msg){expect(msg).to.equal(message)}} // this mocks the 'send' method

        //     connections.add(fakeClient);
        //     connections.add(fakeClient);
        //     connections.add(fakeClient);
        //     connections.sendToAll(message)
        // })
    });