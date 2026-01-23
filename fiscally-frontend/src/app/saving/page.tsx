"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Info, Shield, Zap, Bot, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import {
    subzeroAPI,
    Subscription,
    NegotiationStatus,
    NegotiationMessage,
    VendorOffer,
} from "@/lib/subzero-api"

type ViewMode = 'list' | 'negotiating' | 'result';
type NegotiationGoal = 'full_refund' | 'partial_refund' | 'better_deal' | 'cancel_only';

export default function SavingPage() {
    // State
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [negotiationId, setNegotiationId] = useState<string | null>(null);
    const [negotiation, setNegotiation] = useState<NegotiationStatus | null>(null);
    const [messages, setMessages] = useState<NegotiationMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load subscriptions on mount
    useEffect(() => {
        loadSubscriptions();
    }, []);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            const subs = await subzeroAPI.getSubscriptions();
            setSubscriptions(subs);
        } catch (err) {
            setError('Failed to load subscriptions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startNegotiation = async (subscription: Subscription, goal: NegotiationGoal = 'full_refund') => {
        setSelectedSubscription(subscription);
        setViewMode('negotiating');
        setMessages([]);
        setLoading(true);
        setError(null);

        try {
            const response = await subzeroAPI.startNegotiation({
                merchant_name: subscription.merchant_name,
                amount: subscription.amount,
                goal: goal,
            });

            setNegotiationId(response.negotiation_id);

            // Poll for status
            const status = await subzeroAPI.getNegotiationStatus(response.negotiation_id);
            setNegotiation(status);
            setMessages(status.messages || []);

            if (status.status === 'completed') {
                setViewMode('result');
            }
        } catch (err) {
            setError('Failed to start negotiation');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUserDecision = async (decision: 'accept' | 'reject') => {
        if (!negotiationId) return;

        setLoading(true);
        try {
            const status = await subzeroAPI.submitDecision(negotiationId, decision);
            setNegotiation(status);
            setMessages(status.messages || []);

            if (status.status === 'completed') {
                setViewMode('result');
            }
        } catch (err) {
            setError('Failed to submit decision');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetNegotiation = () => {
        setViewMode('list');
        setSelectedSubscription(null);
        setNegotiationId(null);
        setNegotiation(null);
        setMessages([]);
        setError(null);
    };

    // Render subscription list
    const renderSubscriptionList = () => (
        <div className="space-y-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                Your Subscriptions
            </p>

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}

            {subscriptions.map((sub) => (
                <Card key={sub.id} className="bg-card shadow-sm border-none">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-foreground">{sub.merchant_name}</h3>
                                <p className="text-sm text-muted-foreground">
                                    ${sub.amount.toFixed(2)} / {sub.billing_frequency}
                                </p>
                            </div>
                            <Button
                                onClick={() => startNegotiation(sub)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-9 px-4"
                            >
                                NEGOTIATE
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    // Render negotiation chat
    const renderNegotiationChat = () => (
        <div className="space-y-4">
            {/* Target Entity Card */}
            {selectedSubscription && (
                <Card className="bg-card shadow-sm border-none overflow-hidden">
                    <div className="h-24 bg-gradient-to-b from-gray-100 to-white flex items-center justify-center">
                        <span className="text-3xl font-black text-gray-300">
                            {selectedSubscription.merchant_name.split(' ')[0]}
                        </span>
                    </div>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
                                    Target Entity
                                </p>
                                <h2 className="text-xl font-black text-foreground">
                                    {selectedSubscription.merchant_name}
                                </h2>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">Billing</p>
                                <p className="text-lg font-bold text-foreground">
                                    ${selectedSubscription.amount.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Chat Messages */}
            <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                    Tactical Feed
                </p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pb-4">
                    {messages.map((msg, index) => (
                        <div key={index} className="flex gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${msg.role === 'agent' ? 'bg-slate-800' :
                                    msg.role === 'vendor' ? 'bg-blue-600' :
                                        'bg-gray-400'
                                }`}>
                                {msg.role === 'agent' && <Bot className="h-4 w-4 text-white" />}
                                {msg.role === 'vendor' && <Shield className="h-4 w-4 text-white" />}
                                {msg.role === 'system' && <Info className="h-4 w-4 text-white" />}
                            </div>
                            <div className={`p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] ${msg.role === 'agent' ? 'bg-card' :
                                    msg.role === 'vendor' ? 'bg-blue-50' :
                                        'bg-gray-100'
                                }`}>
                                <p className="text-xs font-bold text-muted-foreground mb-1 uppercase">
                                    {msg.role === 'agent' ? 'SUBZERO AGENT' :
                                        msg.role === 'vendor' ? 'VENDOR' : 'SYSTEM'}
                                </p>
                                <p className="text-sm text-foreground leading-relaxed">
                                    {msg.content}
                                </p>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                            </div>
                            <div className="bg-card p-4 rounded-2xl rounded-tl-none shadow-sm">
                                <p className="text-xs text-muted-foreground">Processing...</p>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Decision Panel - Show when awaiting user decision */}
            {negotiation?.vendor_offer?.requires_user_decision && (
                <div className="fixed bottom-24 left-4 right-4 z-20">
                    <Card className="bg-card shadow-2xl border-none ring-1 ring-black/5">
                        <CardContent className="p-5 space-y-4">
                            <div className="text-center space-y-1">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Strategic Decision
                                </h3>
                                <p className="text-sm text-foreground">
                                    {negotiation.vendor_offer.description}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button
                                    onClick={() => handleUserDecision('accept')}
                                    variant="outline"
                                    disabled={loading}
                                    className="w-full h-12 text-sm font-bold border-border bg-secondary/20 hover:bg-secondary/40"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept Offer'}
                                </Button>
                                <Button
                                    onClick={() => handleUserDecision('reject')}
                                    disabled={loading}
                                    className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'PUSH FOR FULL REFUND'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );

    // Render result
    const renderResult = () => (
        <div className="space-y-4">
            <Card className="bg-card shadow-sm border-none overflow-hidden">
                <CardContent className="p-6 text-center space-y-4">
                    {negotiation?.outcome?.outcome_type === 'refund_approved' ? (
                        <>
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground">Success! 🎉</h2>
                            <p className="text-lg text-muted-foreground">{negotiation.outcome.description}</p>
                            <p className="text-3xl font-black text-primary">
                                ${negotiation.outcome.amount_saved.toFixed(2)} Saved
                            </p>
                        </>
                    ) : negotiation?.outcome?.outcome_type === 'refund_denied' ? (
                        <>
                            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground">Denied</h2>
                            <p className="text-muted-foreground">{negotiation.outcome.description}</p>
                        </>
                    ) : (
                        <>
                            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                                <AlertCircle className="h-8 w-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground">Completed</h2>
                            <p className="text-muted-foreground">{negotiation?.outcome?.description}</p>
                        </>
                    )}

                    {negotiation?.outcome?.confirmation_message && (
                        <p className="text-sm text-muted-foreground italic">
                            {negotiation.outcome.confirmation_message}
                        </p>
                    )}

                    <Button
                        onClick={resetNegotiation}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold mt-4"
                    >
                        Back to Subscriptions
                    </Button>
                </CardContent>
            </Card>

            {/* Transaction Log */}
            {messages.length > 0 && (
                <Card className="bg-card shadow-sm border-none">
                    <CardContent className="p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                            Negotiation Transcript
                        </p>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {messages.map((msg, index) => (
                                <div key={index} className="text-sm">
                                    <span className="font-bold text-muted-foreground">
                                        {msg.role.toUpperCase()}:
                                    </span>{' '}
                                    <span className="text-foreground">{msg.content}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-secondary/30 p-4 space-y-6 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border -mx-4 -mt-4 px-4 py-4 mb-4">
                {viewMode === 'list' ? (
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ChevronLeft className="h-6 w-6 text-foreground" />
                        </Button>
                    </Link>
                ) : (
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={resetNegotiation}>
                        <ChevronLeft className="h-6 w-6 text-foreground" />
                    </Button>
                )}
                <div className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                        {viewMode === 'negotiating' && (
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                        <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">
                            {viewMode === 'list' ? 'SubZero Agent' :
                                viewMode === 'negotiating' ? 'Negotiation Active' : 'Complete'}
                        </h1>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground">
                        {viewMode === 'list' ? 'Subscription Rescue' : 'SubZero Agent v2.4.1'}
                    </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Info className="h-5 w-5 text-foreground" />
                </Button>
            </header>

            {/* Error Display */}
            {error && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                    </CardContent>
                </Card>
            )}

            {/* Main Content */}
            {viewMode === 'list' && renderSubscriptionList()}
            {viewMode === 'negotiating' && renderNegotiationChat()}
            {viewMode === 'result' && renderResult()}

            {/* Footer Badges */}
            {viewMode === 'negotiating' && !negotiation?.vendor_offer?.requires_user_decision && (
                <div className="fixed bottom-24 left-0 right-0 flex items-center justify-center gap-4 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
                        <Shield className="h-3 w-3" />
                        <span>SECURE PROTOCOL</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
                        <Zap className="h-3 w-3" />
                        <span>AI ENFORCED</span>
                    </div>
                </div>
            )}
        </div>
    )
}
