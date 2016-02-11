var express = require('express');
var http = require('http');
var net = require('net');
var child = require('child_process');

var app = express();
var httpServer = http.createServer(app);

/**
 * Use public/ as static folder
 */
app.use(express.static('public'));

app.get('/gstreamer', function(req, res) {
  var date = new Date();

  res.writeHead(200, {
    'Date':date.toUTCString(),
    'Connection':'close',
    'Cache-Control':'private',
    'Content-Type':'video/webm',
    'Server':'CustomStreamer/0.0.1',
  });

  var tcpServer = net.createServer(function (socket) {
    socket.on('data', function (data) {
      res.write(data);
    });
    socket.on('close', function(had_error) {
      res.end();
    });
  });

  tcpServer.maxConnections = 1;

  tcpServer.listen(function() {
    var cmd = 'gst-launch-1.0';
    var options = {};
    var args =
      ['videotestsrc', 'horizontal-speed=1', 'is-live=1',
    '!', 'video/x-raw,width=320,height=240,framerate=60/1',
    '!', 'videoconvert',
    '!', 'vp8enc',
    '!', 'webmmux', 'streamable=true',
    '!', 'tcpclientsink', 'host=0.0.0.0',
    'port='+tcpServer.address().port];

    var gstMuxer = child.spawn(cmd, args, options);

    gstMuxer.stderr.on('data', function(data) {
	console.log(data.toString());
    });
    gstMuxer.on('exit', function(code) {
      if (code != null) {
        console.error('GStreamer error, exit code ' + code);
      }
    });

    res.connection.on('close', function() {
      gstMuxer.kill();
    });
  });
});

httpServer.listen(9001);

process.on('uncaughtException', function(err) {
  console.log(err);
});
