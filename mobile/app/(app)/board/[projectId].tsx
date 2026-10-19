import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest, ApiError } from "../../../src/lib/api";

import type { Board, Project, TaskPriority } from "../../../src/types/api";

type BoardResponse = {
  board: Board;
};

type ProjectResponse = {
  project: Project;
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export default function BoardScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();

  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId;

  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");

  const [formError, setFormError] = useState("");
  const [moveError, setMoveError] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<ProjectResponse>(`/projects/${projectId}`),
  });

  const boardQuery = useQuery({
    queryKey: ["board", projectId],
    enabled: Boolean(projectId),
    queryFn: () => apiRequest<BoardResponse>(`/projects/${projectId}/board`),
  });

  const createTask = useMutation({
    mutationFn: () =>
      apiRequest<{ task: unknown }>(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
        },
      }),

    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setFormError("");
      setModalVisible(false);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["projects"],
        }),
      ]);
    },

    onError: (error) => {
      setFormError(error.message);
    },
  });

  const moveTask = useMutation({
    mutationFn: (input: {
      taskId: string;
      columnId: string;
      position: number;
    }) =>
      apiRequest(`/tasks/${input.taskId}/move`, {
        method: "PATCH",
        body: {
          columnId: input.columnId,
          position: input.position,
        },
      }),

    onSuccess: async () => {
      setMoveError("");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["board", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["projects"],
        }),
      ]);
    },

    onError: (error) => {
      setMoveError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível mover a tarefa.",
      );
    },
  });

  const project = projectQuery.data?.project;
  const board = boardQuery.data?.board;

  function handleCreateTask() {
    setFormError("");

    if (title.trim().length === 0) {
      setFormError("Informe o título da tarefa.");
      return;
    }

    createTask.mutate();
  }

  function handleMove(
    taskId: string,
    destinationColumnId: string,
    destinationPosition: number,
  ) {
    setMoveError("");

    moveTask.mutate({
      taskId,
      columnId: destinationColumnId,
      position: destinationPosition,
    });
  }

  async function refresh() {
    await Promise.all([projectQuery.refetch(), boardQuery.refetch()]);
  }

  const loading = projectQuery.isLoading || boardQuery.isLoading;

  const refreshLoading = projectQuery.isRefetching || boardQuery.isRefetching;

  if (!projectId) {
    return (
      <View style={styles.center}>
        <Text>Projeto não informado.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2459D3" />
        <Text style={styles.loadingText}>Carregando quadro...</Text>
      </View>
    );
  }

  if (projectQuery.isError || boardQuery.isError || !project || !board) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Não foi possível abrir o quadro</Text>

        <Text style={styles.subtitle}>
          Verifique a conexão ou suas permissões.
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => void refresh()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Projetos</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => {
            setFormError("");
            setTitle("");
            setDescription("");
            setPriority("MEDIUM");
            setModalVisible(true);
          }}
        >
          <Text style={styles.primaryButtonText}>+ Tarefa</Text>
        </Pressable>
      </View>

      <View style={styles.projectHeader}>
        <Text style={styles.projectTitle}>{project.name}</Text>

        <Text style={styles.subtitle}>{project.team.name}</Text>
      </View>

      {!!moveError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{moveError}</Text>

          <Pressable onPress={() => setMoveError("")}>
            <Text style={styles.dismissText}>Fechar</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.boardContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshLoading}
            onRefresh={() => void refresh()}
          />
        }
      >
        {board.columns.map((column, index) => (
          <View key={column.id} style={styles.column}>
            <View style={styles.columnHeader}>
              <View style={styles.columnNameRow}>
                <Text style={styles.columnName}>{column.name}</Text>

                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{column.tasks.length}</Text>
                </View>
              </View>

              <Text style={styles.wipLabel}>
                {column.wipLimit !== null
                  ? `Limite: ${column.wipLimit}`
                  : "Sem limite"}
              </Text>
            </View>

            {column.tasks.length === 0 ? (
              <Text style={styles.emptyColumn}>
                Nenhuma tarefa nesta etapa.
              </Text>
            ) : (
              column.tasks.map((task) => {
                const previousColumn = board.columns[index - 1];

                const nextColumn = board.columns[index + 1];

                return (
                  <View key={task.id} style={styles.taskCard}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir tarefa ${task.title}`}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/task/[taskId]",
                          params: { taskId: task.id },
                        })
                      }
                      style={styles.taskCardContent}
                    >
                      <View style={styles.taskTopRow}>
                        <Text style={styles.taskTitle}>{task.title}</Text>

                        <View
                          style={[
                            styles.priorityBadge,
                            task.priority === "HIGH" && styles.highPriority,
                            task.priority === "LOW" && styles.lowPriority,
                          ]}
                        >
                          <Text style={styles.priorityText}>
                            {priorityLabels[task.priority]}
                          </Text>
                        </View>
                      </View>

                      {task.description ? (
                        <Text style={styles.taskDescription}>
                          {task.description}
                        </Text>
                      ) : null}

                      {task.assignee && (
                        <Text style={styles.taskMeta}>
                          Responsável: {task.assignee.name}
                        </Text>
                      )}

                      {task.dueDate && (
                        <Text style={styles.taskMeta}>
                          Prazo:{" "}
                          {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                        </Text>
                      )}
                    </Pressable>

                    <View style={styles.moveActions}>
                      {previousColumn && (
                        <Pressable
                          accessibilityRole="button"
                          style={styles.moveButton}
                          disabled={moveTask.isPending}
                          onPress={() =>
                            handleMove(
                              task.id,
                              previousColumn.id,
                              previousColumn.tasks.length,
                            )
                          }
                        >
                          <Text style={styles.moveButtonText}>
                            ← {previousColumn.name}
                          </Text>
                        </Pressable>
                      )}

                      {nextColumn && (
                        <Pressable
                          accessibilityRole="button"
                          style={styles.moveButton}
                          disabled={moveTask.isPending}
                          onPress={() =>
                            handleMove(
                              task.id,
                              nextColumn.id,
                              nextColumn.tasks.length,
                            )
                          }
                        >
                          <Text style={styles.moveButtonText}>
                            {nextColumn.name} →
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nova tarefa</Text>

            <Text style={styles.label}>Título</Text>

            <TextInput
              accessibilityLabel="Título da tarefa"
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Implementar login"
              maxLength={200}
              editable={!createTask.isPending}
            />

            <Text style={styles.label}>Descrição</Text>

            <TextInput
              accessibilityLabel="Descrição da tarefa"
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhes da atividade"
              multiline
              maxLength={10000}
              textAlignVertical="top"
              editable={!createTask.isPending}
            />

            <Text style={styles.label}>Prioridade</Text>

            <View style={styles.priorityOptions}>
              {(["LOW", "MEDIUM", "HIGH"] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[
                    styles.priorityOption,
                    priority === value && styles.priorityOptionSelected,
                  ]}
                  onPress={() => setPriority(value)}
                >
                  <Text
                    style={[
                      styles.priorityOptionText,
                      priority === value && styles.priorityOptionTextSelected,
                    ]}
                  >
                    {priorityLabels[value]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!!formError && <Text style={styles.formError}>{formError}</Text>}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.primaryButton}
                disabled={createTask.isPending}
                onPress={handleCreateTask}
              >
                {createTask.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Criar tarefa</Text>
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
    paddingTop: 48,
  },
  center: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  loadingText: {
    color: "#667085",
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: 10,
    paddingRight: 12,
  },
  backButtonText: {
    color: "#2459D3",
    fontWeight: "700",
    fontSize: 15,
  },
  projectHeader: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
  },
  projectTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#172033",
  },
  subtitle: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  primaryButton: {
    minHeight: 42,
    backgroundColor: "#2459D3",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  boardContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 18,
  },
  column: {
    backgroundColor: "#E9EDF5",
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  columnHeader: {
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  columnNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  columnName: {
    fontWeight: "800",
    fontSize: 17,
    color: "#243047",
  },
  countBadge: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "#344054",
    fontWeight: "700",
    fontSize: 12,
  },
  wipLabel: {
    fontSize: 12,
    color: "#667085",
    marginTop: 6,
  },
  emptyColumn: {
    backgroundColor: "#F8F9FC",
    borderWidth: 1,
    borderColor: "#DFE4EC",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 18,
    textAlign: "center",
    color: "#667085",
    fontSize: 13,
  },
  taskCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8EF",
    gap: 10,
  },
  taskTopRow: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  taskTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    color: "#172033",
    flexShrink: 1,
  },
  priorityBadge: {
    backgroundColor: "#FFF1C2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  highPriority: {
    backgroundColor: "#FEE4E2",
  },
  lowPriority: {
    backgroundColor: "#E4F4E8",
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#344054",
  },
  taskDescription: {
    color: "#475467",
    fontSize: 13,
    lineHeight: 20,
  },
  taskMeta: {
    fontSize: 12,
    color: "#667085",
  },
  moveActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 3,
  },
  moveButton: {
    borderWidth: 1,
    borderColor: "#D5DDEB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  moveButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2459D3",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FEE4E2",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBannerText: {
    color: "#B42318",
    flex: 1,
    fontSize: 13,
  },
  dismissText: {
    color: "#B42318",
    fontWeight: "700",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#172033",
    textAlign: "center",
  },
  backLink: {
    marginTop: 8,
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
    minHeight: 85,
    paddingVertical: 12,
  },
  priorityOptions: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DCE2EC",
    alignItems: "center",
  },
  priorityOptionSelected: {
    borderColor: "#2459D3",
    backgroundColor: "#F0F4FF",
  },
  priorityOptionText: {
    fontSize: 13,
    color: "#475467",
    fontWeight: "600",
  },
  priorityOptionTextSelected: {
    color: "#2459D3",
  },
  formError: {
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
  cancelText: {
    color: "#475467",
    fontWeight: "600",
  },
  taskCardContent: {
    gap: 10,
  },
});
