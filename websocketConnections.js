// "use strict";
var WebSocket = require('ws');
const STREAMING_COMMAND = "send_frames";
const STOP_STREAMING_COMMAND = "stop_frames";
 
 /** A class that hold WebSocket clients for a camera
 * @class
 */
function ClientConnections() {
    this.clients = [];
}
/** Lenght of the internal array of clients
 * @method
 */
ClientConnections.prototype.getLength = function(){
    if(this.clients){
    return this.clients.length;
    }else{
        return 0;
    }
};
/**@method
 * @param {WebSocket} conn - client websocket connection to add
 */
ClientConnections.prototype.add = function (conn, cb) {
    this.clients.push(conn);
    if(cb){ cb();}
    // console.log("client connections:%d", this.clients.length)
};
/**@method
 * @param {WebSocket} conn - websocket connection to close
 */
ClientConnections.prototype.close = function (conn, cb) {
    if(this.clients.length < 1){
        return;
    }
    var indx = this.clients.indexOf(conn);
    this.clients.splice(indx, 1);
    conn.close();
    if(cb){cb();}
};

/**send message to all websockets in the array
 * @method
 * @param {string} message 
 */
ClientConnections.prototype.sendToAll = function (message) {
    this.clients.forEach((client, ind, arr) => {
        if(client.readyState === WebSocket.OPEN){
            client.send(message,(err) => {
                if(err){
                    console.error("Error sending to client. Terminating client...");
                    client.terminate(); // client will be removed on the closing callback
                }
            });//sendCallback(client, "sending to client " + ind + " (ClientConnections.sendToAll)"));
        }
    });
};

 /**Close all clients in the array
  * @method
  */
ClientConnections.prototype.closeAll = function (message) {
    this.clients.forEach(function (client, ind, arr) {
        try{
            client.close();
        }catch(err){
            console.error(err.message);
        }
    });
};


/**A class that holds CameraClient objects
 * @class
 */
function CameraConnections() {
    /** @member {Array} - this an array of clientcameras, no websockets connections */
    this.cameras = [];
}

/**
 * @method
 * @return {number} - number of cameras in the connected
 */
CameraConnections.prototype.count = function() {
    return this.cameras.length;
};

/**
 * @method
 * @return {number} - number of cameras in the connected
 */
CameraConnections.prototype.getClientCount = function() {
    var count = 0;
    this.cameras.forEach(function(camera, inx, arr){
        count += camera.clients.getLength();
    });
    return count;
};


/**
 * @method
 * @return {array} - array of names of the cameras
 */
CameraConnections.prototype.getInfo = function() {
    var cams = [];
    this.cameras.forEach(function(element, index) {
        var name = element.name;
        if (element.name === undefined){
            name = "camera"+index;
        }
        var infoObject = {name:name, ip:element.ip};
        cams.push(infoObject);
    }, this);
    return cams;    
};

 /**
  * @method
  * @param {WebSocket} conn - connection to add
  * @param {string} name - name of the socket
  */
CameraConnections.prototype.add = function (conn, name, ip) {
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
};
/**
 * @method
 * @param {(string|object|function)} cameraName - can be the name of the camera or a Camera object
 * @param {WebSocket} clientConn
 * @param {} callback
 */
CameraConnections.prototype.addClientToCamera = function (cameraName, clientConn, callback) {
    if(typeof cameraName === 'string'){
        this.getCamera(cameraName, tryAddClientToCamera);
    }else{
        // Try to add this client to the camera
        tryAddClientToCamera(cameraName);
    }
    /**
     * @function
     * @param {Camera} camera
     */
    function tryAddClientToCamera(camera){
        if(!camera){
            var err = new Error("cannot add client to invalid camera: "+camera);
            callback(err);
            return;
        }

        // new client Callbacks
        clientConn.on('message', (message) => {camera.sendMessage(message);});
        clientConn.on('close', (code) => {
            camera.clients.close(clientConn, function(){camera.checkClients();});
            console.info("Closing client for %s camera. code: %d, %s, %s", camera.name, code);
        });
        clientConn.on('error', (err) => {
            console.error("Error on Client connected to " + cameraName + " camera. Connection with client will be terminated. Error detail next line.");
            console.error(err);
            clientConn.terminate();
        });
        camera.clients.add(clientConn, function(){camera.checkClients();});
        callback(undefined);
    }
};

CameraConnections.prototype.removeCamera = function(cameraClient){
    var indx = this.cameras.indexOf(cameraClient);
    this.cameras.splice(indx, 1);
};

CameraConnections.prototype.close = function(camera){
    // this will trigger closingCamera callback
    this.removeCamera(camera);
};
/**
 * @method
 * @param {string} name - name of the camera
 * @param {} callback - callback which receives the camera object
 */
CameraConnections.prototype.getCamera = function (name, callback) {
    var cameraFound;
    this.cameras.forEach(function(c, index) {
        if (c.name == name || name == "camera"+index) {
            cameraFound = c;
        }
    }, this);

    callback(cameraFound);
};


/**@class
*  A camera client, it has a list of clients attached, and a unique name
*  @param {WebSocket} conn - connection object
*  @param {String} name - name of this camera (for identification)
*  @param {String} ip - ip address of this camera
*/

function Camera(conn, name, ip) {
    this.conn = conn;
    this.name = name;
    this.ip = ip;
    this.clients = new ClientConnections();
    /** @member {number} - estimated number of people seen by camera */
    this.peopleCount = 0;
    /** @member {Buffer} - last heatmap image from camera */
    this.heatmap = new Buffer(0);
}

Camera.prototype.sendMessage = function (message) {
    var conn = this.conn;
    if(conn.readyState === WebSocket.OPEN){
        conn.send(message, (err) => {
            if(err){console.error("Error sending to Camera " + this.name);}
        });
    }
};


Camera.prototype.checkClients = function (){
    var conn = this.conn;
    if(this.clients.getLength() > 0) {
        // request the camera to start streaming data
        this.conn.send(STREAMING_COMMAND, (err) => {
            if(err){
                console.error("Error sending STREAMING_COMMAND");
                console.error(err);
            }});
    }else{
        // stop sending camera frames but keep connection
        this.conn.send(STOP_STREAMING_COMMAND, (err) => {
            if(err){
                console.error("Error sending STOP_STREAMING_COMMAND");
                console.error(err);
            } });
    } 
};


exports.ClientCamera = Camera;
exports.ClientConnections = ClientConnections;
exports.CameraConnections = CameraConnections;
