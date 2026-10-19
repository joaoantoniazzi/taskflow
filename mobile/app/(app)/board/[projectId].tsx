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
        <Text style={styles.subtitle}>Projeto não informado.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando quadro...</Text>
      </View>
    );
  }

  if (projectQuery.isError || boardQuery.isError || !project || !board) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
        <Text style={styles.errorTitle}>Não foi possível abrir o quadro</Text>
        <Text style={styles.subtitle}>
          Verifique a conexão ou suas permissões.
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => void refresh()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backLinkWrap}>
          <Text style={styles.backLink}>‹ Voltar</Text>
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
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          hitSlop={10}
        >
          <Text style={styles.backButtonText}>‹ Projetos</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => {
            setFormError("");
            setTitle("");
            setDescription("");
            setPriority("MEDIUM");
            setModalVisible(true);
          }}
        >
          <Text style={styles.primaryButtonPlus}>＋</Text>
          <Text style={styles.primaryButtonText}>Nova tarefa</Text>
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshLoading}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
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
                      style={({ pressed }) => [
                        styles.taskCardContent,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.taskTopRow}>
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {task.title}
                        </Text>

                        <View
                          style={[
                            styles.priorityBadge,
                            task.priority === "HIGH" && styles.highPriority,
                            task.priority === "LOW" && styles.lowPriority,
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityText,
                              task.priority === "HIGH" &&
                                styles.highPriorityText,
                              task.priority === "LOW" && styles.lowPriorityText,
                            ]}
                          >
                            {priorityLabels[task.priority]}
                          </Text>
                        </View>
                      </View>

                      {task.description ? (
                        <Text style={styles.taskDescription} numberOfLines={2}>
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
                          style={({ pressed }) => [
                            styles.moveButton,
                            pressed && styles.pressed,
                          ]}
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
                          style={({ pressed }) => [
                            styles.moveButton,
                            pressed && styles.pressed,
                          ]}
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
        onRequestClose={() => {
          if (!createTask.isPending) setModalVisible(false);
        }}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.backdropTouch}
            onPress={() => {
              if (!createTask.isPending) setModalVisible(false);
            }}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingGroup}>
                <Text style={styles.modalEyebrow}>TASKFLOW / BOARD</Text>
                <Text style={styles.modalTitle}>Nova tarefa</Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.label}>Título</Text>
              <TextInput
                accessibilityLabel="Título da tarefa"
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex.: Implementar login"
                placeholderTextColor={colors.muted}
                maxLength={200}
                editable={!createTask.isPending}
              />

              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                accessibilityLabel="Descrição da tarefa"
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Detalhes da atividade"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={10000}
                textAlignVertical="top"
                editable={!createTask.isPending}
              />

              <Text style={styles.label}>Prioridade</Text>
              <View style={styles.priorityOptions}>
                {(["LOW", "MEDIUM", "HIGH"] as const).map((value) => {
                  const selected = priority === value;
                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.priorityOption,
                        selected && styles.priorityOptionSelected,
                      ]}
                      onPress={() => setPriority(value)}
                    >
                      <Text
                        style={[
                          styles.priorityOptionText,
                          selected && styles.priorityOptionTextSelected,
                        ]}
                      >
                        {priorityLabels[value]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {!!formError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.formError}>{formError}</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={createTask.isPending}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.primaryButton,
                    createTask.isPending && styles.disabled,
                  ]}
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
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: colors.secondary,
    fontSize: 13,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  projectHeader: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.text,
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 40,
    backgroundColor: colors.accent,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
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
  boardContent: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 18,
  },
  column: {
    backgroundColor: "#ECEAE4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  columnHeader: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  columnNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  columnName: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.3,
  },
  countBadge: {
    minWidth: 22,
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  countText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 11,
  },
  wipLabel: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
  },
  emptyColumn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    color: colors.secondary,
    fontSize: 12,
  },
  taskCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  taskCardContent: {
    gap: 8,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  taskTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highPriority: {
    backgroundColor: "#FBEDEA",
    borderColor: "#E5B8A8",
  },
  lowPriority: {
    backgroundColor: "#E5F0E9",
    borderColor: "#B8D5C2",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.secondary,
  },
  highPriorityText: {
    color: "#B54738",
  },
  lowPriorityText: {
    color: "#39765B",
  },
  taskDescription: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  taskMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  moveActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  moveButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: colors.surfaceMuted,
  },
  moveButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
  },
  errorBanner: {
    marginHorizontal: 22,
    marginBottom: 12,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FBEDEA",
    borderWidth: 1,
    borderColor: "#E5B8A8",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBannerText: {
    color: "#B54738",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  dismissText: {
    color: "#B54738",
    fontWeight: "700",
    fontSize: 13,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyEyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  backLinkWrap: {
    marginTop: 4,
  },
  backLink: {
    color: colors.accent,
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
    minHeight: 85,
    paddingVertical: 12,
  },
  priorityOptions: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  priorityOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  priorityOptionText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "600",
  },
  priorityOptionTextSelected: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  errorContainer: {
    backgroundColor: "#FBEDEA",
    padding: 10,
    borderRadius: 8,
  },
  formError: {
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
  cancelText: {
    color: colors.secondary,
    fontWeight: "600",
    fontSize: 13,
  },
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.7,
  },
});
