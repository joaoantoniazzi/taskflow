import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
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
import type { Project, Team } from "../../src/types/api";

type ProjectListResponse = {
  projects: Project[];
};

type TeamListResponse = {
  teams: Team[];
};

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

const projectPalettes = [
  { background: "#F7E9E1", foreground: "#A84926" },
  { background: "#E8EDE4", foreground: "#4D6B45" },
  { background: "#E9E8F2", foreground: "#68618F" },
  { background: "#F3EBCF", foreground: "#8C7029" },
  { background: "#E2ECEE", foreground: "#47737A" },
];

export default function ProjectsScreen() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<"team" | "project" | null>(null);

  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [formError, setFormError] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiRequest<TeamListResponse>("/teams"),
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiRequest<ProjectListResponse>("/projects"),
  });

  const createTeam = useMutation({
    mutationFn: (name: string) =>
      apiRequest<{ team: Team }>("/teams", {
        method: "POST",
        body: { name },
      }),

    onSuccess: async () => {
      setTeamName("");
      setFormError("");
      setModal(null);

      await queryClient.invalidateQueries({
        queryKey: ["teams"],
      });
    },

    onError: (error) => {
      setFormError(error.message);
    },
  });

  const createProject = useMutation({
    mutationFn: (input: {
      teamId: string;
      name: string;
      description: string;
    }) =>
      apiRequest<{ project: Project }>(`/teams/${input.teamId}/projects`, {
        method: "POST",
        body: {
          name: input.name,
          description: input.description || undefined,
        },
      }),

    onSuccess: async () => {
      setProjectName("");
      setDescription("");
      setSelectedTeamId("");
      setFormError("");
      setModal(null);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["projects"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["teams"],
        }),
      ]);
    },

    onError: (error) => {
      setFormError(error.message);
    },
  });

  const projects = projectsQuery.data?.projects ?? [];
  const teams = teamsQuery.data?.teams ?? [];

  function openProjectModal() {
    setFormError("");
    setSelectedTeamId(teams[0]?.id ?? "");
    setModal("project");
  }

  function submitTeam() {
    setFormError("");

    if (teamName.trim().length < 2) {
      setFormError("O nome da equipe deve ter pelo menos 2 caracteres.");
      return;
    }

    createTeam.mutate(teamName.trim());
  }

  function submitProject() {
    setFormError("");

    if (!selectedTeamId) {
      setFormError("Selecione uma equipe.");
      return;
    }

    if (projectName.trim().length < 2) {
      setFormError("O nome do projeto deve ter pelo menos 2 caracteres.");
      return;
    }

    createProject.mutate({
      teamId: selectedTeamId,
      name: projectName.trim(),
      description: description.trim(),
    });
  }

  const loading = projectsQuery.isLoading || teamsQuery.isLoading;
  const refreshing = projectsQuery.isRefetching || teamsQuery.isRefetching;

  async function refresh() {
    await Promise.all([projectsQuery.refetch(), teamsQuery.refetch()]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.brandGroup}>
          <View style={styles.wordmark}>
            <Text style={styles.brand}>taskflow</Text>
            <View style={styles.wordmarkDot} />
          </View>
          <Text style={styles.greeting}>
            Olá, {user?.name?.trim().split(/\s+/)[0] || "usuário"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={({ pressed }) => [
              styles.textButton,
              pressed && styles.pressed,
            ]}
            hitSlop={10}
          >
            <Text style={styles.textButtonLabel}>Sair ↗</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push("/(app)/teams")}
        >
          <Text style={styles.quickActionText}>Equipes</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push("/(app)/profile")}
        >
          <Text style={styles.quickActionText}>Perfil</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push("/(app)/notifications")}
        >
          <Text style={styles.quickActionText}>Avisos</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.title}>Meus projetos</Text>
          <Text style={styles.subtitle}>Seus espaços de trabalho</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={openProjectModal}
        >
          <Text style={styles.primaryButtonPlus}>＋</Text>
          <Text style={styles.primaryButtonLabel}>Novo projeto</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {loading ? (
          <View style={styles.loaderState}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loaderText}>Carregando projetos...</Text>
          </View>
        ) : projectsQuery.isError || teamsQuery.isError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
            <Text style={styles.emptyTitle}>
              Não foi possível carregar os dados
            </Text>
            <Text style={styles.subtitle}>
              Verifique a conexão com a API e tente atualizar.
            </Text>

            <Pressable
              onPress={() => void refresh()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonLabel}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEyebrow}>COMECE A ORGANIZAR</Text>
            <Text style={styles.emptyTitle}>Nenhum projeto ainda</Text>
            <Text style={styles.subtitle}>
              Crie uma equipe e depois organize seu primeiro projeto em um
              quadro Kanban.
            </Text>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setFormError("");
                setTeamName("");
                setModal("team");
              }}
            >
              <Text style={styles.secondaryButtonLabel}>Criar equipe</Text>
            </Pressable>
          </View>
        ) : (
          projects.map((project, index) => {
            const palette = projectPalettes[index % projectPalettes.length];
            const initial = project.name.trim().charAt(0).toUpperCase() || "P";

            return (
              <Pressable
                key={project.id}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.projectCard,
                  pressed && styles.projectCardPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/board/[projectId]",
                    params: {
                      projectId: project.id,
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.projectInitialWrap,
                    { backgroundColor: palette.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.projectInitial,
                      { color: palette.foreground },
                    ]}
                  >
                    {initial}
                  </Text>
                </View>

                <View style={styles.projectInfo}>
                  <Text style={styles.projectName} numberOfLines={2}>
                    {project.name}
                  </Text>
                  <Text style={styles.teamName} numberOfLines={1}>
                    {project.team.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.taskStatusDot} />
                    <Text style={styles.taskCount}>
                      {project.taskCount}{" "}
                      {project.taskCount === 1 ? "tarefa" : "tarefas"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })
        )}

        {!loading && teams.length === 0 && projects.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButtonFull,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setFormError("");
              setModal("team");
            }}
          >
            <Text style={styles.secondaryButtonLabel}>+ Criar equipe</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={modal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!createTeam.isPending && !createProject.isPending) setModal(null);
        }}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.backdropTouch}
            onPress={() => {
              if (!createTeam.isPending && !createProject.isPending)
                setModal(null);
            }}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingGroup}>
                <Text style={styles.modalEyebrow}>TASKFLOW / WORKSPACE</Text>
                <Text style={styles.modalTitle}>
                  {modal === "team" ? "Nova equipe" : "Novo projeto"}
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setModal(null)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {modal === "team" ? (
                <>
                  <Text style={styles.label}>Nome da equipe</Text>
                  <TextInput
                    accessibilityLabel="Nome da equipe"
                    style={styles.input}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="Ex.: Equipe de desenvolvimento"
                    placeholderTextColor={colors.muted}
                    editable={!createTeam.isPending}
                    maxLength={120}
                    autoCapitalize="words"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Equipe responsável</Text>

                  <View style={styles.teamOptionsList}>
                    {teams.map((team) => {
                      const selected = selectedTeamId === team.id;
                      return (
                        <Pressable
                          key={team.id}
                          style={[
                            styles.teamOption,
                            selected && styles.teamOptionSelected,
                          ]}
                          onPress={() => setSelectedTeamId(team.id)}
                        >
                          <View style={styles.teamOptionContent}>
                            <Text
                              style={[
                                styles.teamOptionText,
                                selected && styles.teamOptionTextSelected,
                              ]}
                            >
                              {team.name}
                            </Text>
                            <Text style={styles.teamRole}>{team.role}</Text>
                          </View>
                          <View
                            style={[
                              styles.radioOuter,
                              selected && styles.radioOuterSelected,
                            ]}
                          >
                            {selected && <View style={styles.radioInner} />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {teams.length === 0 && (
                    <Text style={styles.subtitle}>
                      Você precisa criar uma equipe primeiro.
                    </Text>
                  )}

                  <Text style={styles.label}>Nome do projeto</Text>
                  <TextInput
                    accessibilityLabel="Nome do projeto"
                    style={styles.input}
                    value={projectName}
                    onChangeText={setProjectName}
                    placeholder="Ex.: Aplicativo móvel"
                    placeholderTextColor={colors.muted}
                    maxLength={150}
                    editable={!createProject.isPending}
                  />

                  <Text style={styles.label}>Descrição (opcional)</Text>
                  <TextInput
                    accessibilityLabel="Descrição do projeto"
                    style={[styles.input, styles.multiline]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Qual é o objetivo do projeto?"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={5000}
                    textAlignVertical="top"
                    editable={!createProject.isPending}
                  />
                </>
              )}

              {!!formError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setModal(null)}
                  disabled={createTeam.isPending || createProject.isPending}
                >
                  <Text style={styles.cancelButtonLabel}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.primaryButton,
                    (createTeam.isPending ||
                      createProject.isPending ||
                      (modal === "project" && teams.length === 0)) &&
                      styles.disabled,
                  ]}
                  disabled={
                    createTeam.isPending ||
                    createProject.isPending ||
                    (modal === "project" && teams.length === 0)
                  }
                  onPress={modal === "team" ? submitTeam : submitProject}
                >
                  {createTeam.isPending || createProject.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>Criar</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandGroup: {
    flex: 1,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.text,
  },
  wordmarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  greeting: {
    marginTop: 2,
    fontSize: 13,
    color: colors.secondary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textButtonLabel: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickActionText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  sectionHeader: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 12,
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
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  projectCardPressed: {
    backgroundColor: colors.surfaceMuted,
    borderColor: "#D8C7BC",
  },
  pressed: {
    opacity: 0.7,
  },
  projectInitialWrap: {
    width: 48,
    height: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  projectInitial: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  projectInfo: {
    flex: 1,
    gap: 3,
  },
  projectName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  teamName: {
    fontSize: 12,
    color: colors.secondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  taskStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  taskCount: {
    fontSize: 12,
    color: colors.secondary,
  },
  chevron: {
    fontSize: 24,
    color: colors.muted,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "flex-start",
    gap: 8,
  },
  emptyEyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: colors.surface,
  },
  secondaryButtonFull: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  secondaryButtonLabel: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(36, 37, 31, 0.42)",
  },
  backdropTouch: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "90%",
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
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
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
  modalScrollContent: {
    paddingBottom: 20,
    gap: 10,
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
  multiline: {
    minHeight: 84,
    paddingVertical: 12,
  },
  teamOptionsList: {
    gap: 8,
  },
  teamOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  teamOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  teamOptionContent: {
    flex: 1,
    gap: 2,
  },
  teamOptionText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  teamOptionTextSelected: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  teamRole: {
    color: colors.secondary,
    fontSize: 11,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  errorContainer: {
    backgroundColor: "#FBEDEA",
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: "#B54738",
    fontSize: 13,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  cancelButtonLabel: {
    color: colors.secondary,
    fontWeight: "600",
    fontSize: 13,
  },
  disabled: {
    opacity: 0.65,
  },
});
