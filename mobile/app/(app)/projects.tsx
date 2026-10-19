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
import { apiRequest, ApiError } from "../../src/lib/api";
import type { Project, Team } from "../../src/types/api";

type ProjectListResponse = {
  projects: Project[];
};

type TeamListResponse = {
  teams: Team[];
};

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
        <View>
          <Text style={styles.brand}>TaskFlow</Text>
          <Text style={styles.greeting}>Olá, {user?.name ?? "usuário"}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.textButton}
          onPress={() => router.push("/(app)/notifications")}
        >
          <Text style={styles.textButtonLabel}>Avisos</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={styles.textButton}
        >
          <Text style={styles.textButtonLabel}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.title}>Meus projetos</Text>
          <Text style={styles.subtitle}>Seus espaços de trabalho</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={openProjectModal}
        >
          <Text style={styles.primaryButtonLabel}>+ Projeto</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
      >
        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : projectsQuery.isError || teamsQuery.isError ? (
          <View style={styles.emptyState}>
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
          projects.map((project) => (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.projectCard,
                pressed && styles.pressed,
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
              <View style={styles.projectIcon}>
                <Text style={styles.projectIconLabel}>
                  {project.name.trim().charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{project.name}</Text>

                <Text style={styles.teamName}>{project.team.name}</Text>

                <Text style={styles.taskCount}>
                  {project.taskCount}{" "}
                  {project.taskCount === 1 ? "tarefa" : "tarefas"}
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}

        {!loading && teams.length === 0 && (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setFormError("");
              setModal("team");
            }}
          >
            <Text style={styles.secondaryButtonLabel}>Criar equipe</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        visible={modal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modal === "team" ? "Nova equipe" : "Novo projeto"}
            </Text>

            {modal === "team" ? (
              <>
                <Text style={styles.label}>Nome da equipe</Text>

                <TextInput
                  accessibilityLabel="Nome da equipe"
                  style={styles.input}
                  value={teamName}
                  onChangeText={setTeamName}
                  placeholder="Ex.: Equipe de desenvolvimento"
                  editable={!createTeam.isPending}
                  maxLength={120}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Equipe</Text>

                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    style={[
                      styles.teamOption,
                      selectedTeamId === team.id && styles.teamOptionSelected,
                    ]}
                    onPress={() => setSelectedTeamId(team.id)}
                  >
                    <Text
                      style={[
                        styles.teamOptionText,
                        selectedTeamId === team.id &&
                          styles.teamOptionTextSelected,
                      ]}
                    >
                      {team.name}
                    </Text>

                    <Text style={styles.teamRole}>{team.role}</Text>
                  </Pressable>
                ))}

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
                  maxLength={150}
                />

                <Text style={styles.label}>Descrição (opcional)</Text>

                <TextInput
                  accessibilityLabel="Descrição do projeto"
                  style={[styles.input, styles.multiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Qual é o objetivo do projeto?"
                  multiline
                  maxLength={5000}
                  textAlignVertical="top"
                />
              </>
            )}

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModal(null)}
              >
                <Text style={styles.cancelButtonLabel}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.primaryButton}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    paddingTop: 52,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 29,
    fontWeight: "800",
    color: "#2459D3",
  },
  greeting: {
    marginTop: 6,
    fontSize: 14,
    color: "#5B6474",
  },
  textButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  textButtonLabel: {
    color: "#2459D3",
    fontWeight: "700",
  },
  sectionHeader: {
    paddingHorizontal: 22,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#172033",
  },
  subtitle: {
    marginTop: 5,
    color: "#667085",
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: "#2459D3",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 13,
  },
  loader: {
    marginTop: 60,
  },
  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7EAF1",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#E7EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  projectIconLabel: {
    fontSize: 21,
    fontWeight: "800",
    color: "#2459D3",
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#172033",
  },
  teamName: {
    fontSize: 13,
    color: "#667085",
    marginTop: 4,
  },
  taskCount: {
    fontSize: 12,
    color: "#2459D3",
    marginTop: 7,
  },
  chevron: {
    fontSize: 28,
    color: "#98A2B3",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 24,
    alignItems: "flex-start",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#172033",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2459D3",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginTop: 8,
  },
  secondaryButtonLabel: {
    color: "#2459D3",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14, 24, 44, 0.45)",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    paddingBottom: 34,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 10,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 8,
  },
  label: {
    color: "#263247",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE2EC",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 15,
    color: "#172033",
  },
  multiline: {
    minHeight: 84,
    paddingVertical: 12,
  },
  teamOption: {
    borderWidth: 1,
    borderColor: "#DCE2EC",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamOptionSelected: {
    borderColor: "#2459D3",
    backgroundColor: "#F0F4FF",
  },
  teamOptionText: {
    color: "#263247",
    fontWeight: "600",
  },
  teamOptionTextSelected: {
    color: "#2459D3",
  },
  teamRole: {
    color: "#667085",
    fontSize: 11,
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  cancelButtonLabel: {
    color: "#475467",
    fontWeight: "600",
  },
});
