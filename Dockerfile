FROM node:latest

MAINTAINER Caleb Clark <caleb@rebeljet.com>

RUN apt-get update -y
RUN apt-get install -y apt-utils curl

################################################################################
# INSTALL OPENVPN

RUN mkdir /dev/net && mknod /dev/net/tun c 100 200
RUN apt-get install -y openvpn
RUN update-rc.d -f openvpn remove

################################################################################
# INSTALL CHROME

RUN apt-get install -y wget --no-install-recommends \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable --no-install-recommends \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get purge --auto-remove -y curl \
  && rm -rf /src/*.deb

################################################################################

RUN npm install -g babel-cli
COPY ./package.json /tmp/package.json
RUN cd /tmp && npm install

RUN mkdir /app
RUN cp -r /tmp/node_modules /app/node_modules

################################################################################

# SETUP CHROME USER

RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
  && mkdir -p /home/pptruser/Downloads \
  && chown -R pptruser:pptruser /home/pptruser \
  && chown -R pptruser:pptruser /app/node_modules

CMD ["google-chrome-stable"]

################################################################################

COPY . /app
RUN chmod a+rx /app/scripts/killAndExit.sh
RUN chmod a+rx /app/runner.sh

################################################################################

WORKDIR /app
