import { exec } from 'child_process';
import { Lock } from './Lock';

describe('single-thread', () => {
  test('single lock', async (done) => {
    const lock = new Lock('a');
  
    await lock.acquire();
    lock.release();
    done();
  }, 1000);
  test('double locks', async (done) => {
    const lockA = new Lock('a');
    const lockB = new Lock('b');
  
    await Promise.all([
      lockA.acquire(),
      lockB.acquire(),
    ]);
    lockB.release();
    lockA.release();
    done();
  }, 1000);
  test('same-name lock', async (done) => {
    const lockA1 = new Lock('a');
    const lockA2 = new Lock('a');
  
    await Promise.all([
      lockA2.acquire(),
      lockA1.acquire(),
    ]);
    lockA1.release();
    lockA2.release();
    done();
  }, 1000);
});

describe('cluster', () => {
  test('master-worker single lock', (done) => {
    const program = exec('npx ts-node ./src/test/master-worker.single-lock.ts');
    const handler = (code) => {
      expect(code).toBe(0);
      program.removeListener('exit', handler);
      done();
    };
    program.once('exit', handler);
  }, 10000);
  test('master-workers single lock', (done) => {
    const program = exec('npx ts-node ./src/test/master-workers.single-lock.ts');
    const handler = (code) => {
      expect(code).toBe(0);
      program.removeListener('exit', handler);
      done();
    }
    program.once('exit', handler);
  }, 10000);
  test('worker-worker single lock', (done) => {
    const program = exec('npx ts-node ./src/test/worker-worker.single-lock.ts');
    const handler = (code) => {
      expect(code).toBe(0);
      program.removeListener('exit', handler);
      done();
    }
    program.once('exit', handler);
  }, 10000);
  test('master-worker double locks', (done) => {
    const program = exec('npx ts-node ./src/test/master-worker.double-locks.ts');
    const handler = (code) => {
      expect(code).toBe(0);
      program.removeListener('exit', handler);
      done();
    };
    program.once('exit', handler);
  }, 10000);
  test('master-workers double locks', (done) => {
    const program = exec('npx ts-node ./src/test/master-workers.double-locks.ts');
    const handler = (code) => {
      expect(code).toBe(0);
      program.removeListener('exit', handler);
      done();
    }
    program.once('exit', handler);
  }, 10000);
  test('worker-worker double locks', (done) => {
    const program = exec('npx ts-node ./src/test/worker-worker.double-locks.ts');
    const handler = (code) => {
      expect(code).toBe(0);
      program.removeListener('exit', handler);
      done();
    }
    program.once('exit', handler);
  }, 10000);
});
