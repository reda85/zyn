import Image from 'next/image'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'

export default function FullScreenLoader({ title = 'Chargement...', message = 'Veuillez patienter' }) {
  return (
    <div className={clsx('flex h-screen w-full items-center justify-center bg-[#fafaf9]', GeistSans.className)}>
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center animate-pulse">
            <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
          </div>
        </div>
        <h2 className="text-[17px] font-medium text-[#050505] mb-2">{title}</h2>
        <p className="text-[13px] text-[#8a8a84]">{message}</p>
        <div className="mt-8 w-64 mx-auto">
          <div className="h-1 bg-[#eeeeec] rounded-full overflow-hidden">
            <div className="h-full bg-[#0d0d0c] w-0 animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 75%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}

export function FullScreenMessage({ title, message, children }) {
  return (
    <div className={clsx('flex h-screen w-full items-center justify-center bg-[#fafaf9] px-6', GeistSans.className)}>
      <div className="max-w-sm text-center">
        <h2 className="text-[17px] font-medium text-[#050505] mb-2">{title}</h2>
        {message && <p className="text-[13px] text-[#666660] mb-6">{message}</p>}
        {children}
      </div>
    </div>
  )
}
