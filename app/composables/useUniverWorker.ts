import { rpcClient } from "~/composables/univerWorkerClient"

await rpcClient.call('batchRecords', {
  type: 'create',
  listName: '09.2025',
  records: [{ id: 123, name: 'test' }]
});