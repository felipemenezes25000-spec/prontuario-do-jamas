import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMenuDto,
  AssignDietDto,
  MealDeliveryDto,
  DietType,
  MealType,
} from './dto/food-service.dto';

/** Label map for meal types in Portuguese. */
const MEAL_LABELS: Record<string, string> = {
  [MealType.BREAKFAST]: 'Cafe da Manha',
  [MealType.MORNING_SNACK]: 'Lanche da Manha',
  [MealType.LUNCH]: 'Almoco',
  [MealType.AFTERNOON_SNACK]: 'Lanche da Tarde',
  [MealType.DINNER]: 'Jantar',
  [MealType.NIGHT_SNACK]: 'Ceia',
};

/** Label map for diet types in Portuguese. */
const DIET_LABELS: Record<string, string> = {
  [DietType.REGULAR]: 'Geral',
  [DietType.SOFT]: 'Pastosa',
  [DietType.LIQUID]: 'Liquida',
  [DietType.LOW_SODIUM]: 'Hipossodica',
  [DietType.DIABETIC]: 'Diabetica',
  [DietType.RENAL]: 'Renal',
  [DietType.GLUTEN_FREE]: 'Sem Gluten',
  [DietType.LACTOSE_FREE]: 'Sem Lactose',
  [DietType.ENTERAL]: 'Enteral',
  [DietType.PARENTERAL]: 'Parenteral',
  [DietType.NPO]: 'Jejum (NPO)',
};

@Injectable()
export class FoodServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Create / Update Daily Menu
  // =========================================================================

  async createMenu(tenantId: string, userId: string, dto: CreateMenuDto) {
    // Check if menu already exists for this date/meal
    const existingMenu = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: `[FOOD_SERVICE:MENU] ${dto.date} - ${dto.mealType}`,
      },
    });

    const menuData = {
      date: dto.date,
      mealType: dto.mealType,
      mealLabel: MEAL_LABELS[dto.mealType] ?? dto.mealType,
      items: dto.items,
      totalCalories: dto.items.reduce((sum, item) => sum + item.calories, 0),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    };

    if (existingMenu) {
      return this.prisma.clinicalDocument.update({
        where: { id: existingMenu.id },
        data: {
          content: JSON.stringify(menuData),
        },
      });
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: 'SYSTEM',
        authorId: userId,
        type: 'CUSTOM',
        title: `[FOOD_SERVICE:MENU] ${dto.date} - ${dto.mealType}`,
        content: JSON.stringify(menuData),
        status: 'FINAL',
      },
    });
  }

  // =========================================================================
  // Assign Diet to Patient
  // =========================================================================

  async assignDiet(tenantId: string, userId: string, dto: AssignDietDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" nao encontrado`);
    }

    // Deactivate previous diet
    const previousDiet = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId: dto.patientId,
        title: { startsWith: '[FOOD_SERVICE:DIET]' },
        status: 'DRAFT', // DRAFT = active diet
      },
    });

    if (previousDiet) {
      await this.prisma.clinicalDocument.update({
        where: { id: previousDiet.id },
        data: {
          status: 'FINAL', // FINAL = inactive/historical
          content: JSON.stringify({
            ...JSON.parse(previousDiet.content ?? '{}'),
            deactivatedAt: new Date().toISOString(),
            deactivatedBy: userId,
          }),
        },
      });
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[FOOD_SERVICE:DIET] ${patient.fullName} - ${dto.dietType}`,
        content: JSON.stringify({
          dietType: dto.dietType,
          dietLabel: DIET_LABELS[dto.dietType] ?? dto.dietType,
          restrictions: dto.restrictions,
          allergies: dto.allergies,
          notes: dto.notes,
          assignedAt: new Date().toISOString(),
          assignedBy: userId,
        }),
        status: 'DRAFT', // DRAFT = active diet
      },
    });
  }

  // =========================================================================
  // Get Patient Diet
  // =========================================================================

  async getPatientDiet(tenantId: string, patientId: string) {
    const diet = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[FOOD_SERVICE:DIET]' },
        status: 'DRAFT', // active diets only
      },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!diet) {
      return { patientId, hasDiet: false, diet: null };
    }

    const data = JSON.parse(diet.content ?? '{}');
    return {
      patientId,
      hasDiet: true,
      diet: {
        id: diet.id,
        dietType: data.dietType,
        dietLabel: data.dietLabel,
        restrictions: data.restrictions,
        allergies: data.allergies,
        notes: data.notes,
        assignedAt: data.assignedAt,
        author: diet.author,
      },
    };
  }

  // =========================================================================
  // Record Meal Delivery
  // =========================================================================

  async recordMealDelivery(tenantId: string, userId: string, dto: MealDeliveryDto) {
    const today = new Date().toISOString().split('T')[0];

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[FOOD_SERVICE:DELIVERY] ${today} - ${dto.mealType}`,
        content: JSON.stringify({
          date: today,
          mealType: dto.mealType,
          mealLabel: MEAL_LABELS[dto.mealType] ?? dto.mealType,
          delivered: dto.delivered,
          refused: dto.refused,
          refusalReason: dto.refusalReason ?? null,
          portionConsumed: dto.portionConsumed ?? null,
          recordedBy: userId,
          recordedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });
  }

  // =========================================================================
  // Ward Food Orders (summary by ward for kitchen)
  // =========================================================================

  async getWardFoodOrders(tenantId: string) {
    // Get all active diets
    const activeDiets = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[FOOD_SERVICE:DIET]' },
        status: 'DRAFT',
      },
      select: { patientId: true, content: true },
    });

    // Get patient ward info via active admissions (no actualDischargeDate = still admitted)
    const patientIds = activeDiets.map((d) => d.patientId);
    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        patientId: { in: patientIds },
        actualDischargeDate: null,
      },
      select: {
        patientId: true,
        currentBed: { select: { ward: true, bedNumber: true, room: true } },
        patient: { select: { fullName: true } },
      },
    });

    const admissionMap = new Map(
      admissions.map((a) => [a.patientId, a]),
    );

    // Group by ward and diet type
    const wardOrders: Record<string, Array<{
      patientId: string;
      patientName: string;
      bed: string | null;
      dietType: string;
      dietLabel: string;
      restrictions: string[];
      allergies: string[];
    }>> = {};

    for (const diet of activeDiets) {
      const data = JSON.parse(diet.content ?? '{}');
      const admission = admissionMap.get(diet.patientId);
      const ward = admission?.currentBed?.ward ?? 'SEM_SETOR';

      if (!wardOrders[ward]) {
        wardOrders[ward] = [];
      }

      wardOrders[ward].push({
        patientId: diet.patientId,
        patientName: admission?.patient?.fullName ?? 'Desconhecido',
        bed: admission?.currentBed ? `${admission.currentBed.room}-${admission.currentBed.bedNumber}` : null,
        dietType: data.dietType,
        dietLabel: data.dietLabel,
        restrictions: data.restrictions ?? [],
        allergies: data.allergies ?? [],
      });
    }

    // Summary stats
    const dietCounts: Record<string, number> = {};
    for (const diet of activeDiets) {
      const data = JSON.parse(diet.content ?? '{}');
      const key = data.dietType ?? 'UNKNOWN';
      dietCounts[key] = (dietCounts[key] ?? 0) + 1;
    }

    return {
      totalPatients: activeDiets.length,
      dietDistribution: dietCounts,
      wardOrders,
    };
  }

  // =========================================================================
  // Dashboard
  // =========================================================================

  async getDashboard(tenantId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Active diets count
    const activeDiets = await this.prisma.clinicalDocument.count({
      where: {
        tenantId,
        title: { startsWith: '[FOOD_SERVICE:DIET]' },
        status: 'DRAFT',
      },
    });

    // Today's deliveries
    const todayDeliveries = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: `[FOOD_SERVICE:DELIVERY] ${today}` },
      },
      select: { content: true },
    });

    let mealsServed = 0;
    let mealsRefused = 0;
    let totalPortionConsumed = 0;
    let portionCount = 0;
    const mealTypeCount: Record<string, number> = {};

    for (const delivery of todayDeliveries) {
      const data = JSON.parse(delivery.content ?? '{}');
      if (data.delivered) mealsServed++;
      if (data.refused) mealsRefused++;
      if (data.portionConsumed !== null && data.portionConsumed !== undefined) {
        totalPortionConsumed += data.portionConsumed;
        portionCount++;
      }
      const meal = data.mealType ?? 'UNKNOWN';
      mealTypeCount[meal] = (mealTypeCount[meal] ?? 0) + 1;
    }

    // Diet distribution
    const dietDocs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[FOOD_SERVICE:DIET]' },
        status: 'DRAFT',
      },
      select: { content: true },
    });

    const dietDistribution: Record<string, number> = {};
    for (const doc of dietDocs) {
      const data = JSON.parse(doc.content ?? '{}');
      const key = data.dietLabel ?? data.dietType ?? 'Outros';
      dietDistribution[key] = (dietDistribution[key] ?? 0) + 1;
    }

    return {
      date: today,
      activeDiets,
      todayStats: {
        totalDeliveries: todayDeliveries.length,
        mealsServed,
        mealsRefused,
        acceptanceRate: todayDeliveries.length > 0
          ? Math.round(((todayDeliveries.length - mealsRefused) / todayDeliveries.length) * 100)
          : 0,
        averagePortionConsumed: portionCount > 0
          ? Math.round(totalPortionConsumed / portionCount)
          : 0,
        byMealType: mealTypeCount,
      },
      dietDistribution,
    };
  }
}
