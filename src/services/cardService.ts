import { Card, CardStatus } from '../types';
import { db } from './storage';
import { generatePublicToken, formatCardNumber } from '../utils';

export const cardService = {
  async getCards(): Promise<Card[]> {
    return db.getCards();
  },

  async getCardById(id: string): Promise<Card | null> {
    const cards = db.getCards();
    return cards.find(c => c.id === id || c.internal_card_no.toUpperCase() === id.toUpperCase()) || null;
  },

  async getCardByToken(token: string): Promise<Card | null> {
    const cards = db.getCards();
    const cleanToken = token.trim().toUpperCase();
    return cards.find(c => c.public_token.toUpperCase() === cleanToken) || null;
  },

  async updateCardDestination(id: string, newDestinationUrl: string): Promise<Card> {
    const cards = db.getCards();
    const index = cards.findIndex(c => c.id === id || c.internal_card_no.toUpperCase() === id.toUpperCase());
    if (index === -1) {
      throw new Error(`Card ${id} not found`);
    }

    const card = cards[index];
    const updated: Card = {
      ...card, // Preserves internal_card_no, public_token, batch_id, client_id, original_url
      destination_url: newDestinationUrl.trim(),
      updated_at: new Date().toISOString(),
    };

    cards[index] = updated;
    db.saveCards(cards);

    db.logActivity({
      action: 'Destination Updated',
      description: `Destination updated for ${card.internal_card_no} (${card.client_name || 'Client'})`,
      type: 'destination',
      entity_id: card.id,
    });

    return updated;
  },

  async updateCardStatus(id: string, status: CardStatus): Promise<Card> {
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
    const card = await this.getCardByToken(token);
    if (!card) return null;

    const cards = db.getCards();
    const index = cards.findIndex(c => c.id === card.id);
    if (index !== -1) {
      cards[index] = {
        ...cards[index],
        total_scans: (cards[index].total_scans || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      db.saveCards(cards);

      db.logActivity({
        action: 'Card Scanned',
        description: `Verified scan recorded for ${cards[index].internal_card_no} (${cards[index].client_name || 'Client'})`,
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
      total_scans: 0,
      created_at: now,
      updated_at: now,
    };

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
