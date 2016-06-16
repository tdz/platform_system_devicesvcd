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

function WifiManager(socket) {

  var wifiManager = this;

  /**
   * Returns whether or not wifi is currently enabled.
   */
  this.enabled = false;

  /**
   * Returns the MAC address of the wifi adapter.
   */
  this.macAddress = null;

  /**
   * An non-null object containing the following information:
   *  - status ("disconnected", "connecting", "associated", "connected")
   *  - network
   *
   *  Note that the object returned is read only. Any changes required must
   *  be done by calling other APIs.
   */
  this.connection = null; // WifiConnection

  /**
   * A connectionInformation object with the same information found in an
   * MozWifiConnectionInfoEvent (but without the network).
   * If we are not currently connected to a network, this will be null.
   */
  this.connectionInformation = null; // WifiConnectionInfo

  /**
   * Capabilities of Wifi.
   */
  this.capabilities = null; // WifiCapabilities

  /**
   * State notification listeners. These all take an
   * MozWifiStatusChangeEvent with the new status and a network (which may be
   * null).
   *
   * The possible statuses are:
   *   - connecting: Fires when we start the process of connecting to a
   *                 network.
   *   - associated: Fires when we have connected to an access point but do
   *                 not yet have an IP address.
   *   - connected: Fires once we are fully connected to an access point and
   *                can access the internet.
   *   - disconnected: Fires when we either fail to connect to an access
   *                   point (transition: associated -> disconnected) or
   *                   when we were connected to a network but have
   *                   disconnected for any reason (transition: connected ->
   *                   disconnected).
   */
  this.onstatuschange = null;

  /**
   * An event listener that is called with information about the signal
   * strength and link speed every 5 seconds.
   */
  this.onconnectioninfoupdate = null;

  /**
   * These two events fire when the wifi system is brought online or taken
   * offline.
   */
  this.onenabled = null;
  this.ondisabled = null;

  /**
   * An event listener that is called with information about the number
   * of wifi stations connected to wifi hotspot every 5 seconds.
   */
  this.onstationinfoupdate = null;

  /*
   * Private fields
   */

  socket.of('/WifiManager').on(
    'connection',
    function(socket) {
      socket.on(
        'command', function(message) {
          var cmd = JSON.parse(message);
          wifiManager.handleCommand(JSON.parse(message),
            function(result) {
              var reply = {
                type: cmd.type,
                result: result
              };
              socket.emit('reply', JSON.stringify(reply));
            },
            function(error) {
              var reply = {
                type: cmd.type,
                error: error
              };
              socket.emit('reply', JSON.stringify(reply));
            });
        });
      socket.on(
        'disconnect', function(event) {
          console.log('client disconnected');
        });
    });
}

/**
 * Turn on/off wifi functionality.
 * @param {Object} enable true for enable, false for disable.
 * @param {} onsuccess Wifi enable/disable successfully, including no status
 *                     change.
 * @param onerror Wifi enable/disable failed or prohibited.
 */
WifiManager.prototype.setWifiEnabled = function(enable, onsuccess, onerror) {
  onerror('Not implemented');
};

/**
 * Returns the list of currently available networks.
 * @param onsuccess We have obtained the current list of networks.
 *                   The parameter 'value' is an object whose property
 *                   names are SSIDs and values are network objects.
 * @param onerror We were unable to obtain a list of property names.
 */
WifiManager.prototype.getNetworks = function(onsuccess, onerror) {
  onerror('Not implemented');
};

/**
 * Returns the list of networks known to the system that will be
 * automatically connected to if they're in range.
 * @param onsuccess The parameter 'value' is an object whose property
 *                   names are SSIDs and values are network objects.
 * @param onerror We were unable to obtain a list of known networks.
 */
WifiManager.prototype.getKnownNetworks = function(onsuccess, onerror) {
  onerror('Not implemented');
};

/**
 * Takes one of the networks returned from getNetworks and tries to
 * connect to it.
 * @param network A network object with information about the network,
 *                such as the SSID, key management desired, etc.
 * @param onsuccess We have started attempting to associate with the network.
 *                  request.value is true.
 * @param onerror We were unable to select the network. This most likely
 *                means a configuration error.
 */
WifiManager.prototype.associate = function(network, onsuccess, onerror) {
  var conf = 'network={\n' +
             '\tssid=\"' + network.bssid + '\"\n' +
             '\tscan_ssid=1\n' +
             '\tproto=RSN WPA\n' +
             '\tkey_mgmt=WPA-PSK\n' +
             '\tpairwise=CCMP TKIP\n' +
             '\tgroup=CCMP TKIP\n' +
             '\tpsk=\"' + network.psk + '\"\n' +
             '}';
  var fs = require('fs');
  fs.writeFile('/data/misc/wifi/wpa_supplicant.conf', conf,
    function(err) {
      if (err) {
        onerror('write error');
        return;
      }
      var child = require('child_process');
      child.exec('/system/bin/stop wpa_supplicant',
        function(err, stdout, stderr) {
          if (err != null) {
            onerror('stop error');
            return;
          }
          var timers = require('timers');
          // Wait 1 second to let wpa_supplicant catch up.
          timers.setTimeout(
            function() {
              child.exec('/system/bin/start wpa_supplicant',
                function(err, stdout, stderr) {
                  if (err != null) {
                    onerror('start error');
                    return;
                  }
                  // Wait 1 second to let wpa_supplicant catch up.
                  timers.setTimeout(
                    function() {
                      child.exec('/system/bin/dhcpcd -p wlan0',
                        function(err, stdout, stderr) {
                          if (err != null) {
                            onerror('DHCP error');
                            return;
                          }
                          onsuccess(true);
                        });
                    }, 1000);
                });
            }, 1000);
        });
    });
};

/**
 * Given a network, removes it from the list of networks that we'll
 * automatically connect to. In order to re-connect to the network, it is
 * necessary to call associate on it.
 * @param network A network object with the SSID of the network to remove.
 * @param onsuccess We have removed this network. If we were previously
 *            connected to it, we have started reconnecting to the next
 *            network in the list.
 * @param onerror We were unable to remove the network.
 */
WifiManager.prototype.forget = function(network, onsuccess, onerror) {
  onerror('Not implemented');
};

/**
 * Wi-Fi Protected Setup functionality.
 * @param detail WPS detail which has 'method' and 'pin' field.
 *               The possible method field values are:
 *                 - pbc: The Push Button Configuration.
 *                 - pin: The PIN configuration.
 *                 - cancel: Request to cancel WPS in progress.
 *               If method field is 'pin', 'pin' field can exist and has
 *               a PIN number.
 *               If method field is 'pin', 'bssid' field can exist and has
 *               a opposite BSSID.
 * @param onsuccess We have successfully started/canceled wps.
 * @param onerror We have failed to start/cancel wps.
 */
WifiManager.prototype.wps = function(detail, onsuccess, onerror) {
  onerror('Not implemented');
};

/**
 * Turn on/off wifi power saving mode.
 * @param enable true or false.
 * @param onsuccess We have successfully turn on/off wifi power saving mode.
 * @param onerror We have failed to turn on/off wifi power saving mode.
 */
WifiManager.prototype.setPowerSavingMode = function(enable, onsuccess,
                                                    onerror) {
  onerror('Not implemented');
};

/**
 * Given a network, configure using static IP instead of running DHCP
 * @param network A network object with the SSID of the network to set
 *                static ip.
 * @param info info should have following field:
 *        - enabled True to enable static IP, false to use DHCP
 *        - ipaddr configured static IP address
 *        - proxy configured proxy server address
 *        - maskLength configured mask length
 *        - gateway configured gateway address
 *        - dns1 configured first DNS server address
 *        - dns2 configured seconf DNS server address
 * @param onsuccess We have successfully configure the static ip mode.
 * @param onerror We have failed to configure the static ip mode.
 */
WifiManager.prototype.setStaticIpMode = function(network, info, onsuccess,
                                                 onerror) {
  onerror('Not implemented');
};

/**
 * Given a network, configure http proxy when using wifi.
 * @param network A network object with the SSID of the network to set
 *                http proxy.
 * @param info info should have following field:
 *        - httpProxyHost ip address of http proxy.
 *        - httpProxyPort port of http proxy, set 0 to use default port 8080.
 *        set info to null to clear http proxy.
 * @param onsuccess We have successfully configure http proxy.
 * @param onerror We have failed to configure http proxy.
 */
WifiManager.prototype.setHttpProxy = function(network, info, onsuccess,
                                              onerror) {
  onerror('Not implemented');
};

/**
 * Import a certificate file, only support CA certificate now.
 * @param certBlob A Blob object containing raw data of certificate to be
 *                 imported.
 *                 Supported format: binary/base64 encoded DER certificates.
 *                                   (.der/.crt/.cer/.pem)
 *                 Cause error if importing certificates already imported.
 * @param certPassword Password of certificate.
 * @param certNickname User assigned nickname for imported certificate.
 *                     Nickname must be unique, it causes error on redundant
 *                     nickname.
 * @param onsuccess We have successfully imported certificate. The result
 *                  is an object, containing information of imported CA:
 *                  {
 *                    nickname:  Nickname of imported CA, String.
 *                    usage:     Supported usage of imported CA, Array of
 *                               String, includes: "ServerCert".
 *                  }
 * @param onerror We have failed to import certificate.
 */
WifiManager.prototype.importCert = function(certBlob, certPassword,
                                            certNickname, onsuccess,
                                            onerror) {
  onerror('Not implemented');
};

/**
 * Get list of imported WIFI certificates.
 * @param onsuccess We have successfully gotten imported certificate list.
 *            request.result is an object using nickname as key, array of usage
 *            string as value.
 *            request.result[USAGE] = [CA_NICKNAME1, CA_NICKNAME2, ...]
 *            USAGE string includes: "ServerCert".
 * @param onerror We have failed to list certificate.
 */
WifiManager.prototype.getImportedCerts = function(onsuccess, onerror) {
  onerror('Not implemented');
};

/**
 * Delete an imported certificate.
 * @param certNickname Nickname of imported to be deleted.
 * @param onsuccess We have successfully deleted certificate.
 * @param onerror We have failed to delete certificate.
 */
WifiManager.prototype.deleteCert = function(certNickname, onsuccess,
                                            onerror) {
  onerror('Not implemented');
};

WifiManager.prototype.handleCommand = function(command, onsuccess, onerror) {
  switch (command.type) {
    case 'setWifiEnabled':
      this.setWifiEnabled(command.enable, onsuccess, onerror);
      break;
    case 'getNetworks':
      this.getNetworks(onsuccess, onerror);
      break;
    case 'getKnownNetworks':
      this.getKnownNetworks(onsuccess, onerror);
      break;
    case 'associate':
      this.associate(command.network, onsuccess, onerror);
      break;
    case 'forget':
      this.forget(command.network, onsuccess, onerror);
      break;
    case 'wps':
      this.wps(command.detail, onsuccess, onerror);
      break;
    case 'setPowerSavingMode':
      this.setPowerSavingMode(command.enable, onsuccess, onerror);
      break;
    case 'setStaticIpMode':
      this.setStaticIpMode(command.network, command.info, onsuccess, onerror);
      break;
    case 'setHttpProxy':
      this.setHttpProxy(command.network, command.info, onsuccess, onerror);
      break;
    case 'importCert':
      this.importCert(command.certBlob, command.certPassword,
                      command.certNickname, onsuccess, onerror);
      break;
    case 'getImportedCerts':
      this.getImportedCerts(onsuccess, onerror);
      break;
    case 'deleteCert':
      this.deleteCert(command.certNickname, onsuccess, onerror);
      break;
    default:
      console.log('Invalid command type \'' + command.type + '\'');
      break;
  }
};

//
// Module interfaces
//

module.exports = {
  createWifiManager: function(socket) {
    return new WifiManager(socket);
  }
};
