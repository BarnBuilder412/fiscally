/**
 * Simple EventBus for cross-component communication
 * Enables instant updates without manual refresh
 */

type EventCallback = (...args: any[]) => void;

class EventBus {
    private events: Map<string, EventCallback[]> = new Map();

    /**
     * Subscribe to an event
     */
    on(event: string, callback: EventCallback): () => void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.events.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }

    /**
     * Emit an event to all subscribers
     */
    emit(event: string, ...args: any[]): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event
     */
    off(event: string): void {
        this.events.delete(event);
    }

    /**
     * Clear all events
     */
    clear(): void {
        this.events.clear();
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Event types for type safety
export const Events = {
    TRANSACTION_ADDED: 'transaction:added',
    TRANSACTION_UPDATED: 'transaction:updated',
    TRANSACTION_DELETED: 'transaction:deleted',
    PREFERENCES_CHANGED: 'preferences:changed',
    DATA_REFRESH: 'data:refresh',
} as const;
