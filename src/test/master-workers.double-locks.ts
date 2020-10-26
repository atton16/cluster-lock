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
  for(let i = 0; i < 3; i++) {
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
  const workerA = cluster.fork();
  const workerB = cluster.fork();
  const messageHandler = (message: any) => {
    if (typeof message !== 'object') {
      return;
    }
    if (message.event === 'count') {
      count = count + 1;
    }
  };
  workerA.on('message', messageHandler);
  workerB.on('message', messageHandler);
  const workerAExitPromise = new Promise((resolve) => {
    workerA.once('exit', (code) => resolve(code));
  });
  const workerBExitPromise = new Promise((resolve) => {
    workerB.once('exit', (code) => resolve(code));
  });
  const masterPromise = new Promise((resolve) => {
    const lockA = new Lock('a');
    const lockB = new Lock('b');
    const promises = [];
    for(let i = 0; i < 3; i++) {
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
  Promise.all([workerAExitPromise, workerBExitPromise, masterPromise]).then((vals) => {
    workerA.removeAllListeners('message');
    workerA.removeAllListeners('exit');
    workerB.removeAllListeners('message');
    workerB.removeAllListeners('exit');
    assert.equal(vals[0], 0);
    assert.equal(vals[1], 0);
    assert.equal(count, 9);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
