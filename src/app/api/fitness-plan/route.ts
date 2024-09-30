import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { object, z } from 'zod';
import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
import { DayPlan, dayPlanSchema } from '@/lib/utils';

dotenv.config();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error(
    'La clave de API de Google Generative AI no está configurada. Por favor, establece la variable de entorno GOOGLE_GENERATIVE_AI_API_KEY.'
  );
}

const googleClient = google('gemini-1.5-flash');

const requestSchema = z.object({
  action: z.enum(['generate', 'edit']),
  fitnessGoals: z.string(),
  fitnessLevel: z.string(),
  availableEquipment: z.string().optional(),
  day: z.string().optional(),
  existingPlan: dayPlanSchema.optional(),
  editInstructions: z.string().optional(),
});

function generatePromptForDay(
  dayName: string,
  fitnessGoals: string,
  fitnessLevel: string,
  availableEquipment: string,
  context: string,
  existingPlan?: DayPlan,
  editInstructions?: string
) {
  let prompt = `
    Genera un plan de entrenamiento estructurado en formato JSON para el día "${dayName}".
    El plan debe estar basado en los siguientes objetivos de fitness: ${fitnessGoals}.
    El nivel de condición física del usuario es "${fitnessLevel}".
    ${
      availableEquipment
        ? `El usuario tiene acceso al siguiente equipo: ${availableEquipment}.`
        : `El usuario no tiene acceso a equipos específicos.`
    }
    El plan debe incluir "warmup", "workout" y "cooldown".
    Aquí está el contexto de los días anteriores:
    ${context}
  `;

  if (existingPlan && editInstructions) {
    prompt += `
      Aquí está el plan de entrenamiento existente para referencia:
      ${JSON.stringify(existingPlan, null, 2)}
      
      Instrucciones para editar el plan:
      ${editInstructions}
    `;
  }

  prompt += `
    Responde solo con el JSON actualizado. No incluyas explicaciones adicionales. Responde en español.
  `;

  return prompt;
}

async function generateDayPlan(
  dayName: string,
  fitnessGoals: string,
  fitnessLevel: string,
  availableEquipment: string,
  context: string,
  existingPlan?: DayPlan,
  editInstructions?: string
) {
  const prompt = generatePromptForDay(
    dayName,
    fitnessGoals,
    fitnessLevel,
    "",
    context,
    existingPlan,
    editInstructions
  );

  let attempts = 0;

  while (attempts < 3) {
    try {
      const { object } = await generateObject({
        model: googleClient,
        schema: dayPlanSchema,
        prompt: prompt,
      });
    
      const parsedDay = dayPlanSchema.parse(object);

      return parsedDay;
    } catch (error) {
      attempts++;
      if (error instanceof z.ZodError) {
        console.error(
          `Error de validación en el intento ${attempts} para el día ${dayName}:`,
          error.errors
        );
      } else {
        console.error(
          `Error en el intento ${attempts} para el día ${dayName}:`,
          error
        );
      }
    }
  }

  throw new Error(
    `No se pudo generar el plan para el día ${dayName} después de 3 intentos.`
  );
}

export async function POST(req: Request) {
  try {
    const userInput = await req.json();
    const parsedRequest = requestSchema.parse(userInput);
    const {
      action,
      fitnessGoals,
      fitnessLevel,
      availableEquipment,
      day,
      existingPlan,
      editInstructions,
    } = parsedRequest;

    if (action === 'edit') {
      if (!day || !existingPlan || !editInstructions) {
        return NextResponse.json(
          { error: 'Faltan campos necesarios para la edición.' },
          { status: 400 }
        );
      }

      const parsedDay = await generateDayPlan(
        day,
        fitnessGoals,
        fitnessLevel,
        availableEquipment || '',
        '',
        existingPlan,
        editInstructions
      );

      return NextResponse.json(parsedDay, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate') {
      if (day) {
        const parsedDay = await generateDayPlan(
          day,
          fitnessGoals,
          fitnessLevel,
          availableEquipment || '',
          ''
        );

        return NextResponse.json(parsedDay, {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Generar plan para toda la semana
      const weekDays = [
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
        'Domingo',
      ];

      let context = '';
      const trainingPlan: DayPlan[] = [];

      for (const dayName of weekDays) {
        try {
          const parsedDay = await generateDayPlan(
            dayName,
            fitnessGoals,
            fitnessLevel,
            availableEquipment || '',
            context
          );

          context += `\nDía ${dayName}: ${JSON.stringify(parsedDay, null, 2)}`;
          trainingPlan.push(parsedDay);
        } catch (error) {
          console.error(`Error generando el plan para ${dayName}:`, error);
          return NextResponse.json(
            { error: `No se pudo generar el plan para el día ${dayName}.` },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(trainingPlan, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(
      { error: 'Acción no reconocida.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error en la API:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validación fallida', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error generando el plan de entrenamiento.' },
      { status: 500 }
    );
  }
}
