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

var PORT = 80;
var HOSTNAME = 'localhost';

/*
 * HTTP server
 */

var Http = require('http');
var Fs = require('fs');
var Url = require('url');

var server = Http.createServer(
  function handler(req, res) {
    if (!(req.method in server.method)) {
      server.response[405](req, res);
      return;
    }
    server.method[req.method](req, res);
  });
server.listen(PORT, HOSTNAME);

server.method = new Array();
server.method['GET'] = function(req, res) {
  var url = Url.parse(req.url);
  if (url.pathname == '/') {
    server.response[301](req, res, 'index.html');
    return;
  }
  Fs.readFile(
    __dirname + url.pathname, 'utf8',
    function(err, data) {
      if (err) {
        switch (err.code) {
        case "ENOENT":
          server.response[404](req, res);
          break;
        default:
          server.response[500](req, res);
          break;
        }
        return;
      }
      server.response[200](req, res, data);
    });
}

server.response = new Array();
server.response[200] = function(req, res, data) { // OK
  res.writeHead(200);
  res.end(data);
}
server.response[301] = function(req, res, pathname) { // Moved Permanently
  var newUrl = Url.resolve(req.headers.host, pathname);
  res.writeHead(301, {'Location': newUrl});
  res.end();
}
server.response[404] = function(req, res) { // File Not Found
  res.writeHead(404);
  res.end();
}
server.response[405] = function(req, res) { // Method Not Allowed
  res.writeHead(405);
  res.end();
}
server.response[500] = function(req, res) { // Internal Server Error
  res.writeHead(500);
  res.end();
}

/*
 * WebSocket
 */

var Server = require('socket.io');
var socket = new Server(server);

/*
 * WifiManager
 */

var WifiManager = require('./WifiManager-server.js');
var wifiManager = WifiManager.createWifiManager(socket);

console.log('Listening at ' + HOSTNAME + ':' + PORT + '...');
