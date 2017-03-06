/**
 * There are 2 classes here ClientConnections and CameraConnections
 * which are ment to hold the connections for either clients and cameras
 */
/**@constructor */
function ClientConnections() {
    this.clients = []
}

ClientConnections.prototype.add = function(conn) {
    this.clients.push(conn)
        // console.log("client connections:%d", this.clients.length)
}

ClientConnections.prototype.close = function(conn) {
    var indx = this.clients.indexOf(conn)
    this.clients.splice(indx, 1)
}

ClientConnections.prototype.incomingCallback = function(cameraConn) {
    return function incoming(message, flags) {
        // console.log("Incoming from a client to camera"  )
        if (cameraConn != null) {
            try {
                cameraConn.send(message)
            } catch (e) {
                console.error(e)
            }
        }
    }
}

ClientConnections.prototype.sendToAll = function(message) {
    this.clients.forEach(function(client, ind, arr) {
        client.send(message);
        // console.log("sent to " + ind)
    });
}
/**@constructor */
function CameraConnections() {
    this.cameras = []
}

CameraConnections.prototype.nConnections = function(){
    return ""+this.cameras.length
}

CameraConnections.prototype.add = function(conn) {
    this.cameras.push(conn)
}

CameraConnections.prototype.close = function(conn){
    var indx = this.cameras.indexOf(conn)
    this.cameras.splice(indx, 1)
}

CameraConnections.prototype.getCamera = function(index) {
    try {
        return this.cameras[index]
    } catch (e) {
        log.error("no such camera")
        return false
    }
}

exports.ClientConnections = ClientConnections
exports.CameraConnections = CameraConnections