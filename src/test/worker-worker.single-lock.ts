import { strict as assert } from 'assert';
import cluster = require('cluster');
import { Lock } from '../Lock';

if (!cluster.isMaster) {
  /**
   * worker code
   */
  const lock = new Lock('a');
  const promises = [];
  for(let i = 0; i < 5; i++) {
    promises.push(new Promise((resolve) => {
      lock.acquire().then(() => {
        process.send({event: 'count'});
        lock.release();
        resolve();
      });
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
  const lock = new Lock('a'); // master lock instance
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
  Promise.all([workerAExitPromise, workerBExitPromise]).then((vals) => {
    workerA.removeAllListeners('message');
    workerA.removeAllListeners('exit');
    workerB.removeAllListeners('message');
    workerB.removeAllListeners('exit');
    assert.equal(vals[0], 0);
    assert.equal(vals[1], 0);
    assert.equal(count, 10);
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
