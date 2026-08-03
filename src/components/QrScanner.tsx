import { useEffect, useRef, useState } from 'react'

type Props = {
  active: boolean
  onDecode: (text: string) => void
  className?: string
}

/** Camera QR scanner — starts only while `active` is true. */
export function QrScanner({ active, onDecode, className }: Props) {
  const onDecodeRef = useRef(onDecode)
  onDecodeRef.current = onDecode
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const genRef = useRef(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) {
      const s = scannerRef.current
      if (s) {
        s.stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              s.clear()
            } catch {
              /* ignore */
            }
          })
        scannerRef.current = null
      }
      return
    }

    const gen = ++genRef.current
    let cancelled = false
    setError(null)

    ;(async () => {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (cancelled || gen !== genRef.current) return

      const scanner = new Html5Qrcode('qa-qr-scanner')
      scannerRef.current = scanner
      const cameras = await Html5Qrcode.getCameras().catch(() => [])
      const back = cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[0]
      const config = { fps: 8, qrbox: { width: 240, height: 240 } }
      const onScan = (decoded: string) => onDecodeRef.current(decoded)

      try {
        if (back?.id) {
          await scanner.start(back.id, config, onScan, () => undefined)
        } else {
          try {
            await scanner.start({ facingMode: 'environment' }, config, onScan, () => undefined)
          } catch {
            await scanner.start({ facingMode: 'user' }, config, onScan, () => undefined)
          }
        }
      } catch (err) {
        if (!cancelled && gen === genRef.current) {
          setError(
            err instanceof Error
              ? `${err.message} — use HTTPS/localhost for camera, or paste the code below.`
              : 'Camera unavailable',
          )
        }
      }
    })()

    return () => {
      cancelled = true
      const s = scannerRef.current
      scannerRef.current = null
      if (s) {
        s.stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              s.clear()
            } catch {
              /* ignore */
            }
          })
      }
    }
  }, [active])

  return (
    <div className={className}>
      {error && <p className="error" style={{ marginBottom: '0.5rem' }}>{error}</p>}
      <div id="qa-qr-scanner" className="scanner" />
    </div>
  )
}
