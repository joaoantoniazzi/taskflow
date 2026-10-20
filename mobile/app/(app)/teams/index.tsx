import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../src/lib/api";
import type { Team } from "../../../src/types/api";

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

const teamPalettes = [
  { background: "#F7E9E1", foreground: "#A84926" },
  { background: "#E8EDE4", foreground: "#4D6B45" },
  { background: "#E9E8F2", foreground: "#68618F" },
  { background: "#F3EBCF", foreground: "#8C7029" },
  { background: "#E2ECEE", foreground: "#47737A" },
];

export default function TeamsScreen() {
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiRequest<{ teams: Team[] }>("/teams"),
  });

  const createTeam = useMutation({
    mutationFn: () =>
      apiRequest<{ team: Team }>("/teams", {
        method: "POST",
        body: { name: name.trim() },
      }),

    onSuccess: async () => {
      setName("");
      setError("");
      setModalVisible(false);

      await queryClient.invalidateQueries({
        queryKey: ["teams"],
      });
    },

    onError: (e) => setError(e.message),
  });

  function submit() {
    if (name.trim().length < 2) {
      setError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    setError("");
    createTeam.mutate();
  }

  const teams = teamsQuery.data?.teams ?? [];

  return (
    <View style={styles.screen}>
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

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyEyebrow}>ORGANIZAÇÃO</Text>
            <Text style={styles.title}>Minhas equipes</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => {
              setError("");
              setName("");
              setModalVisible(true);
            }}
          >
            <Text style={styles.primaryButtonPlus}>＋</Text>
            <Text style={styles.primaryButtonText}>Nova equipe</Text>
          </Pressable>
        </View>
      </View>

      {teamsQuery.isLoading ? (
        <View style={styles.loaderState}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loaderText}>Carregando equipes...</Text>
        </View>
      ) : teamsQuery.isError ? (
        <View style={styles.emptyCardContainer}>
          <View style={styles.empty}>
            <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
            <Text style={styles.cardTitle}>
              Não foi possível carregar as equipes.
            </Text>
            <Pressable
              onPress={() => void teamsQuery.refetch()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {teams.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEyebrow}>SEM VÍNCULOS</Text>
              <Text style={styles.cardTitle}>
                Você ainda não pertence a uma equipe.
              </Text>
              <Text style={styles.muted}>
                Crie uma equipe para começar a colaborar com outras pessoas.
              </Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setError("");
                  setName("");
                  setModalVisible(true);
                }}
              >
                <Text style={styles.secondaryButtonText}>Criar equipe</Text>
              </Pressable>
            </View>
          ) : (
            teams.map((team, index) => {
              const palette = teamPalettes[index % teamPalettes.length];
              const initial = team.name.trim().charAt(0).toUpperCase() || "E";

              return (
                <Pressable
                  key={team.id}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/teams/[teamId]",
                      params: { teamId: team.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: palette.background },
                    ]}
                  >
                    <Text
                      style={[styles.avatarText, { color: palette.foreground }]}
                    >
                      {initial}
                    </Text>
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {team.name}
                    </Text>

                    <Text style={styles.muted} numberOfLines={1}>
                      {team.memberCount}{" "}
                      {team.memberCount === 1 ? "membro" : "membros"} ·{" "}
                      {team.projectCount}{" "}
                      {team.projectCount === 1 ? "projeto" : "projetos"}
                    </Text>

                    <Text style={styles.role}>{team.role}</Text>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!createTeam.isPending) setModalVisible(false);
        }}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <Pressable
            style={styles.backdropTouch}
            onPress={() => {
              if (!createTeam.isPending) setModalVisible(false);
            }}
          />

          <View style={styles.modal}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingGroup}>
                <Text style={styles.modalEyebrow}>TASKFLOW / TEAMS</Text>
                <Text style={styles.title}>Nova equipe</Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Nome da equipe</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Equipe de desenvolvimento"
              placeholderTextColor={colors.muted}
              maxLength={120}
              autoCapitalize="words"
              editable={!createTeam.isPending}
            />

            {!!error && (
              <View style={styles.errorContainer}>
                <Text style={styles.error}>{error}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.cancel}
                disabled={createTeam.isPending}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={submit}
                disabled={createTeam.isPending}
                style={[
                  styles.primaryButton,
                  createTeam.isPending && styles.disabled,
                ]}
              >
                {createTeam.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Criar equipe</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D8C7BC",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  muted: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  role: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
  },
  emptyCardContainer: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  empty: {
    padding: 22,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyEyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  primaryButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentDark,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonPlus: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 15,
    fontWeight: "500",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  loaderState: {
    marginTop: 60,
    alignItems: "center",
    gap: 10,
  },
  loaderText: {
    color: colors.secondary,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36, 37, 31, 0.42)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  modal: {
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 12,
  },
  modalHandle: {
    width: 35,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#D8D5CC",
    alignSelf: "center",
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  modalHeadingGroup: {
    flex: 1,
    gap: 4,
  },
  modalEyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: colors.secondary,
    fontSize: 24,
    lineHeight: 24,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  cancel: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: colors.secondary,
    fontWeight: "600",
    fontSize: 13,
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
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.65,
  },
});
