import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_BARBER_EMAIL = 'joao@subline.local';
const SAMPLE_CLIENT_EMAIL = 'kate@subline.local';
const SAMPLE_PASSWORD = 'ChangeMe123!';

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@subline.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.ADMIN_NAME ?? 'Admin';
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

  // ── Admin ──────────────────────────────────────────────────────────────
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, rounds);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'admin',
        status: 'active',
        fullName: adminName,
      },
    });
    console.log(`✓ Created admin: ${admin.email}  (password: ${adminPassword})`);
  } else {
    console.log(`✓ Admin already exists: ${admin.email}`);
  }

  // ── Sample barber ──────────────────────────────────────────────────────
  let barberUser = await prisma.user.findUnique({ where: { email: SAMPLE_BARBER_EMAIL } });
  let barber = barberUser
    ? await prisma.barber.findUnique({ where: { userId: barberUser.id } })
    : null;

  if (!barberUser || !barber) {
    const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, rounds);
    barberUser =
      barberUser ??
      (await prisma.user.create({
        data: {
          email: SAMPLE_BARBER_EMAIL,
          passwordHash,
          role: 'barber',
          status: 'active',
          fullName: 'João Silva',
          phone: '+351 912 345 678',
        },
      }));
    barber =
      barber ??
      (await prisma.barber.create({
        data: {
          userId: barberUser.id,
          name: 'João Silva',
          phone: '+351 912 345 678',
          address: 'Rua das Flores 12, Lisboa',
          bio: 'Barbeiro com 8 anos de experiência. Especialista em cortes modernos e barba.',
          rating: 4.8,
        },
      }));
    console.log(`✓ Created sample barber: ${SAMPLE_BARBER_EMAIL}  (password: ${SAMPLE_PASSWORD})`);
  } else {
    console.log(`✓ Sample barber already exists: ${SAMPLE_BARBER_EMAIL}`);
  }

  // ── Sample plans ───────────────────────────────────────────────────────
  const existingPlans = await prisma.plan.count({ where: { barberId: barber.id } });
  if (existingPlans === 0) {
    await prisma.plan.createMany({
      data: [
        {
          barberId: barber.id,
          name: 'Bronze',
          description: '1 corte por mês — para quem mantém o estilo.',
          price: 9.99,
          cutsPerMonth: 1,
          isActive: true,
        },
        {
          barberId: barber.id,
          name: 'Silver',
          description: '2 cortes/mês + desconto em produtos.',
          price: 19.99,
          cutsPerMonth: 2,
          isActive: true,
        },
        {
          barberId: barber.id,
          name: 'Gold',
          description: '4 cortes/mês + barba incluída + prioridade.',
          price: 49.99,
          cutsPerMonth: 4,
          isActive: true,
        },
      ],
    });
    console.log('✓ Created sample plans (Bronze, Silver, Gold)');
  }

  // ── Sample availability (Mon–Fri 09:00–19:00, slots de 30 min) ────────
  const existingRules = await prisma.barberAvailability.count({ where: { barberId: barber.id } });
  if (existingRules === 0) {
    await prisma.barberAvailability.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        barberId: barber.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '19:00',
        slotDuration: 30,
        isActive: true,
      })),
    });
    // Saturdays — half day
    await prisma.barberAvailability.create({
      data: {
        barberId: barber.id,
        dayOfWeek: 6,
        startTime: '10:00',
        endTime: '14:00',
        slotDuration: 30,
        isActive: true,
      },
    });
    console.log('✓ Created sample availability (Mon–Fri 09–19, Sat 10–14)');
  }

  // ── Sample client ──────────────────────────────────────────────────────
  let clientUser = await prisma.user.findUnique({ where: { email: SAMPLE_CLIENT_EMAIL } });
  let client = clientUser
    ? await prisma.client.findUnique({ where: { userId: clientUser.id } })
    : null;

  if (!clientUser || !client) {
    const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, rounds);
    clientUser =
      clientUser ??
      (await prisma.user.create({
        data: {
          email: SAMPLE_CLIENT_EMAIL,
          passwordHash,
          role: 'client',
          status: 'active',
          fullName: 'Kate Malone',
          phone: '+351 911 222 333',
        },
      }));
    client =
      client ??
      (await prisma.client.create({
        data: {
          userId: clientUser.id,
          barberId: barber.id,
          name: 'Kate Malone',
          email: SAMPLE_CLIENT_EMAIL,
          phone: '+351 911 222 333',
        },
      }));

    // Initial subscription on the Gold plan
    const goldPlan = await prisma.plan.findFirst({
      where: { barberId: barber.id, name: 'Gold' },
    });
    if (goldPlan) {
      const renewal = new Date();
      renewal.setMonth(renewal.getMonth() + 1);
      const periodStart = new Date();
      periodStart.setDate(1);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const subscription = await prisma.subscription.create({
        data: {
          clientId: client.id,
          planId: goldPlan.id,
          planType: 'gold',
          status: 'active',
          startDate: periodStart,
          renewalDate: renewal,
          price: goldPlan.price,
          cutsTotal: goldPlan.cutsPerMonth ?? 4,
          cutsUsed: 3,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
      // A few historical payments
      await prisma.payment.createMany({
        data: [
          {
            subscriptionId: subscription.id,
            amount: goldPlan.price,
            status: 'paid',
            method: 'card',
            paymentDate: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          },
          {
            subscriptionId: subscription.id,
            amount: goldPlan.price,
            status: 'paid',
            method: 'card',
            paymentDate: new Date(Date.now() - 60 * 24 * 3600 * 1000),
          },
        ],
      });
    }
    console.log(`✓ Created sample client: ${SAMPLE_CLIENT_EMAIL}  (password: ${SAMPLE_PASSWORD})`);
  } else {
    console.log(`✓ Sample client already exists: ${SAMPLE_CLIENT_EMAIL}`);
  }

  // ── Sample appointments (a couple in the next week) ────────────────────
  const existingAppts = await prisma.appointment.count({ where: { barberId: barber.id } });
  if (existingAppts === 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 5);
    nextWeek.setHours(0, 0, 0, 0);

    await prisma.appointment.createMany({
      data: [
        {
          barberId: barber.id,
          clientId: client.id,
          service: 'haircut_beard',
          date: tomorrow,
          startTime: '14:00',
          endTime: '14:30',
          durationMinutes: 30,
          status: 'confirmed',
          notes: 'Cliente regular',
        },
        {
          barberId: barber.id,
          clientId: client.id,
          service: 'haircut',
          date: nextWeek,
          startTime: '11:00',
          endTime: '11:30',
          durationMinutes: 30,
          status: 'pending',
        },
      ],
    });
    console.log('✓ Created sample appointments');
  }

  // ── Sample notification ────────────────────────────────────────────────
  if (clientUser) {
    const existingNotifs = await prisma.notification.count({ where: { userId: clientUser.id } });
    if (existingNotifs === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId: clientUser.id,
            type: 'payment_success',
            title: 'Pagamento confirmado',
            body: 'O teu plano Gold foi renovado com sucesso.',
            isRead: false,
          },
          {
            userId: clientUser.id,
            type: 'appointment_reminder',
            title: 'Marcação amanhã',
            body: 'Tens marcação amanhã às 14:00 com o João.',
            isRead: true,
          },
        ],
      });
      console.log('✓ Created sample notifications');
    }
  }

  console.log('\nSeed complete. Logins:');
  console.log(`  admin   → ${adminEmail}  (${adminPassword})`);
  console.log(`  barber  → ${SAMPLE_BARBER_EMAIL}  (${SAMPLE_PASSWORD})`);
  console.log(`  client  → ${SAMPLE_CLIENT_EMAIL}  (${SAMPLE_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
