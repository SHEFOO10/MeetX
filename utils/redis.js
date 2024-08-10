import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => {
      console.error('Redis client failed to connect:', err.code || err.toString());
      this.connected = false;
    });
    this.client.on('ready', () => {
      console.log("\x1b[32mRedis Connected\x1b[0m");
      this.connected = true;
    });
  }

  static async getInstance() {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
      const { client } = RedisClient.instance;
      await client.connect();
      RedisClient.instance.connected = true;
    }
    return {
      instance: RedisClient.instance,
      client: RedisClient.instance.client,
    };
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(key);
    return value;
  }

  async set(key, value, duration) {
    const setAsync = promisify(this.client.set).bind(this.client);
    await setAsync(key, value);
    this.client.expire(key, duration);
  }

  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    await delAsync(key);
  }
}

export default RedisClient;