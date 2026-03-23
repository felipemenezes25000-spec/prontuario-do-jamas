import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface TelemedicineRoom {
  roomName: string;
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'ENDED';
  createdAt: string;
}

export interface CreateRoomDto {
  appointmentId: string;
  patientId: string;
  doctorId: string;
}

export interface RoomToken {
  token: string;
  roomName: string;
  identity: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const telemedicineKeys = {
  all: ['telemedicine'] as const,
  rooms: () => [...telemedicineKeys.all, 'rooms'] as const,
  room: (roomName: string) => [...telemedicineKeys.all, 'room', roomName] as const,
  token: (roomName: string) => [...telemedicineKeys.all, 'token', roomName] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRoomDto) => {
      const { data } = await api.post<TelemedicineRoom>('/telemedicine/rooms', dto);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: telemedicineKeys.rooms() });
    },
  });
}

export function useRoomToken(roomName: string) {
  return useQuery({
    queryKey: telemedicineKeys.token(roomName),
    queryFn: async () => {
      const { data } = await api.get<RoomToken>(
        `/telemedicine/rooms/${encodeURIComponent(roomName)}/token`,
      );
      return data;
    },
    enabled: !!roomName,
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomName: string) => {
      await api.delete(`/telemedicine/rooms/${encodeURIComponent(roomName)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: telemedicineKeys.rooms() });
    },
  });
}
