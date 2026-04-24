export interface BreakpointConfig {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  "2xl": number
  "3xl": number
}

export interface ResponsiveValue<T> {
  default: T
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  "2xl"?: T
}

export type BreakpointName = keyof BreakpointConfig
