// Generate random unique numbers from a range
function randomFromRange(min: number, max: number, count: number): number[] {
  const nums: number[] = []
  const available = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * available.length)
    nums.push(available.splice(idx, 1)[0])
  }
  return nums
}

export interface BingoCard {
  B: number[]
  I: number[]
  N: number[]
  G: number[]
  O: number[]
}

// Generate a 5x5 bingo card
export function generateCard(): BingoCard {
  const N = randomFromRange(31, 45, 5)
  N[2] = 0 // FREE space
  return {
    B: randomFromRange(1, 15, 5),
    I: randomFromRange(16, 30, 5),
    N,
    G: randomFromRange(46, 60, 5),
    O: randomFromRange(61, 75, 5),
  }
}

// Get all 25 numbers from a card as a flat grid (row by row)
export function cardToGrid(card: BingoCard): number[][] {
  const cols = [card.B, card.I, card.N, card.G, card.O]
  const grid: number[][] = []
  for (let row = 0; row < 5; row++) {
    grid.push(cols.map(col => col[row]))
  }
  return grid
}

// Check if a card has BINGO (all 24 numbers + FREE marked)
export function checkFullCard(
  card: BingoCard,
  markedNumbers: number[],
): boolean {
  const grid = cardToGrid(card)
  const marked = new Set(markedNumbers)

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const num = grid[row][col]
      if (num === 0) continue // FREE
      if (!marked.has(num)) return false
    }
  }
  return true
}

// Check if marked numbers are all valid (exist in drawn_numbers)
export function validateMarks(
  markedNumbers: number[],
  drawnNumbers: number[],
): boolean {
  const drawn = new Set(drawnNumbers)
  return markedNumbers.every(n => drawn.has(n))
}

// Get the column letter for a number
export function getColumnLetter(num: number): string {
  if (num >= 1 && num <= 15) return 'B'
  if (num >= 16 && num <= 30) return 'I'
  if (num >= 31 && num <= 45) return 'N'
  if (num >= 46 && num <= 60) return 'G'
  if (num >= 61 && num <= 75) return 'O'
  return ''
}

// Format timestamp with milliseconds
export function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}
