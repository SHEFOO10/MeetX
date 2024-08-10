import DBClient from "./db";
import RedisClient from "./redis";
import { serverError } from "./response";

const DB_TIMEOUT = 800; // 800ms

export async function checkDB(req, res, next) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject('Database check timed out'), DB_TIMEOUT);
    });
    const race = Promise.race([DBClient.getInstance(), timeoutPromise]);

    race.then((result) => {
      const { instance } = result;
      if (instance.connected) return next();
      return serverError(res, 'Database Server Error');
    }).catch(() => {
      return serverError(res, 'Database Server Error');
    });
}

export async function checkRedis(request, response, next) {
  const { instance } = await RedisClient.getInstance();
  if (!instance.isAlive())
    return serverError(response, 'Cache Server Error');
  next();
};
