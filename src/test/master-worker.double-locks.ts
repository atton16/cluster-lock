import { strict as assert } from 'assert';
import cluster = require('cluster');
import { Lock } from '../Lock';

if (!cluster.isMaster) {
  /**
   * worker code
   */
  const lockA = new Lock('a');
  const lockB = new Lock('b');
  const promises = [];
  for(let i = 0; i < 5; i++) {
    promises.push(new Promise(async (resolve) => {
      await Promise.all([
        lockA.acquire(),
        lockB.acquire(),
      ]);
      process.send({event: 'count'});
      lockB.release();
      lockA.release();
      resolve();
    }));
  }
  Promise.all(promises).then(() => {
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  })
} else {
  /**
   * master code
   */
  let count = 0;
  const worker = cluster.fork();
  const messageHandler = (message: any) => {
    if (typeof message !== 'object') {
      return;
    }
    if (message.event === 'count') {
      count = count + 1;
    }
  };
  worker.on('message', messageHandler);
  const workerExitPromise = new Promise((resolve) => {
    worker.once('exit', (code) => resolve(code));
  });
  const masterPromise = new Promise((resolve) => {
    const lockA = new Lock('a');
    const lockB = new Lock('b');
    const promises = [];
    for(let i = 0; i < 5; i++) {
      promises.push(new Promise(async (resolve) => {
        await Promise.all([
          lockA.acquire(),
          lockB.acquire(),
        ]);
        count = count + 1;
        lockB.release();
        lockA.release();
        resolve();
      }));
    }
    Promise.all(promises).then(resolve);
  });
  Promise.all([workerExitPromise, masterPromise]).then((vals) => {
    worker.removeAllListeners('message');
    worker.removeAllListeners('exit');
    assert.equal(vals[0], 0);
    assert.equal(count, 10);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
