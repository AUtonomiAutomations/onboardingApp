"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface Props {
  storagePath: string
  fileName: string
}

export function FreelancerFileDownload({ storagePath, fileName }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from("client-files")
        .createSignedUrl(storagePath, 60)

      if (error || !data?.signedUrl) return

      const a = document.createElement("a")
      a.href = data.signedUrl
      a.download = fileName
      a.click()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="gap-1.5"
    >
      <Download className="h-3.5 w-3.5" />
      {loading ? "מוריד..." : "הורד"}
    </Button>
  )
}
