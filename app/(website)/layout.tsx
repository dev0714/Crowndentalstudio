import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="font-body bg-cream text-ink">
      <Navbar />
      {children}
      <Footer />
    </div>
  )
}
