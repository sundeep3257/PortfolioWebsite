import { useEffect, useState } from 'react'
import { readLayoutTokens, subscribeVisualLayout, type LayoutTokens } from '../lib/visualLayout'

/** Live aspect-aware layout tokens. Identity at 16:9 laptop sizes. */
export function useWideLayout(): LayoutTokens {
  const [tokens, setTokens] = useState(readLayoutTokens)

  useEffect(() => {
    const sync = () => setTokens(readLayoutTokens())
    sync()
    return subscribeVisualLayout(sync)
  }, [])

  return tokens
}
