import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../lib/theme';

interface ButtonProps {
title: string;
onPress: () => void;
variant?: 'primary' | 'secondary' | 'tertiary';
size?: 'small' | 'medium' | 'large';
style?: ViewStyle;
disabled?: boolean;
}

export default function Button({
title,
onPress,
variant = 'primary',
size = 'medium',
style,
disabled = false,
}: ButtonProps) {
const bgColor =
variant === 'primary'
? colors.primary
: variant === 'secondary'
? colors.bgLight
: 'transparent';

const textColor =
variant === 'primary'
? colors.bgCardLight
: variant === 'secondary'
? colors.primary
: colors.primary;

const paddingVertical =
size === 'small' ? spacing.sm : size === 'medium' ? spacing.md : spacing.lg;

return (
<TouchableOpacity
style={[
styles.button,
{
backgroundColor: disabled ? colors.textMuted : bgColor,
paddingVertical,
borderWidth: variant === 'secondary' ? 1 : 0,
borderColor: variant === 'secondary' ? colors.primary : undefined,
},
style,
]}
onPress={onPress}
disabled={disabled}
activeOpacity={0.7}
>
<Text style={[styles.text, { color: textColor, fontSize: size === 'small' ? 14 : 16 }]}>
{title}
</Text>
</TouchableOpacity>
);
}

const styles = StyleSheet.create({
button: {
borderRadius: borderRadius.lg,
paddingHorizontal: spacing.lg,
justifyContent: 'center',
alignItems: 'center',
minHeight: 44,
},
text: {
fontWeight: '600',
},
});