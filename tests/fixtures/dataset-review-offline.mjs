// Explicit preload for offline dataset review suites. No source or model calls.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import {syncBuiltinESMExports} from 'node:module';
globalThis.__offlineNetworkAttempts=0;
const deny=()=>{globalThis.__offlineNetworkAttempts++;throw Error('Offline validation forbids network access');};
globalThis.fetch=deny;
http.request=http.get=https.request=https.get=deny;
net.connect=net.createConnection=net.Socket.prototype.connect=deny;
tls.connect=dgram.createSocket=deny;
syncBuiltinESMExports();
