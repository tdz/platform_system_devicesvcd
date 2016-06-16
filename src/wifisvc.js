/* Copyright 2012 Mozilla Foundation and Mozilla contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * WifiManager
 */

var wifiManager = new WifiManager();

/*
 * HTTP server
 */

var http = require('http');
var fs = require('fs');

var server = http.createServer(
  function handler(req, res) {
    fs.readFile(
      __dirname + '/index.html', 'r',
      function(err, data) {
        if (err) {
          res.writeHead(500);
          return res.end('Error loading index.html');
        }
        res.writeHead(200);
        res.end(data);
      });
  });
server.listen('80');

/*
 * WebSocket
 */

var io = require('socket.io')(server);
io.on(
  'connection',
  function(socket) {
    socket.on(
      'message', function(message) {
        var cmd = JSON.parse(message);
        wifiManager.handleCommand(JSON.parse(message),
          function(result) {
            var reply {
              type: cmd.type,
              result: result
            };
            socket.send(JSON.stringify(reply));
          },
          function(error) {
            var reply {
              type: cmd.type,
              error: error
            };
            socket.send(JSON.stringify(reply));
          });
        console.log('received event', data);
      });
    socket.on(
      'disconnect', function(event) {
        console.log('client disconnected');
      });
  });

console.log('Hello world');
