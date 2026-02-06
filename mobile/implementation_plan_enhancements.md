# Implementation Plan - Enhancements Phase 1

This plan covers three key user requests:
1.  **Chat Formatting:** Rendering Markdown in chat responses properly.
2.  **Goal Details:** Collecting specific target amounts and dates for selected goals during onboarding.
3.  **Splash Screen:** Implementing a dynamic, animated splash screen.

## User Review Required

> [!IMPORTANT]
> I will be using `pnpm` for package installation as I see a `pnpm-lock.yaml`.
> 
> **Proposed Changes:**
> 1.  **Chat**: Install `react-native-markdown-display` to render bold text, lists, etc.
> 2.  **Onboarding**: Add a new "Goal Details" step triggered after goal selection. It will show a card for each selected goal asking for "Target Amount" and optional "Target Date".
> 3.  **Splash**: Remove the default static splash and implement a custom `AnimatedSplash` component with a fade-out/scale animation of the logo before revealing the app.

## Proposed Plan

### 1. Chat Formatting
-   **Dependency**: Install `react-native-markdown-display`.
-   **Component**: Update `app/(tabs)/chat.tsx` to use `<Markdown>` component for rendering message content instead of standard `<Text>`.
-   **Styling**: Customize markdown styles (fonts, colors) to match the app theme.

### 2. Onboarding Goal Details
-   **State**: Add state for `goalDetails: Record<string, { amount: string, date?: Date }>`.
-   **UI**:
    -   Insert a new step `goal_details` between `goals` and `sms` steps.
    -   Create a carousel or sequential form to input details for each selected goal.
    -   "Skip" option available to use defaults.
-   **Storage**: Save these details to `AsyncStorage` and optionally sync to backend if user is authenticated (currently onboarding is local-first/auth later).

### 3. Animated Splash Screen
-   **Component**: Create `components/AnimatedSplash.tsx`.
-   **Animation**: Use `react-native-reanimated`.
    -   Start with Logo centered.
    -   "Breathe" animation or "Outline trace" effect (simulated).
    -   Scale up and fade out to reveal the app content.
-   **Integration**: Modify `app/_layout.tsx` to conditionally render `AnimatedSplash` until assets are loaded and animation completes.

## Verification Plan

### Automated Tests
-   Verify component rendering (unit tests if setup).

### Manual Verification
1.  **Chat**: Send "Hello", verify response asterisks `**bold**` turn into **bold** visual text.
2.  **Onboarding**: 
    -   Select "Vacation" and "Emergency Fund".
    -   Verify "Goal Details" screen appears.
    -   Enter amounts.
    -   Verify flow continues to SMS step.
3.  **Splash**: 
    -   Reload app.
    -   Verify new animation plays before showing the first screen.
