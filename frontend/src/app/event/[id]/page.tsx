"use client";

import { use, useEffect, useState } from 'react';
import useSWR from 'swr';
import { io } from 'socket.io-client';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: event, mutate, error } = useSWR(`http://localhost:4000/events/${id}`, fetcher);
    const [message, setMessage] = useState('');
    const [reservedTickets, setReservedTickets] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const savedTickets = localStorage.getItem(`tickets_${id}`);
        if (savedTickets) {
            try {
                setReservedTickets(JSON.parse(savedTickets));
            } catch (e) {
                console.error(e);
            }
        }
        setIsLoaded(true);
    }, [id]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(`tickets_${id}`, JSON.stringify(reservedTickets));
        }
    }, [reservedTickets, isLoaded, id]);

    useEffect(() => {
        const socket = io('http://localhost:4000');

        socket.on('tickets_updated', (payload) => {
            if (payload.eventId === id) {
                mutate((currentData: any) => {
                    if (!currentData || currentData.error) return currentData;
                    return {
                        ...currentData,
                        _count: { tickets: payload.availableTickets },
                    };
                }, false);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [id, mutate]);

    const handleReserve = async () => {
        if (!event?._count?.tickets || event._count.tickets <= 0) {
            setMessage('Brak biletów!');
            return;
        }

        mutate((currentData: any) => {
            if (!currentData || currentData.error) return currentData;
            return {
                ...currentData,
                _count: { tickets: currentData._count.tickets - 1 },
            };
        }, false);

        try {
            const res = await fetch('http://localhost:4000/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: id }),
            });

            const result = await res.json();

            if (!res.ok) {
                mutate();
                setMessage(result.message || 'Błąd rezerwacji.');
            } else {
                setReservedTickets((prev) => {
                    if (prev.includes(result.ticket.id)) return prev;
                    return [...prev, result.ticket.id];
                });
                setMessage('Zarezerwowano bilet!');
            }
        } catch (err) {
            mutate();
            setMessage('Błąd połączenia z serwerem.');
        }
    };

    const handlePay = async (ticketId: string) => {
        try {
            const res = await fetch('http://localhost:4000/pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId }),
            });

            const result = await res.json();

            if (!res.ok) {
                setMessage(result.message || 'Błąd płatności.');
            } else {
                setMessage('Płatność pomyślna!');
                setReservedTickets((prev) => prev.filter(ticket => ticket !== ticketId));

                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('Błąd połączenia z serwerem podczas płatności.');
        }
    };

    if (error) return <div className="p-4 sm:p-10 text-red-500 font-bold">Błąd ładowania danych.</div>;
    if (!event) return <div className="p-4 sm:p-10 font-medium text-zinc-500">Ładowanie wydarzenia...</div>;
    if (event.error) return <div className="p-4 sm:p-10 text-red-500 font-bold">Wydarzenie nie istnieje ({event.error})</div>;

    const isError = message.includes('Błąd') || message.includes('Zbyt') || message.includes('Brak');
    const ticketsCount = event?._count?.tickets || 0;

    return (
        <main className="w-full max-w-2xl mx-auto p-4 sm:p-10">
            <a
                href="/"
                className="inline-flex items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white mb-6 transition-colors"
            >
                ← Powrót do listy wydarzeń
            </a>

            <div className="w-full bg-zinc-50 dark:bg-zinc-900 p-6 sm:p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">{event.name}</h1>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
                    Data: {event.date ? new Date(event.date).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Brak danych'}
                </p>

                <div className="flex flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 sm:p-5 rounded-lg mb-8 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-base sm:text-lg font-bold text-zinc-700 dark:text-zinc-300">Dostępne bilety:</span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400">{ticketsCount}</span>
                </div>

                <button
                    onClick={handleReserve}
                    disabled={ticketsCount <= 0}
                    className="w-full bg-foreground text-background py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:opacity-90 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed transition-opacity"
                >
                    Rezerwuj bilet
                </button>

                <div className="h-16 mt-4 w-full">
                    {message && (
                        <div className={`w-full h-full flex items-center justify-center p-2 text-center text-sm sm:text-base font-bold rounded-lg border ${
                            isError
                                ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                                : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30'
                        }`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>

            {reservedTickets.length > 0 && (
                <div className="w-full mt-8 bg-zinc-50 dark:bg-zinc-900 p-6 sm:p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-base sm:text-lg font-bold mb-4">Twoje rezerwacje do opłacenia:</h3>
                    <div className="space-y-3">
                        {reservedTickets.map((ticketId, index) => (
                            <div key={`${ticketId}-${index}`} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs sm:text-sm font-mono break-all sm:pr-4">
                  ID: {ticketId}
                </span>
                                <button
                                    onClick={() => handlePay(ticketId)}
                                    className="w-full sm:w-auto whitespace-nowrap bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm sm:text-base hover:bg-green-500 transition-colors"
                                >
                                    Zapłać
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}