"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendWelcomeEmail, getEmailServiceStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function EmailTest() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  const handleSendEmail = async () => {
    if (!email) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await sendWelcomeEmail(email, name || undefined);
      if (response.success) {
        setResult(`✅ Email sent successfully! ID: ${response.email_id}`);
      } else {
        setResult(`❌ Failed to send email: ${response.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const status = await getEmailServiceStatus();
      setServiceStatus(status);
    } catch (error) {
      setServiceStatus({ error: String(error) });
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">
            Please sign in to test email functionality
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Email Testing</CardTitle>
        <CardDescription>Test the welcome email functionality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name (optional)
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleSendEmail}
            disabled={loading || !email}
            className="flex-1"
          >
            {loading ? "Sending..." : "Send Welcome Email"}
          </Button>

          <Button onClick={checkServiceStatus} variant="outline">
            Check Status
          </Button>
        </div>

        {result && (
          <div className="p-3 bg-gray-50 rounded-md text-sm">{result}</div>
        )}

        {serviceStatus && (
          <div className="p-3 bg-blue-50 rounded-md text-sm">
            <strong>Service Status:</strong>
            <ul className="mt-1 ml-4 list-disc">
              <li>
                Email Service:{" "}
                {serviceStatus.email_service_available
                  ? "✅ Available"
                  : "❌ Not Available"}
              </li>
              <li>
                Resend API:{" "}
                {serviceStatus.resend_api_configured
                  ? "✅ Configured"
                  : "❌ Not Configured"}
              </li>
              <li>From Domain: {serviceStatus.from_domain || "Not set"}</li>
              {serviceStatus.error && <li>Error: {serviceStatus.error}</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
