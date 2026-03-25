import { clsx } from 'clsx'

interface Props {
  children: React.ReactNode
  /** Short caveat shown in amber command stripe */
  caveat?: string
  className?: string
}

/** Left-rail + header for low-confidence / inferred modules — intentionally cautious, not "broken". */
export function InferredModuleBand({ children, caveat, className }: Props) {
  return (
    <div className={clsx('relative rounded-sm border border-ops-600 bg-ops-900/15 overflow-hidden', className)}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-800/80" aria-hidden />
      {caveat && (
        <div className="pl-3.5 pr-2 py-1.5 bg-amber-950/40 border-b border-amber-900/40">
          <div className="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-amber-600/95">
            Inferred · low confidence
          </div>
          <p className="text-[0.7rem] text-ink-muted leading-snug mt-0.5">{caveat}</p>
        </div>
      )}
      <div className="pl-3.5">{children}</div>
    </div>
  )
}
