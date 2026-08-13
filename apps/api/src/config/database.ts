import { MongoClient } from 'mongodb';

import { env } from './environment.js';

export const mongoClient = new MongoClient(env.MONGODB_URI);

export const connectDatabase = async () => {
  await mongoClient.connect();
  await mongoClient.db().command({ ping: 1 });
};

export const disconnectDatabase = async () => {
  await mongoClient.close();
};
