"use client";

import { EventForm } from "@/components/features/events/EventForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Мероприятия", href: "/admin/events" }, { label: "Новое мероприятие" }]} />
      <h1 className="text-2xl font-bold">Новое мероприятие</h1>
      <EventForm />
    </div>
  );
}
