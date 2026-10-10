interface TaskQueue {
  enqueue: <T>(task: Task<T>) => Promise<T>;
  ready: () => Promise<void>;
}

type Task<T> = () => Promise<T>;

interface Config {
  concurrency?: number;
  maxQueuedTasks?: number;
}

function createTaskQueue(config?: Config): TaskQueue {
  const concurrency = config?.concurrency || 15;
  const maxQueuedTasks = config?.maxQueuedTasks || 100;

  const queue: Array<Function> = [];
  const waitingQueue: Array<Function> = [];

  let runningCount = 0;

  function next() {
    if (runningCount >= concurrency || queue.length === 0) return;

    const task = queue.shift();
    waitingQueue.shift()?.();

    if (!task) return;

    runningCount++;
    task();
  }

  async function ready(): Promise<void> {
    while (queue.length >= maxQueuedTasks) {
      await new Promise<void>((resolve) => waitingQueue.push(resolve));
    }
  }

  function enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            runningCount--;
            next();
          });
      });
      next();
    });
  }

  return {
    enqueue,
    ready
  };
}

export default createTaskQueue;
