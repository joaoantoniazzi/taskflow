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
import { Link } from "expo-router";

import { useAuth } from "../../src/auth/auth-context";

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Campos obrigatórios", "Informe seu e-mail e sua senha.");
      return;
    }

    setLoading(true);

    try {
      await signIn(email.trim(), password);
    } catch (error) {
      Alert.alert(
        "Não foi possível entrar",
        error instanceof Error
          ? error.message
          : "Verifique suas credenciais e tente novamente.",
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
      >
        <View style={styles.heading}>
          <Text style={styles.logo}>TaskFlow</Text>

          <Text style={styles.subtitle}>
            Organize projetos. Acompanhe tarefas. Trabalhe em equipe.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>

          <TextInput
            accessibilityLabel="E-mail"
            style={styles.input}
            placeholder="voce@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <Text style={styles.label}>Senha</Text>

          <TextInput
            accessibilityLabel="Senha"
            style={styles.input}
            placeholder="Sua senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
          />

          <Pressable
            accessibilityRole="button"
            style={[styles.button, loading && styles.disabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ainda não possui uma conta?</Text>

            <Link href="/(auth)/register" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.link}>Criar conta</Text>
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
    backgroundColor: "#F5F7FB",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2459D3",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: "#5B6474",
  },
  form: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 18,
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#263247",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#DCE2EC",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#172033",
    marginBottom: 10,
  },
  button: {
    minHeight: 50,
    backgroundColor: "#2459D3",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  footerText: {
    color: "#5B6474",
  },
  link: {
    color: "#2459D3",
    fontWeight: "700",
  },
});
