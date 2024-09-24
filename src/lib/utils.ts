import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const dayPlanSchema = z.object({
  day: z.string(),
  warmup: z.string(),
  workout: z.object({
    type: z.string(),
    durationMinutes: z.number(),
    exercises: z.array(
      z.object({
        name: z.string(),
        sets: z.number(),
        reps: z.number().nullable().optional(),
        timePerSetMinutes: z.number().nullable().default(0),
      })
    ),
  }),
  cooldown: z.string(),
});



export interface Exercise {
  name: string;
  sets: number;
  reps?: number | null;
  timePerSetMinutes?: number | null;
}

export interface Workout {
  type: string;
  durationMinutes: number;
  exercises: Exercise[];
}

export interface DayPlan {
  day: string;
  warmup: string;
  workout: Workout;
  cooldown: string;
}