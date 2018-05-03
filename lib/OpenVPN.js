const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const config = require('./config')

const BADEXIT_AUTH = 1
const BADEXIT_TLS_ERRORS = 2
const BADEXIT_UNEXPECTED_DISCONNECT = 3
const BADEXIT_UNKNOWN_ERROR = 4

class OpenVPN {

  constructor(account, onErrorCb) {
    console.log('OpenVPN.constructor()')
    this.onErrorCb = onErrorCb;
    this.saveCred(account);
    this.saveConf(account);
    this.saveCert(account);
    this.haltnow = false
  }

  saveCred(account) {
    this.credFilename = os.tmpdir() + '/vpn.cred';
    fs.writeFileSync(this.credFilename,`${account.username}\n${account.password}\n`);
    console.log(fs.readFileSync(this.credFilename, 'utf8'))
    fs.chmodSync(this.credFilename, 0o600);
  }

  saveConf(account) {
    this.confFilename = os.tmpdir() + '/vpn.conf'
    fs.writeFileSync(this.confFilename, account.config)
    fs.chmodSync(this.confFilename, 0o600)
  }

  saveCert(account) {
    this.certFilename = os.tmpdir() + '/vpn.cert'
    fs.writeFileSync(this.certFilename, account.cert)
    fs.chmodSync(this.certFilename, 0o600)
  }

  setup() {
    return new Promise((resolve, reject) => {
      console.log('OpenVPN.setup()')

      if (this.openVpnProcess && !this.openVpnProcess.subprocess.killed) {
        console.error('Setup called while openvpn process still alive')
        this.openVpnProcess.kill('SIGTERM')
      }

      this.openVpnProcess = spawn('openvpn',[
        '--config', this.confFilename,
        '--auth-user-pass', this.credFilename,
        '--ca', this.certFilename
      ]);

      const procStartTimeout = setTimeout(() => {
        console.error('Timeout trying to start VPN process')
        this.openVpnProcess.kill('SIGTERM')
      }, config.vpnConnectTimeoutSecs * 1000)

      const processLogline = (loglines, logstream) => {
        logstream.write(loglines)
        if (loglines.includes('Initialization Sequence Completed')) {
          console.log('!!!! CONNECTED to VPN !!!!!')
          clearTimeout(procStartTimeout)
          resolve();
        } else if (loglines.includes('Received control message: AUTH_FAILED')) {
          console.error('auth failure. exiting.')
          this.onErrorCb()
        } else if (loglines.includes('SIGUSR1[soft,tls-error] received, process restarting')) {
          console.error('TLS errors. Restarting')
          this.onErrorCb()
        } else if (loglines.includes('Inactivity timeout')) {
          console.error('TLS errors. Restarting')
          this.onErrorCb()
        }
      }

      this.openVpnProcess.stdout.on('data',(data) => {
        const loglines = data.toString()
        processLogline(loglines, process.stdout)
      })

      this.openVpnProcess.stderr.on('data',(data) => {
        const logline = data.toString()
        processLogline(logline, process.stderr)
      })

      this.openVpnProcess.on('exit',(code,signal) => {
        console.log(`openVpnProcess.on('exit',(${code},${signal})... - haltnow: ${this.haltnow}`)
        switch (code) {
          case 0:
          case BADEXIT_AUTH:
          case BADEXIT_TLS_ERRORS: {
            // retry these with new config
            delete this.openVpnProcess
            if (!this.haltnow) {
              this.setup()
            } else {
              if (this.haltcb) {
                console.log(`OpenVPN - on exit - calling this.haltcb()`)
                this.haltcb()
              }
            }
          }
          break
          default: {
            console.error(`openvpn exited abnormally with exit: ${code}, signal: ${signal}`)
            process.exit(code)
          }
        }
      })

      this.openVpnProcess.on('disconnect',() => {
        console.error('FATAL: openvpn process disconnected!')
        process.exit(BADEXIT_UNEXPECTED_DISCONNECT)
      })

      this.openVpnProcess.on('error',(err) => {
        console.error(`FATAL: openvpn subprocess error: ${err}`)
        process.exit(BADEXIT_UNKNOWN_ERROR)
      })
    })
  }
}

module.exports = OpenVPN
