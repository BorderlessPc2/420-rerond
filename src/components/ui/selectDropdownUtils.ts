export function nextSelectDropdownIndex(index: number, length: number, key: 'ArrowUp' | 'ArrowDown') {
  if (length === 0) return -1
  return key === 'ArrowDown' ? (index + 1) % length : (index - 1 + length) % length
}
