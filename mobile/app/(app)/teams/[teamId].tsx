import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../src/lib/api";
import { useAuth } from "../../../src/auth/auth-context";
import type { TeamDetail } from "../../../src/types/api";

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

const memberPalettes = [
  { background: "#F7E9E1", foreground: "#A84926" },
  { background: "#E8EDE4", foreground: "#4D6B45" },
  { background: "#E9E8F2", foreground: "#68618F" },
  { background: "#F3EBCF", foreground: "#8C7029" },
  { background: "#E2ECEE", foreground: "#47737A" },
];

export default function TeamDetailScreen() {
  const params = useLocalSearchParams<{ teamId: string }>();

  const teamId = Array.isArray(params.teamId)
    ? params.teamId[0]
    : params.teamId;

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState("");

  const teamQuery = useQuery({
    queryKey: ["team", teamId],
    enabled: Boolean(teamId),
    queryFn: () => apiRequest<{ team: TeamDetail }>(`/teams/${teamId}`),
  });

  const team = teamQuery.data?.team;

  const canManage =
    team?.requesterRole === "OWNER" || team?.requesterRole === "ADMIN";

  const isOwner = team?.requesterRole === "OWNER";

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["team", teamId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["teams"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      }),
    ]);
  };

  const updateTeam = useMutation({
    mutationFn: () =>
      apiRequest<{ team: TeamDetail }>(`/teams/${teamId}`, {
        method: "PATCH",
        body: { name: teamName.trim() },
      }),

    onSuccess: async () => {
      await refresh();
      Alert.alert("Equipe atualizada", "O nome foi alterado.");
    },
  });

  const addMember = useMutation({
    mutationFn: () =>
      apiRequest(`/teams/${teamId}/members`, {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          role: memberRole,
        },
      }),

    onSuccess: async () => {
      setModalVisible(false);
      setEmail("");
      setMemberRole("MEMBER");
      setError("");
      await refresh();

      Alert.alert(
        "Integrante adicionado",
        "O usuário agora pertence à equipe.",
      );
    },

    onError: (e) => setError(e.message),
  });

  const updateRole = useMutation({
    mutationFn: (input: { userId: string; role: "MEMBER" | "ADMIN" }) =>
      apiRequest(`/teams/${teamId}/members/${input.userId}`, {
        method: "PATCH",
        body: { role: input.role },
      }),

    onSuccess: refresh,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),

    onSuccess: refresh,
  });

  function confirmRemove(memberId: string, memberName: string) {
    Alert.alert(
      "Remover integrante",
      `Deseja remover ${memberName} da equipe?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => removeMember.mutate(memberId),
        },
      ],
    );
  }

  if (teamQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loaderText}>Carregando equipe...</Text>
      </View>
    );
  }

  if (teamQuery.isError || !team) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEyebrow}>ALGO NÃO SAIU COMO ESPERADO</Text>
        <Text style={styles.heading}>Não foi possível abrir a equipe.</Text>
        <Pressable
          onPress={() => void teamQuery.refetch()}
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
          <Text style={styles.link}>‹ Equipes</Text>
        </Pressable>

        <Text style={styles.heading}>{team.name}</Text>

        <Text style={styles.muted}>
          {team.memberCount} {team.memberCount === 1 ? "membro" : "membros"} ·{" "}
          {team.projectCount} {team.projectCount === 1 ? "projeto" : "projetos"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {(updateTeam.isError || updateRole.isError || removeMember.isError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.error}>
              {updateTeam.error?.message ??
                updateRole.error?.message ??
                removeMember.error?.message}
            </Text>
          </View>
        )}

        {canManage && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Configurações</Text>

            <Text style={styles.label}>Nome da equipe</Text>

            <TextInput
              style={styles.input}
              value={teamName || team.name}
              onChangeText={setTeamName}
              maxLength={120}
              placeholder={team.name}
              placeholderTextColor={colors.muted}
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                (updateTeam.isPending ||
                  (teamName.trim() || team.name) === team.name) &&
                  styles.disabled,
              ]}
              disabled={
                updateTeam.isPending ||
                (teamName.trim() || team.name) === team.name
              }
              onPress={() => updateTeam.mutate()}
            >
              {updateTeam.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Salvar nome</Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.memberHeader}>
          <Text style={styles.sectionTitle}>Integrantes</Text>

          {canManage && (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={() => {
                setError("");
                setEmail("");
                setMemberRole("MEMBER");
                setModalVisible(true);
              }}
            >
              <Text style={styles.primaryButtonPlus}>＋</Text>
              <Text style={styles.primaryButtonText}>Adicionar</Text>
            </Pressable>
          )}
        </View>

        {team.members.map((member, index) => {
          const canChangeRole = isOwner && member.role !== "OWNER";

          const canRemove =
            Boolean(canManage) &&
            member.role !== "OWNER" &&
            member.id !== user?.id;

          const palette = memberPalettes[index % memberPalettes.length];
          const initial = member.name.trim().charAt(0).toUpperCase() || "U";
          const memberAvatarUrl = member.avatarUrl;

          return (
            <View key={member.id} style={styles.memberCard}>
              <View
                style={[
                  styles.memberAvatar,
                  {
                    backgroundColor: memberAvatarUrl
                      ? "transparent"
                      : palette.background,
                  },
                ]}
              >
                {memberAvatarUrl ? (
                  <Image
                    source={{ uri: memberAvatarUrl }}
                    style={styles.memberAvatarImage}
                  />
                ) : (
                  <Text
                    style={[
                      styles.memberAvatarText,
                      { color: palette.foreground },
                    ]}
                  >
                    {initial}
                  </Text>
                )}
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>

                <Text style={styles.muted}>{member.email}</Text>

                <Text style={styles.role}>{member.role}</Text>

                {canChangeRole && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionLinkWrap,
                      pressed && styles.pressed,
                    ]}
                    onPress={() =>
                      updateRole.mutate({
                        userId: member.id,
                        role: member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                      })
                    }
                  >
                    <Text style={styles.link}>
                      {member.role === "ADMIN"
                        ? "Tornar membro"
                        : "Promover a administrador"}
                    </Text>
                  </Pressable>
                )}

                {canRemove && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionLinkWrap,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => confirmRemove(member.id, member.name)}
                  >
                    <Text style={styles.dangerLink}>Remover integrante</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Permissões</Text>

          <Text style={styles.muted}>
            Seu papel nesta equipe: {team.requesterRole}.
          </Text>

          <Text style={styles.muted}>
            Proprietários gerenciam papéis e configurações. Administradores
            gerenciam a equipe e os integrantes. Membros colaboram nos projetos
            e nas tarefas.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!addMember.isPending) setModalVisible(false);
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.backdrop}>
            <Pressable
              style={styles.backdropTouch}
              onPress={() => {
                if (!addMember.isPending) setModalVisible(false);
              }}
            />

            <View style={styles.modal}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalHeadingGroup}>
                  <Text style={styles.modalEyebrow}>TASKFLOW / MEMBERS</Text>
                  <Text style={styles.heading}>Adicionar integrante</Text>
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
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <Text style={styles.muted}>
                  Informe o e-mail de uma conta existente no TaskFlow.
                </Text>

                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="usuario@exemplo.com"
                  placeholderTextColor={colors.muted}
                  editable={!addMember.isPending}
                />

                {isOwner && (
                  <>
                    <Text style={styles.label}>Papel inicial</Text>

                    <View style={styles.roleOptions}>
                      {(["MEMBER", "ADMIN"] as const).map((role) => {
                        const selected = memberRole === role;
                        return (
                          <Pressable
                            key={role}
                            style={[
                              styles.roleOption,
                              selected && styles.roleOptionSelected,
                            ]}
                            onPress={() => setMemberRole(role)}
                          >
                            <Text
                              style={[
                                styles.roleOptionText,
                                selected && styles.roleOptionTextSelected,
                              ]}
                            >
                              {role === "ADMIN" ? "Administrador" : "Membro"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                {!!error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.error}>{error}</Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setModalVisible(false)}
                    style={styles.cancelButton}
                    disabled={addMember.isPending}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    disabled={addMember.isPending}
                    onPress={() => {
                      if (!email.trim()) {
                        setError("Informe o e-mail.");
                        return;
                      }

                      setError("");
                      addMember.mutate();
                    }}
                    style={[
                      styles.primaryButton,
                      addMember.isPending && styles.disabled,
                    ]}
                  >
                    {addMember.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Adicionar</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  actionLinkWrap: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  dangerLink: {
    color: "#B54738",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 6,
  },
  muted: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: -0.3,
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
  primaryButton: {
    minHeight: 40,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    alignSelf: "flex-start",
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
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  memberCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImage: {
    width: "100%",
    height: "100%",
  },
  memberAvatarText: {
    fontWeight: "700",
    fontSize: 22,
    letterSpacing: -0.6,
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  role: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 8,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  roleOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  roleOptionText: {
    color: colors.secondary,
    fontWeight: "600",
    fontSize: 13,
  },
  roleOptionTextSelected: {
    color: colors.accentDark,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
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
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36, 37, 31, 0.42)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    ...StyleSheet.absoluteFill,
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    gap: 12,
  },
  modalScrollContent: {
    paddingBottom: 10,
    gap: 10,
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
