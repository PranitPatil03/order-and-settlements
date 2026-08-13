import { MongoClient } from 'mongodb';

import { env } from './environment.js';

export const mongoClient = new MongoClient(env.MONGODB_URI);
export const database = () => mongoClient.db(env.MONGODB_DB_NAME);

export const connectDatabase = async () => {
  await mongoClient.connect();
  await database().command({ ping: 1 });
};

export const disconnectDatabase = async () => {
  await mongoClient.close();
};
