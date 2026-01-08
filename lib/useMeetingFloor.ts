import { useState, useEffect, useCallback } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/orbit/services/supabaseClient';

export interface MeetingFloorState {
  activeSpeakerId: string | null;
  leasedUntil: string | null;
}

export function useMeetingFloor(roomName: string, userId: string) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [leasedUntil, setLeasedUntil] = useState<string | null>(null);

  // Computed state: Am I the current floor holder?
  const isFloorHolder = activeSpeakerId === userId;

  useEffect(() => {
    if (!roomName) return;

    // Fetch initial state
    const fetchFloorState = async () => {
      const { data, error } = await supabase
        .from('meeting_floor')
        .select('*')
        .eq('meeting_id', roomName)
        .single();
      
      if (data) {
        setActiveSpeakerId(data.active_speaker_id);
        setLeasedUntil(data.leased_until);
      } else if (error && error.code === 'PGRST116') {
        // Row doesn't exist yet, we can try to claim it if we are the first
        claimFloor(); 
      }
    };

    fetchFloorState();

    // Subscribe to changes
    const channel = supabase
      .channel(`floor:${roomName}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_floor',
        filter: `meeting_id=eq.${roomName}`
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        console.log('🎤 Floor update:', payload);
        if (payload.new) {
          // @ts-ignore
          setActiveSpeakerId(payload.new.active_speaker_id);
          // @ts-ignore
          setLeasedUntil(payload.new.leased_until);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomName]);

  const claimFloor = useCallback(async () => {
    if (!roomName || !userId) return;

    const leaseTime = new Date();
    leaseTime.setHours(leaseTime.getHours() + 1); // 1 hour lease

    const { error } = await supabase
      .from('meeting_floor')
      .upsert({
        meeting_id: roomName,
        active_speaker_id: userId,
        leased_until: leaseTime.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Failed to claim floor:', error);
  }, [roomName, userId]);

  const grantFloor = useCallback(async (targetUserId: string) => {
    if (!roomName) return;

    const leaseTime = new Date();
    leaseTime.setHours(leaseTime.getHours() + 1);

    const { error } = await supabase
      .from('meeting_floor')
      .upsert({
        meeting_id: roomName,
        active_speaker_id: targetUserId,
        leased_until: leaseTime.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Failed to grant floor:', error);
  }, [roomName]);

  const releaseFloor = useCallback(async () => {
    // Optional: Logic to clear the floor or pass to "null"
    // For now, we might just keep the last speaker until someone else claims it
  }, [roomName]);

  return {
    activeSpeakerId,
    isFloorHolder,
    claimFloor,
    grantFloor,
    releaseFloor
  };
}
