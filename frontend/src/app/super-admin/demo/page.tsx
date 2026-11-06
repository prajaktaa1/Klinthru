import { SuperAdminPreview } from "@/components/super-admin-preview";

export default function SuperAdminDemoPage() {
  if (process.env.NODE_ENV !== "development") return null;
  return <SuperAdminPreview />;
}
