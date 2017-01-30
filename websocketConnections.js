
/** class ClientConnections*/
function ClientConnections() {
    this.clients = []
}

ClientConnections.prototype.add = function (conn) {
    this.clients.push(conn)
    // console.log("client connections:%d", this.clients.length)
}

ClientConnections.prototype.close = function (conn) {
    var indx = this.clients.indexOf(conn)
    this.clients.splice(indx, 1)
}

ClientConnections.prototype.incomingCallback = function (cameraConn) {
    return function incoming(message, flags) {
        // console.log("Incoming from a client to camera"  )
        if(cameraConn != null){
             try {
            cameraConn.send(message)
        } catch (e) {
            console.error(e)
        }
        } 
    }
}

ClientConnections.prototype.sendToAll = function (message) {
    this.clients.forEach(function (client, ind, arr) {
        client.send(message);
        // console.log("sent to " + ind)
    });
}

exports.ClientConnections = ClientConnections