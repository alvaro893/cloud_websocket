"use strict";
var WebSocket = require('ws');
const STREAMING_COMMAND = "send_frames";
const STOP_STREAMING_COMMAND = "stop_frames";

/** A class that holds WebSocket clients for a camera */
class ClientConnections{
    constructor(){
        this.clients = [];
    }

    /** Lenght of the internal array of clients */
    getLength() {
        if (this.clients) {
            return this.clients.length;
        } else {
            return 0;
        }
    }

    /**
     * 
     * @param {WebSocket} conn - client websocket connection to add 
     */
    add(conn) {
        this.clients.push(conn);
        // console.log("client connections:%d", this.clients.length)
    }

    /**
     * 
     * @param {WebSocket} conn 
     * @param {function} cb 
     */
    close(conn) {
        if (this.clients.length < 1) {
            return;
        }
        var indx = this.clients.indexOf(conn);
        this.clients.splice(indx, 1);
        conn.close();

    }

    /**
     * send message to all websockets in the array
     * @param {string} message 
     */
    sendToAll(message) {
        this.clients.forEach((client, ind, arr) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message, (err) => {
                    if (err) {
                        console.error("Error sending to client. Terminating client...");
                        client.terminate(); // client will be removed on the closing callback
                    }
                })
            }
        });
    }

    /** Close all clients in the array */
    closeAll() {
        this.clients.forEach(function (client, ind, arr) {
            try {
                client.close();
            } catch (err) {
                console.error(err.message);
            }
        });
    }
}




/**A class that holds CameraClient objects*/
class CameraConnections {
    constructor() {
        /** @property {Array} - this an array of clientcameras, no websockets connections */
        this.cameras = [];
    }
    /**
     * @return {number} - number of cameras in the connected
     */
    count() {
        return this.cameras.length;
    }

    /** @return {number} - number of cameras in the connected */
    getClientCount() {
        var count = 0;
        this.cameras.forEach(function (camera, inx, arr) {
            count += camera.clients.getLength();
        });
        return count;
    }

    /**@return {array} - array of names of the cameras */
    getInfo() {
        var cams = [];
        this.cameras.forEach(function (element, index) {
            var name = element.name;
            if (element.name === undefined) {
                name = "camera" + index;
            }
            var infoObject = { name: name, ip: element.ip };
            cams.push(infoObject);
        }, this);
        return cams;
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
            camera.clients.sendToAll(message);
        });
        conn.on('close', (code, message) => {
            camera.clients.closeAll();
            self.removeCamera(camera);
            console.info("Camera %s closing connection: %d, %s", camera.name, code, message);
        });
        conn.on('error', (err) => {
            console.error("Error on " + name + "[" + ip + "]. Connection will be terminated. Error details next line.");
            console.error(err);
            this.terminate();
        });

        var camera = new Camera(conn, cname, ip);
        this.cameras.push(camera);

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
                camera.clients.close(clientConn);
                camera.checkClients();
                console.info("Closing client for %s camera. code: %d, %s, %s", camera.name, code);
            });
            clientConn.on('error', (err) => {
                console.error("Error on Client connected to " + cameraName + " camera. Connection with client will be terminated. Error detail next line.");
                console.error(err);
                clientConn.terminate();
            });
            camera.clients.add(clientConn);
            camera.checkClients();

            callback(undefined);
        }
    }
    /** @param {Camera} camera*/
    removeCamera(camera) {
        var indx = this.cameras.indexOf(camera);
        this.cameras.splice(indx, 1);
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
        this.cameras.forEach(function (c, index) {
            if (c.name == name || name == "camera" + index) {
                cameraFound = c;
            }
        }, this);

        callback(cameraFound);
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
        this.clients = new ClientConnections();
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

    checkClients() {
        var conn = this.conn;
        if (this.clients.getLength() > 0) {
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

}


exports.ClientCamera = Camera;
exports.ClientConnections = ClientConnections;
exports.CameraConnections = CameraConnections;
