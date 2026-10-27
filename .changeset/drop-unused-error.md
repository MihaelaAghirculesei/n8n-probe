---
'@n8n-probe/core': minor
---

**Breaking:** remove `NotImplementedError`, deprecated since 0.2.0. No toolkit API throws it. If you imported it, define your own `Error` subclass.
