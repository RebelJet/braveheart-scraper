const commandLineArgs = require('command-line-args')

const options = commandLineArgs([
  { name: 'vpnconnecttimeoutsecs', type: Number, defaultValue: 60},
  { name: 'disphost', type: String },
  { name: 'dispport', type: Number, defaultValue: 5560},
  { name: 'dispvia', type: String },
  { name: 'dispviadev', type: String },
  { name: 'nameserverip', type: String },
]);

module.exports = {
  vpnConnectTimeoutSecs: options.vpnconnecttimeoutsecs,
  dispHost: options.disphost,
  dispPort: options.dispport,
  dispVia: options.dispvia,
  dispViaDev: options.dispviadev,
  nameserverIp: options.nameserverip,
}
