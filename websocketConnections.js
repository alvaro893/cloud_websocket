"use strict";
var WebSocket = require('ws');
const STREAMING_COMMAND = "send_frames";
const STOP_STREAMING_COMMAND = "stop_frames";
const blackList = [];

// prolematic clients will be some time in the black list
setInterval(() => {
    if(blackList.length > 0){
        blackList.shift(); // remove item as a queue
    }
}, 10000);


/**A class that holds Camera objects*/
class CameraConnections {
    constructor() {
        /** @property {Set<Camera>} cameras */
        this.cameras = new Set();
    }
    /**
     * @return {number} - number of cameras in the connected
     */
    count() {
        return this.cameras.size;
    }

    /**@return {array} - array of names of the cameras */
    getInfo() {
        var cameraArr = [];
        var count = 0;
        this.cameras.forEach(function (camera) {
            var name = camera.name;
            if (camera.name === undefined) {
                name = "camera" + count;
                count++;
            }
            var infoObject = { name: name, ip: camera.ip };
            cameraArr.push(infoObject);
        }, this);
        return cameraArr;
    }

    /**
     *  @param {WebSocket} conn - connection to add
     *  @param {string} name - name of the socket
     *  @return {Camera}
    */
    add(conn, name, ip) {
        var cname = name;
        var self = this;
        if (!cname) {
            cname = undefined; //name will be based on index
        }

        // defining the callbacks for this camera
        conn.on('message', (message) => {
            camera.sendToAllClients(message, name);
        });
        conn.on('close', (code, message) => {
            camera.closeAllClients();
            self.removeCamera(camera);
            console.info("Camera %s closing connection: %d, %s", camera.name, code, message);
        });
        conn.on('error', (err) => {
            console.error("Error on " + name + "[" + ip + "]. Connection will be terminated. Error details next line.");
            console.error(err);
            conn.terminate();
        });

        var camera = new Camera(conn, cname, ip);
        this.cameras.add(camera);

        return camera;
    }

    /**
     * @param {(string|object|function)} cameraName - can be the name of the camera or a Camera object
     * @param {WebSocket} clientConn
     * @param {function(Error)} callback 
    */
    addClientToCamera(cameraName, clientConn, callback) {
        if (typeof cameraName === 'string') {
            this.getCamera(cameraName, tryAddClientToCamera);
        } else {
            // Try to add this client to the camera
            tryAddClientToCamera(cameraName);
        }
        /**
         * @function
         * @param {Camera} camera
         */
        function tryAddClientToCamera(camera) {
            if (!camera) {
                var err = new Error("cannot add client to invalid camera: " + camera);
                callback(err);
                return;
            }

            // new client Callbacks
            clientConn.on('message', (message) => { camera.sendMessage(message); });
            clientConn.on('close', (code) => {
                camera.closeClient(clientConn);
                camera.checkClients();
                console.info("Closing client for %s camera. code: %d, %s, %s", camera.name, code);
            });
            clientConn.on('error', (err) => {
                console.error("Error on Client connected to " + cameraName + " camera. Connection with client will be terminated. Error detail next line.");
                console.error(err);
                clientConn.terminate();
                camera.clientErrors++;
            });
            camera.addClient(clientConn);
            camera.checkClients();

            callback(undefined);
        }
    }
    /** @param {Camera} camera*/
    removeCamera(camera) {
        this.cameras.delete(camera);
    }

    /** @param {Camera} camera*/
    close(camera) {
        // this will trigger closingCamera callback
        this.removeCamera(camera);
    }

    /**
    * @param {string} name - name of the camera
    * @param {} callback - callback which receives the camera object
    */
    getCamera(name, callback) {
        var cameraFound;
        var count = 0;
        this.cameras.forEach(function (camera) {
            if (camera.name == name || name == "camera" + count) {
                cameraFound = camera;
            }
            count++;
        }, this);

        callback(cameraFound);
    }

    getClientsOnBackList(){
        return blackList.length;
    }

    isOnBlackList(ip){
        // var ip = client._socket.remoteAddress;
        return blackList.indexOf(ip) != -1;
    }
}




/** A camera client, it has a list of clients attached, and a unique name */
class Camera {
    /**
    *  @param {WebSocket} conn - connection object
    *  @param {String} name - name of this camera (for identification)
    *  @param {String} ip - ip address of this camera
    */
    constructor(conn, name, ip) {
        this.conn = conn;
        this.name = name;
        this.ip = ip;
        this.clientErrors = 0;
        /** @property {Set<WebSocket>} - client set*/
        this._clients = new Set();
        /** @member {number} - estimated number of people seen by camera */
        this.peopleCount = 0;
        /** @member {Buffer} - last heatmap image from camera */
        this.heatmap = new Buffer(0);
    }

    sendMessage(message) {
        var conn = this.conn;
        if (conn.readyState === WebSocket.OPEN) {
            conn.send(message, (err) => {
                if (err) { console.error("Error sending to Camera " + this.name); }
            });
        }
    }
    /**@param {WebSocket} client */
    addClient(client){
        this._clients.add(client);
    }

    /**@param {WebSocket} client */
    closeClient(clientToClose){
        if(this._clients.has(clientToClose)){
            this._clients.forEach((client) =>{
                if(client == clientToClose){
                    client.terminate();
                    this._clients.delete(clientToClose);
                }
            });
        }
    }

    checkClients() {
        var conn = this.conn;
        if(conn.readyState !== WebSocket.OPEN){ return; }

        console.info("there is %d clients in %s camera", this._clients.size, this.name);
        if (this._clients.size > 0) {
            // request the camera to start streaming data
            this.conn.send(STREAMING_COMMAND, (err) => {
                if (err) {
                    console.error("Error sending STREAMING_COMMAND");
                    console.error(err);
                }
            });
        } else {
            // stop sending camera frames but keep connection
            this.conn.send(STOP_STREAMING_COMMAND, (err) => {
                if (err) {
                    console.error("Error sending STOP_STREAMING_COMMAND");
                    console.error(err);
                }
            });
        }
    }

     /**
     * send message to all websockets in the array
     * @param {string} message 
     * @param {string} cameraName
     */
    sendToAllClients(message, cameraName) {
        this._clients.forEach((client, aSet) => {
            var clientIp = client._socket.remoteAddress;
            if(blackList.indexOf(clientIp) == -1){
            if (client.readyState === WebSocket.OPEN) {
                client.send(message, (err) => {
                    if (err) {
                        // console.error("Error sending to client from camera " + cameraName +". Closing client...");
                        client.terminate();
                        this.clientErrors++;
                        // on many errors put client ip on blacklist
                        if(this.clientErrors > 10){
                            blackList.push(clientIp);
                            this.clientErrors = 0;
                        }
                    }
                });
            }
        }
        });
    }

    /** Close all clients in the array */
    closeAllClients() {
        this._clients.forEach((client) => {
            client.terminate();
            // clients are being removed from the set in the closing callback
        });
    }
}

exports.CameraConnections = CameraConnections;