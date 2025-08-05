import Board, { Player } from '../gameEngine/Board'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master'

export interface AIMove {
  position: number
  score: number
  depth: number
}

export default class AIPlayer {
  private difficulty: Difficulty
  private maxDepth: number
  private randomnessFactor: number

  constructor(difficulty: Difficulty = 'medium') {
    this.difficulty = difficulty
    this.maxDepth = this.getMaxDepth(difficulty)
    this.randomnessFactor = this.getRandomnessFactor(difficulty)
  }

  /**
   * Get the maximum search depth based on difficulty
   */
  private getMaxDepth(difficulty: Difficulty): number {
    const depths = {
      easy: 2,
      medium: 4,
      hard: 6,
      expert: 8,
      master: Infinity
    }
    return depths[difficulty] || 4
  }

  /**
   * Get the randomness factor (probability of making a suboptimal move)
   */
  private getRandomnessFactor(difficulty: Difficulty): number {
    const factors = {
      easy: 0.7,     // 70% chance of random move
      medium: 0.3,   // 30% chance of random move
      hard: 0.1,     // 10% chance of random move
      expert: 0.05,  // 5% chance of random move
      master: 0      // 0% chance of random move (perfect play)
    }
    return factors[difficulty] || 0.3
  }

  /**
   * Get the best move for the AI using minimax with alpha-beta pruning
   */
  getMove(board: Board, aiPlayer: Player): number {
    // Add controlled randomness for easier difficulties
    if (Math.random() < this.randomnessFactor) {
      return this.getRandomMove(board)
    }

    const result = this.minimax(board, 0, true, -Infinity, Infinity, aiPlayer)
    return result.position
  }

  /**
   * Get a random valid move (for easier difficulties)
   */
  private getRandomMove(board: Board): number {
    const emptySquares = board.getEmptySquares()
    return emptySquares[Math.floor(Math.random() * emptySquares.length)]
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(
    board: Board,
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number,
    aiPlayer: Player
  ): AIMove {
    const winner = board.getWinner()
    
    // Terminal conditions
    if (winner === aiPlayer) {
      return { position: -1, score: 10 - depth, depth }
    }
    if (winner && winner !== aiPlayer && winner !== 'DRAW') {
      return { position: -1, score: depth - 10, depth }
    }
    if (winner === 'DRAW') {
      return { position: -1, score: 0, depth }
    }
    if (depth >= this.maxDepth) {
      return { position: -1, score: this.evaluatePosition(board, aiPlayer), depth }
    }

    const emptySquares = board.getEmptySquares()
    let bestMove: AIMove = { position: emptySquares[0], score: isMaximizing ? -Infinity : Infinity, depth }

    for (const square of emptySquares) {
      const newBoard = board.clone()
      const currentPlayer = isMaximizing ? aiPlayer : (aiPlayer === 'X' ? 'O' : 'X')
      newBoard.makeMove(square, currentPlayer)
      
      const result = this.minimax(newBoard, depth + 1, !isMaximizing, alpha, beta, aiPlayer)
      
      if (isMaximizing) {
        if (result.score > bestMove.score) {
          bestMove = { position: square, score: result.score, depth: result.depth }
        }
        alpha = Math.max(alpha, result.score)
      } else {
        if (result.score < bestMove.score) {
          bestMove = { position: square, score: result.score, depth: result.depth }
        }
        beta = Math.min(beta, result.score)
      }
      
      // Alpha-beta pruning
      if (beta <= alpha) {
        break
      }
    }
    
    return bestMove
  }

  /**
   * Evaluate board position for non-terminal states (heuristic function)
   */
  private evaluatePosition(board: Board, aiPlayer: Player): number {
    let score = 0
    const humanPlayer = aiPlayer === 'X' ? 'O' : 'X'
    const combinations = board.getWinningCombinations()

    for (const combo of combinations) {
      const comboScore = this.evaluateLine(board, combo, aiPlayer, humanPlayer)
      score += comboScore
    }

    return score
  }

  /**
   * Evaluate a single line (row, column, or diagonal)
   */
  private evaluateLine(board: Board, line: number[], aiPlayer: Player, humanPlayer: Player): number {
    let score = 0
    let aiCount = 0
    let humanCount = 0
    let emptyCount = 0

    for (const position of line) {
      const cell = board.grid[position]
      if (cell === aiPlayer) {
        aiCount++
      } else if (cell === humanPlayer) {
        humanCount++
      } else {
        emptyCount++
      }
    }

    // If both players have pieces in this line, it's neutral
    if (aiCount > 0 && humanCount > 0) {
      return 0
    }

    // Score based on AI pieces
    if (aiCount > 0) {
      score += Math.pow(10, aiCount)
    }

    // Penalty based on human pieces
    if (humanCount > 0) {
      score -= Math.pow(10, humanCount)
    }

    return score
  }

  /**
   * Get strategic move priorities (for hint system)
   */
  getMovePriorities(board: Board, player: Player): { position: number; priority: string; score: number }[] {
    const emptySquares = board.getEmptySquares()
    const priorities: { position: number; priority: string; score: number }[] = []

    for (const position of emptySquares) {
      const testBoard = board.clone()
      testBoard.makeMove(position, player)
      
      let priority = 'neutral'
      let score = 0

      // Check if this move wins the game
      if (testBoard.getWinner() === player) {
        priority = 'winning'
        score = 1000
      } else {
        // Check if this move blocks opponent from winning
        const opponentPlayer = player === 'X' ? 'O' : 'X'
        const blockBoard = board.clone()
        blockBoard.makeMove(position, opponentPlayer)
        if (blockBoard.getWinner() === opponentPlayer) {
          priority = 'blocking'
          score = 500
        } else {
          // Evaluate strategic value
          const moveResult = this.minimax(testBoard, 0, player === 'X', -Infinity, Infinity, player)
          score = moveResult.score
          
          if (score > 5) priority = 'good'
          else if (score < -5) priority = 'bad'
        }
      }

      priorities.push({ position, priority, score })
    }

    return priorities.sort((a, b) => b.score - a.score)
  }

  /**
   * Change difficulty level
   */
  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty
    this.maxDepth = this.getMaxDepth(difficulty)
    this.randomnessFactor = this.getRandomnessFactor(difficulty)
  }

  /**
   * Get current difficulty
   */
  getDifficulty(): Difficulty {
    return this.difficulty
  }

  /**
   * Get difficulty information
   */
  getDifficultyInfo(): { name: string; description: string; aiStrength: number } {
    const info = {
      easy: {
        name: 'Novice',
        description: 'Makes random moves 70% of the time',
        aiStrength: 30
      },
      medium: {
        name: 'Student',
        description: 'Balanced gameplay with some mistakes',
        aiStrength: 50
      },
      hard: {
        name: 'Apprentice',
        description: 'Strong strategic play with few mistakes',
        aiStrength: 70
      },
      expert: {
        name: 'Expert',
        description: 'Near-perfect play with deep analysis',
        aiStrength: 85
      },
      master: {
        name: 'Master',
        description: 'Perfect play - extremely challenging',
        aiStrength: 95
      }
    }
    
    return info[this.difficulty] || info.medium
  }
}