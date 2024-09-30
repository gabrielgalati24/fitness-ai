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
import { Clock, Dumbbell, Zap, Edit3, Sparkles } from 'lucide-react';
import Modal from './ui/modal';
import { dayPlanSchema } from '@/lib/utils';
import { motion } from 'framer-motion';

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Error al generar el plan de entrenamiento.'
        );
      }

      const data = await response.json();
      const parsedPlan = z.array(dayPlanSchema).parse(data);

      setTrainingPlan(parsedPlan);
    } catch (err: any) {
      setError(
        err.message ||
          'No se pudo generar el plan de entrenamiento. Por favor, inténtalo de nuevo.'
      );
    } finally {
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

      const data = await response.json();
      const parsedDay = dayPlanSchema.parse(data);

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

      const data = await response.json();
      const parsedDay = dayPlanSchema.parse(data);

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-4xl mx-auto mb-12 overflow-hidden shadow-2xl border-t-4 border-green-500 w-full">
          <CardHeader className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-8">
            <CardTitle className="text-4xl sm:text-5xl font-extrabold text-center mb-4">
              Plan de Entrenamiento IA
            </CardTitle>
            <CardDescription className="text-xl sm:text-2xl text-green-100 text-center">
              Personaliza tu plan de entrenamiento según tus objetivos y preferencias.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
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
                className="w-full text-lg py-4 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-white rounded-xl font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Sparkles className="animate-spin mr-2" />
                    Generando Plan...
                  </span>
                ) : (
                  'Generar Plan de Entrenamiento'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-4xl mx-auto mb-12 border-red-500 shadow-lg">
            <CardContent className="text-red-500 p-6 text-lg text-center">
              {error}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {trainingPlan.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {trainingPlan.map((day, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full shadow-lg hover:shadow-2xl transition-all duration-500 border-t-4 border-green-400 rounded-2xl relative overflow-hidden group">
                <CardHeader className="bg-gradient-to-r from-green-400 to-blue-500 p-6 rounded-t-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-3xl font-semibold text-white">
                        {day.day}
                      </CardTitle>
                      <Badge variant="secondary" className="text-md py-1 px-4 mt-2 bg-white text-green-700">
                        {day.workout.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(day)}
                      disabled={loadingDays.includes(day.day)}
                      className="text-white hover:bg-white hover:text-green-600 transition-colors duration-300"
                      title="Editar Día"
                    >
                      <Edit3 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 relative">
                  {loadingDays.includes(day.day) ? (
                    <div className="flex justify-center items-center h-[300px]">
                      <Sparkles className="h-8 w-8 text-green-500 animate-spin" />
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
                                className="bg-blue-50 p-4 rounded-lg shadow-inner flex flex-col transform transition-transform duration-300 hover:scale-105"
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
            </motion.div>
          ))}
        </motion.div>
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
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
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