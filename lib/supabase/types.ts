/**
 * Database types. Keep in sync with supabase/migrations/ (G6).
 * Regenerate with: supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 * Note: these must be `type` aliases (not interfaces) so they satisfy
 * supabase-js's Record<string, unknown> constraints.
 */

export type AppointmentStatus = 'confirmed' | 'cancelled';

export type AppointmentRow = {
  id: string;
  client_name: string;
  client_email: string;
  date_time: string; // timestamptz as ISO string
  barber_name: string;
  status: AppointmentStatus;
  cancel_token: string;
  created_at: string;
  cancelled_at: string | null;
};

export type AppointmentInsert = {
  client_name: string;
  client_email: string;
  date_time: string;
  barber_name: string;
};

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: AppointmentRow;
        Insert: AppointmentInsert;
        Update: Partial<AppointmentRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
