import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../src/auth/auth-context";
import { apiRequest } from "../../src/lib/api";
import type { User, UserProfile } from "../../src/types/api";

const colors = {
  background: "#F4F3F0",
  surface: "#FFFFFF",
  surfaceMuted: "#F8F7F4",
  text: "#24251F",
  secondary: "#77786F",
  muted: "#9A9A91",
  border: "#E7E5DE",
  accent: "#C65D32",
  accentDark: "#A84926",
  accentSoft: "#F7E9E1",
};

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const { user, updateUser, signOut } = useAuth();

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiRequest<{ user: UserProfile }>("/users/me"),
  });

  const profile = profileQuery.data?.user;

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAvatarUrl(profile.avatarUrl ?? "");
    }
  }, [profile?.id, profile?.updatedAt]);

  const updateProfile = useMutation({
    mutationFn: () =>
      apiRequest<{ user: UserProfile }>("/users/me", {
        method: "PATCH",
        body: {
          name: name.trim(),
          avatarUrl: avatarUrl.trim() || null,
        },
      }),

    onSuccess: async ({ user: updatedProfile }) => {
      const updatedUser: User = {
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        avatarUrl: updatedProfile.avatarUrl,
        createdAt: updatedProfile.createdAt,
      };

      await updateUser(updatedUser);

      queryClient.setQueryData(["profile"], { user: updatedProfile });

      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      Alert.alert("Perfil atualizado", "Suas alterações foram salvas.");
    },
  });

  function handleSave() {
    if (name.trim().length < 2) {
      Alert.alert(
        "Nome inválido",
        "Informe um nome com pelo menos 2 caracteres.",
      );
      return;
    }

    if (avatarUrl.trim() && !/^https?:\/\/.+/i.test(avatarUrl.trim())) {
      Alert.alert(
        "URL inválida",
        "O endereço da imagem deve começar com http:// ou https://.",
      );
      return;
    }

    updateProfile.mutate();
  }

  if (profileQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loaderText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
        <Text style={styles.title}>Não foi possível carregar o perfil.</Text>

        <Pressable
          onPress={() => void profileQuery.refetch()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Tentar novamente</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backLinkWrap}>
          <Text style={styles.link}>‹ Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const currentAvatar = avatarUrl.trim() || profile.avatarUrl;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          hitSlop={10}
        >
          <Text style={styles.link}>‹ Voltar</Text>
        </Pressable>

        <Text style={styles.title}>Meu perfil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.avatar}>
          {currentAvatar ? (
            <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>

        <Text style={styles.displayName}>{user?.name ?? profile.name}</Text>

        <Text style={styles.email}>{profile.email}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nome</Text>

          <TextInput
            accessibilityLabel="Nome"
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={120}
            placeholder="Seu nome"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>URL da foto (opcional)</Text>

          <TextInput
            accessibilityLabel="URL do avatar"
            style={styles.input}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://exemplo.com/foto.jpg"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.hint}>
            Este campo guarda apenas o endereço da imagem. O upload de fotos
            ainda não faz parte do MVP.
          </Text>

          {!!updateProfile.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{updateProfile.error.message}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              updateProfile.isPending && styles.disabled,
            ]}
            disabled={updateProfile.isPending}
            onPress={handleSave}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar alterações</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>E-mail da conta</Text>

          <Text style={styles.readOnly}>{profile.email}</Text>

          <Text style={styles.hint}>
            O e-mail não pode ser alterado nesta versão.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            Alert.alert("Sair da conta", "Deseja encerrar sua sessão?", [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Sair",
                style: "destructive",
                onPress: () => void signOut(),
              },
            ])
          }
        >
          <Text style={styles.signOutText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 52,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.6,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    alignItems: "stretch",
    gap: 14,
    paddingBottom: 40,
  },
  avatar: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5B8A8",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: colors.accentDark,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  displayName: {
    color: colors.text,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: -2,
  },
  email: {
    color: colors.secondary,
    textAlign: "center",
    fontSize: 13,
    marginTop: -8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  label: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.secondary,
  },
  errorContainer: {
    backgroundColor: "#FBEDEA",
    padding: 10,
    borderRadius: 8,
  },
  error: {
    color: "#B54738",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 4,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentDark,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  readOnly: {
    padding: 12,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.secondary,
    fontSize: 14,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#E5B8A8",
    backgroundColor: "#FBEDEA",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  signOutText: {
    color: "#B54738",
    fontWeight: "700",
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  loaderText: {
    color: colors.secondary,
    fontSize: 13,
  },
  emptyEyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  backLinkWrap: {
    marginTop: 4,
  },
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.65,
  },
});
