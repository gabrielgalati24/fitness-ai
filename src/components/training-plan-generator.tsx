'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { Clock, Dumbbell, Zap, RefreshCw, Edit3 } from 'lucide-react';
import Modal from './ui/modal';
import { dayPlanSchema } from '@/lib/utils';



type DayPlan = z.infer<typeof dayPlanSchema>;

export function TrainingPlanGenerator() {
  const [userInput, setUserInput] = useState('');
  const [trainingPlan, setTrainingPlan] = useState<DayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDays, setLoadingDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDay, setEditDay] = useState<DayPlan | null>(null);
  const [editInstructions, setEditInstructions] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTrainingPlan([]);

    try {
      const response = await fetch('/api/fitness-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          fitnessGoals: userInput,
          fitnessLevel: 'Intermedio',
          availableEquipment: '',
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Error al generar el plan de entrenamiento.'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let partialData = '';

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          partialData += decoder.decode(value, { stream: true });
          let lines = partialData.split('\n');

          partialData = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsedDay = dayPlanSchema.parse(JSON.parse(line));
                setTrainingPlan((prev) => [...prev, parsedDay]);
              } catch (err) {
                console.error('Error parsing day data:', err);
              }
            }
          }
        }

        // Procesar cualquier dato restante
        if (partialData.trim()) {
          try {
            const parsedDay = dayPlanSchema.parse(JSON.parse(partialData));
            setTrainingPlan((prev) => [...prev, parsedDay]);
          } catch (err) {
            console.error('Error parsing remaining day data:', err);
          }
        }

        setIsLoading(false);
      };

      await processStream();
    } catch (err: any) {
      setError(
        err.message ||
          'No se pudo generar el plan de entrenamiento. Por favor, inténtalo de nuevo.'
      );
      setIsLoading(false);
    }
  };

  const regenerateDayPlan = async (dayName: string) => {
    setLoadingDays((prev) => [...prev, dayName]);
    setError(null);

    try {
      const response = await fetch('/api/fitness-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          fitnessGoals: userInput,
          fitnessLevel: 'Intermedio',
          availableEquipment: '',
          day: dayName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Error al generar el plan para ${dayName}.`
        );
      }

      const parsedDay = dayPlanSchema.parse(await response.json());

      setTrainingPlan((prev) =>
        prev.map((day) => (day.day === dayName ? parsedDay : day))
      );
    } catch (err: any) {
      setError(
        err.message ||
          `No se pudo generar el plan de entrenamiento para ${dayName}. Por favor, inténtalo de nuevo.`
      );
    } finally {
      setLoadingDays((prev) => prev.filter((d) => d !== dayName));
    }
  };

  const openEditModal = (day: DayPlan) => {
    setEditDay(day);
    setEditInstructions('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditDay(null);
    setEditInstructions('');
    setIsEditModalOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDay) return;

    setLoadingDays((prev) => [...prev, editDay.day]);
    setError(null);

    try {
      const response = await fetch('/api/fitness-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'edit',
          fitnessGoals: userInput,
          fitnessLevel: 'Intermedio',
          availableEquipment: '',
          day: editDay.day,
          existingPlan: editDay,
          editInstructions: editInstructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Error al editar el plan para ${editDay.day}.`
        );
      }

      const parsedDay = dayPlanSchema.parse(await response.json());

      setTrainingPlan((prev) =>
        prev.map((day) => (day.day === parsedDay.day ? parsedDay : day))
      );

      closeEditModal();
    } catch (err: any) {
      setError(
        err.message ||
          `No se pudo editar el plan de entrenamiento para ${editDay.day}. Por favor, inténtalo de nuevo.`
      );
      console.error(`Error editando el plan para ${editDay.day}:`, err);
    } finally {
      setLoadingDays((prev) => prev.filter((d) => d !== editDay!.day));
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-200 min-h-screen">
      <Card className="mb-10 shadow-xl border-t-4 border-green-500">
        <CardHeader className="text-center">
          <CardTitle className="text-5xl font-extrabold text-green-600">
            Plan de Entrenamiento IA
          </CardTitle>
          <CardDescription className="text-2xl text-gray-700 mt-4">
            Personaliza tu plan de entrenamiento según tus objetivos y preferencias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Textarea
              placeholder="Describe tus objetivos de fitness..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="min-h-[150px] text-lg p-5 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500 transition duration-300 ease-in-out"
              required
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full text-lg py-4 bg-green-600 hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg text-white"
            >
              {isLoading ? 'Generando Plan...' : 'Generar Plan de Entrenamiento'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-10 border-red-500 shadow-lg">
          <CardContent className="text-red-500 p-6 text-lg text-center">
            {error}
          </CardContent>
        </Card>
      )}

      {trainingPlan.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trainingPlan.map((day, index) => (
            <Card
              key={index}
              className="h-full shadow-lg hover:shadow-2xl transition-shadow duration-500 border-t-4 border-green-400 rounded-2xl relative"
            >
              <CardHeader className="bg-green-50 p-6 rounded-t-2xl flex justify-between items-center">
                <div>
                  <CardTitle className="text-3xl font-semibold text-green-600">
                    {day.day}
                  </CardTitle>
                  <Badge variant="secondary" className="text-md py-1 px-4 mt-2">
                    {day.workout.type}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  {/* <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => regenerateDayPlan(day.day)}
                    disabled={loadingDays.includes(day.day)}
                    title="Regenerar Día"
                  >
                    <RefreshCw className="h-5 w-5 text-green-600" />
                  </Button> */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(day)}
                    disabled={loadingDays.includes(day.day)}
                    title="Editar Día"
                  >
                    <Edit3 className="h-5 w-5 text-blue-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 relative">
                {loadingDays.includes(day.day) ? (
                  <div className="flex justify-center items-center h-full">
                    <span className="text-green-600">Procesando...</span>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-3">
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center text-xl text-yellow-600">
                          <Zap className="mr-2 h-6 w-6" />
                          Calentamiento
                        </h4>
                        <p className="text-gray-700">{day.warmup}</p>
                      </div>
                      <Separator className="bg-gray-300" />
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center text-xl text-blue-600">
                          <Dumbbell className="mr-2 h-6 w-6" />
                          Entrenamiento
                        </h4>
                        <p className="text-gray-700 mb-4">
                          Duración: {day.workout.durationMinutes} minutos
                        </p>
                        <ul className="space-y-3">
                          {day.workout.exercises.map((exercise, exIndex) => (
                            <li
                              key={exIndex}
                              className="bg-blue-50 p-4 rounded-lg shadow-inner flex flex-col"
                            >
                              <span className="font-medium text-blue-700 text-lg">
                                {exercise.name}
                              </span>
                              <span className="text-gray-700">
                                {exercise.sets} series
                                {exercise.reps
                                  ? `, ${exercise.reps} repeticiones`
                                  : ''}
                                {exercise.timePerSetMinutes
                                  ? `, ${exercise.timePerSetMinutes} minutos por serie`
                                  : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Separator className="bg-gray-300" />
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center text-xl text-purple-600">
                          <Clock className="mr-2 h-6 w-6" />
                          Enfriamiento
                        </h4>
                        <p className="text-gray-700">{day.cooldown}</p>
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isEditModalOpen && editDay && (
        <Modal onClose={closeEditModal}>
          <Card className="max-w-lg mx-auto p-6">
            <CardHeader>
              <CardTitle className="text-2xl">Editar {editDay.day}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <Textarea
                  placeholder="Describe las modificaciones que deseas realizar..."
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="min-h-[100px] text-lg p-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
                  required
                />
                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={closeEditModal}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loadingDays.includes(editDay.day)}
                  >
                    {loadingDays.includes(editDay.day) ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Modal>
      )}
    </div>
  );
}
