import { Select as RadixSelect } from 'radix-ui'
import { ChevronDown, Check } from 'lucide-react'

export interface HUDSelectOption {
  value: string
  label: string
}

interface HUDSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: HUDSelectOption[]
  disabled?: boolean
  'aria-label'?: string
}

// Radix Select forbids empty-string item values; map '' ↔ this sentinel internally
const EMPTY = '__hud_empty__'

export function HUDSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
}: HUDSelectProps) {
  const toInternal = (v: string) => v === '' ? EMPTY : v
  const toExternal = (v: string) => v === EMPTY ? '' : v

  return (
    <RadixSelect.Root
      value={toInternal(value)}
      onValueChange={(v) => onChange(toExternal(v))}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          height: 36, width: '100%',
          background: 'rgba(255 255 255 / 0.06)',
          border: '1px solid rgba(255 255 255 / 0.12)',
          borderRadius: 8,
          color: 'var(--text-primary)',
          padding: '0 10px',
          fontSize: 13,
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon style={{ flexShrink: 0, display: 'flex' }}>
          <ChevronDown size={14} color="var(--text-muted)" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          style={{
            zIndex: 60,
            minWidth: 'var(--radix-select-trigger-width)',
            maxHeight: 280,
            background: 'oklch(0.13 0.020 275)',
            border: '1px solid rgba(255 255 255 / 0.12)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0 0 0 / 0.5)',
            overflow: 'hidden',
          }}
        >
          <RadixSelect.Viewport style={{ padding: 4 }}>
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={toInternal(opt.value)}
                data-hud-select-item=""
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 6,
                  fontSize: 13, color: 'var(--text-primary)',
                  cursor: 'pointer', outline: 'none', userSelect: 'none',
                }}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={12} color="var(--accent-primary)" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
