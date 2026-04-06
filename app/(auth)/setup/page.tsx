"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2, Lock, ShieldCheck, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const setupSchema = z
  .object({
    password: z
      .string()
      .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
      .regex(/[A-Z]/, "חייב להכיל אות גדולה אחת לפחות")
      .regex(/[0-9]/, "חייב להכיל ספרה אחת לפחות"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  })

type SetupForm = z.infer<typeof setupSchema>

const requirements = [
  { label: "לפחות 8 תווים", regex: /.{8,}/ },
  { label: "אות גדולה אחת לפחות", regex: /[A-Z]/ },
  { label: "ספרה אחת לפחות",      regex: /[0-9]/ },
]

export default function SetupPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  })

  const passwordValue = form.watch("password")

  const onSubmit = async (values: SetupForm) => {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: values.password,
      data: { needs_password_change: false },
    })

    if (error) {
      setServerError(error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single()

    switch (profile?.role) {
      case "admin":      router.push("/dashboard"); break
      case "client":     router.push("/onboarding"); break
      case "freelancer": router.push("/projects"); break
      default:           router.push("/login")
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900">AutoAgency</span>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">הגדר סיסמה</CardTitle>
          </div>
          <CardDescription>
            צור סיסמה מאובטחת לחשבונך. תשתמש בה בכל כניסה למערכת.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סיסמה חדשה</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="צור סיסמה חזקה" type="password" autoComplete="new-password" className="ps-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live requirements checklist */}
              {passwordValue.length > 0 && (
                <ul className="space-y-1 pl-1">
                  {requirements.map((req) => {
                    const met = req.regex.test(passwordValue)
                    return (
                      <li key={req.label} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`h-3.5 w-3.5 transition-colors ${met ? "text-emerald-500" : "text-slate-300"}`} />
                        <span className={met ? "text-slate-600" : "text-slate-400"}>{req.label}</span>
                      </li>
                    )
                  })}
                </ul>
              )}

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>אימות סיסמה</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="חזור על הסיסמה" type="password" autoComplete="new-password" className="ps-9" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>חייב להיות זהה לסיסמה שהוזנה למעלה.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{serverError}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />שומר…</>
                ) : "הגדר סיסמה והמשך"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
