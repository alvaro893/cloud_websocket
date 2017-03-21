var WebSocket = require('ws');
 
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
    return this.clients.length;
};
/**@method
 * @param {WebSocket} conn - client websocket connection to add
 */
ClientConnections.prototype.add = function (conn) {

    this.clients.push(conn);
    // console.log("client connections:%d", this.clients.length)
};
/**@method
 * @param {WebSocket} conn - websocket connection to close
 */
ClientConnections.prototype.close = function (conn) {
    if(this.clients.length < 1){
        return;
    }
    var indx = this.clients.indexOf(conn);
    this.clients.splice(indx, 1);
};

/**send message to all websockets in the array
 * @method
 * @param {string} message 
 */
ClientConnections.prototype.sendToAll = function (message) {
    this.clients.forEach(function (client, ind, arr) {
        checkSocketOpen(client, function(){
            client.send(message);
        });
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
 * @return {array} - array of names of the cameras
 */
CameraConnections.prototype.getNames = function() {
    var arrayOfNames = [];
    this.cameras.forEach(function(element) {
        arrayOfNames.push(element.name);
    }, this);
    return arrayOfNames;
};

 /**
  * @method
  * @param {WebSocket} conn - connection to add
  * @param {string} name - name of the socket
  */
CameraConnections.prototype.add = function (conn, name) {
    var cname = name;
    var self = this;
    if (name === undefined) {
        cname = "camera" + this.cameras.length;
    }

    // defining the callbacks for this camera
    conn.on('message', incomingFromCamera);
    conn.on('close', closingCamera);

    var camera = new Camera(conn, cname);
    this.cameras.push(camera);

    /** Callled when a connection to a camera is closed
     * @callback */
    function closingCamera(code, message) {
        try{
            camera.clients.closeAll();
            self.removeCamera(camera);
        }catch(err){
            console.error("Error on closing clients:"+err.message);
        }
        console.log("Camera %s closing connection: %d, %s", camera.name, code, message);
    }
    /** Callled when data from a camera is comming
     * @callback */
    function incomingFromCamera(message, flags) {
        try {
            camera.clients.sendToAll(message);
        } catch (e) {
            console.error(e);
        }
    }
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
        tryAddClientToCamera(cameraName);
    }

    function tryAddClientToCamera(camera){
        if(!camera){
            var err = new Error("cannot add client to invalid camera: "+camera);
            callback(err);
            return;
        }

        // new client Callbacks
        clientConn.on('message', incomingFromClient);
        clientConn.on('close', closingClient);
        camera.clients.add(clientConn);
        callback();
        
        /** Called when a client sent data
         * @callback
         * @param {string} message 
         * @param {object} flags 
         */
        function incomingFromClient(message, flags) {
            camera.sendMessage(message);
        }
        /** Called when a connection to a client is closed
         * @callback
         * @param {number} code 
         * @param {string} message 
         */
        function closingClient(code) {
            camera.clients.close(clientConn);
            console.log("Closing client connection for: %s camera. info: %d, %s", camera.name, code);
        }

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
    this.cameras.forEach(function(c) {
        if (c.name == name) {
            cameraFound = c;
        }
    }, this);

    callback(cameraFound);
};


/**@class
*  A camera client, it has a list of clients attached, and a unique name
*  @param {WebSocket} conn - connection object
*  @param {String} name - name of this camera (for identification)
*/
function Camera(conn, name) {
    this.conn = conn;
    this.name = name;
    this.clients = new ClientConnections();
}

Camera.prototype.sendMessage = function (message) {
    var conn = this.conn;
    checkSocketOpen(conn, function(){
        conn.send(message);
    });
};

exports.ClientCamera = Camera;
exports.ClientConnections = ClientConnections;
exports.CameraConnections = CameraConnections;

/**
 * 
 * @param {WebSocket} socket 
 * @param {} callback
 */
function checkSocketOpen(socket, callback){
    if(!socket){
        console.error('socket does not exists');
        return;
    }
    if(socket.readyState == WebSocket.OPEN){
        callback();
    }
}
