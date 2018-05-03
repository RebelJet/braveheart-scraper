#!/bin/bash

trap "echo trapped TERM" SIGTERM
kill $(ps -fe|grep -v 'ps -fe'|awk '$1 ~ /root/{print $2}')
