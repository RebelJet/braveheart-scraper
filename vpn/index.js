'use strict'

const OpenVPN = require('./lib/OpenVPN')
const Worker = require('./lib/Worker')

module.exports = class VPN {

  constructor(options) {
    console.log(`using configs dir: ${options.vpnConfigsDir}`)
    const { dispHost, dispPort, dispVia, dispViaDev, nameserverIp } = options;
    const { vpnConfigsDir, vpnUser, vpnPass, vpnConnectTimeoutSecs } = options;

    this.worker = new Worker(dispHost, dispPort, dispVia, dispViaDev, nameserverIp);
    this.openVpn = new OpenVPN(vpnConfigsDir, vpnUser, vpnPass, vpnConnectTimeoutSecs, this.worker);
    this.onJob = this.worker.onJob.bind(this.worker);
  }

  start() {
    this.openVpn.startup()
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////

process.on('unhandledRejection', err => {
  console.log('Caught unhandledRejection:', err);
});
