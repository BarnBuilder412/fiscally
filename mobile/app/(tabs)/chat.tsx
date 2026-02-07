import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
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
import { ChatMessage, ReasoningStep } from '@/types';
import { api } from '@/services/api';

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

// Icon mapping for reasoning step types
const STEP_ICONS: Record<string, { icon: string; color: string }> = {
  analyzing: { icon: 'person-circle-outline', color: '#8B5CF6' },
  context: { icon: 'flag-outline', color: '#22C55E' },
  pattern: { icon: 'trending-up-outline', color: '#F59E0B' },
  querying: { icon: 'search-outline', color: '#3B82F6' },
  data: { icon: 'stats-chart-outline', color: '#06B6D4' },
  calculating: { icon: 'calculator-outline', color: '#EC4899' },
  memory: { icon: 'bookmark-outline', color: '#8B5CF6' },
  insight: { icon: 'bulb-outline', color: '#F59E0B' },
};

// Animated ThinkingIndicator component
const ThinkingIndicator = ({ steps }: { steps: ReasoningStep[] }) => {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reveal steps one by one
    const timer = setInterval(() => {
      setVisibleSteps(prev => {
        if (prev < steps.length) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [steps.length]);

  if (steps.length === 0) return null;

  return (
    <View style={styles.thinkingContainer}>
      <View style={styles.thinkingHeader}>
        <Ionicons name="sparkles" size={16} color={Colors.primary} />
        <Text style={styles.thinkingTitle}>Thinking...</Text>
      </View>
      {steps.slice(0, visibleSteps).map((step, index) => {
        const stepStyle = STEP_ICONS[step.step_type] || STEP_ICONS.analyzing;
        return (
          <View key={index} style={styles.thinkingStep}>
            <View style={[styles.stepIcon, { backgroundColor: stepStyle.color + '20' }]}>
              <Ionicons name={stepStyle.icon as any} size={14} color={stepStyle.color} />
            </View>
            <Text style={styles.stepText}>{step.content}</Text>
          </View>
        );
      })}
      {visibleSteps < steps.length && (
        <View style={styles.thinkingDotsRow}>
          <View style={[styles.typingDot, styles.typingDot1]} />
          <View style={[styles.typingDot, styles.typingDot2]} />
          <View style={[styles.typingDot, styles.typingDot3]} />
        </View>
      )}
    </View>
  );
};

// Component to display reasoning steps in completed messages
const ReasoningStepsDisplay = ({ steps }: { steps: ReasoningStep[] }) => {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.reasoningToggle}>
      <View style={styles.reasoningToggleHeader}>
        <Ionicons name="sparkles" size={12} color={Colors.primary} />
        <Text style={styles.reasoningToggleText}>
          {expanded ? 'Hide reasoning' : `View reasoning (${steps.length} steps)`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={Colors.gray500}
        />
      </View>
      {expanded && (
        <View style={styles.reasoningStepsList}>
          {steps.map((step, index) => {
            const stepStyle = STEP_ICONS[step.step_type] || STEP_ICONS.analyzing;
            return (
              <View key={index} style={styles.reasoningStepItem}>
                <Ionicons name={stepStyle.icon as any} size={12} color={stepStyle.color} />
                <Text style={styles.reasoningStepText}>{step.content}</Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ReasoningStep[]>([]);
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
    setThinkingSteps([]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Call the real AI chat API
      const response = await api.sendChatMessage(messageText);

      // Store reasoning steps for display
      const reasoningSteps = response.reasoning_steps as ReasoningStep[] | undefined;

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        reasoning_steps: reasoningSteps,
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      // Show error message if API fails
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Chat API error:', error);
    } finally {
      setIsTyping(false);
      setThinkingSteps([]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 0}
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
              {message.role === 'user' ? (
                <Text style={styles.userText}>{message.content}</Text>
              ) : (
                <View>
                  <Markdown
                    style={{
                      body: {
                        color: Colors.textPrimary,
                        fontSize: FontSize.md,
                        lineHeight: 22,
                      },
                      paragraph: {
                        marginTop: 0,
                        marginBottom: 10,
                      },
                      strong: {
                        fontFamily: 'Inter-Bold',
                        fontWeight: '700',
                        color: Colors.primary,
                      },
                      link: {
                        color: Colors.info,
                      },
                    }}
                  >
                    {message.content}
                  </Markdown>
                  {message.reasoning_steps && message.reasoning_steps.length > 0 && (
                    <ReasoningStepsDisplay steps={message.reasoning_steps} />
                  )}
                </View>
              )}
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
  // Chain-of-thought thinking styles
  thinkingContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  thinkingTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  thinkingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: 4,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  thinkingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginLeft: 28,
  },
  // Reasoning steps toggle in completed messages
  reasoningToggle: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  reasoningToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reasoningToggleText: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    flex: 1,
  },
  reasoningStepsList: {
    marginTop: Spacing.sm,
  },
  reasoningStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginVertical: 2,
  },
  reasoningStepText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
});
