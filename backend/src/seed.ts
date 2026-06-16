import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import process from 'process';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    await prisma.ticket.deleteMany({});
    await prisma.event.deleteMany({});

    const date1 = new Date();
    date1.setDate(date1.getDate() + 3);
    date1.setHours(20, 0, 0, 0);

    await prisma.event.create({
        data: {
            name: 'Koncert Rockowy',
            date: date1,
            totalTickets: 2,
            tickets: {
                create: [{ status: 'AVAILABLE' }, { status: 'AVAILABLE' }]
            }
        }
    });

    const date2 = new Date();
    date2.setDate(date2.getDate() + 14);
    date2.setHours(19, 0, 0, 0);

    await prisma.event.create({
        data: {
            name: 'Spektakl Teatralny',
            date: date2,
            totalTickets: 100,
            tickets: {
                create: Array.from({ length: 100 }).map(() => ({ status: 'AVAILABLE' }))
            }
        }
    });

    const date3 = new Date();
    date3.setMonth(date3.getMonth() + 2);
    date3.setHours(21, 0, 0, 0);

    await prisma.event.create({
        data: {
            name: 'Stand-up',
            date: date3,
            totalTickets: 10,
            tickets: {
                create: Array.from({ length: 10 }).map(() => ({ status: 'AVAILABLE' }))
            }
        }
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());