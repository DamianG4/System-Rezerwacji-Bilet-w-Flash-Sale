import Link from 'next/link';

interface Event {
    id: string;
    name: string;
    date: string;
    _count: {
        tickets: number;
    };
}

export default async function Home() {
    const res = await fetch('http://backend:4000/events', {
        next: { revalidate: 10 },
    });

    if (!res.ok) {
        return <div className="p-10 text-red-500 font-bold">Błąd ładowania wydarzeń.</div>;
    }

    const events: Event[] = await res.json();

    return (
        <main className="max-w-4xl mx-auto p-10">
            <h1 className="text-4xl font-extrabold mb-8 tracking-tight">System Rezerwacji Biletów</h1>

            <div className="grid gap-6">
                {events.map((event) => (
                    <div key={event.id} className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-50 dark:bg-zinc-900 transition-colors">
                        <div className="mb-4 sm:mb-0">
                            <h2 className="text-2xl font-bold">{event.name}</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                                Data wydarzenia: {event.date ? new Date(event.date).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Brak danych'}                            </p>
                            <div className="mt-3 inline-block bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-semibold border border-blue-100 dark:border-blue-900/50">
                                Dostępne bilety: {event._count.tickets}
                            </div>
                        </div>

                        <Link
                            href={`/event/${event.id}`}
                            className="bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            Szczegóły i Rezerwacja
                        </Link>
                    </div>
                ))}
            </div>
        </main>
    );
}