# Fiscally Mobile App

AI-powered personal finance companion app built with React Native (Expo).

## Features

- **< 3 taps to add expense** - Voice-first, instant entry
- **Auto SMS tracking** - Parse bank transaction SMS on-device (Android)
- **AI companion** - Context-aware financial insights
- **Beautiful UI** - Modern, accessible design

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

### Environment Variables

Copy `.env.example` to `.env` and update:

```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home dashboard
│   │   ├── stats.tsx      # Statistics
│   │   ├── chat.tsx       # AI chat
│   │   └── settings.tsx   # Settings
│   ├── (auth)/            # Auth screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── add-expense.tsx    # Add expense modal
│   ├── voice-input.tsx    # Voice recording
│   ├── transactions.tsx   # All transactions
│   └── onboarding.tsx     # Onboarding flow
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── TransactionItem.tsx
│   ├── CategoryCard.tsx
│   ├── InsightCard.tsx
│   └── AddExpenseButton.tsx
├── constants/            # Theme, colors, categories
├── services/             # API client
├── stores/               # Zustand stores
├── types/                # TypeScript types
└── assets/               # Images, icons
```

## Tech Stack

- **Framework:** React Native (Expo SDK 52)
- **Navigation:** Expo Router
- **State Management:** Zustand
- **Styling:** StyleSheet (native)
- **Icons:** @expo/vector-icons (Ionicons)

## Screens

### Home Dashboard
- Monthly spending summary with budget progress
- Top categories breakdown
- AI insight card
- Recent transactions
- Quick add button (tap to add, hold for voice)

### Add Expense
- Amount input with category selection
- Optional note
- Voice input alternative

### Voice Input
- Hold-to-record interface
- Live transcript display
- AI parsing with confirmation

### Chat
- Conversational AI interface
- Suggested questions
- Natural language queries about spending

### Statistics
- Weekly/monthly spending charts
- Category breakdown with progress bars
- Trend analysis

### Settings
- Profile management
- SMS auto-tracking toggle
- Notification preferences
- Budget settings

## Development

### Adding a new screen

1. Create file in `app/` directory
2. Export a default component
3. Add to navigation in `app/_layout.tsx` if needed

### Adding a new component

1. Create in `components/` directory
2. Export from `components/index.ts`
3. Use theme constants from `constants/theme.ts`

### API Integration

The app uses a REST API. Configure the base URL in `.env`:

```
EXPO_PUBLIC_API_URL=https://your-api.com
```

## Building for Production

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## License

Private - Fiscally Team
