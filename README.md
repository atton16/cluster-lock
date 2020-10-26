# @atton16/cluster-lock

A lock implementation for both single-thread and clustered Node.JS environment.

This is the simple lock implementation and might not be suitable for production application.

## Installation

```bash
npm install @atton16/cluster-lock
```

## Usage

### Single Process

```typescript
import { Lock } from '@atton16/cluster-lock';

const lock = new Lock('read-car');

lock.acquire().then(() => {
  console.log('I can now read car!');
  lock.release();
});

```

### Cluster

```typescript
import cluter from 'cluster';
import { Lock } from '@atton16/cluster-lock';

if (cluster.isMaster) {
  const lock = new Lock('read-car'); // master lock instance is required
  cluster.fork();  // worker 1
  cluster.fork();  // worker 2
  // NOTE: master process can also acquire lock
  lock.acquire().then(() => {
    console.log('I can now read car!');
    lock.release();
  });
} else {
  const lock = new Lock('read-car');

  lock.acquire().then(() => {
    console.log('I can now read car!');
    lock.release();
  });
}

```

## Limitations

1. Master lock instance is required in cluster mode.
2. Same-name lock is supported in worker process only (which runs in cluster mode).

## License

ISC License

Copyright (c) 2020, Attawit Kittikrairit

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
