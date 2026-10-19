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
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            disabled={markAllRead.isPending}
            onPress={() => markAllRead.mutate()}
          >
            <Text style={styles.secondaryText}>Marcar todas como lidas</Text>
          </Pressable>
        )}
      </View>

      {markRead.isError || markAllRead.isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Não foi possível atualizar as notificações.
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {query.isLoading ? (
          <View style={styles.loaderState}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loaderText}>Carregando avisos...</Text>
          </View>
        ) : query.isError ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
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
            <Text style={styles.emptyEyebrow}>TUDO SOB CONTROLE</Text>
            <Text style={styles.emptyTitle}>Tudo em dia</Text>
            <Text style={styles.muted}>
              Você ainda não possui notificações pendentes.
            </Text>
          </View>
        ) : (
          notifications.map((item) => {
            const isUnread = item.readAt === null;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.card,
                  isUnread && styles.unreadCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  void openNotification(item);
                }}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.type}>
                    {notificationLabel(item.type)}
                  </Text>
                  {isUnread && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.message}>{item.message}</Text>

                {item.task && (
                  <Text style={styles.taskLink}>
                    Abrir: {item.task.title} ↗
                  </Text>
                )}

                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleString("pt-BR")}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
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
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: colors.text,
  },
  summary: {
    backgroundColor: colors.surface,
    marginHorizontal: 22,
    marginTop: 18,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  muted: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 3,
  },
  list: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    gap: 6,
  },
  unreadCard: {
    borderColor: "#E5B8A8",
    backgroundColor: colors.accentSoft,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  type: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  taskLink: {
    color: colors.accentDark,
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
  date: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
    padding: 22,
    gap: 8,
  },
  emptyEyebrow: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
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
  errorContainer: {
    marginHorizontal: 22,
    marginBottom: 8,
    backgroundColor: "#FBEDEA",
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: "#B54738",
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.65,
  },
});
