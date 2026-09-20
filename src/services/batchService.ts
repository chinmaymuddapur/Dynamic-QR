import { Batch, Card } from '../types';
import { db } from './storage';
import { clientService } from './clientService';
import { generatePublicToken, formatCardNumber } from '../utils';

export const batchService = {
  async getBatches(): Promise<Batch[]> {
    return db.getBatches();
  },

  async getBatchById(id: string): Promise<Batch | null> {
    const batches = db.getBatches();
    return batches.find(b => b.id === id) || null;
  },

  async createBatch(data: {
    client_id: string;
    destination_url: string;
    quantity: number;
    batch_name?: string;
  }): Promise<{ batch: Batch; generatedCards: Card[] }> {
    const client = await clientService.getClientById(data.client_id);
    if (!client) {
      throw new Error(`Client ${data.client_id} not found`);
    }

    const batches = db.getBatches();
    const existingCards = db.getCards();
    const existingTokens = new Set(existingCards.map(c => c.public_token.toUpperCase()));
    
    const batchId = `batch_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const clientShortName = client.business_name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const batchName = data.batch_name?.trim() || `${clientShortName}-Batch-${batches.length + 1}`;

    const newBatch: Batch = {
      id: batchId,
      client_id: client.id,
      client_name: client.business_name,
      batch_name: batchName,
      quantity: data.quantity,
      status: 'Completed',
      destination_url: data.destination_url.trim(),
      created_at: now,
    };

    // Generate guaranteed unique mock cards for this batch
    const startCardNum = existingCards.length + 1;
    const generatedCards: Card[] = [];

    for (let i = 0; i < data.quantity; i++) {
      const cardNum = startCardNum + i;
      
      // Ensure unique token
      let token = generatePublicToken(8);
      while (existingTokens.has(token)) {
        token = generatePublicToken(8);
      }
      existingTokens.add(token);

      const card: Card = {
        id: `card_${batchId}_${i + 1}`,
        internal_card_no: formatCardNumber(cardNum),
        public_token: token,
        client_id: client.id,
        client_name: client.business_name,
        batch_id: batchId,
        batch_name: batchName,
        original_url: data.destination_url.trim(),
        destination_url: data.destination_url.trim(),
        status: 'Ready',
        total_scans: 0,
        created_at: now,
        updated_at: now,
      };
      generatedCards.push(card);
    }

    // Save batch & cards
    db.saveBatches([newBatch, ...batches]);
    db.saveCards([...generatedCards, ...existingCards]);

    db.logActivity({
      action: 'Batch Created',
      description: `Batch "${batchName}" (${data.quantity} cards) generated for ${client.business_name}`,
      type: 'batch',
      entity_id: newBatch.id,
    });

    return { batch: newBatch, generatedCards };
  },
};
