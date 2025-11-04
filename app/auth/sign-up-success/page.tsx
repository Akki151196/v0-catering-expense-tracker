import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
            </div>
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription>Check your email to confirm your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              We've sent a confirmation link to your email address. Click the link to verify your account and start
              tracking expenses.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-semibold">What's next?</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check your email for the confirmation link</li>
                <li>• Click the link to verify your email</li>
                <li>• Return here and login to your account</li>
              </ul>
            </div>
            <Link href="/auth/login" className="w-full">
              <Button className="w-full">Return to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
