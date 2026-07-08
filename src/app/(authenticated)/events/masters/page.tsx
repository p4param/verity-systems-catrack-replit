/**
 * @deprecated LEGACY — Event Masters index redirect.
 * Redirects to the first legacy master sub-page.
 * This entire /events/masters route tree is pending removal after MDE migration.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EventMastersIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/events/masters/event-types");
  }, [router]);
  return null;
}
