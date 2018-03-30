const net = require('net');
const axios = require('axios');
const { execSync, spawnSync } = require('child_process')

const { decodeMsgFromDispatcher, encodeMsgToDispatcher } = require('./common/Encoders');
const OpenVPN = require('./OpenVPN');
const config = require('./config');

exports.connect = function connect(onJobCb) {
  new Queue(onJobCb)
}

class Queue {
  constructor(onJobCb) {
    this.onJobCb = onJobCb;
    this.host = config.dispHost;
    this.port = config.dispPort;
    this.via = config.dispVia;
    this.viaDev = config.dispViaDev;
    this.nameserverip = config.nameserverIp;
    this.url = `tcp://${this.host}:${this.port}`;
    this.isConnected = false;
    this.sendQueue = [];
    this.connectSocket();
  }

  async setupVpn(vpnAccount) {
    // const vpnAccount = await fetchVpnAccount();
    const vpn = new OpenVPN(vpnAccount, err => this.abortAll());
    await vpn.setup();
    this.addRoute();
    axios.get('http://ifconfig.co/json').then(response => {
      console.log(`IP ADDRESS = ${JSON.stringify(response.data, null, 2)}`);
    })
  }

  send(msg) {
    return new Promise((resolve, reject) => {
      this.socket.write(msg, 'utf8', resolve)
    })
  }

  connectSocket() {
    console.log(`OPENING CONNECTION TO ${this.url}...`)
    this.isConnected = false;
    const socket = this.socket = new net.Socket();
    socket.connect(this.port, this.host, () => {
      this.isConnected = true;
      console.log(`CONNECTED to ${this.url}`) ;
    });
    socket.on('close', () => {
      this.isConnected = false;
      console.log(`DISCONNECTED from ${this.url}`)
      socket.destroy();
      this.socket = null;
      if (!this.isAborting) {
        console.log('WILL RECONNECT IN 1 second...')
        setTimeout(async () => {
          this.connectSocket();
        }, 1000);
      }
    });

    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (data) => {
      buffer += data;
      let i, l = 0;
      while ((i = buffer.indexOf('\n', l)) !== -1) {
        this.handleSocketResponse(buffer.slice(l, i).toString())
        l = i + 1;
      }
      if (l) buffer = buffer.slice(l);
    });

    socket.on('error', (err) => {
      if (['ECONNREFUSED','EHOSTUNREACH'].includes(err.code)) return;
      console.log('ERROR: ', err);
    })
  }

  async handleSocketResponse(data) {
    const [command, jobId, payload] = decodeMsgFromDispatcher(data);
    const resp = encodeMsgToDispatcher(105, jobId, command);
    await this.send(resp);
    if (command === 'RST') {
      this.abortAll()
    } else if (command === 'INF') {
      const account = JSON.parse(payload);
      console.log(`CONNECTED as ${account.workerId}`);
      this.setupVpn(account);
    } else {
      this.handleIncomingJobs(jobId, payload);
    }
  }

  abortAll() {
    console.error('abortAll() called!');
    this.isAborting = true;
    this.destroyClient();
    spawnSync('/app/vpn/killAndExit.sh');
  }

  destroyClient() {
    if (!this.isConnected) return;
    this.isConnected = false
    this.socket.destroy();
  }

  async handleIncomingJobs(jobId, requestPayload) {
    requestPayload = JSON.parse(requestPayload);
    console.log(`STARTING JOB ${jobId}`)
    const [statusCode, payload] = await this.onJobCb(jobId, requestPayload);
    const resp = encodeMsgToDispatcher(statusCode, jobId, payload);
    console.log(`FINISHED JOB ${jobId}`)
    this.send(resp);
  }

  register() {
    this.addRoute()
    this.connectSocket();
  }

  deregister() {
    this.destroyClient()
    this.delRoute()
  }

  addRoute() {
    if (!this.via) return;
    // Need to add a route to the dispatcher that bypasses VPN
    const routeadd = `/sbin/ip route | grep '${this.host} via ${this.via} dev ${this.viaDev}' || /sbin/ip route add ${this.host} via ${this.via} dev ${this.viaDev}`
    console.log(routeadd)
    const result = execSync(routeadd).toString()
    if (result) console.log(result)
    if (this.nameserverip && this.nameserverip.length > 6) {
      const nsrouteadd = `/sbin/ip route | grep '${this.nameserverip} via ${this.via} dev ${this.viaDev}' || /sbin/ip route add ${this.nameserverip} via ${this.via} dev ${this.viaDev}`
      console.log(nsrouteadd)
      const nsresult = execSync(nsrouteadd).toString()
      if (nsresult) console.log(nsresult)
    }
  }

  delRoute() {
    if (!this.via) return;
    try {
      // Need to remove the route to the dispatcher that bypasses VPN
      const routedel = `/sbin/ip route | grep '${this.host} via ${this.via} dev ${this.viaDev}' && /sbin/ip route del ${this.host} via ${this.via} dev ${this.viaDev}`
      console.log(routedel)
      const result = execSync(routedel)
      console.log(result.toString())
      if (this.nameserverip && this.nameserverip.length > 6) {
        const nsroutedel = `/sbin/ip route | grep '${this.nameserverip} via ${this.via} dev ${this.viaDev}' && /sbin/ip route del ${this.nameserverip} via ${this.via} dev ${this.viaDev}`
        console.log(nsroutedel)
        const nsresult = execSync(routedel)
        console.log(nsresult.toString())
      }
    } catch (e) {
      // we're going to keep going if this fails
      console.error(`caught exception while deleting route: ${e}`)
    }
  }
}
