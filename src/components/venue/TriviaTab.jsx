import React, { useState, useEffect } from 'react';
import { firebase } from '../../firebase';

export default function TriviaTab({ db, venueId }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');

    useEffect(() => {
        if (!venueId) return;
        const unsubscribe = db.collection('pubs').doc(venueId).collection('trivia')
            .doc('liveSession')
            .onSnapshot(doc => {
                if (doc.exists) {
                    setSession(doc.data());
                } else {
                    setSession(null);
                }
                setLoading(false);
            });
        return () => unsubscribe();
    }, [db, venueId]);

    const handleStartSession = async () => {
        await db.collection('pubs').doc(venueId).collection('trivia').doc('liveSession').set({
            isActive: true,
            currentQuestion: 'Welcome to Pub Trivia! Get ready...',
            currentAnswer: '',
            showAnswer: false,
            startedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    const handleEndSession = async () => {
        if (!window.confirm("End the current trivia session?")) return;
        await db.collection('pubs').doc(venueId).collection('trivia').doc('liveSession').delete();
    };

    const handleUpdateQuestion = async (e) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;
        await db.collection('pubs').doc(venueId).collection('trivia').doc('liveSession').update({
            currentQuestion: newQuestion,
            currentAnswer: newAnswer,
            showAnswer: false,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        setNewQuestion('');
        setNewAnswer('');
    };

    const handleRevealAnswer = async () => {
        await db.collection('pubs').doc(venueId).collection('trivia').doc('liveSession').update({
            showAnswer: true
        });
    };

    if (loading) return <div className="p-6 text-center animate-pulse">Loading trivia...</div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Live Pub Trivia</h4>
                <p className="text-sm text-gray-500">Host a digital trivia night! Players checked into your pub will see questions appear live on their phones.</p>
            </div>

            {!session || !session.isActive ? (
                <div className="text-center p-12 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
                    <div className="text-5xl mb-4">🧠</div>
                    <h3 className="text-xl font-bold mb-2">No Active Session</h3>
                    <p className="text-sm text-gray-500 mb-6">Start a live trivia session to broadcast questions to your patrons.</p>
                    <button 
                        onClick={handleStartSession}
                        className="px-6 py-3 bg-brand text-white font-black rounded-xl shadow-md hover:scale-105 transition-transform"
                    >
                        Start Trivia Session
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="p-6 bg-brand/10 border-2 border-brand/20 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Live</span>
                        </div>
                        <h5 className="font-bold text-brand uppercase tracking-wider text-xs mb-2">Current Question</h5>
                        <p className="text-2xl font-black text-gray-900 dark:text-white mb-4">{session.currentQuestion}</p>
                        
                        {session.currentAnswer && (
                            <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                                <h5 className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">Secret Answer (Not shown yet)</h5>
                                <p className="font-bold text-gray-900 dark:text-white">{session.currentAnswer}</p>
                            </div>
                        )}
                        
                        <div className="flex gap-2 mt-6">
                            {session.currentAnswer && !session.showAnswer && (
                                <button 
                                    onClick={handleRevealAnswer}
                                    className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow-sm"
                                >
                                    Reveal Answer
                                </button>
                            )}
                            <button 
                                onClick={handleEndSession}
                                className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg"
                            >
                                End Session
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateQuestion} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                        <h5 className="font-bold text-gray-900 dark:text-white">Push Next Question</h5>
                        <input 
                            type="text" required placeholder="Question (e.g. In what year did the Titanic sink?)"
                            value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700"
                        />
                        <input 
                            type="text" placeholder="Answer (optional, e.g. 1912)"
                            value={newAnswer} onChange={e => setNewAnswer(e.target.value)}
                            className="w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700"
                        />
                        <button type="submit" className="w-full px-4 py-3 bg-brand text-white font-bold rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform">
                            Send to Devices
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
