import mongoose, { connect } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

const {
  DB_HOST: dbHost = 'localhost',
  DB_PORT: dbPort = 27017,
  DB_DATABASE: dbName = 'Meeting',
} = process.env;

const uri = `mongodb://${dbHost}:${dbPort}/${dbName}`;
class DBClient {
  constructor() {
    this.client = mongoose;
    DBClient.listeners(this);
    this.connected = false;
  }
  
  static async getInstance() {
    if (!DBClient.instance) {
      DBClient.instance = new DBClient();
    }
    if (!DBClient.instance.connected) {
      await connect(uri);
    }
    return {
      instance: DBClient.instance,
      db: mongoose.connection.db,
    };
  }

  async connect(uri) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 200,  // Fast server selection timeout
      heartbeatFrequencyMS: 500,      // Frequent heartbeats to detect issues quickly
      connectTimeoutMS: 200,          // Fast connection timeout
      socketTimeoutMS: 200,           // Fast socket timeout
    });
  }

  isAlive() {
    return this.connected;
  }

  static listeners(dbInstance) {
    mongoose.connection.on('connected', () => console.log('\x1b[32mMongoDB Connected\x1b[0m'));
    mongoose.connection.on('open', () => {
      console.log('\x1b[32mMongoDB Ready\x1b[0m')
      dbInstance.connected = true
    });
    mongoose.connection.on('disconnecting', () => {
      console.log('I am disconnecting');
    })
    mongoose.connection.on('disconnected', () => {
      console.log('Disconnected !!!!');
      dbInstance.connected = false;
  });
    mongoose.connection.on('error', (err) => console.log(err.toString()));
  }

  getDb() {
    if (!this.connected) {
      throw new Error('Database not connected. Call getInstance() first.');
    }
    return mongoose.connection.db;
  }
}

export default DBClient;
