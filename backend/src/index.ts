import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import process from 'process';
import rateLimit from 'express-rate-limit';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
const httpServer = createServer(app);

app.set('trust proxy', 1);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

const reserveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: 'Zbyt wiele prób rezerwacji. Odczekaj minutę.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Serwer dziala' });
});

app.get('/events', async (req: Request, res: Response) => {
    try {
        const events = await prisma.event.findMany({
            include: {
                _count: { select: { tickets: { where: { status: 'AVAILABLE' } } } }
            }
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania wydarzeń' });
    }
});

app.get('/events/:id', async (req: Request, res: Response): Promise<any> => {
    try {
        const event = await prisma.event.findUnique({
            where: { id: req.params.id },
            include: {
                _count: { select: { tickets: { where: { status: 'AVAILABLE' } } } }
            }
        });

        if (!event) return res.status(404).json({ error: 'Nie znaleziono' });

        return res.json(event);
    } catch (error) {
        return res.status(500).json({ error: 'Błąd pobierania wydarzenia' });
    }
});

app.post('/reserve', reserveLimiter, async (req: Request, res: Response): Promise<any> => {
    const { eventId } = req.body;

    if (!eventId) {
        return res.status(400).json({ error: 'Brak eventId w zapytaniu' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const availableTickets = await tx.$queryRaw<{ id: string }[]>`
                SELECT id FROM "Ticket"
                WHERE "eventId" = ${eventId} AND status = 'AVAILABLE'
                    LIMIT 1
                FOR UPDATE SKIP LOCKED
            `;

            if (availableTickets.length === 0) {
                throw new Error('Brak dostępnych biletów');
            }

            const ticketId = availableTickets[0].id;

            const reservedTicket = await tx.ticket.update({
                where: { id: ticketId },
                data: {
                    status: 'RESERVED',
                    reservedAt: new Date(),
                },
            });

            return reservedTicket;
        });

        const count = await prisma.ticket.count({
            where: { eventId, status: 'AVAILABLE' }
        });
        io.emit('tickets_updated', { eventId, availableTickets: count });

        return res.status(200).json({ success: true, ticket: result });

    } catch (error: any) {
        return res.status(409).json({ success: false, message: error.message });
    }
});

app.post('/pay', async (req: Request, res: Response): Promise<any> => {
    const { ticketId } = req.body;

    if (!ticketId) {
        return res.status(400).json({ error: 'Brak ticketId w zapytaniu' });
    }

    try {
        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'SOLD' }
        });

        return res.status(200).json({ success: true, ticket });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Błąd podczas płatności' });
    }
});

setInterval(async () => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const expiredTickets = await prisma.ticket.findMany({
            where: {
                status: 'RESERVED',
                reservedAt: {
                    lt: fiveMinutesAgo,
                },
            },
        });

        if (expiredTickets.length > 0) {
            await prisma.ticket.updateMany({
                where: {
                    id: { in: expiredTickets.map(t => t.id) },
                },
                data: {
                    status: 'AVAILABLE',
                    reservedAt: null,
                },
            });

            const eventIds = [...new Set(expiredTickets.map(t => t.eventId))];
            for (const eventId of eventIds) {
                const count = await prisma.ticket.count({
                    where: { eventId, status: 'AVAILABLE' }
                });
                io.emit('tickets_updated', { eventId, availableTickets: count });
            }

            console.log(`Zwolniono ${expiredTickets.length} wygasłych biletów`);
        }
    } catch (error) {
        console.error('Błąd podczas zwalniania biletów', error);
    }
}, 10000);

io.on('connection', (socket) => {
    console.log(`Klient podłączony: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Klient odłączony: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
    console.log(`Serwer uruchomiony na porcie ${PORT}`);
});

export { io };