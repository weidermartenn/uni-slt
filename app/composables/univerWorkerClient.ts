import { RPCClient } from "~/utils/rpc";

const worker = new Worker(new URL('~/workers/sheet.worker.ts', import.meta.url), {
    type: 'module'
})

export const rpcClient = new RPCClient(worker)