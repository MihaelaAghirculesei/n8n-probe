---
'@n8n-probe/core': minor
---

Add a `credentials` option to `createMockExecuteFunctions`. It wires
`getCredentials(type)` to return the matching decrypted object and to throw when
a node asks for a type that was not provided — mirroring a real run with
unconfigured credentials rather than handing back `undefined`.
