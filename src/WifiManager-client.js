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

function ProtocolError(message) {
  this.message = message;
  this.name = 'ProtocolError';
  this.toString = function() {
    return this.name + ': ' + this.message;
  }
}

function WifiManager(io) {

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

  this.commandQueue = new Array();

  this.socket = io.connect('/WifiManager');
  this.socket.on(
    'reply', function(message) {
      if (wifiManager.commandQueue.length == 0) {
        throw new ProtocolError('Empty command queue');
      }
      var reply = JSON.parse(message);
      var cmd = wifiManager.commandQueue.shift();
      if (cmd.message.type != reply.type) {
        throw new ProtocolError('Invalid reply type (expected ' +
                                cmd.message.type +
                                ', got ' +
                                reply.type + ')');
      }
      wifiManager.handleReply(reply, cmd.onsuccess, cmd.onerror);
    });
  this.socket.on(
    'notification', function(message) {
      this.handleNotification(JSON.parse(message));
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
  var msg = {
    type: 'setWifiEnabled',
    enable: enable
  };
  this.send(msg, onsuccess, onerror);
};

/**
 * Returns the list of currently available networks.
 * @param onsuccess We have obtained the current list of networks.
 *                   The parameter 'value' is an object whose property
 *                   names are SSIDs and values are network objects.
 * @param onerror We were unable to obtain a list of property names.
 */
WifiManager.prototype.getNetworks = function(onsuccess, onerror) {
  var msg = {
    type: 'getNetworks'
  };
  this.send(msg, onsuccess, onerror);
};

/**
 * Returns the list of networks known to the system that will be
 * automatically connected to if they're in range.
 * @param onsuccess The parameter 'value' is an object whose property
 *                   names are SSIDs and values are network objects.
 * @param onerror We were unable to obtain a list of known networks.
 */
WifiManager.prototype.getKnownNetworks = function(onsuccess, onerror) {
  var msg = {
    type: 'getKnownNetworks'
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'associate',
    network: network
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'forget',
    network: network
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'wps',
    detail: detail
  };
  this.send(msg, onsuccess, onerror);
};

/**
 * Turn on/off wifi power saving mode.
 * @param enable true or false.
 * @param onsuccess We have successfully turn on/off wifi power saving mode.
 * @param onerror We have failed to turn on/off wifi power saving mode.
 */
WifiManager.prototype.setPowerSavingMode = function(enable, onsuccess,
                                                    onerror) {
  var msg = {
    type: 'setPowerSavingMode',
    enable: enable
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'setStaticIpMode',
    network: network,
    info: info
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'setHttpProxy',
    network: network,
    info: info
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'importCert',
    certBlob: certBlob,
    certPassword: certPassword,
    certNickname: certNickname
  };
  this.send(msg, onsuccess, onerror);
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
  var msg = {
    type: 'getImportedCerts'
  };
  this.send(msg, onsuccess, onerror);
};

/**
 * Delete an imported certificate.
 * @param certNickname Nickname of imported to be deleted.
 * @param onsuccess We have successfully deleted certificate.
 * @param onerror We have failed to delete certificate.
 */
WifiManager.prototype.deleteCert = function(certNickname, onsuccess,
                                            onerror) {
  var msg = {
    type: 'deleteCert'
  };
  this.send(msg, onsuccess, onerror);
};

WifiManager.prototype.send = function(message, onsuccess, onerror) {
  this.socket.emit('command', JSON.stringify(message));
  var cmd = {
    message: message,
    onsuccess: onsuccess,
    onerror: onerror
  };
  this.commandQueue.push(cmd);
};

WifiManager.prototype.handleReply = function(reply, onsuccess, onerror) {
  if ('error' in reply) {
    if (onerror) {
      onerror(reply.error);
    }
    return;
  }

  // success

  if (!onsuccess) {
    return;
  }

  if (reply.type == 'setWifiEnabled') {
    onsuccess();
  } else if (reply.type == 'getNetworks') {
    onsuccess();
  } else if (reply.type == 'getKnownNetworks') {
    onsuccess();
  } else if (reply.type == 'associate') {
    onsuccess();
  } else if (reply.type == 'forget') {
    onsuccess();
  } else if (reply.type == 'wps') {
    onsuccess();
  } else if (reply.type == 'setPowerSavingMode') {
    onsuccess();
  } else if (reply.type == 'setStaticIpMode') {
    onsuccess();
  } else if (reply.type == 'setHttpProxy') {
    onsuccess();
  } else if (reply.type == 'importCert') {
    onsuccess();
  } else if (reply.type == 'getImportedCerts') {
    onsuccess();
  } else if (reply.type == 'deleteCert') {
    onsuccess();
  } else {
    console.log('Invalid reply type \'' + reply.type + '\'');
  }
};

WifiManager.prototype.handleNotification = function(notification) {
  // TODO
};
