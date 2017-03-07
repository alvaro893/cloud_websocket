/*
 * There are 2 classes here ClientConnections and CameraConnections
 * which are meant to hold the connections for either clients and cameras
 */


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
    var indx = this.clients.indexOf(conn);
    this.clients.splice(indx, 1);
};

/**send message to all websockets in the array
 * @method
 * @param {string} message 
 */
ClientConnections.prototype.sendToAll = function (message) {
    this.clients.forEach(function (client, ind, arr) {
        client.send(message);
    });
};

ClientConnections.prototype.closeAll = function (message) {
    this.clients.forEach(function (client, ind, arr) {
        client.close();
    });
};


/**A class that holds CameraClient objects
 * @class
 */
function CameraConnections() {
    // this an array of clientcameras, no ws connections
    this.cameras = [];
}

CameraConnections.prototype.add = function (conn, name) {
    var cname = name;
    if (name === undefined) {
        cname = "camera" + this.cameras.length;
    }

    // defining the callbacks for this camera
    conn.on('message', incomingFromCamera);
    conn.on('close', closingCamera);

    var camera = new Camera(conn, cname);
    this.cameras.push(camera);

    function closingCamera(code, message) {
        camera.conn.close();
        camera.clients.closeAll();
        this.prototype.removeCameraClient(camera);
        console.log("Camera %s closing connection: %d, %s", camera.name, code, message);
    }

    function incomingFromCamera(message, flags) {
        try {
            camera.clients.sendToAll(message);
        } catch (e) {
            console.error(e);
        }
    }
    return camera;
};

CameraConnections.prototype.addClientToCamera = function (cameraName, clientConn) {
    var camera;
    if(typeof cameraName == 'string'){
        camera = this.getCamera(cameraName);
    }else{
        camera = cameraName;
    }
    // new client Callbacks
    clientConn.on('message', incomingFromClient);
    clientConn.on('close', closingClient);

    function incomingFromClient(message, flags) {
        camera.sendMessage(message);
    }

    function closingClient(code, message) {
        console.log("Client closing connection for: %s camera. info: %d, %s", camera.name, code, message);
    }

    camera.clients.add(clientConn);
};

CameraConnections.prototype.removeCamera = function(cameraClient){
    var indx = this.cameras.indexOf(cameraClient);
    this.cameras.splice(indx, 1);
};

CameraConnections.prototype.close = function(camera){
    // this will trigger closingCamera callback
    this.removeCamera(camera);
};

CameraConnections.prototype.getCamera = function (name) {
    for (var i = 0; i < this.cameras.length; i++) {
        var camera = this.cameras[i];
        if (camera.name == name) {
            return camera;
        }
    }
    console.error("no such camera");
    return false;
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
    this.conn.send(message);
};

exports.ClientCamera = Camera;
exports.ClientConnections = ClientConnections;
exports.CameraConnections = CameraConnections;