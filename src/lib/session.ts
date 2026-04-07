import { customAlphabet } from 'nanoid'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generate = customAlphabet(ALPHABET, 6)

export function generateCode(): string {
  return generate()
}

export function validateCode(input: string): boolean {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length !== 6) return false
  return cleaned.split('').every(c => ALPHABET.includes(c))
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

export function formatCodeForDisplay(code: string): string {
  return `VYDE-${code.toUpperCase()}`
}
