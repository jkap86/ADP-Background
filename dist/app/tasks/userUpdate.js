import { fileURLToPath } from "url";
import path from "path";
import workerThreads from "worker_threads";
const startWorker = () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const worker = new workerThreads.Worker(path.join(__dirname, "..", "workers", "userWorker.js"));
    worker.on("error", (error) => {
        console.log(error);
    });
    worker.on("exit", (code) => {
        if (code !== 0) {
            console.log(`Worker stopped with exit code ${code}`);
        }
        else {
            console.log("Worker stopped");
        }
    });
};
export default startWorker;
