// In-memory queue for test print requests
interface TestPrintJob {
  id: string
  createdAt: number
}

const globalForTests = globalThis as unknown as {
  __testPrintJobs: TestPrintJob[] | undefined
}

if (!globalForTests.__testPrintJobs) {
  globalForTests.__testPrintJobs = []
}

export const testPrintQueue = {
  add: (id = 'TEST-' + Date.now()) => {
    globalForTests.__testPrintJobs!.push({ id, createdAt: Date.now() })
  },
  pop: () => {
    return globalForTests.__testPrintJobs!.shift() || null
  },
  peek: () => {
    return globalForTests.__testPrintJobs![0] || null
  },
  hasJobs: () => {
    return (globalForTests.__testPrintJobs?.length || 0) > 0
  },
}
