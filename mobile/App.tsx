import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider } from '@tamagui/core'
import config from './tamagui.config'
import { GameScreen } from './src/screens/GameScreen'

export default function App() {
  return (
    <TamaguiProvider config={config} defaultTheme="game_light">
      <GameScreen />
      <StatusBar style="auto" />
    </TamaguiProvider>
  )
}
