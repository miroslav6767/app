export type IpcHandler<T> = (payload: T) => void | Promise<void>;

export class IpcBus {
    private readonly handlers = new Map<string, Set<IpcHandler<unknown>>>();

    on<T>(channel: string, handler: IpcHandler<T>): () => void {
        let set = this.handlers.get(channel);
        if (!set) {
            set = new Set();
            this.handlers.set(channel, set);
        }

        const typed = handler as IpcHandler<unknown>;
        set.add(typed);
        return () => set.delete(typed);
    }

    async emit<T>(channel: string, payload: T): Promise<void> {
        const set = this.handlers.get(channel);
        if (!set) return;
        await Promise.all([...set].map((handler) => handler(payload)));
    }
}

export const ipc = new IpcBus();
