#!/usr/bin/env bash

disphost=${1}
dispport=${2}
dispvia=${3}
dispviadev=${4}
nameserverip=${5}

set -e

# Start Xvfb
# Xvfb -ac -screen scrn 1280x2000x24 :99.0 &
# export DISPLAY=:99.0

exec >&2  # send everything to stderr and avoid buffering

echo "LAUNCHING WORKER"
while true
do
  echo starting...
  echo "args: $*"
  echo "environment -"
  env

  echo "babel-node worker.js --disphost=${disphost} --dispport=${dispport} --dispvia=${dispvia} --dispviadev=${dispviadev} --nameserverip=${nameserverip}"
  babel-node worker.js --disphost=${disphost} --dispport=${dispport} --dispvia=${dispvia} --dispviadev=${dispviadev} --nameserverip=${nameserverip}

  echo "exited with: $?"
done
