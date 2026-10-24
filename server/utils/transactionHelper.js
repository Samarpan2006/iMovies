const mongoose = require('mongoose');

let isReplicaSet = null;

/**
 * Detects whether the current MongoDB connection supports multi-document transactions.
 * Transactions require a replica set or sharded cluster.
 */
async function checkTransactionSupport() {
  if (isReplicaSet !== null) return isReplicaSet;
  try {
    if (!mongoose.connection || !mongoose.connection.db) {
      return false;
    }
    const admin = mongoose.connection.db.admin();
    const hello = await admin.command({ hello: 1 });
    isReplicaSet = Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch (err) {
    isReplicaSet = false;
  }
  return isReplicaSet;
}

/**
 * Executes a callback within a MongoDB session/transaction if supported,
 * or directly without a transaction if the deployment is a standalone mongod.
 */
async function runWithTransaction(callback) {
  const supported = await checkTransactionSupport();
  if (supported) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      await session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      await session.endSession();
      throw err;
    }
  } else {
    return await callback(null);
  }
}

module.exports = {
  checkTransactionSupport,
  runWithTransaction
};
