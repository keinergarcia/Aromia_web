import { Hero } from '@/components/public/Hero'
import { Features } from '@/components/public/Features'
import { Benefits } from '@/components/public/Benefits'
import { Screenshots } from '@/components/public/Screenshots'
import { WhatIncludes } from '@/components/public/WhatIncludes'
import { Faq } from '@/components/public/Faq'
import { DownloadCTA } from '@/components/public/DownloadCTA'
import { Contact } from '@/components/public/Contact'

export function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Benefits />
      <Screenshots />
      <WhatIncludes />
      <DownloadCTA />
      <Faq />
      <Contact />
    </>
  )
}