import { rpcClient } from "~/composables/univerWorkerClient"

interface BatchRecordsResponse {
  success: boolean 
  count: number 
  created?: number 
  updated?: number 
  error?: string
}

export async function sendBatchToWorker() {
  const result = await rpcClient.call<BatchRecordsResponse>('batchRecords', {
    type: 'create',
    listName: '10.2025',
    records: [{ id: 34234, name: 'test'}]
  })
}