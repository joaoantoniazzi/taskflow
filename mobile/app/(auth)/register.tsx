import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";

const colors = {
  background: "#F4F3F0",
  surface: "#FFFFFF",
  text: "#24251F",
  secondary: "#77786F",
  muted: "#9A9A91",
  border: "#E7E5DE",
  accent: "#C65D32",
  accentDark: "#A84926",
};

export default function RegisterScreen() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Campos obrigatórios", "Preencha todos os campos.");
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Senha inválida",
        "A senha deve possuir pelo menos 8 caracteres.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Senhas diferentes", "A confirmação da senha não confere.");
      return;
    }

    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password);

      Alert.alert("Conta criada", "Agora entre com seu e-mail e sua senha.", [
        {
          text: "Continuar",
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Não foi possível cadastrar",
        error instanceof Error ? error.message : "Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <View style={styles.wordmark}>
            <Text style={styles.logo}>taskflow</Text>
            <View style={styles.wordmarkDot} />
          </View>

          <Text style={styles.subtitle}>
            Comece a organizar o trabalho da sua equipe.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            accessibilityLabel="Nome"
            style={styles.input}
            placeholder="Seu nome completo"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            accessibilityLabel="E-mail"
            style={styles.input}
            placeholder="voce@exemplo.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            accessibilityLabel="Senha"
            style={styles.input}
            placeholder="Mínimo de 8 caracteres"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            accessibilityLabel="Confirmar senha"
            style={styles.input}
            placeholder="Repita sua senha"
            placeholderTextColor={colors.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              loading && styles.disabled,
            ]}
            onPress={handleRegister}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta?</Text>

            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.link}>Entrar</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    marginBottom: 28,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: colors.text,
  },
  wordmarkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
    marginTop: 11,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.secondary,
  },
  form: {
    padding: 22,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  label: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 2,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  button: {
    minHeight: 48,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonPressed: {
    backgroundColor: colors.accentDark,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 16,
  },
  footerText: {
    color: colors.secondary,
    fontSize: 13,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
});
