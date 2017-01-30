var chai = require('chai');
var sinon = require('sinon')
var ws = require('ws')
var expect = chai.expect;
var WebsocketConnections = require('../websocketConnections')

describe('websocketConnections', function test0(){
    it('clients must be zero at the begining', function(){
        var connections = new WebsocketConnections.ClientConnections()
        expect(connections.clients.length).to.equal(0)
    })

    it('add two clients to array', function test1(){
        var connections = new WebsocketConnections.ClientConnections()
        connections.add('1'); connections.add('2')
        expect(connections.clients.length).to.equal(2)
    })

    it('close connections client connection', function test2(){
        var connections = new WebsocketConnections.ClientConnections()
        connections.add('1'); connections.add('2')
        expect(connections.clients.length).to.equal(2)
        connections.close('1')
        expect(connections.clients.length).to.equal(1)
    })

    it('create an incomming callback for connection', function test3(){
        var message = "hello"
        var connections = new WebsocketConnections.ClientConnections()
        var fakeClient = {send: function send(msg){expect(msg).to.equal(message)}}
        
        connections.add(fakeClient);
        connections.incomingCallback(fakeClient)(message, null)
    })
    it('send to all clients', function test3(){
        var message = "hello"
        var connections = new WebsocketConnections.ClientConnections()
        var fakeClient = {send: function send(msg){expect(msg).to.equal(message)}} // this mocks the 'send' method

        connections.add(fakeClient);
        connections.add(fakeClient);
        connections.add(fakeClient);
        connections.sendToAll(message)
    })
})