import { Card, CardStatus } from '../types';
import { db } from './storage';
import { generatePublicToken, formatCardNumber, getDynamicUrl } from '../utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CreateCardInput {
  destination_url?: string;
  client_id?: string;
  client_name?: string;
  batch_id?: string;
  batch_name?: string;
  status?: CardStatus;
}

export interface CreatedCardResult {
  id: string;
  internal_card_no: string;
  public_token: string;
  destination_url: string | null;
  status: CardStatus;
  scan_count: number;
  dynamic_url: string;
}

export const cardService = {
  /**
   * MVP Step 6: Create a card with automatic internal_card_no and secure public_token
   * Return: id, internal_card_no, public_token, destination_url, status, scan_count, dynamic_url
   */
  async createCard(input?: string | CreateCardInput): Promise<CreatedCardResult> {
    const destinationUrl = typeof input === 'string' 
      ? input.trim() 
      : input?.destination_url?.trim() || null;

    const token = generatePublicToken(8);
    const dynamicUrl = getDynamicUrl(token);

    if (isSupabaseConfigured() && supabase) {
      // Get next card sequence count
      const { count } = await supabase
        .from('cards')
        .select('*', { count: 'exact', head: true });
      
      const nextNum = (count || 0) + 1;
      const internalCardNo = formatCardNumber(nextNum);

      const { data, error } = await supabase
        .from('cards')
        .insert({
          internal_card_no: internalCardNo,
          public_token: token,
          destination_url: destinationUrl,
          status: 'READY',
          scan_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase card insert error:', error);
        throw new Error(`Failed to create card in Supabase: ${error.message}`);
      }

      return {
        id: data.id,
        internal_card_no: data.internal_card_no,
        public_token: data.public_token,
        destination_url: data.destination_url,
        status: (data.status as CardStatus) || 'Ready',
        scan_count: data.scan_count || 0,
        dynamic_url: dynamicUrl,
      };
    }

    // Fallback to local storage
    const cards = db.getCards();
    const nextNumber = cards.length + 1;
    const internalCardNo = formatCardNumber(nextNumber);
    const now = new Date().toISOString();

    const newCard: Card = {
      id: `card_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
      internal_card_no: internalCardNo,
      public_token: token,
      destination_url: destinationUrl || '',
      original_url: destinationUrl || '',
      status: 'Ready',
      scan_count: 0,
      total_scans: 0,
      dynamic_url: dynamicUrl,
      created_at: now,
      updated_at: now,
    };

    db.saveCards([newCard, ...cards]);

    return {
      id: newCard.id,
      internal_card_no: newCard.internal_card_no,
      public_token: newCard.public_token,
      destination_url: newCard.destination_url || null,
      status: newCard.status,
      scan_count: 0,
      dynamic_url: dynamicUrl,
    };
  },

  async getCards(): Promise<Card[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(c => ({
          id: c.id,
          internal_card_no: c.internal_card_no,
          public_token: c.public_token,
          destination_url: c.destination_url || '',
          status: (c.status as CardStatus) || 'Ready',
          scan_count: c.scan_count || 0,
          total_scans: c.scan_count || 0,
          dynamic_url: getDynamicUrl(c.public_token),
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));
      }
    }
    return db.getCards();
  },

  async getCardById(id: string): Promise<Card | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .or(`id.eq.${id},internal_card_no.ilike.${id}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          internal_card_no: data.internal_card_no,
          public_token: data.public_token,
          destination_url: data.destination_url || '',
          status: (data.status as CardStatus) || 'Ready',
          scan_count: data.scan_count || 0,
          total_scans: data.scan_count || 0,
          dynamic_url: getDynamicUrl(data.public_token),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    }

    const cards = db.getCards();
    return cards.find(c => c.id === id || c.internal_card_no.toUpperCase() === id.toUpperCase()) || null;
  },

  async getCardByToken(token: string): Promise<Card | null> {
    const cleanToken = token.trim().toUpperCase();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .ilike('public_token', cleanToken)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          internal_card_no: data.internal_card_no,
          public_token: data.public_token,
          destination_url: data.destination_url || '',
          status: (data.status as CardStatus) || 'Ready',
          scan_count: data.scan_count || 0,
          total_scans: data.scan_count || 0,
          dynamic_url: getDynamicUrl(data.public_token),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    }

    const cards = db.getCards();
    return cards.find(c => c.public_token.toUpperCase() === cleanToken) || null;
  },

  async updateCardDestination(id: string, newDestinationUrl: string): Promise<Card> {
    const trimmedUrl = newDestinationUrl.trim();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('cards')
        .update({
          destination_url: trimmedUrl,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${id},internal_card_no.ilike.${id}`)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          internal_card_no: data.internal_card_no,
          public_token: data.public_token,
          destination_url: data.destination_url || '',
          status: (data.status as CardStatus) || 'Ready',
          scan_count: data.scan_count || 0,
          total_scans: data.scan_count || 0,
          dynamic_url: getDynamicUrl(data.public_token),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    }

    const cards = db.getCards();
    const index = cards.findIndex(c => c.id === id || c.internal_card_no.toUpperCase() === id.toUpperCase());
    if (index === -1) {
      throw new Error(`Card ${id} not found`);
    }

    const card = cards[index];
    const updated: Card = {
      ...card,
      destination_url: trimmedUrl,
      updated_at: new Date().toISOString(),
    };

    cards[index] = updated;
    db.saveCards(cards);

    db.logActivity({
      action: 'Destination Updated',
      description: `Destination updated for ${card.internal_card_no} (${card.client_name || 'Card'})`,
      type: 'destination',
      entity_id: card.id,
    });

    return updated;
  },

  async updateCardStatus(id: string, status: CardStatus): Promise<Card> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('cards')
        .update({
          status: status.toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${id},internal_card_no.ilike.${id}`)
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          internal_card_no: data.internal_card_no,
          public_token: data.public_token,
          destination_url: data.destination_url || '',
          status: (data.status as CardStatus) || status,
          scan_count: data.scan_count || 0,
          total_scans: data.scan_count || 0,
          dynamic_url: getDynamicUrl(data.public_token),
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    }

    const cards = db.getCards();
    const index = cards.findIndex(c => c.id === id || c.internal_card_no.toUpperCase() === id.toUpperCase());
    if (index === -1) {
      throw new Error(`Card ${id} not found`);
    }

    const card = cards[index];
    const updated: Card = {
      ...card,
      status,
      updated_at: new Date().toISOString(),
    };

    cards[index] = updated;
    db.saveCards(cards);

    db.logActivity({
      action: 'Status Changed',
      description: `Card ${card.internal_card_no} status changed to ${status}`,
      type: 'status',
      entity_id: card.id,
    });

    return updated;
  },

  async recordCardScan(token: string): Promise<Card | null> {
    const cleanToken = token.trim().toUpperCase();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.rpc('resolve_and_increment_scan', {
        token_input: cleanToken,
      });

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.id,
          internal_card_no: item.internal_card_no,
          public_token: item.public_token,
          destination_url: item.destination_url || '',
          status: (item.status as CardStatus) || 'Ready',
          scan_count: item.scan_count || 0,
          total_scans: item.scan_count || 0,
          dynamic_url: getDynamicUrl(item.public_token),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    const card = await this.getCardByToken(cleanToken);
    if (!card) return null;

    const cards = db.getCards();
    const index = cards.findIndex(c => c.id === card.id);
    if (index !== -1) {
      cards[index] = {
        ...cards[index],
        scan_count: (cards[index].scan_count || 0) + 1,
        total_scans: (cards[index].total_scans || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      db.saveCards(cards);

      db.logActivity({
        action: 'Card Scanned',
        description: `Verified scan recorded for ${cards[index].internal_card_no}`,
        type: 'card',
        entity_id: cards[index].id,
      });

      return cards[index];
    }
    return card;
  },

  async createSingleCard(data: {
    client_id: string;
    client_name: string;
    destination_url: string;
    batch_id?: string;
    batch_name?: string;
    status?: CardStatus;
  }): Promise<Card> {
    const cards = db.getCards();
    const existingTokens = new Set(cards.map(c => c.public_token.toUpperCase()));
    const nextNumber = cards.length + 1;
    const now = new Date().toISOString();

    let token = generatePublicToken(8);
    while (existingTokens.has(token)) {
      token = generatePublicToken(8);
    }

    const newCard: Card = {
      id: `card_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
      internal_card_no: formatCardNumber(nextNumber),
      public_token: token,
      client_id: data.client_id,
      client_name: data.client_name,
      batch_id: data.batch_id || 'manual_batch',
      batch_name: data.batch_name || 'Manual Individual Creation',
      original_url: data.destination_url.trim(),
      destination_url: data.destination_url.trim(),
      status: data.status || 'Ready',
      scan_count: 0,
      total_scans: 0,
      dynamic_url: getDynamicUrl(token),
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured() && supabase) {
      await supabase.from('cards').insert({
        internal_card_no: newCard.internal_card_no,
        public_token: newCard.public_token,
        destination_url: newCard.destination_url,
        status: 'READY',
        scan_count: 0,
      });
    }

    db.saveCards([newCard, ...cards]);

    db.logActivity({
      action: 'Card Generated',
      description: `Card ${newCard.internal_card_no} generated for ${newCard.client_name}`,
      type: 'card',
      entity_id: newCard.id,
    });

    return newCard;
  },
};
