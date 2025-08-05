export type Player = 'X' | 'O' | null

export default class Board {
  public grid: Player[]
  public size: number
  public winningCombination: number[] | null

  constructor(grid?: Player[], size = 3) {
    this.grid = grid || new Array(size * size).fill(null)
    this.size = size
    this.winningCombination = null
  }

  /**
   * Generate winning combinations dynamically for NxN grids
   */
  getWinningCombinations(): number[][] {
    const combos: number[][] = []
    const size = this.size

    // Rows
    for (let i = 0; i < size; i++) {
      const row: number[] = []
      for (let j = 0; j < size; j++) {
        row.push(i * size + j)
      }
      combos.push(row)
    }

    // Columns
    for (let i = 0; i < size; i++) {
      const col: number[] = []
      for (let j = 0; j < size; j++) {
        col.push(j * size + i)
      }
      combos.push(col)
    }

    // Main diagonal (top-left to bottom-right)
    const mainDiagonal: number[] = []
    for (let i = 0; i < size; i++) {
      mainDiagonal.push(i * size + i)
    }
    combos.push(mainDiagonal)

    // Anti-diagonal (top-right to bottom-left)
    const antiDiagonal: number[] = []
    for (let i = 0; i < size; i++) {
      antiDiagonal.push(i * size + (size - 1 - i))
    }
    combos.push(antiDiagonal)

    return combos
  }

  /**
   * Check for a winner and return the winning player
   */
  getWinner(): Player | 'DRAW' | null {
    const combinations = this.getWinningCombinations()

    // Check each winning combination
    for (const combo of combinations) {
      const firstValue = this.grid[combo[0]]
      if (firstValue && combo.every(index => this.grid[index] === firstValue)) {
        this.winningCombination = combo
        return firstValue
      }
    }

    // Check for draw (no empty squares)
    if (this.getEmptySquares().length === 0) {
      return 'DRAW'
    }

    return null
  }

  /**
   * Get all empty square indices
   */
  getEmptySquares(): number[] {
    return this.grid
      .map((cell, index) => cell === null ? index : -1)
      .filter(index => index !== -1)
  }

  /**
   * Make a move on the board
   */
  makeMove(index: number, player: Player): boolean {
    if (this.grid[index] === null && player !== null) {
      this.grid[index] = player
      return true
    }
    return false
  }

  /**
   * Create a copy of the board
   */
  clone(): Board {
    return new Board([...this.grid], this.size)
  }

  /**
   * Check if a move is valid
   */
  isValidMove(index: number): boolean {
    return index >= 0 && index < this.grid.length && this.grid[index] === null
  }

  /**
   * Reset the board to empty state
   */
  reset(): void {
    this.grid = new Array(this.size * this.size).fill(null)
    this.winningCombination = null
  }

  /**
   * Get the current state as a simple array
   */
  getState(): Player[] {
    return [...this.grid]
  }

  /**
   * Check if the board is full
   */
  isFull(): boolean {
    return !this.grid.includes(null)
  }

  /**
   * Get the number of moves made
   */
  getMoveCount(): number {
    return this.grid.filter(cell => cell !== null).length
  }

  /**
   * Get the position in 2D coordinates (row, col)
   */
  getPosition2D(index: number): { row: number; col: number } {
    return {
      row: Math.floor(index / this.size),
      col: index % this.size
    }
  }

  /**
   * Convert 2D coordinates to 1D index
   */
  getIndex1D(row: number, col: number): number {
    return row * this.size + col
  }

  /**
   * Get adjacent cells (for potential future features)
   */
  getAdjacentCells(index: number): number[] {
    const { row, col } = this.getPosition2D(index)
    const adjacent: number[] = []

    // Check all 8 directions
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue // Skip the cell itself
        
        const newRow = row + dr
        const newCol = col + dc
        
        if (newRow >= 0 && newRow < this.size && newCol >= 0 && newCol < this.size) {
          adjacent.push(this.getIndex1D(newRow, newCol))
        }
      }
    }

    return adjacent
  }

  /**
   * Get a string representation of the board (for debugging)
   */
  toString(): string {
    let result = ''
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = this.grid[i * this.size + j]
        result += cell ? cell : '-'
        if (j < this.size - 1) result += ' | '
      }
      if (i < this.size - 1) result += '\n' + '-'.repeat(this.size * 4 - 1) + '\n'
    }
    return result
  }
}