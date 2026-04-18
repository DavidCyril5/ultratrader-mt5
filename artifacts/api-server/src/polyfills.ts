// metaapi.cloud-sdk is a browser-targeted webpack bundle that uses axios with the XHR adapter.
// Node.js does not have XMLHttpRequest built in, so we polyfill it before the SDK loads.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XHR = require("xmlhttprequest-ssl").XMLHttpRequest;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).XMLHttpRequest = XHR;
