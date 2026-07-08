"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateEventSchema,
  UpdateEventSchema,
  EventFunctionSchema,
  EventTaskSchema,
  EventPaymentSchema,
  EventSearchSchema
} from "../validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateEventForm({ onSubmit, isSubmitting }: { onSubmit: (data: any) => void; isSubmitting?: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(CreateEventSchema),
    defaultValues: { name: "", guestCount: 100, budgetAmount: 2000, bookingDate: new Date() }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Event Name</Label>
        <Input {...register("name")} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message as string}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Guest Count</Label>
          <Input type="number" {...register("guestCount", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1">
          <Label>Budget Amount</Label>
          <Input type="number" {...register("budgetAmount", { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Event"}
      </Button>
    </form>
  );
}

export function EditEventForm({ defaultValues, onSubmit, isSubmitting }: { defaultValues: any; onSubmit: (data: any) => void; isSubmitting?: boolean }) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(UpdateEventSchema),
    defaultValues
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Event Name</Label>
        <Input {...register("name")} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        Save Changes
      </Button>
    </form>
  );
}

export function EventFunctionForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(EventFunctionSchema) });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Function Name</Label>
        <Input {...register("name")} />
      </div>
      <Button type="submit" className="w-full">Add Function</Button>
    </form>
  );
}

export function EventVenueForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Venue ID</Label>
        <Input {...register("venueId")} />
      </div>
      <div className="space-y-1">
        <Label>Rent Amount</Label>
        <Input type="number" {...register("rentAmount", { valueAsNumber: true })} />
      </div>
      <Button type="submit" className="w-full">Link Venue</Button>
    </form>
  );
}

export function EventTaskForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(EventTaskSchema) });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Task Title</Label>
        <Input {...register("title")} />
      </div>
      <Button type="submit" className="w-full">Create Task</Button>
    </form>
  );
}

export function EventPaymentForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(EventPaymentSchema) });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Amount</Label>
        <Input type="number" {...register("amount", { valueAsNumber: true })} />
      </div>
      <div className="space-y-1">
        <Label>Method</Label>
        <Input {...register("method")} />
      </div>
      <Button type="submit" className="w-full">Add Payment</Button>
    </form>
  );
}

export function EventSearchForm({ onSearch }: { onSearch: (filters: any) => void }) {
  const { register, handleSubmit } = useForm({ resolver: zodResolver(EventSearchSchema) });
  return (
    <form onSubmit={handleSubmit(onSearch)} className="flex items-center space-x-2">
      <Input {...register("query")} placeholder="Search events..." className="max-w-xs" />
      <Button type="submit">Search</Button>
    </form>
  );
}

export function EventChecklistForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1">
        <Label>Checklist Item Title</Label>
        <Input {...register("title")} />
      </div>
      <Button type="submit" className="w-full">Add Item</Button>
    </form>
  );
}
