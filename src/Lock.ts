import process from 'process';
import cluster from 'cluster';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { ILockMessage } from './ILockMessage';

/**
 * Lock A lock implementation for both single-thread and clustered Node.JS environment.
 * Original implementation: https://thecodebarbarian.com/mutual-exclusion-patterns-with-node-promises
 */
export class Lock {
  private _locked = false;
  private _ee = new EventEmitter();
  private _eventName = 'lock';
  private _id: string;
  private _hello = false;
  private _instanceId = crypto.randomBytes(32).toString('hex');

  constructor(id: string) {
    this._id = id;
    if (cluster.isMaster) {
      cluster.on('message', (worker: cluster.Worker, message: ILockMessage) => {
        if (!this._isMyLockMessage(message)) {
          return;
        }

        if (message.message === 'hello') {
          worker.send(this._createLockMessage('hello'));
          return;
        }

        // receive acquire message from worker process
        // perform lock acquisition and notify when the lock is acquired
        if (message.message === 'acquire') {
          this._acquireInProcess().then(() => worker.send(this._createLockMessage('acquired', message.instanceId)));
          return;
        }

        // receive release message from worker process
        // perform lock release
        if (message.message === 'release') {
          this._releaseInProcess();
          return;
        }
      });
    } else {
      process.on('message', (message: ILockMessage) => {
        if (!this._isMyLockMessage(message)) {
          return;
        }

        if (message.message === 'hello') {
          this._hello = true;
          return;
        }

      });
      setTimeout(() => {
        if (!this._hello) {
          throw new Error('Hello timeout! Please make sure that master lock instance is initialized.');
        }
      }, 1000);
      process.send(this._createLockMessage('hello'));
    }
  }

  private _isMyLockMessage(message: any): boolean {
    if (typeof message !== 'object') {
      return false;
    }
    const m: ILockMessage = message as any;
    if (!m.event) {
      return false;
    }
    // Ignore non-lock message
    if (m.event !== this._eventName) {
      return false;
    }
    // Ignore other lock message
    if (m.lockId !== this._id) {
      return false;
    }
    return true;
  }

  private _createLockMessage(message: string, instanceId?: string): ILockMessage {
    return {
      event: 'lock',
      lockId: this._id,
      message,
      instanceId,
    };
  }

  private _acquireInProcess(): Promise<void> {
    return new Promise(resolve => {
      // If nobody has the lock, take it and resolve immediately
      if (!this._locked) {
        // Safe because JS doesn't interrupt you on synchronous operations,
        // so no need for compare-and-swap or anything like that.
        this._locked = true;
        return resolve();
      }

      // Otherwise, wait until somebody releases the lock and try again
      const tryAcquire = () => {
        if (!this._locked) {
          this._locked = true;
          this._ee.removeListener('release', tryAcquire);
          return resolve();
        }
      };
      this._ee.on('release', tryAcquire);
    });
  }

  private _acquireViaIPC(): Promise<void> {
    return new Promise(resolve => {
      process.send(this._createLockMessage('acquire', this._instanceId));
      const onMessage = (message: ILockMessage) => {
        if (!this._isMyLockMessage(message)) {
          return;
        }
        if (message.message !== 'acquired') {
          return;
        }
        if (message.instanceId !== this._instanceId) {
          return;
        }
        process.removeListener('message', onMessage);
        return resolve();
      };
      process.on('message', onMessage);
    });
  }

  acquire(): Promise<void> {
    if (cluster.isMaster) {
      return this._acquireInProcess();
    }
    return this._acquireViaIPC();
  }

  private _releaseInProcess(): void {
    // Release the lock immediately
    this._locked = false;
    process.nextTick(() => this._ee.emit('release'));

  }

  private _releaseViaIPC(): void {
    process.send(this._createLockMessage('release'));
  }

  release(): void {
    if (cluster.isMaster) {
      this._releaseInProcess();
      return;
    }
    this._releaseViaIPC();
    return;
  }
}
