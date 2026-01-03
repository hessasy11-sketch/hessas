export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone_number: string
          display_name: string
          user_type: 'individual' | 'farmer' | 'company' | 'platform_admin' | 'group_owner'
          avatar_url: string | null
          logo_url: string | null
          account_type: string
          city: string | null
          bio: string | null
          hide_phone: boolean
          verified_phone: boolean
          verified_identity: boolean
          notification_new_bids: boolean
          notification_new_offers: boolean
          notification_auction_ending: boolean
          registration_status: string
          registration_completed: boolean
          last_active_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone_number: string
          display_name: string
          user_type?: 'individual' | 'farmer' | 'company' | 'platform_admin' | 'group_owner'
          avatar_url?: string | null
          logo_url?: string | null
          account_type?: string
          city?: string | null
          bio?: string | null
          hide_phone?: boolean
          verified_phone?: boolean
          verified_identity?: boolean
          notification_new_bids?: boolean
          notification_new_offers?: boolean
          notification_auction_ending?: boolean
          registration_status?: string
          registration_completed?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          display_name?: string
          user_type?: 'individual' | 'farmer' | 'company' | 'platform_admin' | 'group_owner'
          avatar_url?: string | null
          logo_url?: string | null
          account_type?: string
          city?: string | null
          bio?: string | null
          hide_phone?: boolean
          verified_phone?: boolean
          verified_identity?: boolean
          notification_new_bids?: boolean
          notification_new_offers?: boolean
          notification_auction_ending?: boolean
          registration_status?: string
          registration_completed?: boolean
          last_active_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      auction_categories: {
        Row: {
          id: string
          name_ar: string
          section: 'public' | 'companies' | 'platform' | 'groups' | 'collectibles'
          icon: string | null
          color: string
          sort_order: number
          sub_type: 'request' | 'offer' | 'both'
          created_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          section: 'public' | 'companies' | 'platform' | 'groups' | 'collectibles'
          icon?: string | null
          color?: string
          sort_order?: number
          sub_type?: 'request' | 'offer' | 'both'
          created_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          section?: 'public' | 'companies' | 'platform' | 'groups' | 'collectibles'
          icon?: string | null
          color?: string
          sort_order?: number
          sub_type?: 'request' | 'offer' | 'both'
          created_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          is_private: boolean
          member_count: number
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          is_private?: boolean
          member_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          is_private?: boolean
          member_count?: number
          created_at?: string
        }
      }
      auctions: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          category_id: string | null
          section: 'public' | 'companies' | 'platform' | 'groups' | 'collectibles'
          request_offer_type: 'request' | 'offer' | null
          starting_price: number
          current_price: number
          images: string[]
          status: 'upcoming' | 'active' | 'closed' | 'extended' | 'sold'
          starts_at: string
          ends_at: string
          location: string | null
          group_id: string | null
          seller_phone: string | null
          chat_status: 'active' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          category_id?: string | null
          section: 'public' | 'companies' | 'platform' | 'groups' | 'collectibles'
          request_offer_type?: 'request' | 'offer' | null
          starting_price?: number
          current_price?: number
          images?: string[]
          status?: 'upcoming' | 'active' | 'closed' | 'extended' | 'sold'
          starts_at: string
          ends_at: string
          location?: string | null
          group_id?: string | null
          seller_phone?: string | null
          chat_status?: 'active' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          category_id?: string | null
          section?: 'public' | 'companies' | 'platform' | 'groups' | 'collectibles'
          request_offer_type?: 'request' | 'offer' | null
          starting_price?: number
          current_price?: number
          images?: string[]
          status?: 'upcoming' | 'active' | 'closed' | 'extended' | 'sold'
          starts_at?: string
          ends_at?: string
          location?: string | null
          group_id?: string | null
          seller_phone?: string | null
          chat_status?: 'active' | 'closed'
          created_at?: string
          updated_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          auction_id: string
          bidder_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          bidder_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          bidder_id?: string
          amount?: number
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          auction_id: string
          sender_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          sender_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          sender_id?: string
          message?: string
          created_at?: string
        }
      }
    }
  }
}
