import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

  /*
   * Inicializa os campos somente quando a tarefa
   * é carregada pela primeira vez nesta tela.
   * Refetches de comentários não apagam o rascunho.
   */
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
        <ActivityIndicator size="large" color="#2459D3" />
        <Text style={styles.muted}>Carregando tarefa...</Text>
      </View>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Não foi possível carregar a tarefa</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void taskQuery.refetch()}
        >
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.link}>‹ Voltar</Text>
        </Pressable>

        <Text style={styles.headerCaption}>{task.column.name}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
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
        />

        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.optionsRow}>
          {priorities.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setPriority(item.value)}
              style={[
                styles.option,
                priority === item.value && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  priority === item.value && styles.optionTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Responsável</Text>
        {teamQuery.isLoading ? (
          <ActivityIndicator />
        ) : teamQuery.isError ? (
          <Text style={styles.muted}>
            Não foi possível carregar os membros da equipe.
          </Text>
        ) : (
          <View style={styles.memberList}>
            <Pressable
              style={[
                styles.memberOption,
                !assigneeId && styles.memberSelected,
              ]}
              onPress={() => setAssigneeId("")}
            >
              <Text style={styles.memberText}>Sem responsável</Text>
              {!assigneeId && <Text style={styles.check}>✓</Text>}
            </Pressable>

            {members.map((member) => (
              <Pressable
                key={member.id}
                style={[
                  styles.memberOption,
                  assigneeId === member.id && styles.memberSelected,
                ]}
                onPress={() => setAssigneeId(member.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberText}>{member.name}</Text>
                  <Text style={styles.memberSubtext}>
                    {member.role} · {member.email}
                  </Text>
                </View>

                {assigneeId === member.id && (
                  <Text style={styles.check}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Prazo</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {dueDate ? formatDate(dueDate) : "Sem prazo"}
          </Text>

          <Pressable
            style={styles.secondaryButton}
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
            style={[
              styles.primaryButton,
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
            <Text style={styles.errorText}>{saveTask.error.message}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Comentários</Text>

        {commentsQuery.isLoading ? (
          <ActivityIndicator />
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
        />

        <Pressable
          style={[
            styles.secondaryButton,
            createComment.isPending && styles.disabled,
          ]}
          disabled={createComment.isPending || !commentText.trim()}
          onPress={handleAddComment}
        >
          {createComment.isPending ? (
            <ActivityIndicator color="#2459D3" />
          ) : (
            <Text style={styles.secondaryButtonText}>Publicar comentário</Text>
          )}
        </Pressable>

        {createComment.isError && (
          <Text style={styles.errorText}>{createComment.error.message}</Text>
        )}

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
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
    backgroundColor: "#F5F7FB",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  headerCaption: {
    fontSize: 13,
    color: "#667085",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 12,
  },
  projectName: {
    color: "#2459D3",
    fontWeight: "700",
    fontSize: 13,
  },
  title: {
    color: "#172033",
    fontWeight: "800",
    fontSize: 25,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#263247",
    marginTop: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE2EC",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: "#172033",
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
    borderColor: "#DCE2EC",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  optionSelected: {
    borderColor: "#2459D3",
    backgroundColor: "#EAF0FF",
  },
  optionText: {
    color: "#475467",
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#2459D3",
  },
  memberList: {
    gap: 8,
  },
  memberOption: {
    borderWidth: 1,
    borderColor: "#E0E5ED",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberSelected: {
    borderColor: "#2459D3",
    backgroundColor: "#F0F4FF",
  },
  memberText: {
    color: "#263247",
    fontWeight: "600",
  },
  memberSubtext: {
    color: "#667085",
    fontSize: 12,
    marginTop: 4,
  },
  check: {
    color: "#2459D3",
    fontWeight: "800",
    fontSize: 17,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dateText: {
    color: "#344054",
    fontWeight: "600",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#2459D3",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: "#2459D3",
    fontWeight: "700",
  },
  clearDateButton: {
    alignSelf: "flex-start",
    paddingVertical: 5,
  },
  saveContainer: {
    marginTop: 10,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#2459D3",
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: "#DCE2EC",
    marginVertical: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#172033",
  },
  commentCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E8EF",
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  commentAuthor: {
    color: "#2459D3",
    fontWeight: "700",
    fontSize: 14,
  },
  commentContent: {
    color: "#344054",
    lineHeight: 21,
  },
  commentDate: {
    color: "#98A2B3",
    fontSize: 11,
  },
  commentInput: {
    minHeight: 85,
  },
  footerMeta: {
    marginTop: 18,
    color: "#98A2B3",
    fontSize: 12,
  },
  muted: {
    color: "#667085",
    lineHeight: 21,
  },
  link: {
    color: "#2459D3",
    fontWeight: "700",
  },
  errorText: {
    color: "#B42318",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,24,44,0.45)",
  },
  dateModal: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    paddingBottom: 32,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: 12,
  },
});
