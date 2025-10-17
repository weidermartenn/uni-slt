type RPCRequest = {
    id: number 
    method: string 
    payload?: any
}

type RPCResponse = {
    id: number 
    result?: any 
    error?: string
}

type RPCHandler = (payload?: any) => any | Promise<any>

export class RPCClient {
    private _id = 0 
    private _resolvers = new Map<number, { resolve: Function; reject: Function }>
    private _worker: Worker

    constructor(worker: Worker) {
        this._worker = worker 
        this._worker.onmessage = (event) => {
            const msg: RPCResponse = event.data 
            const resolver = this._resolvers.get(msg.id)
            if (!resolver) return 

            if (msg.error) resolver.reject(new Error(msg.error))
            else resolver.resolve(msg.result)

            this._resolvers.delete(msg.id)
        }
    }

    call<T = any>(method: string, payload?: any): Promise<T> {
        const id = ++this._id
        this._worker.postMessage({ id, method, payload })
        return new Promise<T>((resolve, reject) => {
            this._resolvers.set(id, { resolve, reject })
        })
    }

    send(method: string, payload?: any): void {
        this._worker.postMessage({ id: 0, method, payload })
    }
}

export class RPCServer {
    private _handlers = new Map<string, RPCHandler>() 

    constructor(port: DedicatedWorkerGlobalScope | Window = self) {
        port.addEventListener('message', async (event) => {
            const msg: RPCRequest = event.data
            if (!msg.method || !this._handlers.has(msg.method)) return 

            const handler = this._handlers.get(msg.method)
            try {
                const result = await handler(msg.payload)
                if (msg.id !== 0) {
                    ;(port as DedicatedWorkerGlobalScope).postMessage({ id: msg.id, result })
                }
            } catch (e) {
                if (msg.id !== 0) {
                    ;(port as DedicatedWorkerGlobalScope).postMessage({ id: msg.id, error: e })
                }
            }
        })
    }

    register(method: string, handler: RPCHandler) {
        this._handlers.set(method, handler)
    }
}