"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Lock, Mail, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const loginSchema = z.object({
  email: z.string().email("אנא הזן כתובת אימייל תקינה"),
  password: z.string().min(1, "סיסמה נדרשת"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginForm) => {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setServerError("אימייל או סיסמה שגויים. אנא נסה שנית.")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setServerError("ההתחברות נכשלה. אנא נסה שנית.")
      return
    }

    // Make.com sets this flag when auto-generating accounts
    if (user.user_metadata?.needs_password_change) {
      router.push("/setup")
      return
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    switch (profile?.role) {
      case "admin":      router.push("/dashboard"); break
      case "client":     router.push("/onboarding"); break
      case "freelancer": router.push("/projects"); break
      default:           router.push("/login")
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900">AutoAgency</span>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">ברוך הבא</CardTitle>
          <CardDescription>
            התחבר עם הפרטים שנשלחו לכתובת האימייל שלך.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כתובת אימייל</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="you@company.com" type="email" autoComplete="email" className="ps-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סיסמה</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="••••••••" type="password" autoComplete="current-password" className="ps-9" {...field} />
                      </div>
                    </FormControl>
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
                  <><Loader2 className="h-4 w-4 animate-spin" />מתחבר…</>
                ) : "התחבר"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground mt-6">
        צריך עזרה? צור קשר עם מנהל החשבון שלך.
      </p>
    </div>
  )
}
