import { useAtom } from 'jotai'
import { selectedPinAtom } from '@/store/atoms'
import DrawerHeader from './DrawerHeader'
import DrawerBody from './DrawerBody'
import DrawerFooter from './DrawerFooter'
import { Lexend } from 'next/font/google'

const inter = Lexend({ subsets: ['latin'] })

export default function PinDrawer() {
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)

  if (!selectedPin) return null

  const closeDrawer = () => setSelectedPin(null)

  return (
    <div
      className={`${inter.className} fixed top-[64px] right-4 w-[500px] h-[calc(100vh-100px)]
      bg-white z-[1000] border border-gray-300 rounded-md flex flex-col overflow-hidden`}
    >
      <div className="px-5 py-4 border-b border-gray-200 shrink-0">
        <DrawerHeader pin={selectedPin} onClose={closeDrawer} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <DrawerBody pin={selectedPin} onClose={closeDrawer} />
      </div>

      <div className="px-5 py-4 border-t border-gray-200 shrink-0">
        <DrawerFooter pin={selectedPin} submit={closeDrawer} />
      </div>
    </div>
  )
}
