// Schema validation utilities for API endpoints
import type { ValidationSchema, ValidationResult, Player, GameMode, Difficulty } from './types';

export function validateSchema(data: any, schema: ValidationSchema): ValidationResult {
  const errors: string[] = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation if field is not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be of type ${rules.type}`);
      continue;
    }
    
    // Number range validation
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }
    }
    
    // String length validation
    if (rules.type === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
    }
    
    // Array validation
    if (rules.type === 'object' && Array.isArray(value)) {
      if (!Array.isArray(value)) {
        errors.push(`${field} must be an array`);
      } else {
        if (rules.minItems !== undefined && value.length < rules.minItems) {
          errors.push(`${field} must have at least ${rules.minItems} items`);
        }
        if (rules.maxItems !== undefined && value.length > rules.maxItems) {
          errors.push(`${field} must have at most ${rules.maxItems} items`);
        }
      }
    }
    
    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customResult = rules.validate(value);
      if (customResult !== true) {
        errors.push(customResult || `${field} is invalid`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Common validation schemas
export const schemas: { [key: string]: ValidationSchema } = {
  gameMove: {
    gameId: { type: 'string', required: true, minLength: 1 },
    position: { 
      type: 'number', 
      required: true, 
      min: 0, 
      validate: (value) => Number.isInteger(value) || 'Position must be an integer'
    },
    playerId: { type: 'string', required: true, minLength: 1 },
    player: { 
      type: 'string', 
      required: true,
      validate: (value) => ['X', 'O'].includes(value) || 'Player must be X or O'
    }
  },
  
  gameCreation: {
    playerId: { type: 'string', required: true, minLength: 1 },
    gameMode: { 
      type: 'string', 
      required: true,
      validate: (value) => ['single', 'multiplayer', 'ai'].includes(value) || 'Invalid game mode'
    },
    difficulty: {
      type: 'string',
      required: false,
      validate: (value) => ['easy', 'medium', 'hard', 'impossible'].includes(value) || 'Invalid difficulty'
    },
    gridSize: {
      type: 'number',
      required: false,
      min: 3,
      max: 10,
      validate: (value) => Number.isInteger(value) || 'Grid size must be an integer'
    }
  },
  
  scoreSubmission: {
    playerId: { type: 'string', required: true, minLength: 1 },
    score: { 
      type: 'number', 
      required: true, 
      min: 0, 
      max: 1000000,
      validate: (value) => Number.isInteger(value) || 'Score must be an integer'
    },
    gameMode: { type: 'string', required: true, minLength: 1 },
    difficulty: { type: 'string', required: false },
    movesCount: { type: 'number', required: false, min: 0 },
    timeElapsed: { type: 'number', required: false, min: 0 }
  }
};

// Input sanitization
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    return data.trim().slice(0, 1000); // Prevent extremely long strings
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof key === 'string' && key.length < 100) { // Prevent long keys
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return data;
}