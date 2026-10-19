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
      >
        <Text style={styles.logo}>Criar conta</Text>

        <Text style={styles.subtitle}>
          Comece a organizar o trabalho da sua equipe.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            accessibilityLabel="Nome"
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            accessibilityLabel="E-mail"
            style={styles.input}
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
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            accessibilityLabel="Confirmar senha"
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={[styles.button, loading && styles.disabled]}
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
    backgroundColor: "#F5F7FB",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2459D3",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 23,
    color: "#5B6474",
  },
  form: {
    padding: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    gap: 10,
  },
  label: {
    color: "#263247",
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DCE2EC",
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    minHeight: 50,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#2459D3",
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 14,
  },
  footerText: {
    color: "#5B6474",
  },
  link: {
    color: "#2459D3",
    fontWeight: "700",
  },
});
