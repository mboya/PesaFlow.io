// frontend/src/lib/websocket.ts
// @ts-ignore
import { createConsumer } from '@rails/actioncable';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/cable';

export const cable = createConsumer(WS_URL);

export function subscribeToSubscription(
    subscriptionId: string,
    callbacks: {
        received: (data: any) => void;
        connected?: () => void;
        disconnected?: () => void;
    }
) {
    return cable.subscriptions.create(
        { channel: 'SubscriptionChannel', id: subscriptionId },
        {
            received: callbacks.received,
            connected: callbacks.connected,
            disconnected: callbacks.disconnected,
        }
    );
}