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

function WifiNetwork() {

  // Read-only attributes
  //

  this.ssid = null; // String
  this.mode = 0; // long
  this.frequency = 0; // long
  this.security = null; // Array of String
  this.capabilities = null; // Array of String
  this.known = false; // boolean
  this.connected = false; // boolean
  this.hidden = false; // boolean

  // User variables
  //

  this.bssid = null; // String
  this.signalStrength = null; // String
  this.relSignalStrength = 0; // long
  this.psk = null; // String
  this.wep = null; // String
  this.wep_key0 = null; // String
  this.wep_key1 = null; // String
  this.wep_key2 = null; // String
  this.wep_key3 = null; // String
  this.wep_tx_keyidx = 0; // long
  this.priority = 0; // long
  this.scan_ssid = 0; // long
  this.keyManagement; // String
  this.identity; // String
  this.phase1; // String
  this.phase2; // String
  this.eap; // String
  this.pin; // String
  this.dontConnect; // boolean
  this.serverCertificate; // String
  this.subjectMatch; // String
  this.userCertificate; // String
}

function WifiWPSInfo() {
  this.method = null; // String
  this.pin = null; // String
  this.bssid = null; // String
}

function IPConfiguration() {
  this.enabled; // boolean
  this.ipaddr; // String
  this.proxy; // String
  this.maskLength; // short
  this.gateway; // String
  this.dns1; // String
  this.dns2; // String
}

function WifiConnection() {
  this.status = null; // String
  this.network = null; // WifiNetwork;
}

function WifiConnectionInfo() {
  this.signalStrength = 0; // short
  this.relSignalStrength = 0; // short
  this.linkSpeed = null; // long
  this.ipAddress = null; // String
}
