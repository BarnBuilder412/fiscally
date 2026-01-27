import React, { useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../lib/theme';
import Button from '../../components/Button';

interface Message {
id: string;
sender: 'user' | 'agent';
text: string;
timestamp: string;
}

interface SubZeroNegotiationModalProps {
merchant: string;
amount: number;
onClose: () => void;
}

export default function SubZeroNegotiationModal({
merchant,
amount,
onClose,
}: SubZeroNegotiationModalProps) {
const [messages, setMessages] = useState<Message[]>([
{
id: '1',
sender: 'agent',
text: `Hi! I'm SubZero. I'll handle your ${merchant} refund.`,
timestamp: 'Just now',
},
{
id: '2',
sender: 'agent',
text: `What went wrong with this $${amount.toFixed(2)} charge? I'll take it from here.`,
timestamp: 'Just now',
},
]);
const [inputText, setInputText] = useState('');
const [confidenceScore, setConfidenceScore] = useState(45);

const handleSendMessage = () => {
if (!inputText.trim()) return;

const userMessage: Message = {
id: Date.now().toString(),
sender: 'user',
text: inputText,
timestamp: 'Just now',
};

setMessages([...messages, userMessage]);
setInputText('');
setConfidenceScore(Math.min(100, confidenceScore + 15));

// Simulate agent response
setTimeout(() => {
const agentMessage: Message = {
id: (Date.now() + 1).toString(),
sender: 'agent',
text: 'I found 7 similar cases. Merchants refunded 85% on average for this issue type.\n\nReady to push for your full refund?',
timestamp: 'Just now',
};
setMessages((prev) => [...prev, agentMessage]);
}, 800);
};

return (
<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
style={styles.keyboardAvoid}
>
{/* Header */}
<View style={[styles.header, shadows.sm]}>
<TouchableOpacity onPress={onClose} style={styles.closeButton}>
<MaterialCommunityIcons name="close" size={24} color={colors.textDark} />
</TouchableOpacity>
<View style={styles.headerInfo}>
<Text style={styles.headerMerchant}>{merchant}</Text>
<View style={styles.statusRow}>
<View style={styles.statusDot} />
<Text style={styles.statusText}>AI Negotiating</Text>
</View>
</View>
<View style={styles.confidenceContainer}>
<Text style={styles.confidenceValue}>{confidenceScore}%</Text>
<Text style={styles.confidenceLabel}>Confidence</Text>
</View>
</View>

{/* Messages */}
<ScrollView
style={styles.messagesScroll}
contentContainerStyle={styles.messagesContent}
showsVerticalScrollIndicator={false}
>
{messages.map((msg) => (
<View key={msg.id} style={styles.messageRow}>
{msg.sender === 'agent' && (
<View style={[styles.message, styles.agentMessage]}>
<Text style={styles.agentMessageText}>{msg.text}</Text>
</View>
)}
{msg.sender === 'user' && (
<View style={styles.userMessageContainer}>
<View style={[styles.message, styles.userMessage]}>
<Text style={styles.userMessageText}>{msg.text}</Text>
</View>
</View>
)}
</View>
))}
</ScrollView>

{/* Action Buttons */}
<View style={[styles.actions, shadows.lg]}>
<TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
<MaterialCommunityIcons
name="message-reply"
size={16}
color={colors.primary}
style={{ marginRight: spacing.sm }}
/>
<Text style={styles.actionButtonSecondaryText}>Counter</Text>
</TouchableOpacity>
<TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
<Text style={styles.actionButtonPrimaryText}>Accept Offer</Text>
</TouchableOpacity>
</View>

{/* Input */}
<View style={[styles.inputContainer, shadows.md]}>
<TextInput
style={styles.input}
placeholder="Message AI agent..."
placeholderTextColor={colors.textMuted}
value={inputText}
onChangeText={setInputText}
multiline
maxLength={500}
/>
<TouchableOpacity
onPress={handleSendMessage}
disabled={!inputText.trim()}
style={styles.sendButton}
>
<MaterialCommunityIcons
name="send"
size={20}
color={inputText.trim() ? colors.primary : colors.textMuted}
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
backgroundColor: colors.bgLight,
},
keyboardAvoid: {
flex: 1,
},
header: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
backgroundColor: colors.bgCardLight,
borderBottomColor: colors.borderLight,
borderBottomWidth: 1,
},
closeButton: {
marginRight: spacing.md,
padding: spacing.sm,
},
headerInfo: {
flex: 1,
},
headerMerchant: {
...typography.body,
color: colors.textDark,
fontWeight: '600',
},
statusRow: {
flexDirection: 'row',
alignItems: 'center',
marginTop: spacing.xs,
gap: spacing.xs,
},
statusDot: {
width: 8,
height: 8,
borderRadius: 4,
backgroundColor: colors.success,
},
statusText: {
...typography.bodySmall,
color: colors.success,
},
confidenceContainer: {
alignItems: 'center',
marginLeft: spacing.lg,
},
confidenceValue: {
...typography.h3,
color: colors.primary,
},
confidenceLabel: {
...typography.label,
color: colors.textMuted,
fontSize: 9,
},
messagesScroll: {
flex: 1,
},
messagesContent: {
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
},
messageRow: {
marginBottom: spacing.md,
},
message: {
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
borderRadius: borderRadius.lg,
maxWidth: '85%',
},
agentMessage: {
backgroundColor: colors.bgLight,
marginRight: 'auto',
},
agentMessageText: {
...typography.body,
color: colors.textDark,
lineHeight: 22,
},
userMessageContainer: {
alignItems: 'flex-end',
},
userMessage: {
backgroundColor: colors.primary,
},
userMessageText: {
...typography.body,
color: colors.bgCardLight,
},
actions: {
flexDirection: 'row',
gap: spacing.md,
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
backgroundColor: colors.bgCardLight,
borderTopColor: colors.borderLight,
borderTopWidth: 1,
},
actionButton: {
flex: 1,
flexDirection: 'row',
paddingVertical: spacing.sm,
paddingHorizontal: spacing.md,
borderRadius: borderRadius.md,
justifyContent: 'center',
alignItems: 'center',
},
actionButtonPrimary: {
backgroundColor: colors.primary,
},
actionButtonPrimaryText: {
...typography.bodySmall,
color: colors.bgCardLight,
fontWeight: '600',
},
actionButtonSecondary: {
backgroundColor: colors.bgLight,
borderWidth: 1,
borderColor: colors.borderLight,
},
actionButtonSecondaryText: {
...typography.bodySmall,
color: colors.primary,
fontWeight: '600',
},
inputContainer: {
flexDirection: 'row',
alignItems: 'center',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
backgroundColor: colors.bgCardLight,
borderTopColor: colors.borderLight,
borderTopWidth: 1,
gap: spacing.md,
},
input: {
flex: 1,
...typography.body,
color: colors.textDark,
backgroundColor: colors.bgLight,
borderRadius: borderRadius.md,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
maxHeight: 100,
},
sendButton: {
padding: spacing.sm,
},
});
