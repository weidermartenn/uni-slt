// workers/api-worker.js
class ApiQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.batchSize = 10
    this.batchDelay = 100
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      if (!this.processing) this.process()
    })
  }

  async process() {
    this.processing = true
    
    while (this.queue.length > 0) {
      const batch = []
      while (batch.length < this.batchSize && this.queue.length > 0) {
        batch.push(this.queue.shift())
      }

      try {
        await this.processBatch(batch)
      } catch (error) {
        batch.forEach(item => item.reject(error))
      }

      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay))
      }
    }
    
    this.processing = false
  }

  async processBatch(batch) {
    const groupedTasks = {
      create: [],
      update: [],
      delete: []
    }

    // Группируем задачи по типам
    batch.forEach(({ task }) => {
      if (groupedTasks[task.type]) {
        groupedTasks[task.type].push(task)
      }
    })

    // Выполняем групповые запросы
    const results = await Promise.allSettled([
      this.executeBatchRequest('create', groupedTasks.create),
      this.executeBatchRequest('update', groupedTasks.update),
      this.executeBatchRequest('delete', groupedTasks.delete)
    ])

    // Распределяем результаты
    let taskIndex = 0
    batch.forEach((item) => {
      const taskType = item.task.type
      const batchResult = results.find(r => 
        r.status === 'fulfilled' && r.value.type === taskType
      )
      
      if (batchResult && batchResult.status === 'fulfilled') {
        item.resolve(batchResult.value.results[taskIndex++])
      } else {
        item.reject(new Error('Batch processing failed'))
      }
    })
  }

  async executeBatchRequest(type, tasks) {
    if (tasks.length === 0) return { type, results: [] }

    const payload = tasks.map(task => task.payload)
    
    try {
      const response = await fetch(this.getUrl(type), {
        method: this.getMethod(type),
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const results = await response.json()
      return { type, results }
    } catch (error) {
      throw error
    }
  }

  getUrl(type) {
    const baseUrl = self.API_BASE
    const endpoints = {
      create: `${baseUrl}/workTable/transportAccounting`,
      update: `${baseUrl}/workTable/transportAccounting`,
      delete: `${baseUrl}/workTable/transportAccounting`
    }
    return endpoints[type]
  }

  getMethod(type) {
    const methods = { create: 'POST', update: 'PATCH', delete: 'DELETE' }
    return methods[type]
  }

  getHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${self.AUTH_TOKEN}`
    }
  }
}

// Инициализация воркера
let apiQueue

self.addEventListener('message', function(e) {
  const { type, payload } = e.data

  switch (type) {
    case 'init':
      self.API_BASE = payload.apiBase
      self.AUTH_TOKEN = payload.token
      apiQueue = new ApiQueue()
      break

    case 'task':
      apiQueue.add(payload).then(result => {
        self.postMessage({ 
          type: 'success', 
          taskId: payload.taskId, 
          result 
        })
      }).catch(error => {
        self.postMessage({ 
          type: 'error', 
          taskId: payload.taskId, 
          error: error.message 
        })
      })
      break

    case 'updateToken':
      self.AUTH_TOKEN = payload.token
      break
  }
})