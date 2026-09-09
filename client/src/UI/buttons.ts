export interface ButtonDefinition {
    id: string;
    label: string;
    action: string;
}

export const buttons: ButtonDefinition[] = [
    { id: "health", label: "Check backend", action: "health" },
    { id: "platform", label: "Platform info", action: "platform" }
];

export function renderButtons(): string {
    return buttons
        .map((button) => `<button data-action="${button.action}">${button.label}</button>`)
        .join("\n");
}
