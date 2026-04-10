import React, { useState } from 'react';

export default function OnboardingModal({ user, db }) {
    const [step, setStep] = useState(1);
    const [nickname, setNickname] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [bio, setBio] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await db.collection("users").doc(user.uid).update({
                nickname: nickname.trim() || user.email.split('@')[0],
                avatarUrl: avatarUrl.trim(),
                bio: bio.trim(),
                hasCompletedOnboarding: true
            });
        } catch (err) {
            console.error("Error saving onboarding setup", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] bg-gray-900/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fadeIn">
                
                {/* --- SLIDE 1: WELCOME --- */}
                {step === 1 && (
                    <div className="p-8 text-center animate-fadeIn">
                        <div className="text-6xl mb-6">🍻</div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Welcome to the Group</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            You've just joined the ultimate venue ranking engine. No more debating where to go—let the data decide.
                        </p>
                        <button onClick={() => setStep(2)} className="w-full bg-brand text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:opacity-90 transition">
                            Next
                        </button>
                    </div>
                )}

                {/* --- SLIDE 2: HOW IT WORKS --- */}
                {step === 2 && (
                    <div className="p-8 animate-fadeIn">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 text-center">How it works</h2>
                        <div className="space-y-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">🎯</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">1. The Hit List</h4>
                                    <p className="text-sm text-gray-500">See a place you want to try? Add it to the Hit List so the group can plan a visit.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">⚖️</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">2. The Verdict</h4>
                                    <p className="text-sm text-gray-500">Once you visit, drop your ratings. Is the Guinness top-tier? You decide.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">🏆</div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">3. The Leaderboard</h4>
                                    <p className="text-sm text-gray-500">Watch the math do its magic. Only one venue can be crowned the best.</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setStep(3)} className="w-full bg-brand text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:opacity-90 transition">
                            Let's Go
                        </button>
                    </div>
                )}

                {/* --- SLIDE 3: OPEN A TAB (PROFILE SETUP) --- */}
                {step === 3 && (
                    <div className="p-8 animate-fadeIn">
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">📝</div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Open a Tab</h2>
                            <p className="text-sm text-gray-500">Set up your profile so the group knows who is leaving the harsh reviews.</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Display Name</label>
                                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Dave" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand outline-none dark:text-white" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avatar Image URL (Optional)</label>
                                <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand outline-none dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your "Go-To Pint" (Bio)</label>
                                <input type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. Neck Oil & A Packet of Crisps" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand outline-none dark:text-white" />
                            </div>
                            
                            <button type="submit" disabled={saving} className="w-full mt-4 bg-green-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-green-700 transition disabled:opacity-50">
                                {saving ? "Saving..." : "Enter the Taproom"}
                            </button>
                        </form>
                    </div>
                )}
                
                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 pb-6">
                    <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                </div>
            </div>
        </div>
    );
}