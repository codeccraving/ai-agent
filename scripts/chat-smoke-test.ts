import { loadEnvFile } from 'node:process'
import type { AppConfig } from '../src/config/types.js'
import { loadConfig } from '../src/config/loadConfig.js'
import { createProvider } from '../src/providers/factory.js'
import { ProviderError } from '../src/providers/types.js'

loadEnvFile()

async function chatSmokeTest() {
  let config: AppConfig
  try {
    config = loadConfig()
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }

  const provider = createProvider(config)

  try {
    const response = await provider.chat([
      { role: 'user', content: 'Reply with exactly the words: hello agent' },
    ])
    console.log('--- ChatResponse ---')
    console.log(response)
  } catch (e) {
    if (e instanceof ProviderError) {
      console.error(`Provider error [${e.code}]:`, e.message)
    } else {
      console.error('Unexpected error:', e)
    }
    process.exit(1)
  }
}

chatSmokeTest()