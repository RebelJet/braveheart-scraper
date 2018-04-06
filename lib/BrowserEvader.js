// initial evasions from @sangaline
//   https://intoli.com/blog/not-possible-to-block-chrome-headless/
//   https://intoli.com/blog/not-possible-to-block-chrome-headless/test-headless-final.js

module.exports = async function(browser, page) {
  const userAgent = await browser.userAgent();
  await page.setUserAgent(userAgent.replace('Headless', ''));

  // clear cookies
  await page._client.send('Network.clearBrowserCookies');

  await page.evaluateOnNewDocument(insertWebdriver);
  await page.evaluateOnNewDocument(insertChromeObj);
  await page.evaluateOnNewDocument(insertLanguages);
  await page.evaluateOnNewDocument(insertMimeTypes);
  await page.evaluateOnNewDocument(insertPlugins);
};

////////////////////////////////////////////////////////////////////////////////////////////////////

function insertLanguages() {
  Object.defineProperty(navigator, 'languages', {
    get: function() {
      return ['en-US', 'en'];
    },
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function insertWebdriver() {
  Object.defineProperty(navigator, 'webdriver', {
    configurable: true,
    get: () => undefined,
  });
  delete navigator.webdriver;
  delete Navigator.prototype.webdriver;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function insertChromeObj() {
  // REGEXP: "function[^\(]*\(([^\)]*)\) \{[^"]*\}"
  // REPLACE: function($1) { }

  const chrome = {
    app: {
      getDetails: function GetDetails() { },
      getIsInstalled: function GetIsInstalled() { },
      installState: function getInstallState(callback) { },
      isInstalled: false,
      runningState: function GetRunningState() { }
    },
    csi: function() { },
    loadTimes: function() { },
    webstore: {
      install: function(url, onSuccess, onFailure) { },
      onDownloadProgress: {
        addListener: function() { },
        addRules: function() { },
        constructor: function() { },
        dispatch: function() { },
        dispatchToListener: function() { },
        getRules: function() { },
        hasListener: function() { },
        hasListeners: function() { },
        removeListener: function() { },
        removeRules: function() { }
      },
      onInstallStageChanged: {
        addListener: function() { },
        addRules: function() { },
        constructor: function() { },
        dispatch: function() { },
        dispatchToListener: function() { },
        getRules: function() { },
        hasListener: function() { },
        hasListeners: function() { },
        removeListener: function() { },
        removeRules: function() { }
      }
    }
  };

  Object.defineProperty(window, 'chrome', {
    value: chrome
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function insertMimeTypes() {
  const mimeTypes = {
    0: {
      description: "",
      enabledPlugin: {
        0: {
          description: "",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.0.enabledPlugin",
          suffixes: "pdf",
          type: "application/pdf"
        },
        'application/pdf': {
          description: "",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.0.enabledPlugin",
          suffixes: "pdf",
          type: "application/pdf"
        },
        description: "",
        filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
        item: function() { },
        length: "1",
        name: "Chromium PDF Viewer",
        namedItem: function() { }
      },
      suffixes: "pdf",
      type: "application/pdf"
    },
    1: {
      description: "Portable Document Format",
      enabledPlugin: {
        0: {
          description: "Portable Document Format",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.1.enabledPlugin",
          suffixes: "pdf",
          type: "application/x-google-chrome-pdf"
        },
        'application/x-google-chrome-pdf': {
          description: "Portable Document Format",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.1.enabledPlugin",
          suffixes: "pdf",
          type: "application/x-google-chrome-pdf"
        },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        item: function() { },
        length: "1",
        name: "Chromium PDF Plugin",
        namedItem: function() { }
      },
      suffixes: "pdf",
      type: "application/x-google-chrome-pdf"
    },
    2: {
      description: "Native Client Executable",
      enabledPlugin: {
        0: {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.2.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        1: {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.2.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        'application/x-nacl': {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.2.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        'application/x-pnacl': {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.2.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        description: "",
        filename: "internal-nacl-plugin",
        item: function() { },
        length: "2",
        name: "Native Client",
        namedItem: function() { }
      },
      suffixes: "",
      type: "application/x-nacl"
    },
    3: {
      description: "Portable Native Client Executable",
      enabledPlugin: {
        0: {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.3.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        1: {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.3.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        'application/x-nacl': {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.3.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        'application/x-pnacl': {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.3.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        description: "",
        filename: "internal-nacl-plugin",
        item: function() { },
        length: "2",
        name: "Native Client",
        namedItem: function() { }
      },
      suffixes: "",
      type: "application/x-pnacl"
    },
    'application/pdf': {
      description: "",
      enabledPlugin: {
        0: {
          description: "",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/pdf.enabledPlugin",
          suffixes: "pdf",
          type: "application/pdf"
        },
        'application/pdf': {
          description: "",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/pdf.enabledPlugin",
          suffixes: "pdf",
          type: "application/pdf"
        },
        description: "",
        filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
        item: function() { },
        length: "1",
        name: "Chromium PDF Viewer",
        namedItem: function() { }
      },
      suffixes: "pdf",
      type: "application/pdf"
    },
    'application/x-google-chrome-pdf': {
      description: "Portable Document Format",
      enabledPlugin: {
        0: {
          description: "Portable Document Format",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-google-chrome-pdf.enabledPlugin",
          suffixes: "pdf",
          type: "application/x-google-chrome-pdf"
        },
        'application/x-google-chrome-pdf': {
          description: "Portable Document Format",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-google-chrome-pdf.enabledPlugin",
          suffixes: "pdf",
          type: "application/x-google-chrome-pdf"
        },
        description: "Portable Document Format",
        filename: "internal-pdf-viewer",
        item: function() { },
        length: "1",
        name: "Chromium PDF Plugin",
        namedItem: function() { }
      },
      suffixes: "pdf",
      type: "application/x-google-chrome-pdf"
    },
    'application/x-nacl': {
      description: "Native Client Executable",
      enabledPlugin: {
        0: {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-nacl.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        1: {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-nacl.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        'application/x-nacl': {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-nacl.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        'application/x-pnacl': {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-nacl.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        description: "",
        filename: "internal-nacl-plugin",
        item: function() { },
        length: "2",
        name: "Native Client",
        namedItem: function() { }
      },
      suffixes: "",
      type: "application/x-nacl"
    },
    'application/x-pnacl': {
      description: "Portable Native Client Executable",
      enabledPlugin: {
        0: {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-pnacl.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        1: {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-pnacl.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        'application/x-nacl': {
          description: "Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-pnacl.enabledPlugin",
          suffixes: "",
          type: "application/x-nacl"
        },
        'application/x-pnacl': {
          description: "Portable Native Client Executable",
          enabledPlugin: "CIRCULAR VALUE TO: window.clientInformation.mimeTypes.application/x-pnacl.enabledPlugin",
          suffixes: "",
          type: "application/x-pnacl"
        },
        description: "",
        filename: "internal-nacl-plugin",
        item: function() { },
        length: "2",
        name: "Native Client",
        namedItem: function() { }
      },
      suffixes: "",
      type: "application/x-pnacl"
    },
    item: function() { },
    length: "4",
    namedItem: function() { }
  }

  for (let mimeKey in mimeTypes) {
    const mimeType = mimeTypes[mimeKey];
    if (!mimeType.enabledPlugin) continue;
    for (let pluginKey in mimeType.enabledPlugin) {
      mimeType.enabledPlugin[pluginKey].enabledPlugin = mimeType.enabledPlugin;
    }
  }

  Object.defineProperty(navigator, 'mimeTypes', {
    value: mimeTypes
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function insertPlugins() {
  const plugins = {
    "0": {
      "0": {
        "description": "Portable Document Format",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.0",
        "suffixes": "pdf",
        "type": "application/x-google-chrome-pdf"
      },
      "application/x-google-chrome-pdf": {
        "description": "Portable Document Format",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.0",
        "suffixes": "pdf",
        "type": "application/x-google-chrome-pdf"
      },
      "description": "Portable Document Format",
      "filename": "internal-pdf-viewer",
      "item": "function() { }",
      "length": "1",
      "name": "Chromium PDF Plugin",
      "namedItem": "function() { }"
    },
    "1": {
      "0": {
        "description": "",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.1",
        "suffixes": "pdf",
        "type": "application/pdf"
      },
      "application/pdf": {
        "description": "",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.1",
        "suffixes": "pdf",
        "type": "application/pdf"
      },
      "description": "",
      "filename": "mhjfbmdgcfjbbpaeojofohoefgiehjai",
      "item": "function() { }",
      "length": "1",
      "name": "Chromium PDF Viewer",
      "namedItem": "function() { }"
    },
    "2": {
      "0": {
        "description": "Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.2",
        "suffixes": "",
        "type": "application/x-nacl"
      },
      "1": {
        "description": "Portable Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.2",
        "suffixes": "",
        "type": "application/x-pnacl"
      },
      "application/x-nacl": {
        "description": "Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.2",
        "suffixes": "",
        "type": "application/x-nacl"
      },
      "application/x-pnacl": {
        "description": "Portable Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.2",
        "suffixes": "",
        "type": "application/x-pnacl"
      },
      "description": "",
      "filename": "internal-nacl-plugin",
      "item": "function() { }",
      "length": "2",
      "name": "Native Client",
      "namedItem": "function() { }"
    },
    "Chromium PDF Plugin": {
      "0": {
        "description": "Portable Document Format",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Chromium PDF Plugin",
        "suffixes": "pdf",
        "type": "application/x-google-chrome-pdf"
      },
      "application/x-google-chrome-pdf": {
        "description": "Portable Document Format",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Chromium PDF Plugin",
        "suffixes": "pdf",
        "type": "application/x-google-chrome-pdf"
      },
      "description": "Portable Document Format",
      "filename": "internal-pdf-viewer",
      "item": "function() { }",
      "length": "1",
      "name": "Chromium PDF Plugin",
      "namedItem": "function() { }"
    },
    "Chromium PDF Viewer": {
      "0": {
        "description": "",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Chromium PDF Viewer",
        "suffixes": "pdf",
        "type": "application/pdf"
      },
      "application/pdf": {
        "description": "",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Chromium PDF Viewer",
        "suffixes": "pdf",
        "type": "application/pdf"
      },
      "description": "",
      "filename": "mhjfbmdgcfjbbpaeojofohoefgiehjai",
      "item": "function() { }",
      "length": "1",
      "name": "Chromium PDF Viewer",
      "namedItem": "function() { }"
    },
    "Native Client": {
      "0": {
        "description": "Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Native Client",
        "suffixes": "",
        "type": "application/x-nacl"
      },
      "1": {
        "description": "Portable Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Native Client",
        "suffixes": "",
        "type": "application/x-pnacl"
      },
      "application/x-nacl": {
        "description": "Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Native Client",
        "suffixes": "",
        "type": "application/x-nacl"
      },
      "application/x-pnacl": {
        "description": "Portable Native Client Executable",
        "enabledPlugin": "CIRCULAR VALUE TO: window.clientInformation.plugins.Native Client",
        "suffixes": "",
        "type": "application/x-pnacl"
      },
      "description": "",
      "filename": "internal-nacl-plugin",
      "item": "function() { }",
      "length": "2",
      "name": "Native Client",
      "namedItem": "function() { }"
    },
    "item": "function() { }",
    "length": "3",
    "namedItem": "function() { }",
    "refresh": "function() { }"
  }

  for (let pluginKey in plugins) {
    const plugin = plugins[pluginKey];
    if (!plugin.filename) continue;
    for (let mimeKey in plugin) {
      const mimeType = plugin[mimeKey];
      if (!mimeType.description) continue;
      mimeType.enabledPlugin = plugin;
    }
  }

  Object.defineProperty(navigator, 'plugins', {
    value: plugins
  });
}
