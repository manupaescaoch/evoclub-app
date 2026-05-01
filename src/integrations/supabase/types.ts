export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anamnesis: {
        Row: {
          client_id: number
          content: string | null
          created_at: string | null
          id: string
          type: string | null
        }
        Insert: {
          client_id: number
          content?: string | null
          created_at?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          client_id?: number
          content?: string | null
          created_at?: string | null
          id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          active: boolean | null
          id: string
          name: string
          segment: string | null
          trigger_rule: string | null
          unit_id: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          name: string
          segment?: string | null
          trigger_rule?: string | null
          unit_id?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string
          segment?: string | null
          trigger_rule?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          cancelled_at: string | null
          client_id: number | null
          id: string
          reason: string | null
          unit_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id?: number | null
          id?: string
          reason?: string | null
          unit_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: number | null
          id?: string
          reason?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checked_at: string | null
          client_id: number
          id: string
        }
        Insert: {
          checked_at?: string | null
          client_id: number
          id?: string
        }
        Update: {
          checked_at?: string | null
          client_id?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booked_at: string | null
          class_id: string | null
          client_id: number | null
          id: string
          status: string | null
        }
        Insert: {
          booked_at?: string | null
          class_id?: string | null
          client_id?: number | null
          id?: string
          status?: string | null
        }
        Update: {
          booked_at?: string | null
          class_id?: string | null
          client_id?: number | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          day_of_week: number | null
          end_time: string
          id: string
          max_slots: number | null
          name: string | null
          start_time: string
          trainer: string | null
          unit_id: string | null
        }
        Insert: {
          day_of_week?: number | null
          end_time: string
          id?: string
          max_slots?: number | null
          name?: string | null
          start_time: string
          trainer?: string | null
          unit_id?: string | null
        }
        Update: {
          day_of_week?: number | null
          end_time?: string
          id?: string
          max_slots?: number | null
          name?: string | null
          start_time?: string
          trainer?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contract_end: string | null
          contract_start: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: number
          name: string
          observations: string | null
          phone: string | null
          plan: string | null
          plan_value: number | null
          status: string | null
          unit_id: string | null
          visit_type: string | null
        }
        Insert: {
          contract_end?: string | null
          contract_start?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: number
          name: string
          observations?: string | null
          phone?: string | null
          plan?: string | null
          plan_value?: number | null
          status?: string | null
          unit_id?: string | null
          visit_type?: string | null
        }
        Update: {
          contract_end?: string | null
          contract_start?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: number
          name?: string
          observations?: string | null
          phone?: string | null
          plan?: string | null
          plan_value?: number | null
          status?: string | null
          unit_id?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          hired_at: string | null
          id: string
          internal_notes: string | null
          permission_profile_id: string | null
          phone: string | null
          photo_url: string | null
          role_title: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hired_at?: string | null
          id?: string
          internal_notes?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hired_at?: string | null
          id?: string
          internal_notes?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body: string | null
          cancellation_rules: string | null
          contract_type: string | null
          created_at: string
          id: string
          linked_plan: string | null
          name: string
          penalty_value: number | null
          renewal_rules: string | null
          status: string
          unit_id: string | null
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          body?: string | null
          cancellation_rules?: string | null
          contract_type?: string | null
          created_at?: string
          id?: string
          linked_plan?: string | null
          name: string
          penalty_value?: number | null
          renewal_rules?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          body?: string | null
          cancellation_rules?: string | null
          contract_type?: string | null
          created_at?: string
          id?: string
          linked_plan?: string | null
          name?: string
          penalty_value?: number | null
          renewal_rules?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          coupon_type: string | null
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          linked_plan: string | null
          linked_service_id: string | null
          name: string
          notes: string | null
          quantity_available: number | null
          quantity_used: number
          status: string
          unit_id: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          coupon_type?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          linked_plan?: string | null
          linked_service_id?: string | null
          name: string
          notes?: string | null
          quantity_available?: number | null
          quantity_used?: number
          status?: string
          unit_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          coupon_type?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          linked_plan?: string | null
          linked_service_id?: string | null
          name?: string
          notes?: string | null
          quantity_available?: number | null
          quantity_used?: number
          status?: string
          unit_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_linked_service_id_fkey"
            columns: ["linked_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          created_at: string
          equipment: string | null
          id: string
          instructions: string | null
          is_global: boolean
          muscle_group: string | null
          name: string
          secondary_muscle: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_global?: boolean
          muscle_group?: string | null
          name: string
          secondary_muscle?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_global?: boolean
          muscle_group?: string | null
          name?: string
          secondary_muscle?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      grade_activities: {
        Row: {
          activity_group: string | null
          allow_booking: boolean
          color: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          internal_notes: string | null
          max_capacity: number | null
          name: string
          status: string
          unit_id: string | null
          updated_at: string
          visible_to_student: boolean
        }
        Insert: {
          activity_group?: string | null
          allow_booking?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          internal_notes?: string | null
          max_capacity?: number | null
          name: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          visible_to_student?: boolean
        }
        Update: {
          activity_group?: string | null
          allow_booking?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          internal_notes?: string | null
          max_capacity?: number | null
          name?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          visible_to_student?: boolean
        }
        Relationships: []
      }
      permission_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          modules: Json
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          modules?: Json
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          modules?: Json
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_id: number | null
          created_at: string | null
          id: string
          installments: number | null
          payment_method: string | null
          type: string | null
          unit_id: string | null
          value: number
        }
        Insert: {
          client_id?: number | null
          created_at?: string | null
          id?: string
          installments?: number | null
          payment_method?: string | null
          type?: string | null
          unit_id?: string | null
          value: number
        }
        Update: {
          client_id?: number | null
          created_at?: string | null
          id?: string
          installments?: number | null
          payment_method?: string | null
          type?: string | null
          unit_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          accounting_code: string | null
          category: string | null
          created_at: string
          default_value: number | null
          description: string
          financial_nature: string | null
          id: string
          notes: string | null
          receipt_only: boolean
          revenue_center: string | null
          show_on_receipt: boolean
          status: string
          tax_type: string | null
          updated_at: string
        }
        Insert: {
          accounting_code?: string | null
          category?: string | null
          created_at?: string
          default_value?: number | null
          description: string
          financial_nature?: string | null
          id?: string
          notes?: string | null
          receipt_only?: boolean
          revenue_center?: string | null
          show_on_receipt?: boolean
          status?: string
          tax_type?: string | null
          updated_at?: string
        }
        Update: {
          accounting_code?: string | null
          category?: string | null
          created_at?: string
          default_value?: number | null
          description?: string
          financial_nature?: string | null
          id?: string
          notes?: string | null
          receipt_only?: boolean
          revenue_center?: string | null
          show_on_receipt?: boolean
          status?: string
          tax_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          bank: string | null
          bank_account: string | null
          bank_agency: string | null
          category: string | null
          city: string | null
          cnpj: string | null
          commission: number | null
          complement: string | null
          created_at: string
          email: string | null
          id: string
          min_delivery_days: number | null
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          pix_key: string | null
          responsible: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          bank?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          category?: string | null
          city?: string | null
          cnpj?: string | null
          commission?: number | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          min_delivery_days?: number | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          pix_key?: string | null
          responsible?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          bank?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          category?: string | null
          city?: string | null
          cnpj?: string | null
          commission?: number | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          min_delivery_days?: number | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          pix_key?: string | null
          responsible?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          id: string
          load: string | null
          name: string
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          sort_order: number | null
          template_session_id: string
        }
        Insert: {
          id?: string
          load?: string | null
          name: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number | null
          template_session_id: string
        }
        Update: {
          id?: string
          load?: string | null
          name?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number | null
          template_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_template_session_id_fkey"
            columns: ["template_session_id"]
            isOneToOne: false
            referencedRelation: "template_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sessions: {
        Row: {
          day_label: string | null
          duration_min: number | null
          id: string
          name: string | null
          notes: string | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      training_exercise_sets: {
        Row: {
          cadence: string | null
          created_at: string
          id: string
          incline: string | null
          load: string | null
          method_id: string | null
          notes: string | null
          order_index: number
          reps: string | null
          rest_seconds: number | null
          session_exercise_id: string
          set_type: string
          sets: number
          time_seconds: number | null
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          id?: string
          incline?: string | null
          load?: string | null
          method_id?: string | null
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          session_exercise_id: string
          set_type?: string
          sets?: number
          time_seconds?: number | null
        }
        Update: {
          cadence?: string | null
          created_at?: string
          id?: string
          incline?: string | null
          load?: string | null
          method_id?: string | null
          notes?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          session_exercise_id?: string
          set_type?: string
          sets?: number
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_exercise_sets_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "training_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_exercise_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "training_session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      training_methods: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          coach_id: string | null
          created_at: string
          description: string | null
          frequency: string | null
          goal: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          organization_type: string
          status: string
          student_id: number
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          organization_type?: string
          status?: string
          student_id: number
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          organization_type?: string
          status?: string
          student_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      training_session_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          order_index: number
          training_session_id: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          order_index?: number
          training_session_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          order_index?: number
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_exercises_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          created_at: string
          day_of_week: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          session_number: number | null
          training_week_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          session_number?: number | null
          training_week_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          session_number?: number | null
          training_week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_training_week_id_fkey"
            columns: ["training_week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_weeks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          training_plan_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          training_plan_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          training_plan_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_weeks_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          day_label: string | null
          id: string
          load: string | null
          name: string
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          session_id: string | null
          sets: number | null
          sort_order: number | null
          workout_id: string
        }
        Insert: {
          day_label?: string | null
          id?: string
          load?: string | null
          name: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          session_id?: string | null
          sets?: number | null
          sort_order?: number | null
          workout_id: string
        }
        Update: {
          day_label?: string | null
          id?: string
          load?: string | null
          name?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          session_id?: string | null
          sets?: number | null
          sort_order?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          day_label: string | null
          duration_min: number | null
          id: string
          name: string
          notes: string | null
          sort_order: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string
          notes?: string | null
          sort_order?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string
          notes?: string | null
          sort_order?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          client_id: number | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          name: string
          starts_at: string | null
          status: string | null
          updated_at: string | null
          week: number | null
        }
        Insert: {
          client_id?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          week?: number | null
        }
        Update: {
          client_id?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_training: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "coordinator" | "student" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "coordinator", "student", "viewer"],
    },
  },
} as const
