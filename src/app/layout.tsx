import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { AppShell } from "@/components/dashboard/app-shell";

export const metadata: Metadata = {
  title: "Spending Tracker",
  description: "Monthly expenditure across your UK bank accounts",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <html lang="en">
      <body>
        <DashboardProvider>
          <AppShell user={user}>{children}</AppShell>
        </DashboardProvider>
      </body>
    </html>
  );
}
