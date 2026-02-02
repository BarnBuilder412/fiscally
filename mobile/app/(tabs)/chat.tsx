import React, { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  FontSize,
  FontWeight,
  BorderRadius
} from '@/constants/theme';
import { ChatMessage } from '@/types';

const SUGGESTED_QUESTIONS = [
  'How much did I spend on food?',
  "What's my biggest expense?",
  'Am I on track for my goal?',
  'Compare this week to last week',
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hi! I'm Fiscally, your AI finance companion. Ask me anything about your spending!",
    timestamp: new Date().toISOString(),
  },
];

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getAIResponse(messageText),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const getAIResponse = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('food')) {
      return "You've spent ₹4,850 on food this month across 12 orders. That's ₹400 per order avg, and 15% of your total spending.\n\n💡 Your late-night orders (after 10pm) average ₹520 vs ₹340 during the day.";
    }
    if (q.includes('biggest') || q.includes('most')) {
      return "Your biggest expense this month is Food at ₹12,400 (38% of total). Shopping comes second at ₹8,200 (25%).\n\n📊 Food spending is down 12% from last month though!";
    }
    if (q.includes('goal') || q.includes('track')) {
      return "You're at 65% of your ₹50,000 monthly budget with 8 days left. At current pace, you'll end at ₹48,500 — under budget! 🎯\n\nKeep up the good work!";
    }
    if (q.includes('week') || q.includes('compare')) {
      return "This week: ₹8,200 spent\nLast week: ₹10,500 spent\n\nYou're spending 22% less this week! 🎉 The biggest drop is in food delivery (-₹1,840).";
    }
    return "Based on your spending patterns, you're doing well! Your average daily spend is ₹1,048. Would you like me to analyze a specific category or time period?";
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat with Fiscally</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Try asking:</Text>
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => handleSend(question)}
                >
                  <Text style={styles.suggestionText}>• {question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.typingIndicator}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything about your money..."
            placeholderTextColor={Colors.gray400}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Enter') {
                if (Platform.OS === 'web') {
                  e.preventDefault();
                }
                handleSend();
              }
            }}
            blurOnSubmit={false} // Keep keyboard open after sending
          />
          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic" size={20} color={Colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim() && styles.sendButtonActive,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? Colors.white : Colors.gray400}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '1A',
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
  },
  suggestionsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  suggestionButton: {
    paddingVertical: Spacing.sm,
  },
  suggestionText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xxl,
    marginBottom: Spacing.md,
  },
  userBubble: {
    backgroundColor: Colors.surfaceSecondary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '0D',
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  userText: {
    color: Colors.textSecondary,
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray400,
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.primary + '1A',
    marginBottom: 60, // Add space for bottom tab bar
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, // Reduced height
    textAlignVertical: 'center', // Center text vertically
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    maxHeight: 100,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
});
