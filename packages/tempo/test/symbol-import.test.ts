import { test, expect } from 'vitest'
import { $Logify } from '#library/symbol.library.js'

test('symbol import', () => {
  expect($Logify).toBeDefined()
})
