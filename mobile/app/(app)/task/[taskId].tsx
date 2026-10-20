import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../src/lib/api";
import type { TaskPriority, User } from "../../../src/types/api";

type TaskDetails = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  column: {
    id: string;
    name: string;
    type: "TODO" | "DOING" | "DONE";
    position: number;
  };
  project: {
    id: string;
    name: string;
  };
  assignee: {
    id: string;
    name: string;
    email?: string;
    avatarUrl: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
};

type CommentItem = {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

type TeamResponse = {
  team: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      role: "OWNER" | "ADMIN" | "MEMBER";
    }>;
  };
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

const priorities: {
  value: TaskPriority;
  label: string;
}[] = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
];

function formatDate(value: string | Date | null) {
  if (!value) {
    return "Sem prazo";
  }

  const date = value instanceof Date ? value : new Date(value);

  return date.toLocaleDateString("pt-BR");
}

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{ taskId: string }>();

  const taskId = Array.isArray(params.taskId)
    ? params.taskId[0]
    : params.taskId;

  const queryClient = useQueryClient();
  const initializedTaskId = useRef<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);

  const [commentText, setCommentText] = useState("");

  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    enabled: Boolean(taskId),
    queryFn: () => apiRequest<{ task: TaskDetails }>(`/tasks/${taskId}`),
  });

  const task = taskQuery.data?.task;

  const projectId = task?.project.id;

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    enabled: Boolean(projectId),
    queryFn: () =>
      apiRequest<{
        project: {
          id: string;
          team: { id: string; name: string };
        };
      }>(`/projects/${projectId}`),
  });

  const teamId = projectQuery.data?.project.team.id;

  const teamQuery = useQuery({
    queryKey: ["team", teamId],
    enabled: Boolean(teamId),
    queryFn: () => apiRequest<TeamResponse>(`/teams/${teamId}`),
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", taskId],
    enabled: Boolean(taskId),
    queryFn: () =>
      apiRequest<{ comments: CommentItem[] }>(`/tasks/${taskId}/comments`),
  });

  useEffect(() => {
    if (!task || initializedTaskId.current === task.id) {
      return;
    }

    initializedTaskId.current = task.id;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setAssigneeId(task.assignee?.id ?? "");
    setDueDate(task.dueDate ? new Date(task.dueDate) : null);
  }, [task]);

  const saveTask = useMutation({
    mutationFn: () => {
      const deadline = dueDate ? new Date(dueDate) : null;

      if (deadline) {
        deadline.setHours(23, 59, 59, 999);
      }

      return apiRequest<{ task: TaskDetails }>(`/tasks/${taskId}`, {
        method: "PATCH",
        body: {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          assigneeId: assigneeId || null,
          dueDate: deadline ? deadline.toISOString() : null,
        },
      });
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["task", taskId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["board"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["projects"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications"],
        }),
      ]);

      Alert.alert("Tarefa atualizada", "As alterações foram salvas.");
    },
  });

  const createComment = useMutation({
    mutationFn: () =>
      apiRequest<{ comment: CommentItem }>(`/tasks/${taskId}/comments`, {
        method: "POST",
        body: {
          content: commentText.trim(),
        },
      }),

    onSuccess: async () => {
      setCommentText("");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["comments", taskId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["notifications"],
        }),
      ]);
    },
  });

  const comments = commentsQuery.data?.comments ?? [];
  const members = teamQuery.data?.team.members ?? [];

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (event.type === "set" && selectedDate) {
      setDueDate(selectedDate);
    }

    if (Platform.OS === "android") {
      setShowAndroidDatePicker(false);
    }
  }

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Título obrigatório", "Informe o título da tarefa.");
      return;
    }

    saveTask.mutate();
  }

  function handleAddComment() {
    if (!commentText.trim()) {
      return;
    }

    createComment.mutate();
  }

  if (taskQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.muted}>Carregando tarefa...</Text>
      </View>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
        <Text style={styles.title}>Não foi possível carregar a tarefa</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void taskQuery.refetch()}
        >
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backLinkWrap}>
          <Text style={styles.link}>‹ Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} // Ajuste opcional se houver header customizado
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

        <Text style={styles.headerCaption}>{task.column.name}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.projectName}>{task.project.name}</Text>
        <Text style={styles.title}>Detalhes da tarefa</Text>

        <Text style={styles.label}>Título</Text>
        <TextInput
          accessibilityLabel="Título da tarefa"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.muted}
          maxLength={200}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          accessibilityLabel="Descrição da tarefa"
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={10000}
          textAlignVertical="top"
          placeholder="Descreva a tarefa..."
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.optionsRow}>
          {priorities.map((item) => {
            const selected = priority === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setPriority(item.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Responsável</Text>
        {teamQuery.isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : teamQuery.isError ? (
          <Text style={styles.muted}>
            Não foi possível carregar os membros da equipe.
          </Text>
        ) : (
          <View style={styles.memberList}>
            <Pressable
              style={({ pressed }) => [
                styles.memberOption,
                !assigneeId && styles.memberSelected,
                pressed && styles.pressed,
              ]}
              onPress={() => setAssigneeId("")}
            >
              <Text style={styles.memberText}>Sem responsável</Text>
              {!assigneeId && <Text style={styles.check}>✓</Text>}
            </Pressable>

            {members.map((member) => {
              const selected = assigneeId === member.id;
              return (
                <Pressable
                  key={member.id}
                  style={({ pressed }) => [
                    styles.memberOption,
                    selected && styles.memberSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setAssigneeId(member.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberText}>{member.name}</Text>
                    <Text style={styles.memberSubtext}>
                      {member.role} · {member.email}
                    </Text>
                  </View>

                  {selected && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Prazo</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {dueDate ? formatDate(dueDate) : "Sem prazo"}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              if (Platform.OS === "ios") {
                setShowIOSDatePicker(true);
              } else {
                setShowAndroidDatePicker(true);
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Escolher data</Text>
          </Pressable>
        </View>

        {dueDate && (
          <Pressable
            style={styles.clearDateButton}
            onPress={() => setDueDate(null)}
          >
            <Text style={styles.link}>Remover prazo</Text>
          </Pressable>
        )}

        {showAndroidDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <View style={styles.saveContainer}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              saveTask.isPending && styles.disabled,
            ]}
            disabled={saveTask.isPending}
            onPress={handleSave}
          >
            {saveTask.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar alterações</Text>
            )}
          </Pressable>

          {saveTask.isError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{saveTask.error.message}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Comentários</Text>

        {commentsQuery.isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : commentsQuery.isError ? (
          <Text style={styles.muted}>
            Não foi possível carregar os comentários.
          </Text>
        ) : comments.length === 0 ? (
          <Text style={styles.muted}>
            Ainda não existem comentários nesta tarefa.
          </Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Text style={styles.commentAuthor}>{comment.author.name}</Text>
              <Text style={styles.commentContent}>{comment.content}</Text>
              <Text style={styles.commentDate}>
                {new Date(comment.createdAt).toLocaleString("pt-BR")}
              </Text>
            </View>
          ))
        )}

        <View style={styles.commentBox}>
          <Text style={styles.label}>Adicionar comentário</Text>

          <TextInput
            accessibilityLabel="Novo comentário"
            style={[styles.input, styles.commentInput]}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={10000}
            textAlignVertical="top"
            placeholder="Escreva um comentário..."
            placeholderTextColor={colors.muted}
          />

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButtonFull,
              (createComment.isPending || !commentText.trim()) &&
                styles.disabled,
              pressed && styles.pressed,
            ]}
            disabled={createComment.isPending || !commentText.trim()}
            onPress={handleAddComment}
          >
            {createComment.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Publicar comentário
              </Text>
            )}
          </Pressable>

          {createComment.isError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {createComment.error.message}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.footerMeta}>Criada por {task.createdBy.name}</Text>
      </ScrollView>

      {Platform.OS === "ios" && (
        <Modal
          visible={showIOSDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIOSDatePicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dateModal}>
              <Text style={styles.sectionTitle}>Selecionar prazo</Text>

              <DateTimePicker
                value={dueDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />

              <Pressable
                style={styles.primaryButton}
                onPress={() => setShowIOSDatePicker(false)}
              >
                <Text style={styles.primaryButtonText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 4,
  },
  headerCaption: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "600",
  },
  content: {
    padding: 22,
    paddingBottom: 48,
    gap: 12,
  },
  projectName: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 22,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    minHeight: 90,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionText: {
    color: colors.secondary,
    fontWeight: "600",
    fontSize: 13,
  },
  optionTextSelected: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  memberList: {
    gap: 8,
  },
  memberOption: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  memberText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  memberSubtext: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 3,
  },
  check: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 16,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dateText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  clearDateButton: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  saveContainer: {
    marginTop: 10,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
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
  disabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  commentCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 12,
    gap: 5,
  },
  commentAuthor: {
    color: colors.accentDark,
    fontWeight: "700",
    fontSize: 13,
  },
  commentContent: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  commentDate: {
    color: colors.muted,
    fontSize: 11,
  },
  commentBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginTop: 6,
  },
  commentInput: {
    minHeight: 85,
  },
  footerMeta: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 12,
  },
  muted: {
    color: colors.secondary,
    lineHeight: 20,
    fontSize: 13,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(36, 37, 31, 0.42)",
  },
  dateModal: {
    backgroundColor: colors.surface,
    padding: 22,
    paddingBottom: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 12,
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
  pressed: {
    opacity: 0.65,
  },
});
