const http = require('http');
const url = require('url');


/**@constructor 
 * @param {number} port
 * @param {CameraConnections} **/
function HttpServer(port, ip, cameraConnections, callback) {
    var self = this;
    this.server = http.createServer(function (req, res) {
        if (req.method != 'GET') {
            restricted(res);
        }
        var rurl = url.parse(req.url);
        switch (rurl.pathname) {
            case "/cams":
                var json = { names: cameraConnections.getNames(), count: cameraConnections.count() };
                res.end(JSON.stringify(json));
                break;
            default:
                restricted(res);
        }
    }).on('clientError', function (err, socket) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }).listen(port, ip, function () {
        callback(self.server);
    });
}

function restricted(response) {
    response.statusCode = 400;
    response.end();
}

module.exports = HttpServer;