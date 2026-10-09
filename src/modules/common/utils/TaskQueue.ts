interface TaskQueue {
  enqueue: <T>(task: Task<T>) => Promise<T>;
}

type Task<T> = () => Promise<T>;

interface Config {
  concurrency?: number;
}

function createTaskQueue(config?: Config): TaskQueue {
  const concurrency = config?.concurrency ?? 15;
  const queue: Array<Function> = [];

  let runningCount = 0;

  function next() {
    if (runningCount >= concurrency || queue.length === 0) return;

    const task = queue.shift();

    if (!task) return;

    runningCount++;

    task();
  }

  function enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            runningCount--;
            next();
          });
      });
      next();
    });
  }

  return {
    enqueue
  };
}

export default createTaskQueue;
