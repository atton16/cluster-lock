export interface ILockMessage {
  event: 'lock';
  lockId: string;
  message: string;
  instanceId?: string;
}
