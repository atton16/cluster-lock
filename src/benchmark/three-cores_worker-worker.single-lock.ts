import cluster = require('cluster');
import { Lock } from '../Lock';

if (!cluster.isMaster) {
  /**
   * worker code
   */
  async function main() {
    const lock = new Lock('a');
    const task = () => {
      return lock.acquire().then(() => {
        process.send({event: 'count'});
        lock.release();
      });
    };
    while(true) {
      const start = Date.now();
      await task();
      // await Promise.all([
      //   task(),
      //   task(),
      //   task(),
      // ]);
      const end = Date.now();
      const diff = end-start;
      process.send({event: 'diff', diff});
    }
  }
  main();
} else {
  /**
   * master code
   */
  const start = Date.now();
  const startDate = new Date(start);
  const lock = new Lock('a'); // master lock instance
  let count = 0;
  const diffStat = {
    count: 0,
    sum: 0,
    min: 1000000,
    avg: undefined,
    max: 0,
  };
  const workerA = cluster.fork();
  const workerB = cluster.fork();
  const messageHandler = (message: any) => {
    if (typeof message !== 'object') {
      return;
    }
    if (message.event === 'count') {
      count = count + 1;
    }
    if (message.event === 'diff') {
      const thisDiff = message.diff;
      diffStat.sum = diffStat.sum + thisDiff;
      diffStat.count = diffStat.count + 1;
      if (diffStat.min > thisDiff) diffStat.min = thisDiff;
      if (diffStat.max < thisDiff) diffStat.max = thisDiff;
      diffStat.avg = diffStat.sum / diffStat.count;
    }
  };
  workerA.on('message', messageHandler);
  workerB.on('message', messageHandler);
  workerA.on('exit', () => console.log('Worker A died!'));
  workerB.on('exit', () => console.log('Worker B died!'));

  setInterval(() => {
    const msSinceStart = Date.now() - start;
    const sSinceStart = Math.round(msSinceStart / 1000);
    console.log(`Start Date: ${startDate}`);
    console.log(`Time passed(s): ${sSinceStart}`);
    console.log(`Successful attempts: ${count}`);
    console.log(`Time wait (min/avg/max/sum/count): ${diffStat.min} / ${diffStat.avg} / ${diffStat.max} / ${diffStat.sum} / ${diffStat.count}`);
  }, 1000);
}
