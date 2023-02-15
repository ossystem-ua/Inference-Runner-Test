import express, { ErrorRequestHandler, Express, NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import cors  from 'cors';
import cluster from "cluster";
import os from "os";
import search from "./routes/search.js";

if (cluster.isPrimary) {
  const numWorkers = os.cpus().length;

  console.log(`Master cluster setting up ${numWorkers} workers...`);

  for (var i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("online", function (worker) {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  cluster.on("exit", function (worker, code, signal) {
    console.log(
      `Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`
    );
    console.log("Starting a new worker");
    cluster.fork();
  });
} else {
  const app: Express = express();

  app.use(cors());
  
  // parse application/json
  app.use(bodyParser.json());

  app.post("/search", search);

  app.use((err: ErrorRequestHandler, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err)
    }
    res.status(500).send('Something broke!')
  })

  app.listen(8000, function () {
    console.log(`Process ${process.pid} is listening to all incoming requests`);
  });
}
