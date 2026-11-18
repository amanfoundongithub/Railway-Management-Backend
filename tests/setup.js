import { MongoMemoryReplSet } from 'mongodb-memory-server'; // <-- CHANGED
import mongoose from 'mongoose';

// Inject fake environment variables for tests
process.env.JWT_SECRET = 'test-secret-key-12345';

let replSet; // <-- CHANGED

beforeAll(async () => {
  // Start an in-memory Replica Set required for MongoDB Transactions
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();

  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop(); // <-- CHANGED
});