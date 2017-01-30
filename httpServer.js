const http = require('http');
const url = require('url')


/**@constructor 
 * @param {number} port
 * @param {CameraConnections} **/
function HttpServer(port, cameraConnections) {
    this.server = http.createServer((req, res) => {
        if(req.method != 'GET'){
            restricted(res)
        }
        var rurl = url.parse(req.url)
        switch (rurl.pathname) {
            case "/ncams":
                res.end(cameraConnections.nConnections())
            default:
                restricted(res)
        }
    }).on('clientError', (err, socket) => {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }).listen(port)
}

function restricted(response){
    response.statusCode = 400
    response.end()
}
module.exports = HttpServer