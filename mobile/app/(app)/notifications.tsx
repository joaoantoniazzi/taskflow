import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../src/lib/api";

type NotificationItem = {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_COMMENTED" | "TASK_DUE_SOON";
  message: string;
  readAt: string | null;
  createdAt: string;
  task: {
    id: string;
    title: string;
  } | null;
};

type NotificationResponse = {
  unreadCount: number;
  notifications: NotificationItem[];
};

function notificationLabel(type: NotificationItem["type"]) {
  switch (type) {
    case "TASK_ASSIGNED":
      return "Tarefa atribuída";
    case "TASK_COMMENTED":
      return "Novo comentário";
    case "TASK_DUE_SOON":
      return "Prazo próximo";
  }
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<NotificationResponse>("/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: "PATCH" }),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      }),
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      apiRequest("/notifications/read-all", { method: "PATCH" }),

    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      }),
  });

  const notifications = query.data?.notifications ?? [];

  async function openNotification(notification: NotificationItem) {
    if (notification.readAt === null) {
      await markRead.mutateAsync(notification.id);
    }

    if (notification.task) {
      router.push({
        pathname: "/(app)/task/[taskId]",
        params: {
          taskId: notification.task.id,
        },
      });
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.link}>‹ Voltar</Text>
        </Pressable>

        <Text style={styles.heading}>Notificações</Text>
      </View>

      <View style={styles.summary}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>Suas atualizações</Text>

          <Text style={styles.muted}>
            {query.data?.unreadCount ?? 0} não lidas
          </Text>
        </View>

        {(query.data?.unreadCount ?? 0) > 0 && (
          <Pressable
            style={styles.secondaryButton}
            disabled={markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
          >
            <Text style={styles.secondaryText}>Marcar todas como lidas</Text>
          </Pressable>
        )}
      </View>

      {markRead.isError || markAllRead.isError ? (
        <Text style={styles.errorText}>
          Não foi possível atualizar as notificações.
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        {query.isLoading ? (
          <ActivityIndicator
            size="large"
            color="#2459D3"
            style={{ marginTop: 40 }}
          />
        ) : query.isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Não foi possível carregar as notificações.
            </Text>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => void query.refetch()}
            >
              <Text style={styles.secondaryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Tudo em dia</Text>

            <Text style={styles.muted}>
              Você ainda não possui notificações.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              style={[styles.card, item.readAt === null && styles.unreadCard]}
              onPress={() => {
                void openNotification(item);
              }}
            >
              <View style={styles.cardTop}>
                <Text style={styles.type}>{notificationLabel(item.type)}</Text>

                {item.readAt === null && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.message}>{item.message}</Text>

              {item.task && (
                <Text style={styles.taskLink}>Abrir: {item.task.title} →</Text>
              )}

              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleString("pt-BR")}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    paddingTop: 48,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  link: {
    color: "#2459D3",
    fontWeight: "700",
  },
  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#172033",
  },
  summary: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 18,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryTitle: {
    color: "#172033",
    fontWeight: "700",
    fontSize: 16,
  },
  muted: {
    color: "#667085",
    fontSize: 13,
    marginTop: 5,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E8EF",
    padding: 15,
    gap: 8,
  },
  unreadCard: {
    borderColor: "#B7C9FA",
    backgroundColor: "#FAFBFF",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  type: {
    color: "#2459D3",
    fontWeight: "700",
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2459D3",
  },
  message: {
    color: "#263247",
    fontSize: 14,
    lineHeight: 21,
  },
  taskLink: {
    color: "#2459D3",
    fontWeight: "600",
    fontSize: 13,
  },
  date: {
    color: "#98A2B3",
    fontSize: 11,
    marginTop: 3,
  },
  secondaryButton: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#2459D3",
  },
  secondaryText: {
    color: "#2459D3",
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginTop: 14,
    padding: 24,
    gap: 10,
  },
  emptyTitle: {
    color: "#172033",
    fontSize: 17,
    fontWeight: "700",
  },
  errorText: {
    marginHorizontal: 18,
    marginBottom: 8,
    color: "#B42318",
    fontSize: 13,
  },
});
