export type HeroLineSignal = 'good' | 'warn' | 'alert' | 'neutral'

export interface HeroLineResult {
  prefix: string
  emphasis: string
  emphasisSignal: HeroLineSignal
  suffix: string
}

export function heroLine(utilizations: number[]): HeroLineResult {
  const atCap   = utilizations.filter(u => u >= 90).length
  const nearCap = utilizations.filter(u => u >= 75 && u < 90).length
  const plural  = (n: number, s: string) => n === 1 ? s : `${s}s`

  if (atCap > 0) return {
    prefix: 'Attention:',
    emphasis: `${atCap} ${plural(atCap, 'investigator')} at capacity`,
    emphasisSignal: 'alert',
    suffix: 'this week — redistribute or defer visits.',
  }
  if (nearCap >= 3) return {
    prefix: 'Site is running hot:',
    emphasis: `${nearCap} investigators near capacity`,
    emphasisSignal: 'warn',
    suffix: 'this week — monitor closely.',
  }
  if (nearCap > 0) return {
    prefix: 'Site is',
    emphasis: 'operating smoothly',
    emphasisSignal: 'good',
    suffix: `— ${nearCap} ${plural(nearCap, 'investigator')} near capacity.`,
  }
  return {
    prefix: 'Site is',
    emphasis: 'operating smoothly',
    emphasisSignal: 'good',
    suffix: '',
  }
}

interface Props { firstName: string; utilizations: number[] }

const underlineColor: Record<HeroLineSignal, string> = {
  good: 'var(--signal-good)',
  warn: 'var(--signal-warn)',
  alert: 'var(--signal-alert)',
  neutral: 'var(--text-muted)',
}

export function HeroSentence({ firstName, utilizations }: Props) {
  const line = heroLine(utilizations)
  return (
    <div>
      <p style={{
        margin: 0, fontSize: 13, letterSpacing: '0.04em',
        color: 'var(--text-label)',
      }}>Good morning, {firstName}</p>
      <p style={{
        margin: '2px 0 0',
        fontFamily: 'Geist, Inter, system-ui', fontSize: 32, fontWeight: 300,
        letterSpacing: '-0.02em', lineHeight: 1.15,
        color: 'var(--text-secondary)',
      }}>
        {line.prefix}{' '}
        <span style={{
          color: 'var(--text-primary)', fontWeight: 500,
          textDecoration: 'underline', textDecorationThickness: 1,
          textUnderlineOffset: 4, textDecorationColor: underlineColor[line.emphasisSignal],
        }}>{line.emphasis}</span>{' '}
        {line.suffix}
      </p>
    </div>
  )
}
