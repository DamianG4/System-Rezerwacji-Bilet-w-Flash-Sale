import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import process from 'process';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
    console.log('Start testu integracyjnego (Race Condition)');

    const event = await prisma.event.create({
        data: {
            name: 'Wydarzenie Testowe - Overbooking',
            date: new Date(),
            totalTickets: 2,
            tickets: {
                create: [
                    { status: 'AVAILABLE' },
                    { status: 'AVAILABLE' }
                ]
            }
        }
    });

    console.log(`Utworzono wydarzenie (ID: ${event.id}) z 2 biletami.`);
    console.log('Wysylam 5 jednoczesnych zadan rezerwacji...');

    const requests = Array.from({ length: 5 }).map(() =>
        fetch('http://localhost:4000/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: event.id })
        }).then(async (res) => ({
            status: res.status,
            data: await res.json()
        }))
    );

    const results = await Promise.all(requests);

    const successCount = results.filter(r => r.status === 200).length;
    const failCount = results.filter(r => r.status === 409).length;

    console.log(`Sukcesy (kod 200): ${successCount}`);
    console.log(`Odrzucenia (kod 409): ${failCount}`);

    const reservedInDb = await prisma.ticket.count({
        where: { eventId: event.id, status: 'RESERVED' }
    });

    console.log(`Zarezerwowane bilety w bazie: ${reservedInDb}`);

    if (successCount === 2 && reservedInDb === 2) {
        console.log('TEST ZALICZONY: Zapobiegnieto overbookingowi.');
    } else {
        console.log('TEST NIEZALICZONY: Wystapil overbooking!');
    }

    await prisma.ticket.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
}

runTest().catch(console.error).finally(() => prisma.$disconnect());